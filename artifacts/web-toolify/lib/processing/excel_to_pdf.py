"""
Excel → PDF converter — Arabic-first, ilovepdf-quality output.

Fixes vs previous version:
  1. Merged cells: values are properly expanded to every cell in the range,
     so student names (often in merged rows) never appear blank.
  2. Header detection: title rows are stripped before the table is built;
     the column header row repeats on every page — never distorted.
  3. Threaded-comment noise: Excel "Your version of Excel allows you to read
     this threaded comment;" lines are silently discarded.
  4. No row-splitting across pages: splitByRow=0 keeps each data row intact.
  5. Page numbers: printed in the footer of every page.

Usage:
    python3 excel_to_pdf.py input.xlsx output.pdf [options]

Options:
    --page-size    a4 | letter | legal      (default: a4)
    --orientation  portrait | landscape     (default: landscape)
    --font-size    <int>                    (default: 9)
"""

from __future__ import annotations

import sys
import os
import re
import json
import argparse
from pathlib import Path
from typing import Any

import openpyxl
from openpyxl.utils import get_column_letter
import arabic_reshaper
from bidi.algorithm import get_display

from reportlab.lib.pagesizes import A4, LETTER, LEGAL, landscape, portrait
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate,
    Table, TableStyle, Paragraph, Spacer, PageBreak, KeepTogether,
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.pdfgen import canvas as rl_canvas


# ── Constants ─────────────────────────────────────────────────────────────────

_AR_RE = re.compile(r'[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]')

# Noise strings injected by Excel's threaded-comment feature
_COMMENT_NOISE = re.compile(
    r'Your version of Excel allows you to read this threaded comment',
    re.IGNORECASE,
)

PAGE_SIZES = {'a4': A4, 'letter': LETTER, 'legal': LEGAL}


# ── Arabic helpers ────────────────────────────────────────────────────────────

def has_arabic(text: str) -> bool:
    return bool(_AR_RE.search(text))


def shape_arabic(text: str) -> str:
    """
    Logical-order Unicode → visual-order Presentation Forms,
    identical to what ilovepdf.com applies before PDF embedding.
    Non-Arabic text is returned unchanged.
    """
    if not text or not has_arabic(text):
        return text
    reshaped = arabic_reshaper.reshape(text)
    return get_display(reshaped)


# ── Font registration ─────────────────────────────────────────────────────────

_FONTS_DIR    = Path(__file__).parent / 'fonts'
_FONT_REGULAR = 'Amiri'
_FONT_BOLD    = 'Amiri-Bold'
_fonts_registered = False


def _register_fonts() -> tuple[str, str]:
    global _fonts_registered
    if _fonts_registered:
        return _FONT_REGULAR, _FONT_BOLD

    reg_path  = _FONTS_DIR / 'Amiri-Regular.ttf'
    bold_path = _FONTS_DIR / 'Amiri-Bold.ttf'

    # Fallback: walk /usr/share/fonts or /nix/store
    if not reg_path.exists():
        for sysdir in [Path('/usr/share/fonts'), Path('/nix/store')]:
            if sysdir.exists():
                hits = list(sysdir.rglob('Amiri-Regular.ttf'))
                if hits:
                    reg_path  = hits[0]
                    bold_path = hits[0].parent / 'Amiri-Bold.ttf'
                    break

    try:
        if reg_path.exists():
            pdfmetrics.registerFont(TTFont(_FONT_REGULAR, str(reg_path)))
        if bold_path.exists():
            pdfmetrics.registerFont(TTFont(_FONT_BOLD, str(bold_path)))
        pdfmetrics.getFont(_FONT_REGULAR)   # raises if not registered
        _fonts_registered = True
        return _FONT_REGULAR, _FONT_BOLD
    except Exception:
        return 'Helvetica', 'Helvetica-Bold'


# ── Cell value helpers ────────────────────────────────────────────────────────

def _cell_str(value: Any) -> str:
    """Convert an openpyxl cell value to a clean, noise-free string."""
    if value is None:
        return ''
    s = str(value).strip()
    # Drop Excel threaded-comment noise
    if _COMMENT_NOISE.search(s):
        return ''
    # Drop very long noise strings unlikely to be real cell data
    if len(s) > 500:
        return s[:500]
    return s


def _is_noise(row: list[str]) -> bool:
    """True if the entire row appears to be comment/noise rather than data."""
    joined = ' '.join(row)
    return bool(_COMMENT_NOISE.search(joined))


# ── Merged-cell expansion ────────────────────────────────────────────────────

