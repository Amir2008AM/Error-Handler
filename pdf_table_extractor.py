"""
pdf_table_extractor.py
======================
Production-ready PDF → Excel table extraction pipeline.

Pipeline (fully automatic — works on ANY PDF including Arabic/RTL):
  1. Detect whether PDF is text-based or scanned (image-only)
  1b. Auto-detect script language from embedded text (Arabic → ara+eng)
  2a. Text PDF  → Camelot lattice → Camelot stream → pdfplumber → OCR fallback
  2b. Scanned PDF → OCR via Tesseract 5 + pdf2image → table reconstruction
  3. Clean each DataFrame with vectorised pandas ops (pandas 2/3 compatible)
  4. Write results to a single .xlsx file (one sheet per table + metadata)

Usage:
  python pdf_table_extractor.py input.pdf [output.xlsx]
  python pdf_table_extractor.py *.pdf               # batch mode
  python pdf_table_extractor.py report.pdf -q       # quiet
  python pdf_table_extractor.py report.pdf -v       # verbose
  python pdf_table_extractor.py report.pdf --lang ara+eng   # force Arabic OCR

Performance notes:
  - Text/scan detection reads only the first page — never the whole PDF
  - Camelot is invoked once per PDF, pages='all' — no per-page loops
  - DataFrame cleaning uses vectorised str/mask operations — no apply()
  - OCR runs page-by-page with Tesseract 5 (--psm 6 for tabular layouts)
  - Logging is lazy-formatted (% style) — zero cost when level is OFF

Requirements:
  pip install camelot-py[cv] pdfplumber pandas openpyxl pytesseract pdf2image
  System: tesseract >= 4 with ara + eng traineddata, poppler (pdftoppm)
"""

from __future__ import annotations

import argparse
import logging
import os
import re
import sys
import time
from pathlib import Path
from typing import Optional

import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

# ---------------------------------------------------------------------------
# Logging — minimal overhead (lazy % formatting, configurable level)
# ---------------------------------------------------------------------------

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
    level=logging.INFO,
    stream=sys.stderr,
)
log = logging.getLogger("pdf_extractor")


# ---------------------------------------------------------------------------
# Fast lattice/stream auto-detection
# ---------------------------------------------------------------------------

_LATTICE_SIGNALS = re.compile(
    rb"(?:RectangularPath|moveto|lineto|stroke|closepath|"
    rb"/Type\s*/Page|Rect\s*\[|/Border|/BS\s*/S)",
    re.IGNORECASE,
)
_SCAN_BYTES = 131_072  # 128 KB — enough to detect border markers


def detect_flavor(pdf_path: str) -> str:
    """Return 'lattice' or 'stream' by scanning the first 128 KB of the PDF."""
    try:
        with open(pdf_path, "rb") as fh:
            sample = fh.read(_SCAN_BYTES)
        hits = len(_LATTICE_SIGNALS.findall(sample))
        flavor = "lattice" if hits >= 3 else "stream"
        log.info("Auto-detected flavor=%s (%d border signals)", flavor, hits)
        return flavor
    except OSError:
        log.warning("Could not scan %s for flavor — defaulting to stream", pdf_path)
        return "stream"


# ---------------------------------------------------------------------------
# Scan detection — is the PDF image-only (no embedded text)?
# ---------------------------------------------------------------------------

_MIN_CHARS_PER_PAGE = 40  # fewer than this → treat as scanned

# Arabic + Arabic Extended Unicode ranges
_ARABIC_RE = re.compile(
    r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]'
)


def is_scanned_pdf(pdf_path: str) -> bool:
    """
    Return True when the PDF appears to have no meaningful embedded text.
    Uses pdfplumber to extract text from up to the first 3 pages.
    Cost: opens the file once, reads only text layer — no rendering.
    """
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            sample_pages = pdf.pages[:3]
            total_chars = sum(
                len((p.extract_text() or "").strip())
                for p in sample_pages
            )
            pages_checked = len(sample_pages)
        avg = total_chars / max(pages_checked, 1)
        result = avg < _MIN_CHARS_PER_PAGE
        log.info(
            "Scan detection: avg %.0f chars/page (threshold %d) → %s",
            avg, _MIN_CHARS_PER_PAGE, "SCANNED" if result else "text-based",
        )
        return result
    except Exception as exc:
        log.warning("Scan detection failed (%s) — assuming text-based", exc)
        return False


