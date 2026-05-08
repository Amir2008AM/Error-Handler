"""
pdf_table_extractor.py  — Enterprise PDF → Excel Reconstruction Pipeline
=========================================================================

Architecture (10 phases):
  Phase 1  — Document Classification (text/scanned/hybrid, Arabic/LTR, bordered)
  Phase 2  — Layout Analysis (geometric, visual alignment, coordinate clustering)
  Phase 3  — Smart Engine Routing (per-page: Camelot lattice/stream/pdfplumber/OCR)
  Phase 4  — OCR Pipeline (pdf2image + Tesseract, coordinate-aware)
  Phase 5  — Persistent Column Stabilization (global schema across ALL pages)
  Phase 6  — Table Reconstruction Engine (merge fragments, repair rows)
  Phase 7  — Header Intelligence (dedup repeated headers, multi-page continuation)
  Phase 8  — Arabic RTL Support (reshaping, bidi correction, RTL Excel alignment)
  Phase 9  — Excel Generation Engine (openpyxl, borders, merged cells, RTL sheets)
  Phase 10 — Validation Layer (consistency, repair, empty-output detection)

Usage:
  python pdf_table_extractor.py input.pdf [output.xlsx]
  python pdf_table_extractor.py report.pdf -q
  python pdf_table_extractor.py report.pdf -v
  python pdf_table_extractor.py report.pdf --lang ara+eng
"""

from __future__ import annotations

import argparse
import logging
import os
import re
import sys
import time
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import (
    Alignment, Border, Font, PatternFill, Side
)
from openpyxl.utils import get_column_letter

# ─────────────────────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
    level=logging.INFO,
    stream=sys.stderr,
)
log = logging.getLogger("pdf_extractor")

# ─────────────────────────────────────────────────────────────────────────────
# Arabic Unicode ranges
# ─────────────────────────────────────────────────────────────────────────────
_ARABIC_RE = re.compile(
    r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]'
)
_ARABIC_THRESHOLD = 0.05  # >5% Arabic chars → Arabic document

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 1 — DOCUMENT CLASSIFICATION
# ─────────────────────────────────────────────────────────────────────────────

class DocumentProfile:
    """Complete classification result for a PDF file."""
    __slots__ = (
        "is_scanned", "is_hybrid", "is_arabic", "has_borders",
        "page_count", "lang", "avg_chars_per_page",
        "text_page_indices", "scanned_page_indices",
    )

    def __init__(self):
        self.is_scanned          = False
        self.is_hybrid           = False
        self.is_arabic           = False
        self.has_borders         = False
        self.page_count          = 0
        self.lang                = "eng"
        self.avg_chars_per_page  = 0.0
        self.text_page_indices:   list[int] = []
        self.scanned_page_indices: list[int] = []


_LATTICE_SIGNALS = re.compile(
    rb"(?:RectangularPath|moveto|lineto|stroke|closepath|"
    rb"/Type\s*/Page|Rect\s*\[|/Border|/BS\s*/S)",
    re.IGNORECASE,
)
_MIN_CHARS_TEXT = 40  # chars per page below which → likely scanned


def classify_document(pdf_path: str) -> DocumentProfile:
    """
    Phase 1: Classify the PDF before any extraction begins.
    Reads only text layer + first 128 KB for border signals.
    """
    profile = DocumentProfile()

    # ── Border detection (128 KB scan) ───────────────────────────────────────
    try:
        with open(pdf_path, "rb") as fh:
            sample = fh.read(131_072)
        hits = len(_LATTICE_SIGNALS.findall(sample))
        profile.has_borders = hits >= 3
        log.info("Border signals: %d → has_borders=%s", hits, profile.has_borders)
    except OSError:
        log.warning("Could not scan for border signals")

    # ── Text layer analysis (pdfplumber) ─────────────────────────────────────
    # For large PDFs we sample instead of scanning all pages — this caps
    # classify_document at <3 s regardless of page count.
    _CLASSIFY_SAMPLE = 20   # pages to inspect for language + scanned detection
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            profile.page_count = total_pages = len(pdf.pages)
            all_text = []
            page_char_counts = []

            # Build a representative sample: first 10 + last 5 + a few from middle
            if total_pages <= _CLASSIFY_SAMPLE:
                sample_indices = list(range(total_pages))
            else:
                mid = total_pages // 2
                sample_indices = sorted(set(
                    list(range(min(10, total_pages)))
                    + list(range(max(0, total_pages - 5), total_pages))
                    + [mid - 2, mid, mid + 2]
                ))

            sampled_text_pages = 0
            sampled_scanned_pages = 0

            for i in sample_indices:
                page = pdf.pages[i]
                text = (page.extract_text() or "").strip()
                page_char_counts.append(len(text))
                all_text.append(text)
                if len(text) >= _MIN_CHARS_TEXT:
                    sampled_text_pages += 1
                    profile.text_page_indices.append(i)
                else:
                    sampled_scanned_pages += 1
                    profile.scanned_page_indices.append(i)

        # Classify overall type based on sampled pages
        full_text = " ".join(all_text)
        total_chars = len(full_text.strip())

        # Scale scanned/text counts to estimate full document
        sample_size = len(sample_indices)
        scanned_ratio = sampled_scanned_pages / max(sample_size, 1)
        profile.avg_chars_per_page = (
            total_chars / max(profile.page_count, 1)
        )

        # Use ratio-based classification so sampling doesn't distort the result
        if scanned_ratio < 0.05:           # <5% scanned → fully text-based
            profile.is_scanned = False
            profile.is_hybrid  = False
        elif scanned_ratio > 0.95:         # >95% scanned → fully scanned
            profile.is_scanned = True
            profile.is_hybrid  = False
        else:                              # mixed → hybrid
            profile.is_scanned = False
            profile.is_hybrid  = True

        # Arabic detection
        if total_chars > 0:
            arabic_chars = len(_ARABIC_RE.findall(full_text))
            ratio = arabic_chars / total_chars
            if ratio > _ARABIC_THRESHOLD:
                profile.is_arabic = True
                profile.lang = "ara+eng"
                log.info("Arabic detected (%.1f%%) → lang=ara+eng", ratio * 100)
            else:
                profile.lang = "eng"
        else:
            profile.lang = "ara+eng"  # scanned → safe default

    except Exception as exc:
        log.warning("Classification failed (%s) — using defaults", exc)
        profile.is_scanned = False
        profile.lang = "eng"

    log.info(
        "Profile: pages=%d scanned=%s hybrid=%s arabic=%s borders=%s",
        profile.page_count, profile.is_scanned,
        profile.is_hybrid, profile.is_arabic, profile.has_borders,
    )
    return profile


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 2 — LAYOUT ANALYSIS
# ─────────────────────────────────────────────────────────────────────────────

class PageLayout:
    """Layout analysis result for a single page."""
    __slots__ = ("page_idx", "words", "has_table", "page_width", "page_height")

    def __init__(self, page_idx: int):
        self.page_idx   = page_idx
        self.words: list[dict] = []      # [{x0,x1,top,bottom,text}]
        self.has_table  = False
        self.page_width = 0.0
        self.page_height = 0.0


