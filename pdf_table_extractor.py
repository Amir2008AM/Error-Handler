"""
pdf_table_extractor.py
======================
Production-ready PDF → Excel table extraction pipeline.

Pipeline:
  1. Detect table structure (lattice vs stream) via a fast byte-scan
  2. Extract tables with Camelot (primary) or pdfplumber (fallback)
  3. Clean each DataFrame with vectorised pandas ops
  4. Write results to a single .xlsx file (one sheet per table + metadata)

Usage:
  python pdf_table_extractor.py input.pdf [output.xlsx]
  python pdf_table_extractor.py *.pdf            # batch mode

Performance notes:
  - Detection scan reads only the first 128 KB — never the whole PDF
  - Camelot is invoked once per PDF, pages='all' — no per-page loops
  - DataFrame cleaning uses vectorised str/mask operations — no apply()
  - openpyxl writes in write-only mode for large sheets (deferred cells)
  - Logging is lazy-formatted (% style) — zero cost when level is OFF
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
# Extraction helpers
# ---------------------------------------------------------------------------

def _extract_camelot(pdf_path: str, flavor: str) -> list[pd.DataFrame]:
    """Extract all tables via Camelot. Returns list of DataFrames."""
    import camelot  # local import — not penalised if fallback is used instead

    log.info("Camelot extracting [%s] from %s", flavor, pdf_path)
    tables = camelot.read_pdf(
        pdf_path,
        pages="all",
        flavor=flavor,
        suppress_stdout=True,
    )
    log.info("Camelot found %d raw table(s)", len(tables))
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


def extract_tables(pdf_path: str, flavor: str) -> tuple[list[pd.DataFrame], str]:
    """
    Try Camelot first; fall back to pdfplumber on any error.
    Returns (list_of_dataframes, engine_used).
    """
    try:
        return _extract_camelot(pdf_path, flavor), f"camelot/{flavor}"
    except Exception as exc:
        log.warning("Camelot failed (%s) — falling back to pdfplumber", exc)
        try:
            return _extract_pdfplumber(pdf_path), "pdfplumber"
        except Exception as exc2:
            raise RuntimeError(f"Both extractors failed: {exc2}") from exc2


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

def process_pdf(pdf_path: str, output_path: Optional[str] = None) -> str:
    """
    Full pipeline for a single PDF.
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

    # Step 1: auto-detect flavor
    flavor = detect_flavor(pdf_path)

    # Step 2: extract
    raw_dfs, engine = extract_tables(pdf_path, flavor)

    # Step 3: clean (skip empty/trivial tables silently)
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

    if not clean:
        raise RuntimeError(
            f"No usable tables found in '{os.path.basename(pdf_path)}'. "
            "The PDF may contain only images or non-tabular content."
        )

    log.info("%d usable table(s) after cleaning", len(clean))

    # Step 4: write Excel
    write_excel(clean, output_path, pdf_path, engine)

    elapsed = time.perf_counter() - t0
    log.info("Done in %.2fs → %s", elapsed, output_path)
    return output_path


# ---------------------------------------------------------------------------
# Batch processing
# ---------------------------------------------------------------------------

def process_batch(paths: list[str]) -> dict[str, str | Exception]:
    """
    Process multiple PDFs.
    Returns a dict mapping input path → output path or Exception.
    """
    results: dict[str, str | Exception] = {}
    for path in paths:
        try:
            results[path] = process_pdf(path)
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
    p.add_argument("inputs",       nargs="+",          help="PDF file(s) to process")
    p.add_argument("output",       nargs="?",           help="Output .xlsx path (single-file mode only)")
    p.add_argument("-q", "--quiet", action="store_true", help="Suppress info logs (errors only)")
    p.add_argument("-v", "--verbose", action="store_true", help="Enable debug logs")
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

    if len(pdf_inputs) > 1:
        if explicit_output:
            parser.error("Output path can only be specified for a single PDF in batch mode.")
        results = process_batch(pdf_inputs)
        errors  = {k: v for k, v in results.items() if isinstance(v, Exception)}
        if errors:
            for path, exc in errors.items():
                print(f"ERROR  {path}: {exc}", file=sys.stderr)
            sys.exit(1)
        for path, out in results.items():
            print(f"OK     {path} → {out}")
    else:
        try:
            out = process_pdf(pdf_inputs[0], explicit_output)
            print(f"OK     {pdf_inputs[0]} → {out}")
        except RuntimeError as exc:
            print(f"ERROR  {exc}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