def _expand_merged_cells(ws: openpyxl.worksheet.worksheet.Worksheet) -> dict[tuple[int,int], str]:
    """
    Build a (row, col) → value mapping that correctly handles merged cells.

    openpyxl stores only the top-left cell of a merged range with a value;
    every other cell in the range has value=None.  This function propagates
    the top-left value to all cells in the range so no data is lost.
    """
    value_map: dict[tuple[int,int], str] = {}

    # First pass: read every cell's own value
    for row in ws.iter_rows():
        for cell in row:
            value_map[(cell.row, cell.column)] = _cell_str(cell.value)

    # Second pass: propagate merged-cell values
    for merged_range in ws.merged_cells.ranges:
        # The top-left cell holds the real value
        origin_val = value_map.get((merged_range.min_row, merged_range.min_col), '')
        for row_idx in range(merged_range.min_row, merged_range.max_row + 1):
            for col_idx in range(merged_range.min_col, merged_range.max_col + 1):
                value_map[(row_idx, col_idx)] = origin_val

    return value_map


# ── Column width helpers ──────────────────────────────────────────────────────

def _excel_col_widths(ws: openpyxl.worksheet.worksheet.Worksheet, n_cols: int) -> list[float | None]:
    """
    Read explicit column widths from the worksheet (in character units).
    Returns a list length n_cols; None means "no explicit width set".
    """
    widths: list[float | None] = []
    for ci in range(1, n_cols + 1):
        col_letter = get_column_letter(ci)
        col_dim = ws.column_dimensions.get(col_letter)
        if col_dim and col_dim.width and col_dim.width > 0:
            widths.append(float(col_dim.width))
        else:
            widths.append(None)
    return widths


def _estimate_col_widths(
    rows: list[list[str]],
    available_w: float,
    font_size: int,
    excel_hints: list[float | None],
) -> list[float]:
    """
    Estimate reportlab column widths in points.

    Priority:
      1. Explicit width from the Excel column_dimensions (most accurate)
      2. Content-length estimate (Arabic chars are wider)
    Result widths always sum to exactly available_w.
    """
    if not rows or not rows[0]:
        return [available_w]

    n_cols   = max(len(r) for r in rows)
    char_pt  = font_size * 0.58
    ar_pt    = font_size * 0.72
    min_w    = font_size * 1.8
    padding  = 8  # 4pt each side

    raw: list[float] = []
    for ci in range(n_cols):
        # Excel hint first
        hint = excel_hints[ci] if ci < len(excel_hints) else None
        if hint is not None:
            # Excel width is in chars at ~7pt each (standard Calibri 11pt scale)
            raw.append(max(hint * 7.0, min_w))
            continue

        # Content-length estimate
        best = min_w
        for row in rows:
            if ci < len(row):
                cell = row[ci]
                chars = len(cell)
                w = (ar_pt if has_arabic(cell) else char_pt) * chars + padding
                if w > best:
                    best = w
        raw.append(best)

    total = sum(raw)
    if total <= 0:
        return [available_w / n_cols] * n_cols
    scale = available_w / total
    return [max(w * scale, min_w) for w in raw]


# ── Row-reading from worksheet ────────────────────────────────────────────────

def _read_sheet_rows(ws: openpyxl.worksheet.worksheet.Worksheet) -> list[list[str]]:
    """
    Read all non-empty rows from a worksheet, handling merged cells correctly.
    Threaded-comment noise rows are filtered out.
    """
    if ws.max_row is None or ws.max_column is None:
        return []

    value_map = _expand_merged_cells(ws)

    rows: list[list[str]] = []
    for ri in range(1, ws.max_row + 1):
        row = [value_map.get((ri, ci), '') for ci in range(1, ws.max_column + 1)]
        # Skip all-empty rows
        if not any(row):
            continue
        # Skip threaded-comment noise rows
        if _is_noise(row):
            continue
        rows.append(row)

    return rows


# ── Title / header separation ─────────────────────────────────────────────────

def _is_merged_title_row(row: list[str]) -> bool:
    """
    Return True if this row looks like a merged title:
    exactly one unique non-empty value (the rest are duplicates or empty).
    This matches patterns like:
      ['عنوان', '', '', '', ''] — one value, rest empty
      ['عنوان', 'عنوان', 'عنوان'] — all same value (merged expansion)
    """
    non_empty = [v for v in row if v.strip()]
    if not non_empty:
        return False
    return len(set(non_empty)) == 1