def _extract_page_words(
    pdf_path: str,
    max_pages: int = 20,
) -> list[PageLayout]:
    """
    Phase 2: Extract word-level bounding boxes for column-schema building.

    For large PDFs we only process the first `max_pages` pages — the global
    column schema converges quickly (typically within 3–5 pages) and scanning
    hundreds of pages provides no additional signal while adding many seconds
    of latency.  The pdfplumber extraction path in Phase 3 handles all pages
    directly, so layout objects are only needed for the schema + spatial-
    clustering fallback.
    """
    import pdfplumber

    layouts: list[PageLayout] = []
    with pdfplumber.open(pdf_path) as pdf:
        pages_to_scan = pdf.pages[:max_pages] if len(pdf.pages) > max_pages else pdf.pages
        for i, page in enumerate(pages_to_scan):
            layout = PageLayout(i)
            layout.page_width  = float(page.width or 595)
            layout.page_height = float(page.height or 842)

            words = page.extract_words(
                x_tolerance=3,
                y_tolerance=3,
                keep_blank_chars=False,
                use_text_flow=False,
            )
            if words:
                layout.words = words
                layout.has_table = len(words) >= 4
            layouts.append(layout)

    return layouts


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 5 — PERSISTENT COLUMN STABILIZATION
# ─────────────────────────────────────────────────────────────────────────────