def detect_language(pdf_path: str) -> str:
    """
    Detect the primary script in a text-based PDF by sampling up to 3 pages.

    Returns a Tesseract lang string:
      - 'ara+eng'  when > 5 % of sampled characters are Arabic-script
      - 'eng'      otherwise

    For scanned PDFs (no embedded text) the caller should pass 'ara+eng'
    as a safe default so both scripts are recognised in one pass.
    """
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            text = " ".join((p.extract_text() or "") for p in pdf.pages[:3])
        total = len(text.strip())
        if total == 0:
            return "ara+eng"   # no text → scanned → safe default covers both
        arabic = len(_ARABIC_RE.findall(text))
        ratio = arabic / total
        if ratio > 0.05:
            log.info(
                "Language: Arabic script detected (%.0f%% of chars) → lang=ara+eng",
                ratio * 100,
            )
            return "ara+eng"
        return "eng"
    except Exception as exc:
        log.warning("Language detection failed (%s) — defaulting to eng", exc)
        return "eng"


# ---------------------------------------------------------------------------
# OCR extraction — for scanned / image-only PDFs
# ---------------------------------------------------------------------------

def _ocr_page_to_df(image, lang: str = "eng") -> Optional[pd.DataFrame]:
    """
    Run Tesseract on a single PIL image and reconstruct a table DataFrame.

    Algorithm (gap-voting — robust to wide title rows):
      1. Get per-word bounding boxes from Tesseract (TSV output)
      2. Filter low-confidence / empty tokens
      3. Cluster words into rows by Y midpoint (55 % of median line height tolerance)
      4. For EACH ROW find the large horizontal gaps between consecutive words
         (gap = next_word.left − cur_word.right; large = > 1.5× median inter-word gap)
      5. Collect all "gap centre-X" positions and build a histogram;
         peaks with enough votes across rows become column split points
      6. Assign each word to a column region; concatenate multi-word cells
      7. Return a DataFrame (rows × cols)
    """
    import pytesseract
    import numpy as np

    data = pytesseract.image_to_data(
        image,
        output_type=pytesseract.Output.DATAFRAME,
        lang=lang,
        config="--psm 6",
    )

    # Keep only confident, non-empty words
    data = data[
        (data["conf"] >= 30) &
        (data["text"].astype(str).str.strip() != "") &
        (data["text"].notna())
    ].copy()

    if len(data) < 4:
        return None

    data = data.copy()
    data["left"]    = data["left"].astype(int)
    data["width"]   = data["width"].astype(int)
    data["top"]     = data["top"].astype(int)
    data["height"]  = data["height"].astype(int)
    data["x_right"] = data["left"] + data["width"]
    data["y_mid"]   = data["top"]  + data["height"] / 2.0

    # ── Step 1: cluster words into rows ──────────────────────────────────────
    median_h = float(data["height"].median())
    row_tol  = max(8.0, median_h * 0.55)

    data = data.sort_values(["y_mid", "left"]).reset_index(drop=True)

    rows_raw: list[list[tuple[int, int, str]]] = []
    cur_row:  list[tuple[int, int, str]] = []
    cur_y = float(data.iloc[0]["y_mid"])

    for _, w in data.iterrows():
        ym = float(w["y_mid"])
        if abs(ym - cur_y) <= row_tol:
            cur_row.append((int(w["left"]), int(w["x_right"]), str(w["text"]).strip()))
        else:
            if cur_row:
                rows_raw.append(sorted(cur_row, key=lambda t: t[0]))
            cur_row = [(int(w["left"]), int(w["x_right"]), str(w["text"]).strip())]
            cur_y = ym
    if cur_row:
        rows_raw.append(sorted(cur_row, key=lambda t: t[0]))

    if len(rows_raw) < 2:
        return None

    # ── Step 2: collect ALL inter-word gaps from every multi-word row ────────
    all_gap_records: list[tuple[int, int]] = []   # (size, centre_x)

    for row in rows_raw:
        if len(row) < 2:
            continue
        for i in range(len(row) - 1):
            gap_left  = row[i][1]      # right edge of word i
            gap_right = row[i + 1][0]  # left  edge of word i+1
            size = gap_right - gap_left
            if size > 0:
                all_gap_records.append((size, (gap_left + gap_right) // 2))

    if not all_gap_records:
        return None

    # ── Step 3: bimodal threshold — find natural split between small (intra-cell)
    #   and large (inter-column) gaps using the biggest jump in sorted sizes ────
    sorted_sizes = sorted(s for s, _ in all_gap_records)

    if len(sorted_sizes) < 2:
        return None

    # Find the largest jump between consecutive sorted gap sizes
    biggest_jump_idx = int(np.argmax(np.diff(sorted_sizes)))
    small_max = sorted_sizes[biggest_jump_idx]
    large_min = sorted_sizes[biggest_jump_idx + 1]
    col_gap_threshold = (small_max + large_min) // 2

    # If there is no bimodal structure (all gaps similar), bail out
    if large_min - small_max < 50:
        return None

    # ── Step 4: cluster column-gap centre-X positions → split points ─────────
    col_gap_centres = [c for s, c in all_gap_records if s > col_gap_threshold]

    if not col_gap_centres:
        return None

    x_max = int(data["x_right"].max()) + 1
    # Bin width = ~5 % of the large-gap size for fine grouping
    bin_width = max(20, int(large_min * 0.10))
    n_bins    = max(1, x_max // bin_width + 1)

    hist = np.zeros(n_bins, dtype=np.int32)
    for gx in col_gap_centres:
        bi = min(gx // bin_width, n_bins - 1)
        hist[bi] += 1

    # Treat a bin as a column split if it received any votes
    col_splits: list[int] = []
    in_peak   = False
    peak_vals: list[int] = []

    for bi in range(n_bins):
        if hist[bi] > 0:
            if not in_peak:
                in_peak   = True
                peak_vals = []
            peak_vals.extend([bi * bin_width] * int(hist[bi]))
        else:
            if in_peak:
                col_splits.append(int(np.mean(peak_vals)))
                in_peak   = False
                peak_vals = []
    if in_peak and peak_vals:
        col_splits.append(int(np.mean(peak_vals)))

    col_splits.append(x_max)   # sentinel at right edge

    if len(col_splits) < 2:
        return None

    ncols = len(col_splits)

    def _col_of(left: int) -> int:
        for ci, boundary in enumerate(col_splits):
            if left < boundary:
                return ci
        return ncols - 1

    # ── Step 4: build cell matrix ─────────────────────────────────────────────
    matrix: list[list[str]] = []
    for row in rows_raw:
        cells: list[str] = [""] * ncols
        for left, _right, text in row:
            ci = _col_of(left)
            cells[ci] = (cells[ci] + " " + text).strip() if cells[ci] else text
        matrix.append(cells)

    if not matrix:
        return None

    return pd.DataFrame(matrix)


def _extract_ocr(pdf_path: str, lang: str = "eng") -> list[pd.DataFrame]:
    """
    Convert each PDF page to an image and extract tables via Tesseract OCR.
    Returns a list of DataFrames (one per page that contains a recognisable table).
    `lang` is passed directly to Tesseract (e.g. 'ara+eng' for Arabic PDFs).
    """
    from pdf2image import convert_from_path

    log.info("OCR extraction starting (lang=%s): converting pages to images …", lang)
    images = convert_from_path(pdf_path, dpi=300)
    log.info("OCR: %d page(s) to process", len(images))

    dfs: list[pd.DataFrame] = []
    for i, img in enumerate(images, start=1):
        log.debug("OCR: processing page %d/%d", i, len(images))
        df = _ocr_page_to_df(img, lang=lang)
        if df is not None and not df.empty:
            dfs.append(df)
        else:
            log.debug("OCR: page %d — no table detected", i)

    log.info("OCR found %d raw table(s)", len(dfs))
    return dfs


# ---------------------------------------------------------------------------
# Extraction helpers
# ---------------------------------------------------------------------------

def _extract_camelot(pdf_path: str, flavor: str) -> list[pd.DataFrame]:
    """
    Extract all tables via Camelot with the given flavor.
    If the primary flavor yields 0 tables, automatically retries with the
    alternate flavor (lattice ↔ stream) before returning.
    Returns list of DataFrames.
    """
    import camelot  # local import — not penalised if fallback is used instead

    log.info("Camelot extracting [%s] from %s", flavor, pdf_path)
    tables = camelot.read_pdf(
        pdf_path,
        pages="all",
        flavor=flavor,
        suppress_stdout=True,
    )
    log.info("Camelot [%s] found %d raw table(s)", flavor, len(tables))

    if len(tables) == 0:
        alt = "stream" if flavor == "lattice" else "lattice"
        log.info("Camelot [%s] returned 0 tables — retrying with [%s]", flavor, alt)
        try:
            alt_tables = camelot.read_pdf(
                pdf_path,
                pages="all",
                flavor=alt,
                suppress_stdout=True,
            )
            log.info("Camelot [%s] found %d raw table(s)", alt, len(alt_tables))
            if len(alt_tables) > 0:
                return [t.df for t in alt_tables]
        except Exception as exc:
            log.debug("Camelot [%s] also failed: %s", alt, exc)

    return [t.df for t in tables]


def _extract_pdfplumber(pdf_path: str) -> list[pd.DataFrame]:
    """Fallback: extract tables via pdfplumber (pure-Python, no OpenCV dep)."""
    import pdfplumber  # local import

    log.info("pdfplumber fallback extracting from %s", pdf_path)
    dfs: list[pd.DataFrame] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for tbl in page.extract_tables() or []:
                if tbl:
                    dfs.append(pd.DataFrame(tbl))
    log.info("pdfplumber found %d raw table(s)", len(dfs))
    return dfs


def extract_tables(pdf_path: str, flavor: str, lang: str = "eng") -> tuple[list[pd.DataFrame], str]:
    """
    Try Camelot first (with automatic alternate-flavor retry); fall back to
    pdfplumber; fall back to OCR using the detected `lang`.
    Returns (list_of_dataframes, engine_used).
    """
    try:
        return _extract_camelot(pdf_path, flavor), f"camelot/{flavor}"
    except Exception as exc:
        log.warning("Camelot failed (%s) — falling back to pdfplumber", exc)

    try:
        return _extract_pdfplumber(pdf_path), "pdfplumber"
    except Exception as exc2:
        log.warning("pdfplumber failed (%s) — falling back to OCR", exc2)

    try:
        return _extract_ocr(pdf_path, lang=lang), "tesseract-ocr"
    except Exception as exc3:
        raise RuntimeError(f"All extractors failed: {exc3}") from exc3


# ---------------------------------------------------------------------------
# Data cleaning (fully vectorised)
# ---------------------------------------------------------------------------

def _dedup_columns(names: list[str]) -> list[str]:
    """Make column names unique: blank → Col_N, duplicates → name_1, name_2 …"""
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


def _is_title_row(row: pd.Series, ncols: int) -> bool:
    """True when a row looks like a merged title (≥ 50 % of cells are empty)."""
    non_empty = row.astype(str).str.strip().replace({"": pd.NA, "nan": pd.NA}).notna().sum()
    return non_empty <= max(1, ncols // 2)


def _to_str(v: object) -> str:
    """Safely coerce any scalar to a stripped string; NaN/None → ''."""
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    try:
        return str(v).strip()
    except Exception:
        return ""


def clean_dataframe(raw: pd.DataFrame) -> Optional[pd.DataFrame]:
    """
    Vectorised cleaning pipeline (pandas 2/3 compatible):
      0. Convert to plain object dtype so StringDtype NaN floats don't leak
      1. Normalise blank/nan strings → None
      2. Drop all-None rows and columns
      3. Skip leading title/merged rows; promote first content-rich row → header
      4. Deduplicate column names (blank, duplicates)
      5. NFKC-normalise remaining string cells
      6. Return None if the cleaned table is trivially empty
    """
    import unicodedata

    if raw.empty:
        return None

    # ── Step 0: force object dtype — prevents pandas 3 StringDtype leaking NaN floats
    df = raw.copy()
    df = df.astype(object)

    _BLANK = {"", "nan", "none", "nan", "<na>", "n/a", "-"}

    # ── Step 1: blank strings → None (object dtype safe, purely vectorised) ──
    for col in df.columns:
        # Map each cell: strip → if blank or NaN → None else keep as str
        df[col] = df[col].map(_to_str).replace(_BLANK, None)

    # ── Step 2: drop all-None rows / columns ─────────────────────────────────
    df.replace({None: pd.NA}, inplace=True)
    df.dropna(how="all", inplace=True)
    df.dropna(axis=1, how="all", inplace=True)
    df = df.where(df.notna(), other="")  # None → "" for safe string ops
    df.reset_index(drop=True, inplace=True)

    if df.empty or df.shape[0] < 2 or df.shape[1] < 2:
        return None

    # ── Step 3: header promotion (only when Camelot gives integer columns) ───
    if all(isinstance(c, int) or (isinstance(c, str) and c.isdigit())
           for c in df.columns):
        ncols = df.shape[1]

        # Skip leading title rows (merged cells — one non-empty out of N cols)
        header_idx = 0
        while header_idx < len(df):
            row_vals = [_to_str(v) for v in df.iloc[header_idx]]
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

    # ── Step 4: NFKC normalisation — one pass per column, no apply overhead ──
    def _norm_col(s: pd.Series) -> pd.Series:
        def _fix(v: object) -> str:
            text = _to_str(v)
            if not text or text.lower() in _BLANK:
                return ""
            return unicodedata.normalize("NFKC", text)
        return s.map(_fix)

    for col in df.columns:
        df[col] = _norm_col(df[col])

    # Drop rows that are entirely empty after normalisation
    non_empty_rows = df.apply(lambda row: row.astype(str).str.strip().ne("").any(), axis=1)
    df = df[non_empty_rows].reset_index(drop=True)

    # ── Final guard ──────────────────────────────────────────────────────────
    if df.shape[0] < 1 or df.shape[1] < 2:
        return None

    return df


# ---------------------------------------------------------------------------
# Excel writing
# ---------------------------------------------------------------------------

_HEADER_FILL  = PatternFill("solid", fgColor="2563EB")   # Tailwind blue-600
_HEADER_FONT  = Font(bold=True, color="FFFFFF", name="Calibri", size=10)
_META_FILL    = PatternFill("solid", fgColor="F3F4F6")
_ALIGN_CENTER = Alignment(horizontal="center", vertical="center")
_ALIGN_LEFT   = Alignment(horizontal="left",   vertical="top", wrap_text=True)


def _auto_col_width(ws, df: pd.DataFrame) -> None:
    """Set column widths based on max content length (capped at 60)."""
    for idx, col in enumerate(df.columns, start=1):
        header_len = len(str(col))
        try:
            max_data_len = df.iloc[:, idx - 1].astype(str).str.len().max()
        except Exception:
            max_data_len = 0
        width = min(max(header_len, max_data_len or 0) + 4, 60)
        ws.column_dimensions[get_column_letter(idx)].width = width


def write_excel(
    tables: list[pd.DataFrame],
    output_path: str,
    source_pdf: str,
    flavor: str,
) -> None:
    """Write cleaned tables to .xlsx with a metadata sheet."""
    wb = Workbook()
    wb.remove(wb.active)  # remove default empty sheet

    # ── Metadata sheet ──────────────────────────────────────────────────────
    ws_meta = wb.create_sheet("Metadata", 0)
    meta_rows = [
        ("Source PDF",           os.path.basename(source_pdf)),
        ("Extraction engine",    flavor),
        ("Tables extracted",     str(len(tables))),
        ("Generated at",         time.strftime("%Y-%m-%d %H:%M:%S")),
    ]
    for r, (key, val) in enumerate(meta_rows, start=1):
        cell_k = ws_meta.cell(r, 1, key)
        cell_v = ws_meta.cell(r, 2, val)
        cell_k.font  = Font(bold=True, name="Calibri", size=10)
        cell_k.fill  = _META_FILL
        cell_v.font  = Font(name="Calibri", size=10)
        cell_k.alignment = _ALIGN_LEFT
        cell_v.alignment = _ALIGN_LEFT
    ws_meta.column_dimensions["A"].width = 22
    ws_meta.column_dimensions["B"].width = 48

    # ── Table sheets ────────────────────────────────────────────────────────
    for i, df in enumerate(tables, start=1):
        sheet_name = f"Table_{i}"
        ws = wb.create_sheet(sheet_name)

        # Header row
        for col_idx, header in enumerate(df.columns, start=1):
            cell = ws.cell(1, col_idx, str(header))
            cell.font      = _HEADER_FONT
            cell.fill      = _HEADER_FILL
            cell.alignment = _ALIGN_CENTER

        # Data rows (batch write — no cell-by-cell loops where avoidable)
        for row_idx, row in enumerate(df.itertuples(index=False), start=2):
            for col_idx, val in enumerate(row, start=1):
                cell = ws.cell(row_idx, col_idx, "" if pd.isna(val) else val)  # type: ignore[arg-type]
                cell.alignment = _ALIGN_LEFT

        # Freeze header row + auto-width
        ws.freeze_panes = "A2"
        _auto_col_width(ws, df)

        log.info("Sheet '%s': %d rows × %d cols", sheet_name, *df.shape)

    wb.save(output_path)
    log.info("Saved → %s", output_path)


# ---------------------------------------------------------------------------
# Per-file orchestrator
# ---------------------------------------------------------------------------

def _clean_batch(raw_dfs: list[pd.DataFrame]) -> list[pd.DataFrame]:
    """Run clean_dataframe on a list; skip empty/failed tables. Returns cleaned list."""
    clean: list[pd.DataFrame] = []
    for idx, raw in enumerate(raw_dfs):
        try:
            df = clean_dataframe(raw)
            if df is not None:
                clean.append(df)
            else:
                log.debug("Table %d skipped (empty after cleaning)", idx + 1)
        except Exception as exc:
            log.warning("Table %d cleaning error — skipping: %s", idx + 1, exc)
    return clean


def process_pdf(pdf_path: str, output_path: Optional[str] = None, lang: Optional[str] = None) -> str:
    """
    Full pipeline for a single PDF — text-based or scanned, any language.

    Routing:
      • Scanned PDF  → OCR (Tesseract) directly with auto/forced lang
      • Text PDF     → Camelot (both flavors) → pdfplumber → OCR fallback

    `lang`: Tesseract language string (e.g. 'ara+eng', 'eng').
            None = auto-detect from the PDF's embedded text.

    Returns the path of the written .xlsx file.
    Raises RuntimeError with a user-friendly message on failure.
    """
    pdf_path = str(Path(pdf_path).resolve())
    if not os.path.isfile(pdf_path):
        raise RuntimeError(f"File not found: {pdf_path}")

    if output_path is None:
        output_path = str(Path(pdf_path).with_suffix(".xlsx"))

    t0 = time.perf_counter()
    log.info("=== Processing: %s ===", pdf_path)

    # ── Step 1: detect PDF type ──────────────────────────────────────────────
    scanned = is_scanned_pdf(pdf_path)

    # ── Step 1b: detect language (auto unless caller overrides) ─────────────
    if lang:
        log.info("Language override: lang=%s", lang)
        ocr_lang = lang
    else:
        ocr_lang = detect_language(pdf_path)

    # ── Step 2: extract ──────────────────────────────────────────────────────
    if scanned:
        log.info("Routing to OCR engine (scanned/image PDF detected, lang=%s)", ocr_lang)
        try:
            raw_dfs, engine = _extract_ocr(pdf_path, lang=ocr_lang), "tesseract-ocr"
        except Exception as exc:
            raise RuntimeError(
                f"OCR extraction failed for '{os.path.basename(pdf_path)}': {exc}"
            ) from exc
    else:
        flavor = detect_flavor(pdf_path)
        raw_dfs, engine = extract_tables(pdf_path, flavor, lang=ocr_lang)

    # ── Step 3: clean ────────────────────────────────────────────────────────
    clean = _clean_batch(raw_dfs)

    # ── Step 3b: OCR fallback if text-based extraction returned 0 tables ─────
    if not clean and not scanned:
        log.info(
            "Text-based engines found 0 tables — attempting OCR fallback "
            "(PDF may mix text and image content, lang=%s)", ocr_lang
        )
        try:
            ocr_raw = _extract_ocr(pdf_path, lang=ocr_lang)
            ocr_clean = _clean_batch(ocr_raw)
            if ocr_clean:
                clean = ocr_clean
                engine = "tesseract-ocr (fallback)"
        except Exception as exc:
            log.warning("OCR fallback also failed: %s", exc)

    if not clean:
        raise RuntimeError(
            f"No usable tables found in '{os.path.basename(pdf_path)}'. "
            "The PDF may contain no tables or only complex graphical content."
        )

    log.info("%d usable table(s) after cleaning", len(clean))

    # ── Step 4: write Excel ──────────────────────────────────────────────────
    write_excel(clean, output_path, pdf_path, engine)

    elapsed = time.perf_counter() - t0
    log.info("Done in %.2fs → %s", elapsed, output_path)
    return output_path


# ---------------------------------------------------------------------------
# Batch processing
# ---------------------------------------------------------------------------

def process_batch(paths: list[str], lang: Optional[str] = None) -> dict[str, str | Exception]:
    """
    Process multiple PDFs.
    `lang` is forwarded to process_pdf (None = auto-detect per file).
    Returns a dict mapping input path → output path or Exception.
    """
    results: dict[str, str | Exception] = {}
    for path in paths:
        try:
            results[path] = process_pdf(path, lang=lang)
        except Exception as exc:
            log.error("FAILED %s: %s", path, exc)
            results[path] = exc
    return results


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="pdf_table_extractor",
        description="Extract PDF tables → clean Excel file(s)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python pdf_table_extractor.py report.pdf\n"
            "  python pdf_table_extractor.py report.pdf output.xlsx\n"
            "  python pdf_table_extractor.py *.pdf          # batch\n"
            "  python pdf_table_extractor.py report.pdf -q  # quiet\n"
        ),
    )
    p.add_argument("inputs",        nargs="+",           help="PDF file(s) to process")
    p.add_argument("output",        nargs="?",           help="Output .xlsx path (single-file mode only)")
    p.add_argument("-q", "--quiet", action="store_true", help="Suppress info logs (errors only)")
    p.add_argument("-v", "--verbose", action="store_true", help="Enable debug logs")
    p.add_argument(
        "--lang",
        default=None,
        metavar="LANG",
        help=(
            "Tesseract OCR language(s) to use, e.g. 'ara+eng' for Arabic, "
            "'eng' for English. Default: auto-detect from PDF content. "
            "Run 'tesseract --list-langs' to see available languages."
        ),
    )
    return p


def main() -> None:
    parser = _build_parser()
    args   = parser.parse_args()

    if args.quiet:
        log.setLevel(logging.ERROR)
    elif args.verbose:
        log.setLevel(logging.DEBUG)

    pdf_inputs = [p for p in args.inputs if p.lower().endswith(".pdf")]
    non_pdfs   = [p for p in args.inputs if not p.lower().endswith(".pdf")]

    if non_pdfs:
        # Support: script.py report.pdf output.xlsx
        if len(non_pdfs) == 1 and non_pdfs[0].lower().endswith(".xlsx") and len(pdf_inputs) == 1:
            explicit_output = non_pdfs[0]
        else:
            parser.error(f"Unrecognised input(s): {non_pdfs}")
            return
    else:
        explicit_output = args.output

    if not pdf_inputs:
        parser.error("No PDF files specified.")

    forced_lang = args.lang or None

    if len(pdf_inputs) > 1:
        if explicit_output:
            parser.error("Output path can only be specified for a single PDF in batch mode.")
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
            out = process_pdf(pdf_inputs[0], explicit_output, lang=forced_lang)
            print(f"OK     {pdf_inputs[0]} → {out}")
        except RuntimeError as exc:
            print(f"ERROR  {exc}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