def _extract_titles(rows: list[list[str]]) -> tuple[list[str], list[list[str]]]:
    """
    Separate leading title/merged rows from the actual data table rows.
    Returns (title_texts, data_rows).

    We allow up to 5 consecutive merged title rows at the top.
    The first row that is NOT a merged title marks the start of the table.
    """
    titles: list[str] = []
    idx = 0
    while idx < min(len(rows), 5):
        row = rows[idx]
        if _is_merged_title_row(row):
            val = [v for v in row if v.strip()][0]
            titles.append(val)
            idx += 1
        else:
            break
    return titles, rows[idx:]


# ── Page-number footer ────────────────────────────────────────────────────────

class _NumberedCanvas(rl_canvas.Canvas):
    """Canvas subclass that draws page numbers in the footer."""

    def __init__(self, *args: Any, font_regular: str = 'Helvetica', **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._font_regular = font_regular
        self._saved_page_states: list[dict] = []

    def showPage(self) -> None:
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self) -> None:
        total = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_page_number(total)
            super().showPage()
        super().save()

    def _draw_page_number(self, total: int) -> None:
        try:
            self.setFont(self._font_regular, 8)
            self.setFillColor(colors.HexColor('#666666'))
            text = f'{self._pageNumber} / {total}'
            self.drawCentredString(self._pagesize[0] / 2, 6 * mm, text)
        except Exception:
            pass


# ── Paragraph style factory ───────────────────────────────────────────────────

def _make_styles(font_regular: str, font_bold: str, font_size: int) -> dict[str, ParagraphStyle]:
    fs = font_size
    return {
        'title': ParagraphStyle(
            'ArabicTitle',
            fontName=font_bold, fontSize=fs + 4,
            alignment=TA_CENTER, leading=(fs + 4) * 1.5,
            spaceAfter=2, wordWrap='RTL',
        ),
        'subtitle': ParagraphStyle(
            'ArabicSubtitle',
            fontName=font_bold, fontSize=fs + 2,
            alignment=TA_CENTER, leading=(fs + 2) * 1.4,
            spaceAfter=2, wordWrap='RTL',
        ),
        'hdr': ParagraphStyle(
            'ColHeader',
            fontName=font_bold, fontSize=fs,
            alignment=TA_CENTER, leading=fs * 1.3, wordWrap='RTL',
        ),
        'cell_ar': ParagraphStyle(
            'CellAr',
            fontName=font_regular, fontSize=fs,
            alignment=TA_RIGHT, leading=fs * 1.3, wordWrap='RTL',
        ),
        'cell_num': ParagraphStyle(
            'CellNum',
            fontName=font_regular, fontSize=fs,
            alignment=TA_CENTER, leading=fs * 1.3,
        ),
    }


# ── Main conversion ───────────────────────────────────────────────────────────