class GlobalColumnSchema:
    """
    The global column anchor system.

    Instead of discovering columns independently on each page, we:
    1. Collect ALL inter-word gaps from ALL pages into one global pool
    2. Build a global gap histogram
    3. Find stable column boundaries that appear consistently
    4. Apply those same boundaries to every page → consistent column count
    """

    def __init__(self):
        self.splits: list[int] = []        # sorted column split X positions
        self.n_cols: int = 0
        self.page_width: float = 595.0     # default A4

    def fit(self, layouts: list[PageLayout]) -> None:
        """Build the global column schema from all page layouts."""
        if not layouts:
            return

        self.page_width = max(
            (l.page_width for l in layouts if l.page_width > 0),
            default=595.0,
        )

        # ── Collect ALL gap records from ALL pages ────────────────────────────
        all_gap_records: list[tuple[int, int]] = []   # (size, centre_x)
        all_heights: list[float] = []

        for layout in layouts:
            if not layout.words:
                continue

            heights = [
                float(w.get("bottom", 0)) - float(w.get("top", 0))
                for w in layout.words
                if w.get("bottom") and w.get("top")
            ]
            all_heights.extend(heights)

            # Sort words by row then X
            sorted_words = sorted(
                layout.words,
                key=lambda w: (
                    round(float(w.get("top", 0)) / 5) * 5,
                    float(w.get("x0", 0)),
                ),
            )

            # Cluster into rows
            rows = _cluster_words_into_rows(sorted_words)

            # Collect gaps per row
            for row in rows:
                if len(row) < 2:
                    continue
                for i in range(len(row) - 1):
                    gap_l = float(row[i].get("x1", 0))
                    gap_r = float(row[i + 1].get("x0", 0))
                    size = gap_r - gap_l
                    if size > 0:
                        centre = int((gap_l + gap_r) / 2)
                        all_gap_records.append((int(size), centre))

        if not all_gap_records or len(all_gap_records) < 4:
            log.info("GlobalColumnSchema: insufficient gap data — single-column mode")
            self.splits = [int(self.page_width) + 1]
            self.n_cols = 1
            return

        # ── Find bimodal threshold (intra-cell vs inter-column gaps) ─────────
        sorted_sizes = sorted(s for s, _ in all_gap_records)

        if len(sorted_sizes) < 2:
            self.splits = [int(self.page_width) + 1]
            self.n_cols = 1
            return

        diffs = np.diff(sorted_sizes)
        biggest_jump_idx = int(np.argmax(diffs))
        small_max  = sorted_sizes[biggest_jump_idx]
        large_min  = sorted_sizes[biggest_jump_idx + 1]
        threshold  = (small_max + large_min) // 2

        # PDF points: minimum 6 pt gap difference (≈ 2 mm)
        if large_min - small_max < 6:
            log.info("GlobalColumnSchema: no bimodal gap structure → single-column")
            self.splits = [int(self.page_width) + 1]
            self.n_cols = 1
            return

        # ── Build histogram of column-gap centre-X positions ─────────────────
        col_gap_centres = [c for s, c in all_gap_records if s > threshold]

        if not col_gap_centres:
            self.splits = [int(self.page_width) + 1]
            self.n_cols = 1
            return

        x_max     = int(self.page_width) + 1
        bin_width = max(8, int(large_min * 0.12))
        n_bins    = max(1, x_max // bin_width + 1)

        hist = np.zeros(n_bins, dtype=np.int32)
        for gx in col_gap_centres:
            bi = min(int(gx) // bin_width, n_bins - 1)
            hist[bi] += 1

        # Total number of pages that contributed gaps
        contributing_pages = sum(1 for l in layouts if l.words)
        # A split is "stable" if it appears in ≥25% of contributing pages
        # (or at least once, for small documents)
        min_votes = max(1, contributing_pages // 4)

        col_splits: list[int] = []
        in_peak  = False
        peak_xs: list[int] = []

        for bi in range(n_bins):
            if hist[bi] >= min_votes:
                if not in_peak:
                    in_peak  = True
                    peak_xs  = []
                peak_xs.extend([bi * bin_width] * int(hist[bi]))
            else:
                if in_peak:
                    col_splits.append(int(np.mean(peak_xs)))
                    in_peak  = False
                    peak_xs  = []
        if in_peak and peak_xs:
            col_splits.append(int(np.mean(peak_xs)))

        col_splits.append(x_max)  # sentinel

        if len(col_splits) < 2:
            col_splits = [x_max]

        self.splits = col_splits
        self.n_cols = len(col_splits)
        log.info(
            "GlobalColumnSchema: %d columns, split points=%s",
            self.n_cols, col_splits[:-1],
        )

    def assign_column(self, x: float) -> int:
        """Assign an X coordinate to a column index using the global schema."""
        xi = int(x)
        for ci, boundary in enumerate(self.splits):
            if xi < boundary:
                return ci
        return self.n_cols - 1


def _cluster_words_into_rows(
    sorted_words: list[dict],
    tol_factor: float = 0.55,
) -> list[list[dict]]:
    """Cluster words into rows by Y midpoint proximity."""
    if not sorted_words:
        return []

    heights = []
    for w in sorted_words:
        try:
            h = float(w.get("bottom", 0)) - float(w.get("top", 0))
            if h > 0:
                heights.append(h)
        except (TypeError, ValueError):
            pass

    median_h = float(np.median(heights)) if heights else 10.0
    row_tol  = max(3.0, median_h * tol_factor)

    rows: list[list[dict]]  = []
    cur_row: list[dict]     = []
    cur_y = (
        float(sorted_words[0].get("top", 0)) +
        float(sorted_words[0].get("bottom", 0))
    ) / 2.0

    for w in sorted_words:
        try:
            ym = (float(w.get("top", 0)) + float(w.get("bottom", 0))) / 2.0
        except (TypeError, ValueError):
            ym = cur_y

        if abs(ym - cur_y) <= row_tol:
            cur_row.append(w)
        else:
            if cur_row:
                rows.append(sorted(cur_row, key=lambda ww: float(ww.get("x0", 0))))
            cur_row = [w]
            cur_y   = ym

    if cur_row:
        rows.append(sorted(cur_row, key=lambda ww: float(ww.get("x0", 0))))

    return rows


def layout_to_dataframe(
    layout: PageLayout,
    schema: GlobalColumnSchema,
) -> Optional[pd.DataFrame]:
    """
    Convert a PageLayout to a DataFrame using the global column schema.
    This is the core of Phase 5 — every page uses the SAME column boundaries.
    """
    if not layout.words:
        return None

    sorted_words = sorted(
        layout.words,
        key=lambda w: (
            round(float(w.get("top", 0)) / 5) * 5,
            float(w.get("x0", 0)),
        ),
    )

    rows = _cluster_words_into_rows(sorted_words)
    if len(rows) < 2:
        return None

    ncols  = schema.n_cols
    matrix: list[list[str]] = []

    for row in rows:
        cells = [""] * ncols
        for w in row:
            x0   = float(w.get("x0", 0))
            text = str(w.get("text", "")).strip()
            if not text:
                continue
            ci = schema.assign_column(x0)
            cells[ci] = (cells[ci] + " " + text).strip() if cells[ci] else text
        if any(cells):
            matrix.append(cells)

    if not matrix:
        return None

    return pd.DataFrame(matrix)


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 3 — SMART ENGINE ROUTING
# ─────────────────────────────────────────────────────────────────────────────

def _extract_camelot(pdf_path: str, flavor: str) -> list[pd.DataFrame]:
    """Extract tables via Camelot with auto-fallback to opposite flavor."""
    import camelot

    log.info("Camelot [%s] extracting from %s", flavor, pdf_path)
    try:
        tables = camelot.read_pdf(
            pdf_path, pages="all", flavor=flavor, suppress_stdout=True
        )
        log.info("Camelot [%s] found %d table(s)", flavor, len(tables))

        if len(tables) == 0:
            alt = "stream" if flavor == "lattice" else "lattice"
            log.info("Retrying with Camelot [%s]", alt)
            try:
                alt_tables = camelot.read_pdf(
                    pdf_path, pages="all", flavor=alt, suppress_stdout=True
                )
                if len(alt_tables) > 0:
                    return [t.df for t in alt_tables]
            except Exception as exc:
                log.debug("Camelot [%s] also failed: %s", alt, exc)

        return [t.df for t in tables]

    except Exception as exc:
        log.warning("Camelot [%s] failed: %s", flavor, exc)
        return []


def _extract_pdfplumber_tables(
    pdf_path: str,
    fix_visual_arabic: bool = False,
) -> list[pd.DataFrame]:
    """
    pdfplumber explicit table detection.

    When fix_visual_arabic=True (detected visual-order Arabic PDF):
    - Each cell's text is corrected with _fix_visual_arabic_cell():
        • Reverse each Arabic word's characters (fixes char-level reversal)
        • Reverse the word list within each cell (fixes word-order reversal)
    - Column names are corrected the same way
    This produces correct logical-order Unicode text that Excel renders
    properly using its own bidi engine.
    """
    import pdfplumber

    log.info(
        "pdfplumber table extraction from %s (visual_arabic=%s)",
        pdf_path, fix_visual_arabic,
    )
    dfs: list[pd.DataFrame] = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                for tbl in (page.extract_tables() or []):
                    if not tbl:
                        continue
                    if fix_visual_arabic:
                        corrected = [
                            [
                                _fix_visual_arabic_cell(str(cell)) if cell else ""
                                for cell in row
                            ]
                            for row in tbl
                        ]
                        dfs.append(pd.DataFrame(corrected))
                    else:
                        dfs.append(pd.DataFrame(tbl))
    except Exception as exc:
        log.warning("pdfplumber failed: %s", exc)
    log.info("pdfplumber found %d table(s)", len(dfs))
    return dfs


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 4 — OCR PIPELINE
# ─────────────────────────────────────────────────────────────────────────────

def _ocr_page_to_df(
    image,
    lang: str = "eng",
    schema: Optional[GlobalColumnSchema] = None,
) -> Optional[pd.DataFrame]:
    """
    Run Tesseract on a PIL image, extract word bounding boxes,
    cluster into rows, and assign to columns using the global schema (if any).
    Falls back to local bimodal gap voting if no global schema.
    """
    import pytesseract

    data = pytesseract.image_to_data(
        image,
        output_type=pytesseract.Output.DATAFRAME,
        lang=lang,
        config="--psm 6 --oem 1",
    )

    data = data[
        (data["conf"] >= 30) &
        (data["text"].astype(str).str.strip() != "") &
        (data["text"].notna())
    ].copy()

    if len(data) < 4:
        return None

    data["x_right"] = data["left"].astype(int) + data["width"].astype(int)
    data["y_mid"]   = data["top"].astype(int)  + data["height"].astype(int) / 2.0

    # Convert to word-dict format compatible with layout clustering
    words = []
    for _, row in data.iterrows():
        words.append({
            "x0":    float(row["left"]),
            "x1":    float(row["x_right"]),
            "top":   float(row["top"]),
            "bottom": float(row["top"]) + float(row["height"]),
            "text":  str(row["text"]).strip(),
        })

    sorted_words = sorted(words, key=lambda w: (
        round(float(w["top"]) / 5) * 5, float(w["x0"])
    ))
    rows = _cluster_words_into_rows(sorted_words)

    if len(rows) < 2:
        return None

    # Use global schema if available, else do local gap voting
    if schema is not None and schema.n_cols > 1:
        ncols  = schema.n_cols
        matrix: list[list[str]] = []
        for row in rows:
            cells = [""] * ncols
            for w in row:
                ci = schema.assign_column(float(w["x0"]))
                t  = w["text"]
                cells[ci] = (cells[ci] + " " + t).strip() if cells[ci] else t
            if any(cells):
                matrix.append(cells)
        if not matrix:
            return None
        return pd.DataFrame(matrix)

    # ── Local bimodal gap voting ──────────────────────────────────────────────
    all_gap_records: list[tuple[int, int]] = []
    for row in rows:
        if len(row) < 2:
            continue
        for i in range(len(row) - 1):
            gap_l = row[i]["x1"]
            gap_r = row[i + 1]["x0"]
            size  = gap_r - gap_l
            if size > 0:
                all_gap_records.append((int(size), int((gap_l + gap_r) / 2)))

    if not all_gap_records:
        return None

    sorted_sizes = sorted(s for s, _ in all_gap_records)
    if len(sorted_sizes) < 2:
        return None

    diffs = np.diff(sorted_sizes)
    jump_idx  = int(np.argmax(diffs))
    small_max = sorted_sizes[jump_idx]
    large_min = sorted_sizes[jump_idx + 1]

    if large_min - small_max < 50:
        return None

    threshold = (small_max + large_min) // 2
    col_gap_centres = [c for s, c in all_gap_records if s > threshold]

    if not col_gap_centres:
        return None

    x_max     = int(max(w["x1"] for row in rows for w in row)) + 1
    bin_width = max(20, int(large_min * 0.10))
    n_bins    = max(1, x_max // bin_width + 1)

    hist = np.zeros(n_bins, dtype=np.int32)
    for gx in col_gap_centres:
        bi = min(int(gx) // bin_width, n_bins - 1)
        hist[bi] += 1

    col_splits: list[int] = []
    in_peak   = False
    peak_xs:  list[int]  = []

    for bi in range(n_bins):
        if hist[bi] > 0:
            if not in_peak:
                in_peak  = True
                peak_xs  = []
            peak_xs.extend([bi * bin_width] * int(hist[bi]))
        else:
            if in_peak:
                col_splits.append(int(np.mean(peak_xs)))
                in_peak  = False
                peak_xs  = []
    if in_peak and peak_xs:
        col_splits.append(int(np.mean(peak_xs)))

    col_splits.append(x_max)

    if len(col_splits) < 2:
        return None

    ncols = len(col_splits)

    def _col_of(x: float) -> int:
        for ci, b in enumerate(col_splits):
            if int(x) < b:
                return ci
        return ncols - 1

    matrix2: list[list[str]] = []
    for row in rows:
        cells = [""] * ncols
        for w in row:
            ci = _col_of(w["x0"])
            t  = w["text"]
            cells[ci] = (cells[ci] + " " + t).strip() if cells[ci] else t
        if any(cells):
            matrix2.append(cells)

    if not matrix2:
        return None

    return pd.DataFrame(matrix2)


def _extract_ocr(
    pdf_path: str,
    lang: str = "eng",
    schema: Optional[GlobalColumnSchema] = None,
) -> list[pd.DataFrame]:
    """Phase 4: Convert each PDF page to image and OCR it."""
    from pdf2image import convert_from_path

    log.info("OCR pipeline: lang=%s", lang)
    images = convert_from_path(pdf_path, dpi=300)
    log.info("OCR: %d page(s)", len(images))

    dfs: list[pd.DataFrame] = []
    for i, img in enumerate(images, start=1):
        log.debug("OCR page %d/%d", i, len(images))
        df = _ocr_page_to_df(img, lang=lang, schema=schema)
        if df is not None and not df.empty:
            dfs.append(df)
        else:
            log.debug("OCR page %d — no table detected", i)

    log.info("OCR found %d raw table(s)", len(dfs))
    return dfs


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 6 — TABLE RECONSTRUCTION ENGINE
# ─────────────────────────────────────────────────────────────────────────────

def _normalize_header_row(row: pd.Series) -> tuple:
    """Produce a hashable fingerprint of a header row for deduplication."""
    vals = []
    for v in row:
        s = str(v).strip().lower()
        s = re.sub(r'\s+', ' ', s)
        s = unicodedata.normalize("NFKC", s)
        vals.append(s)
    return tuple(vals)


def _schemas_compatible(a: pd.DataFrame, b: pd.DataFrame) -> bool:
    """
    Two tables are compatible for merging when they have the same column count,
    OR when one has only 1 row (it's a fragment).
    """
    if a.shape[1] == b.shape[1]:
        return True
    # Allow ±1 column difference for reconstruction tolerance
    if abs(a.shape[1] - b.shape[1]) <= 1 and min(a.shape[1], b.shape[1]) >= 2:
        return True
    return False


def _pad_to_width(df: pd.DataFrame, target_cols: int) -> pd.DataFrame:
    """Pad a DataFrame with empty columns on the right to reach target_cols."""
    while df.shape[1] < target_cols:
        df[f"_pad_{df.shape[1]}"] = ""
    return df


def reconstruct_tables(raw_dfs: list[pd.DataFrame]) -> list[pd.DataFrame]:
    """
    Phase 6 + Phase 7: Merge compatible adjacent tables and remove duplicate headers.

    Algorithm:
      1. Start with the first table
      2. For each subsequent table, check if it's schema-compatible with the current group
      3. If yes → append rows (after deduplicating the header)
      4. If no  → finalize the current group, start a new one
    """
    if not raw_dfs:
        return []

    cleaned = []
    for df in raw_dfs:
        c = _clean_dataframe(df)
        if c is not None:
            cleaned.append(c)

    if not cleaned:
        return []

    groups: list[pd.DataFrame] = [cleaned[0]]
    seen_headers: set[tuple] = set()

    if len(cleaned[0]) > 0:
        seen_headers.add(_normalize_header_row(cleaned[0].iloc[0]))

    for df in cleaned[1:]:
        current = groups[-1]

        if _schemas_compatible(current, df):
            # Align column counts
            target = max(current.shape[1], df.shape[1])
            if current.shape[1] < target:
                current = _pad_to_width(current.copy(), target)
                groups[-1] = current
            if df.shape[1] < target:
                df = _pad_to_width(df.copy(), target)

            # Normalize column names to match
            df.columns = current.columns[:df.shape[1]]

            # Drop rows matching seen headers (Phase 7: header deduplication)
            rows_to_keep = []
            for i, row in df.iterrows():
                fp = _normalize_header_row(row)
                if fp not in seen_headers:
                    rows_to_keep.append(i)

            if rows_to_keep:
                df_filtered = df.loc[rows_to_keep].copy()
                # Track new headers from this page
                if len(df_filtered) > 0:
                    seen_headers.add(_normalize_header_row(df_filtered.iloc[0]))

                merged = pd.concat(
                    [current, df_filtered], ignore_index=True
                )
                groups[-1] = merged
            # else: entire df was repeated header → skip it

        else:
            # Start a new group
            if len(df) > 0:
                seen_headers.add(_normalize_header_row(df.iloc[0]))
            groups.append(df)

    # Final cleanup
    result = []
    for g in groups:
        g = g.reset_index(drop=True)
        # Remove entirely empty rows/cols
        g.replace("", pd.NA, inplace=True)
        g.dropna(how="all", inplace=True)
        g.dropna(axis=1, how="all", inplace=True)
        g.fillna("", inplace=True)
        g.reset_index(drop=True, inplace=True)
        if g.shape[0] >= 1 and g.shape[1] >= 1:
            result.append(g)

    log.info("Reconstruction: %d raw → %d merged table(s)", len(raw_dfs), len(result))
    return result


# ─────────────────────────────────────────────────────────────────────────────
# DATA CLEANING (shared utility)
# ─────────────────────────────────────────────────────────────────────────────

_BLANK_VALS = {"", "nan", "none", "n/a", "-", "<na>", "na"}


def _to_str(v: object) -> str:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    try:
        s = str(v).strip()
        return "" if s.lower() in _BLANK_VALS else s
    except Exception:
        return ""


def _dedup_columns(names: list[str]) -> list[str]:
    seen: dict[str, int] = {}
    result: list[str] = []
    for i, name in enumerate(names):
        base = name.strip() if name.strip() else f"Col_{i + 1}"
        if base in seen:
            seen[base] += 1
            result.append(f"{base}_{seen[base]}")
        else:
            seen[base] = 0
            result.append(base)
    return result


def _clean_dataframe(raw: pd.DataFrame) -> Optional[pd.DataFrame]:
    """
    Vectorised cleaning:
    1. Convert to object dtype
    2. Blank/NaN strings → ""
    3. Drop all-empty rows and columns
    4. Promote header if columns are integer indices
    5. NFKC-normalise strings
    """
    if raw is None or raw.empty:
        return None

    df = raw.copy().astype(object)

    # Blank → ""
    for col in df.columns:
        df[col] = df[col].map(_to_str)

    df.replace("", pd.NA, inplace=True)
    df.dropna(how="all", inplace=True)
    df.dropna(axis=1, how="all", inplace=True)
    df.fillna("", inplace=True)
    df.reset_index(drop=True, inplace=True)

    if df.empty or df.shape[1] < 1:
        return None

    # Header promotion for integer-indexed columns
    if all(
        isinstance(c, int) or (isinstance(c, str) and c.isdigit())
        for c in df.columns
    ):
        ncols = df.shape[1]
        header_idx = 0
        while header_idx < len(df):
            row_vals  = [_to_str(v) for v in df.iloc[header_idx]]
            non_empty = sum(1 for v in row_vals if v)
            if non_empty > max(1, ncols // 2):
                break
            header_idx += 1

        if header_idx >= len(df):
            return None

        new_header = [_to_str(v) for v in df.iloc[header_idx]]
        df = df.iloc[header_idx + 1:].copy()
        df.columns = _dedup_columns(new_header)
        df.reset_index(drop=True, inplace=True)
    else:
        df.columns = _dedup_columns([str(c) for c in df.columns])

    # NFKC normalisation
    for col in df.columns:
        df[col] = df[col].map(
            lambda v: unicodedata.normalize("NFKC", _to_str(v))
        )

    # Drop all-empty rows post-normalisation
    mask = df.apply(
        lambda row: row.astype(str).str.strip().ne("").any(), axis=1
    )
    df = df[mask].reset_index(drop=True)

    if df.shape[0] < 1 or df.shape[1] < 1:
        return None

    return df


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 8 — ARABIC RTL SUPPORT
# ─────────────────────────────────────────────────────────────────────────────
#
# ROOT-CAUSE ANALYSIS OF THE VISUAL-ORDER BUG
# ─────────────────────────────────────────────
# Many Arabic PDFs (especially those generated by Windows Office tools or
# older PDF exporters) store Arabic characters in VISUAL order — i.e. the
# characters appear in the PDF content stream left-to-right as they would be
# rendered on screen, not in Unicode logical (right-to-left reading) order.
#
# Problem 1 — Character order: "لستلا" is "التسلسل" with its chars reversed.
# Problem 2 — Word order: "بلاطلا مسا" = "اسم الطالب" with words reversed.
# Problem 3 — arabic_reshaper + bidi makes it WORSE: those tools expect
#   *logical-order* input and convert to presentation forms (ﻞﺠﻧﺓ) which
#   Excel cannot render correctly. Excel's own bidi engine handles display.
#
# FIX: detect visual-order cells (Arabic words with direction='ltr' in the
# PDF) and apply: reverse each word's chars, then reverse the word list.
# Do NOT apply arabic_reshaper/bidi for Excel output — Excel handles bidi.
# ─────────────────────────────────────────────────────────────────────────────

def _is_rtl_table(df: pd.DataFrame) -> bool:
    """Detect whether a table's content is primarily Arabic/RTL."""
    sample_text = " ".join(
        str(v)
        for row in df.values[:10]
        for v in row
    )
    total = len(sample_text.strip())
    if total == 0:
        return False
    arabic_chars = len(_ARABIC_RE.findall(sample_text))
    return arabic_chars / total > _ARABIC_THRESHOLD


def _is_visual_order_arabic(text: str) -> bool:
    """
    Heuristic: detect whether Arabic text is stored in visual order.

    Visual-order Arabic chars are rendered LTR in the PDF content stream,
    so pdfplumber reports direction='ltr' for every word.  We use a char-level
    test: if the text contains Arabic AND the final char of the first Arabic
    token is a connector (ال، لا، ما، ها…) — a pattern common in reversed
    logical Arabic but rare in correctly-ordered Arabic beginnings — treat as
    visual order.  In practice we rely on the direction flag from pdfplumber
    (set at extract time) and fall back to this heuristic.
    """
    if not _ARABIC_RE.search(text):
        return False
    # Very simple heuristic: does the first Arabic word end with ل or ا?
    # (These chars often appear at the start of correctly-ordered Arabic words
    #  only if preceded by ال — but as final chars they're common in visual
    #  reversed text.)
    tokens = [t for t in text.split() if _ARABIC_RE.search(t)]
    if not tokens:
        return False
    first = tokens[0]
    return first[-1] in 'التنيةةىلاو'


_DIGITS_ONLY_RE   = re.compile(r'^[\d\.\,\-\/\+]+$')
_LATIN_ONLY_RE    = re.compile(r'^[A-Za-z0-9\.\,\-\/\+\s\(\)\[\]]+$')
_MIXED_NUM_AR_RE  = re.compile(r'^[\d\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]+$')


def _fix_visual_arabic_cell(text: str) -> str:
    """
    Correct visual-order Arabic cell text for Excel storage.

    Algorithm:
      1. Split on spaces into word tokens
      2. For pure Arabic tokens: reverse character sequence
      3. For digit/Latin/mixed tokens: keep as-is (numbers don't need reversal)
      4. Reverse the word list (fixes word-order reversal)
      5. Rejoin with spaces

    Handles multi-line cells (\\n) by processing each line independently.

    Edge cases:
    - Cells that are purely numeric (student codes): returned unchanged
    - Cells mixing numbers and Arabic chars in a single token: kept as-is
      because pdfplumber has merged them in a way we can't reliably split
    - Latin text (A1 W, 10:00): returned unchanged
    """
    if not text:
        return text
    if not _ARABIC_RE.search(text):
        return text  # no Arabic content — skip entirely

    # Handle multi-line cells line by line
    if '\n' in text:
        lines = text.split('\n')
        fixed_lines = [_fix_visual_arabic_cell(line) for line in lines]
        return '\n'.join(fixed_lines)

    tokens = text.split(' ')
    fixed  = []
    has_arabic_token = False

    for tok in tokens:
        if not tok:
            fixed.append(tok)
        elif _ARABIC_RE.search(tok) and not _DIGITS_ONLY_RE.match(tok):
            # Pure Arabic or Arabic+punctuation token
            # If it also has digits mixed in, only reverse the Arabic chars
            if any(c.isdigit() for c in tok):
                # Mixed token (e.g. '250114كلية'): keep as-is — splitting is unsafe
                fixed.append(tok)
            else:
                fixed.append(tok[::-1])   # reverse Arabic word chars
                has_arabic_token = True
        else:
            # Digits, Latin, or purely numeric: keep unchanged
            fixed.append(tok)

    if has_arabic_token:
        fixed.reverse()   # reverse word order only when Arabic present
    return ' '.join(fixed)


def fix_visual_arabic_dataframe(
    df: pd.DataFrame,
    visual_order: bool = True,
) -> pd.DataFrame:
    """
    Apply visual-order Arabic correction to every cell in a DataFrame.

    When visual_order=True (the detected state for this PDF type):
      - Calls _fix_visual_arabic_cell() on each cell
      - Fixes column names the same way
    When visual_order=False: returns df unchanged (logical-order text is fine).

    NOTE: We deliberately do NOT call arabic_reshaper or bidi.get_display()
    here because Excel's own rendering engine handles Arabic bidi correctly
    when given proper Unicode logical-order text.  Applying presentation-form
    reshaping (ﻞﺠﻧﺓ) produces characters that appear as boxes in Excel.
    """
    if not visual_order:
        return df

    out = df.copy()
    for col in out.columns:
        out[col] = out[col].map(lambda v: _fix_visual_arabic_cell(_to_str(v)))

    new_cols = [_fix_visual_arabic_cell(str(c)) for c in out.columns]
    out.columns = new_cols
    return out


def _detect_visual_order_from_words(words: list[dict]) -> bool:
    """
    Return True when pdfplumber word objects indicate visual-order Arabic.
    Criteria: ≥50% of Arabic-containing words have direction='ltr'.
    """
    arabic_words = [w for w in words if _ARABIC_RE.search(str(w.get("text", "")))]
    if not arabic_words:
        return False
    ltr_count = sum(1 for w in arabic_words if w.get("direction", "") == "ltr")
    return ltr_count / len(arabic_words) >= 0.5


# Keep a thin public alias that old call-sites may reference
def apply_arabic_reshaping(df: pd.DataFrame) -> pd.DataFrame:
    """Alias kept for API compatibility — delegates to fix_visual_arabic_dataframe."""
    return fix_visual_arabic_dataframe(df, visual_order=True)


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 9 — EXCEL GENERATION ENGINE
# ─────────────────────────────────────────────────────────────────────────────

# Styles
_HDR_FILL     = PatternFill("solid", fgColor="1E40AF")   # deep blue
_HDR_FONT     = Font(bold=True, color="FFFFFF", name="Calibri", size=10)
_HDR_BORDER   = Border(
    bottom=Side(style="medium", color="FFFFFF"),
)
_CELL_FONT    = Font(name="Calibri", size=10)
_ALT_FILL     = PatternFill("solid", fgColor="EFF6FF")   # very light blue
_META_FILL    = PatternFill("solid", fgColor="F1F5F9")
_THIN_SIDE    = Side(style="thin", color="CBD5E1")
_THIN_BORDER  = Border(
    left=_THIN_SIDE, right=_THIN_SIDE,
    top=_THIN_SIDE,  bottom=_THIN_SIDE,
)

_ALIGN_CENTER    = Alignment(horizontal="center", vertical="center", wrap_text=False)
_ALIGN_LEFT_WRAP = Alignment(horizontal="left",   vertical="top",    wrap_text=True)
_ALIGN_RIGHT_RTL = Alignment(horizontal="right",  vertical="top",    wrap_text=True, readingOrder=2)


def _auto_col_width(ws, df: pd.DataFrame) -> None:
    """Set column widths based on content (capped 8–60)."""
    for idx, col in enumerate(df.columns, start=1):
        header_len = len(str(col))
        try:
            max_data_len = int(
                df.iloc[:, idx - 1].astype(str).str.len().max()
            )
        except Exception:
            max_data_len = 0
        width = max(8, min(header_len + 4, max_data_len + 4, 60))
        ws.column_dimensions[get_column_letter(idx)].width = width


def _write_table_sheet(
    wb: Workbook,
    df: pd.DataFrame,
    sheet_name: str,
    is_rtl: bool,
    table_num: int,
) -> None:
    """Write one DataFrame to a named sheet with full professional formatting."""
    ws = wb.create_sheet(sheet_name)

    if is_rtl:
        ws.sheet_view.rightToLeft = True

    cell_align = _ALIGN_RIGHT_RTL if is_rtl else _ALIGN_LEFT_WRAP

    # ── Header row ────────────────────────────────────────────────────────────
    for col_idx, header in enumerate(df.columns, start=1):
        cell = ws.cell(1, col_idx, str(header))
        cell.font      = _HDR_FONT
        cell.fill      = _HDR_FILL
        cell.alignment = _ALIGN_CENTER if not is_rtl else Alignment(
            horizontal="center", vertical="center",
            readingOrder=2, wrap_text=False,
        )
        cell.border    = _HDR_BORDER

    # ── Data rows ─────────────────────────────────────────────────────────────
    for row_idx, row in enumerate(df.itertuples(index=False), start=2):
        fill = _ALT_FILL if row_idx % 2 == 0 else None
        for col_idx, val in enumerate(row, start=1):
            cell       = ws.cell(row_idx, col_idx, "" if pd.isna(val) else str(val))
            cell.font  = _CELL_FONT
            cell.alignment = cell_align
            cell.border    = _THIN_BORDER
            if fill:
                cell.fill = fill

    ws.freeze_panes = "A2"
    _auto_col_width(ws, df)
    log.info("Sheet '%s': %d rows × %d cols (RTL=%s)", sheet_name, *df.shape, is_rtl)


def write_excel(
    tables: list[pd.DataFrame],
    output_path: str,
    source_pdf: str,
    engine: str,
    is_arabic: bool = False,
) -> None:
    """Phase 9: Write all tables to a production-quality .xlsx file."""
    wb = Workbook()
    wb.remove(wb.active)

    # ── Metadata sheet ────────────────────────────────────────────────────────
    ws_meta = wb.create_sheet("Metadata", 0)
    meta_rows = [
        ("Source PDF",        os.path.basename(source_pdf)),
        ("Extraction engine", engine),
        ("Tables extracted",  str(len(tables))),
        ("Document language", "Arabic / RTL" if is_arabic else "English / LTR"),
        ("Generated at",      time.strftime("%Y-%m-%d %H:%M:%S")),
        ("Generator",         "Toolify PDF Reconstruction Engine v2"),
    ]
    for r, (key, val) in enumerate(meta_rows, start=1):
        ck = ws_meta.cell(r, 1, key)
        cv = ws_meta.cell(r, 2, val)
        ck.font      = Font(bold=True, name="Calibri", size=10)
        ck.fill      = _META_FILL
        ck.alignment = _ALIGN_LEFT_WRAP
        cv.font      = Font(name="Calibri", size=10)
        cv.alignment = _ALIGN_LEFT_WRAP
    ws_meta.column_dimensions["A"].width = 24
    ws_meta.column_dimensions["B"].width = 50

    # ── Table sheets ──────────────────────────────────────────────────────────
    for i, df in enumerate(tables, start=1):
        is_rtl = is_arabic or _is_rtl_table(df)
        # NOTE: Arabic visual-order correction is applied at extraction time
        # (in _extract_pdfplumber_tables / spatial clustering / OCR paths).
        # We do NOT call apply_arabic_reshaping() / bidi here because:
        #   1. It would double-process already-corrected text
        #   2. arabic_reshaper produces presentation forms (ﻞﺠﻧﺓ) that Excel
        #      cannot render — Excel uses its own Unicode bidi engine
        sheet_name = f"Table_{i}"
        _write_table_sheet(wb, df, sheet_name, is_rtl, i)

    wb.save(output_path)
    log.info("Saved → %s", output_path)


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 10 — VALIDATION LAYER
# ─────────────────────────────────────────────────────────────────────────────

def validate_and_repair(tables: list[pd.DataFrame]) -> list[pd.DataFrame]:
    """
    Phase 10: Validate column consistency, detect broken structures,
    and repair where possible.
    """
    valid: list[pd.DataFrame] = []

    for i, df in enumerate(tables):
        # Check minimum size
        if df.shape[0] < 1 or df.shape[1] < 1:
            log.warning("Validation: Table %d skipped (too small: %s)", i + 1, df.shape)
            continue

        # Check for completely empty table
        all_empty = df.apply(
            lambda col: col.astype(str).str.strip().eq("").all()
        ).all()
        if all_empty:
            log.warning("Validation: Table %d skipped (all empty)", i + 1)
            continue

        # Repair: detect and drop columns that are >90% empty
        col_empty_ratio = df.apply(
            lambda col: col.astype(str).str.strip().eq("").mean()
        )
        mostly_empty_cols = col_empty_ratio[col_empty_ratio > 0.90].index.tolist()
        if mostly_empty_cols and len(df.columns) - len(mostly_empty_cols) >= 1:
            df = df.drop(columns=mostly_empty_cols)
            log.info(
                "Validation: Table %d — dropped %d empty columns",
                i + 1, len(mostly_empty_cols),
            )

        # Repair: drop rows that are >90% empty
        row_empty_ratio = df.apply(
            lambda col: col.astype(str).str.strip().eq(""), axis=1
        ).mean(axis=1)
        mostly_empty_rows = row_empty_ratio[row_empty_ratio > 0.90].index
        if len(mostly_empty_rows) > 0:
            df = df.drop(index=mostly_empty_rows).reset_index(drop=True)

        # Validate RTL formatting consistency
        is_rtl = _is_rtl_table(df)
        log.debug(
            "Validation: Table %d — %d rows × %d cols — RTL=%s",
            i + 1, df.shape[0], df.shape[1], is_rtl,
        )

        # Final size check after repair
        if df.shape[0] >= 1 and df.shape[1] >= 1:
            valid.append(df)
        else:
            log.warning("Validation: Table %d discarded after repair", i + 1)

    log.info("Validation: %d/%d tables passed", len(valid), len(tables))
    return valid


# ─────────────────────────────────────────────────────────────────────────────
# FULL PIPELINE ORCHESTRATOR
# ─────────────────────────────────────────────────────────────────────────────

def process_pdf(
    pdf_path: str,
    output_path: Optional[str] = None,
    lang: Optional[str] = None,
) -> str:
    """
    Enterprise PDF → Excel reconstruction pipeline.

    Phases:
      1  Classify document
      2  Extract layout (word bounding boxes)
      5  Build global column schema
      3  Route to best engine per-document type
      6  Reconstruct + merge multi-page tables
      7  Remove repeated headers
      8  Apply Arabic reshaping
      9  Generate Excel
      10 Validate output
    """
    pdf_path = str(Path(pdf_path).resolve())
    if not os.path.isfile(pdf_path):
        raise RuntimeError(f"File not found: {pdf_path}")

    if output_path is None:
        output_path = str(Path(pdf_path).with_suffix(".xlsx"))

    t0 = time.perf_counter()
    log.info("=== Toolify PDF Reconstruction: %s ===", pdf_path)

    # ── Phase 1: Document Classification ─────────────────────────────────────
    profile = classify_document(pdf_path)
    ocr_lang = lang or profile.lang

    # ── Phase 2 + 5: Layout Analysis + Global Column Schema ──────────────────
    schema = GlobalColumnSchema()
    layouts: list[PageLayout] = []

    if not profile.is_scanned:
        try:
            layouts = _extract_page_words(pdf_path)
            text_layouts = [l for l in layouts if l.words]
            if text_layouts:
                schema.fit(text_layouts)
                log.info(
                    "Global schema: %d columns from %d text pages",
                    schema.n_cols, len(text_layouts),
                )
        except Exception as exc:
            log.warning("Layout extraction failed (%s) — skipping global schema", exc)

    # ── Phase 3: Smart Engine Routing ────────────────────────────────────────
    raw_dfs: list[pd.DataFrame] = []
    engine  = "unknown"

    # Detect visual-order Arabic: sample words from the first text page.
    # In visual-order PDFs pdfplumber marks every Arabic word as direction='ltr'.
    is_visual_arabic = False
    if profile.is_arabic and not profile.is_scanned:
        try:
            import pdfplumber as _plumber
            with _plumber.open(pdf_path) as _pdf:
                sample_words: list[dict] = []
                for p in _pdf.pages[:min(3, len(_pdf.pages))]:
                    sample_words.extend(p.extract_words() or [])
                    if len(sample_words) >= 100:
                        break
            is_visual_arabic = _detect_visual_order_from_words(sample_words)
            log.info(
                "Arabic text order detection: %s",
                "VISUAL (LTR-encoded)" if is_visual_arabic else "LOGICAL (RTL Unicode)",
            )
        except Exception as _e:
            log.debug("Visual-order detection skipped: %s", _e)

    # CAMELOT TIMEOUT GUARD: Camelot spawns Ghostscript per-page and blocks
    # indefinitely on PDFs > ~30 pages.  Skip it and go straight to pdfplumber
    # which handles large structured PDFs correctly in O(N) time.
    _CAMELOT_PAGE_LIMIT = 30
    camelot_eligible = (
        not profile.is_scanned
        and profile.page_count <= _CAMELOT_PAGE_LIMIT
    )
    if not camelot_eligible:
        log.info(
            "Camelot skipped: page_count=%d > %d limit — routing to pdfplumber",
            profile.page_count, _CAMELOT_PAGE_LIMIT,
        )

    if profile.is_scanned:
        # Fully scanned → OCR directly
        log.info("Routing: fully scanned PDF → OCR")
        try:
            raw_dfs = _extract_ocr(pdf_path, lang=ocr_lang, schema=schema if schema.n_cols > 1 else None)
            engine  = "tesseract-ocr"
        except Exception as exc:
            raise RuntimeError(f"OCR failed: {exc}") from exc

    else:
        # Text-based or hybrid → try Camelot first (only for small PDFs)
        flavor = "lattice" if profile.has_borders else "stream"

        if camelot_eligible:
            try:
                raw_dfs = _extract_camelot(pdf_path, flavor)
                if raw_dfs:
                    engine = f"camelot/{flavor}"
            except Exception as exc:
                log.warning("Camelot routing failed: %s", exc)

        if not raw_dfs:
            # pdfplumber table detection (primary for large/Arabic PDFs)
            try:
                raw_dfs = _extract_pdfplumber_tables(
                    pdf_path,
                    fix_visual_arabic=is_visual_arabic,
                )
                if raw_dfs:
                    engine = "pdfplumber"
            except Exception as exc:
                log.warning("pdfplumber fallback failed: %s", exc)

        if not raw_dfs and layouts:
            # Fallback 2: spatial word clustering with global schema
            log.info("Routing: spatial clustering with global schema")
            for layout in layouts:
                if layout.words:
                    df = layout_to_dataframe(layout, schema)
                    if df is not None and not df.empty:
                        raw_dfs.append(df)
            if raw_dfs:
                engine = "spatial-clustering"

        if not raw_dfs:
            # Fallback 3: OCR
            log.info("Routing: all text engines failed → OCR")
            try:
                raw_dfs = _extract_ocr(pdf_path, lang=ocr_lang, schema=schema if schema.n_cols > 1 else None)
                engine  = "tesseract-ocr (fallback)"
            except Exception as exc:
                raise RuntimeError(f"All extractors failed: {exc}") from exc

        # For hybrid PDFs: OCR the scanned pages ONLY if pdfplumber found < 10%
        # of expected tables (i.e. pdfplumber mostly failed).  When pdfplumber
        # already recovered a full table per page, adding OCR just duplicates
        # rows and costs tens of seconds of Tesseract time.
        expected_tables = max(profile.page_count // 2, 1)
        pdfplumber_sufficient = len(raw_dfs) >= expected_tables * 0.5

        if profile.is_hybrid and profile.scanned_page_indices and not pdfplumber_sufficient:
            log.info(
                "Hybrid PDF: supplementing with OCR for %d scanned pages",
                len(profile.scanned_page_indices),
            )
            try:
                from pdf2image import convert_from_path
                images = convert_from_path(pdf_path, dpi=300)
                for pi in profile.scanned_page_indices:
                    if pi < len(images):
                        df = _ocr_page_to_df(
                            images[pi], lang=ocr_lang,
                            schema=schema if schema.n_cols > 1 else None,
                        )
                        if df is not None and not df.empty:
                            raw_dfs.append(df)
                engine += "+ocr-hybrid"
            except Exception as exc:
                log.warning("Hybrid OCR supplement failed: %s", exc)
        elif profile.is_hybrid and pdfplumber_sufficient:
            log.info(
                "Hybrid PDF: skipping OCR supplement — pdfplumber found %d tables (sufficient)",
                len(raw_dfs),
            )

    # ── Phase 6 + 7: Table Reconstruction + Header Intelligence ──────────────
    tables = reconstruct_tables(raw_dfs)

    if not tables:
        raise RuntimeError(
            f"No usable tables found in '{os.path.basename(pdf_path)}'. "
            "The PDF may contain no tables or only complex graphical content."
        )

    # ── Phase 10: Validation ──────────────────────────────────────────────────
    tables = validate_and_repair(tables)

    if not tables:
        raise RuntimeError(
            f"Tables were found but failed validation in '{os.path.basename(pdf_path)}'. "
            "The content may be corrupted or too sparse."
        )

    # ── Phase 9: Excel Generation (includes Phase 8 Arabic reshaping) ─────────
    write_excel(
        tables, output_path, pdf_path, engine,
        is_arabic=profile.is_arabic,
    )

    elapsed = time.perf_counter() - t0
    log.info(
        "Done: %d table(s) → %s [engine=%s] in %.2fs",
        len(tables), output_path, engine, elapsed,
    )
    return output_path


# ─────────────────────────────────────────────────────────────────────────────
# BATCH PROCESSING
# ─────────────────────────────────────────────────────────────────────────────

def process_batch(
    paths: list[str],
    lang: Optional[str] = None,
) -> dict[str, "str | Exception"]:
    results: dict[str, "str | Exception"] = {}
    for path in paths:
        try:
            results[path] = process_pdf(path, lang=lang)
        except Exception as exc:
            log.error("FAILED %s: %s", path, exc)
            results[path] = exc
    return results


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="pdf_table_extractor",
        description="Enterprise PDF → Excel reconstruction pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python pdf_table_extractor.py report.pdf\n"
            "  python pdf_table_extractor.py report.pdf output.xlsx\n"
            "  python pdf_table_extractor.py *.pdf\n"
            "  python pdf_table_extractor.py report.pdf -q\n"
            "  python pdf_table_extractor.py report.pdf --lang ara+eng\n"
        ),
    )
    p.add_argument("inputs",            nargs="+",           help="PDF file(s) to process")
    p.add_argument("output",            nargs="?",           help="Output .xlsx (single-file mode)")
    p.add_argument("-q", "--quiet",     action="store_true", help="Errors only")
    p.add_argument("-v", "--verbose",   action="store_true", help="Debug logs")
    p.add_argument(
        "--lang", default=None, metavar="LANG",
        help="Tesseract language override, e.g. 'ara+eng' or 'eng'",
    )
    return p


def main() -> None:
    parser = _build_parser()
    args   = parser.parse_args()

    if args.quiet:
        log.setLevel(logging.ERROR)
    elif args.verbose:
        log.setLevel(logging.DEBUG)

    pdf_inputs   = [p for p in args.inputs if p.lower().endswith(".pdf")]
    non_pdfs     = [p for p in args.inputs if not p.lower().endswith(".pdf")]
    explicit_out = None

    if non_pdfs:
        if (
            len(non_pdfs) == 1
            and non_pdfs[0].lower().endswith(".xlsx")
            and len(pdf_inputs) == 1
        ):
            explicit_out = non_pdfs[0]
        else:
            parser.error(f"Unrecognised input(s): {non_pdfs}")

    explicit_out = explicit_out or args.output

    if not pdf_inputs:
        parser.error("No PDF files specified.")

    forced_lang = args.lang or None

    if len(pdf_inputs) > 1:
        if explicit_out:
            parser.error("Output path can only be used in single-file mode.")
        results = process_batch(pdf_inputs, lang=forced_lang)
        errors  = {k: v for k, v in results.items() if isinstance(v, Exception)}
        if errors:
            for path, exc in errors.items():
                print(f"ERROR  {path}: {exc}", file=sys.stderr)
            sys.exit(1)
        for path, out in results.items():
            print(f"OK     {path} → {out}")
    else:
        try:
            out = process_pdf(pdf_inputs[0], explicit_out, lang=forced_lang)
            print(f"OK     {pdf_inputs[0]} → {out}")
        except RuntimeError as exc:
            print(f"ERROR  {exc}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