def excel_to_pdf(
    input_path: str,
    output_path: str,
    page_size: str = 'a4',
    orientation: str = 'landscape',
    font_size: int = 9,
) -> dict:
    """
    Convert an Excel (.xlsx) file to PDF with correct Arabic shaping.
    Returns {'success': True, 'pageCount': N, 'engine': '...'}.
    """
    font_regular, font_bold = _register_fonts()

    base_size = PAGE_SIZES.get(page_size, A4)
    if orientation == 'landscape':
        page_w, page_h = landscape(base_size)
    else:
        page_w, page_h = portrait(base_size)

    margin_h = 15 * mm     # horizontal margin
    margin_t = 15 * mm     # top margin
    margin_b = 18 * mm     # bottom margin (extra room for page number)
    available_w = page_w - 2 * margin_h

    styles = _make_styles(font_regular, font_bold, font_size)

    # Load workbook
    wb = openpyxl.load_workbook(input_path, data_only=True)

    # ── Build ReportLab story ──────────────────────────────────────────────
    story: list[Any] = []
    first_sheet = True

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]

        raw_rows = _read_sheet_rows(ws)
        if not raw_rows:
            continue

        if not first_sheet:
            story.append(PageBreak())
        first_sheet = False

        # ── Separate title rows from data ──────────────────────────────────
        title_texts, data_rows = _extract_titles(raw_rows)

        # Render titles
        title_flowables: list[Any] = []
        for i, t in enumerate(title_texts):
            shaped_t = shape_arabic(t) if has_arabic(t) else t
            st_key = 'title' if i == 0 else 'subtitle'
            title_flowables.append(Paragraph(shaped_t, styles[st_key]))
        if title_flowables:
            title_flowables.append(Spacer(1, 3))
            story.extend(title_flowables)

        if not data_rows:
            continue

        # ── Normalize column count ─────────────────────────────────────────
        n_cols = max(len(r) for r in data_rows)
        normed: list[list[str]] = [
            (list(r) + [''] * n_cols)[:n_cols] for r in data_rows
        ]

        # ── Shape Arabic in every cell ─────────────────────────────────────
        shaped_rows: list[list[str]] = []
        for row in normed:
            shaped_rows.append([
                shape_arabic(cell) if cell and has_arabic(cell) else cell
                for cell in row
            ])

        # ── Column widths ─────────────────────────────────────────────────
        excel_hints = _excel_col_widths(ws, n_cols)
        col_widths  = _estimate_col_widths(shaped_rows, available_w, font_size, excel_hints)

        # ── Build Paragraph cells ─────────────────────────────────────────
        # Row 0 of data_rows is the column header row
        para_rows: list[list[Paragraph]] = []
        for ri, row in enumerate(shaped_rows):
            para_row: list[Paragraph] = []
            is_header = (ri == 0)
            for text in row:
                if is_header:
                    st = styles['hdr']
                elif has_arabic(text):
                    st = styles['cell_ar']
                else:
                    st = styles['cell_num']
                para_row.append(Paragraph(text, st))
            para_rows.append(para_row)

        # ── Table style ───────────────────────────────────────────────────
        n_rows = len(para_rows)
        ts = TableStyle([
            # Header
            ('BACKGROUND',    (0, 0), (-1, 0), colors.HexColor('#2C3E50')),
            ('TEXTCOLOR',     (0, 0), (-1, 0), colors.white),
            ('FONTNAME',      (0, 0), (-1, 0), font_bold),
            ('ALIGN',         (0, 0), (-1, 0), 'CENTER'),
            # All cells
            ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTSIZE',      (0, 0), (-1, -1), font_size),
            ('TOPPADDING',    (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING',   (0, 0), (-1, -1), 4),
            ('RIGHTPADDING',  (0, 0), (-1, -1), 4),
            # Alternating backgrounds (data rows only)
            ('ROWBACKGROUNDS', (0, 1), (-1, -1),
             [colors.white, colors.HexColor('#F5F5F5')]),
            # Grid
            ('GRID',          (0, 0), (-1, -1), 0.4, colors.HexColor('#CCCCCC')),
            ('LINEBELOW',     (0, 0), (-1, 0),  1.0, colors.HexColor('#2C3E50')),
            # Prevent rows splitting across pages
            ('NOSPLIT',       (0, 0), (-1, -1)),
        ])

        tbl = Table(
            para_rows,
            colWidths=col_widths,
            repeatRows=1,          # header repeats on every page
            splitByRow=0,          # never cut a data row across two pages
        )
        tbl.setStyle(ts)
        story.append(tbl)

    # ── Build document ─────────────────────────────────────────────────────
    frame = Frame(
        margin_h, margin_b,
        page_w - 2 * margin_h,
        page_h - margin_t - margin_b,
        id='main',
    )
    page_template = PageTemplate(id='main', frames=[frame])
    doc = BaseDocTemplate(
        output_path,
        pagesize=(page_w, page_h),
        pageTemplates=[page_template],
    )

    # Build with numbered-canvas so page X / Y appears in footer
    doc.build(
        story,
        canvasmaker=lambda *a, **kw: _NumberedCanvas(
            *a, font_regular=font_regular, **kw
        ),
    )

    # Count pages
    page_count = 1
    try:
        with open(output_path, 'rb') as f:
            data = f.read()
        # Count /Type /Page objects (more reliable than string search)
        page_count = max(
            data.count(b'/Type/Page'),
            data.count(b'/Type /Page'),
            1,
        )
    except Exception:
        pass

    return {'success': True, 'pageCount': page_count, 'engine': 'python-arabic-reshaper'}


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description='Excel → PDF (Arabic-ready)')
    parser.add_argument('input',  help='Input .xlsx file')
    parser.add_argument('output', help='Output .pdf file')
    parser.add_argument('--page-size',   default='a4',        choices=['a4', 'letter', 'legal'])
    parser.add_argument('--orientation', default='landscape',  choices=['portrait', 'landscape'])
    parser.add_argument('--font-size',   default=9, type=int)
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(json.dumps({'success': False, 'error': f'File not found: {args.input}'}))
        sys.exit(1)

    try:
        result = excel_to_pdf(
            args.input, args.output,
            page_size=args.page_size,
            orientation=args.orientation,
            font_size=args.font_size,
        )
        print(json.dumps(result))
    except Exception as exc:
        import traceback
        print(json.dumps({
            'success': False,
            'error': str(exc),
            'traceback': traceback.format_exc(),
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()
