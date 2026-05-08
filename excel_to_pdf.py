"""
Excel → PDF converter with proper Arabic text shaping.

Matches ilovepdf.com output quality:
  - Arabic text reshaped to Presentation Forms (connected glyphs)
  - RTL layout with correct word/cell ordering
  - Amiri font embedded (same family as TimesNewRomanPS Arabic)
  - Proper table borders and column sizing
  - Landscape A4 by default (matches the source Excel layout)

Usage:
    python3 excel_to_pdf.py <input.xlsx> <output.pdf> [options]

Options:
    --page-size   a4 | letter | legal        (default: a4)
    --orientation portrait | landscape       (default: landscape)
    --font-size   <int>                      (default: 9)
"""

from __future__ import annotations

import sys
import os
import re
import json
import argparse
import unicodedata
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
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

# ── Arabic detection ──────────────────────────────────────────────────────────

_AR_RE = re.compile(r'[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]')

def has_arabic(text: str) -> bool:
    return bool(_AR_RE.search(text))


def shape_arabic(text: str) -> str:
    """
    Convert logical-order Unicode Arabic to display-order Presentation Forms,
    exactly as ilovepdf does.  Non-Arabic strings pass through unchanged.
    """
    if not text or not has_arabic(text):
        return text
    # arabic_reshaper handles the glyph shaping (logical → presentation forms)
    # bidi.get_display handles the visual reordering (RTL word order)
    reshaped = arabic_reshaper.reshape(text)
    return get_display(reshaped)


# ── Font registration ─────────────────────────────────────────────────────────

_FONTS_DIR = Path(__file__).parent / 'fonts'

_FONT_REGULAR = 'Amiri'
_FONT_BOLD    = 'Amiri-Bold'

def _register_fonts() -> tuple[str, str]:
    """Register Amiri fonts and return (regular_name, bold_name)."""
    reg_path  = _FONTS_DIR / 'Amiri-Regular.ttf'
    bold_path = _FONTS_DIR / 'Amiri-Bold.ttf'

    if not reg_path.exists() or not bold_path.exists():
        # Fallback: try system paths
        for sysdir in [Path('/usr/share/fonts'), Path('/nix/store')]:
            hits = list(sysdir.rglob('Amiri-Regular.ttf')) if sysdir.exists() else []
            if hits:
                reg_path  = hits[0]
                bold_path = hits[0].parent / 'Amiri-Bold.ttf'
                break

    if reg_path.exists():
        pdfmetrics.registerFont(TTFont(_FONT_REGULAR, str(reg_path)))
    if bold_path.exists():
        pdfmetrics.registerFont(TTFont(_FONT_BOLD, str(bold_path)))

    # Verify registration
    try:
        pdfmetrics.getFont(_FONT_REGULAR)
        return _FONT_REGULAR, _FONT_BOLD if bold_path.exists() else _FONT_REGULAR
    except Exception:
        return 'Helvetica', 'Helvetica-Bold'


# ── Cell value helpers ────────────────────────────────────────────────────────

def cell_to_str(value: Any) -> str:
    """Convert an openpyxl cell value to a clean string."""
    if value is None:
        return ''
    if isinstance(value, float):
        if value == int(value):
            return str(int(value))
        return str(value)
    return str(value).strip()


def is_rtl_cell(text: str) -> bool:
    """True if the cell should be aligned right-to-left."""
    return has_arabic(text)


# ── Column width calculation ──────────────────────────────────────────────────

def estimate_col_widths(rows: list[list[str]], available_w: float, font_size: int) -> list[float]:
    """
    Estimate column widths based on content length.
    Arabic cells are wider per character because Amiri glyphs are wider.
    Result widths sum to <= available_w.
    """
    if not rows or not rows[0]:
        return [available_w]

    n_cols = max(len(r) for r in rows)
    char_px = font_size * 0.55   # approx points per char for Latin
    ar_px   = font_size * 0.70   # approx points per char for Arabic (wider)
    min_col = font_size * 2

    raw = [min_col] * n_cols
    for row in rows:
        for ci, cell in enumerate(row):
            if ci >= n_cols:
                break
            chars = len(cell)
            w = ar_px * chars if has_arabic(cell) else char_px * chars
            w = max(w, min_col) + 8   # 4pt padding each side
            if w > raw[ci]:
                raw[ci] = w

    total = sum(raw)
    if total <= available_w:
        return raw
    scale = available_w / total
    return [max(w * scale, min_col) for w in raw]


# ── Main conversion ───────────────────────────────────────────────────────────

PAGE_SIZES = {
    'a4':     A4,
    'letter': LETTER,
    'legal':  LEGAL,
}


def excel_to_pdf(
    input_path: str,
    output_path: str,
    page_size: str = 'a4',
    orientation: str = 'landscape',
    font_size: int = 9,
) -> dict:
    """
    Convert an Excel file to PDF with proper Arabic shaping.
    Returns a dict with { success, pageCount, engine }.
    """
    font_regular, font_bold = _register_fonts()

    base_size = PAGE_SIZES.get(page_size, A4)
    if orientation == 'landscape':
        page_w, page_h = landscape(base_size)
    else:
        page_w, page_h = portrait(base_size)

    margin = 15 * mm
    available_w = page_w - 2 * margin
    available_h = page_h - 2 * margin

    # Load workbook
    wb = openpyxl.load_workbook(input_path, data_only=True)

    # Build story (list of reportlab flowables)
    story: list[Any] = []
    styles = getSampleStyleSheet()

    # Arabic paragraph style (RTL, Amiri)
    ar_style = ParagraphStyle(
        'Arabic',
        fontName=font_bold,
        fontSize=font_size + 1,
        alignment=TA_RIGHT,
        wordWrap='RTL',
        leading=font_size * 1.4,
    )
    # Title style
    title_style = ParagraphStyle(
        'ArabicTitle',
        fontName=font_bold,
        fontSize=font_size + 3,
        alignment=TA_CENTER,
        wordWrap='RTL',
        leading=(font_size + 3) * 1.4,
        spaceAfter=6,
    )
    # Normal cell style
    cell_style = ParagraphStyle(
        'Cell',
        fontName=font_regular,
        fontSize=font_size,
        alignment=TA_CENTER,
        leading=font_size * 1.3,
    )
    ar_cell_style = ParagraphStyle(
        'ArabicCell',
        fontName=font_regular,
        fontSize=font_size,
        alignment=TA_RIGHT,
        wordWrap='RTL',
        leading=font_size * 1.3,
    )

    first_sheet = True
    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]

        if ws.max_row == 0 or ws.max_column == 0:
            continue

        if not first_sheet:
            story.append(PageBreak())
        first_sheet = False

        # Read all rows
        raw_rows: list[list[str]] = []
        for row in ws.iter_rows(values_only=True):
            str_row = [cell_to_str(v) for v in row]
            # Skip completely empty rows
            if any(s for s in str_row):
                raw_rows.append(str_row)

        if not raw_rows:
            continue

        # Detect if first row is a merged-cell title (all values same or mostly empty)
        title_text = ''
        table_rows = raw_rows
        if len(raw_rows) > 1:
            first = raw_rows[0]
            non_empty = [v for v in first if v]
            if len(non_empty) == 1 or (len(non_empty) > 0 and len(set(non_empty)) == 1):
                raw_title = non_empty[0]
                title_text = shape_arabic(raw_title) if has_arabic(raw_title) else raw_title
                table_rows = raw_rows[1:]

        # Detect sub-title row (second merged row)
        sub_title_text = ''
        if title_text and len(table_rows) > 1:
            first = table_rows[0]
            non_empty = [v for v in first if v]
            if len(non_empty) == 1 or (len(non_empty) > 0 and len(set(non_empty)) == 1):
                raw_sub = non_empty[0]
                sub_title_text = shape_arabic(raw_sub) if has_arabic(raw_sub) else raw_sub
                table_rows = table_rows[1:]

        if title_text:
            story.append(Paragraph(title_text, title_style))
        if sub_title_text:
            story.append(Paragraph(sub_title_text, ar_style))
        if title_text or sub_title_text:
            story.append(Spacer(1, 4))

        if not table_rows:
            continue

        # Normalize column count
        n_cols = max(len(r) for r in table_rows)
        normed: list[list[str]] = []
        for r in table_rows:
            padded = list(r) + [''] * (n_cols - len(r))
            normed.append(padded[:n_cols])

        # Shape Arabic in every cell
        shaped: list[list[str]] = []
        for r in normed:
            shaped_row = []
            for cell in r:
                if cell and has_arabic(cell):
                    shaped_row.append(shape_arabic(cell))
                else:
                    shaped_row.append(cell)
            shaped.append(shaped_row)

        # Column widths
        col_widths = estimate_col_widths(shaped, available_w, font_size)

        # Build Paragraph objects for each cell
        para_rows: list[list[Paragraph]] = []
        for ri, row in enumerate(shaped):
            para_row = []
            is_header = ri == 0
            for ci, text in enumerate(row):
                if is_header:
                    st = ParagraphStyle(
                        f'Hdr{ci}',
                        fontName=font_bold,
                        fontSize=font_size,
                        alignment=TA_CENTER,
                        wordWrap='RTL' if has_arabic(text) else 'LTR',
                        leading=font_size * 1.3,
                    )
                else:
                    st = ar_cell_style if has_arabic(text) else cell_style

                para_row.append(Paragraph(text, st))
            para_rows.append(para_row)

        # Build table
        tbl = Table(para_rows, colWidths=col_widths, repeatRows=1)

        # Table style — matches ilovepdf visual appearance
        ts = TableStyle([
            # Header row: dark background, white text
            ('BACKGROUND',  (0, 0), (-1, 0), colors.HexColor('#2C3E50')),
            ('TEXTCOLOR',   (0, 0), (-1, 0), colors.white),
            ('FONTNAME',    (0, 0), (-1, 0), font_bold),
            ('FONTSIZE',    (0, 0), (-1, 0), font_size),
            ('ALIGN',       (0, 0), (-1, 0), 'CENTER'),
            ('VALIGN',      (0, 0), (-1, -1), 'MIDDLE'),
            # Alternating row backgrounds
            ('ROWBACKGROUNDS', (0, 1), (-1, -1),
             [colors.white, colors.HexColor('#F2F2F2')]),
            # Grid lines
            ('GRID',        (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
            ('LINEBELOW',   (0, 0), (-1, 0),  1.0, colors.HexColor('#2C3E50')),
            # Cell padding
            ('TOPPADDING',  (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING',(0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING',(0, 0), (-1, -1), 4),
        ])
        tbl.setStyle(ts)
        story.append(tbl)

    # Build PDF
    doc = SimpleDocTemplate(
        output_path,
        pagesize=(page_w, page_h),
        rightMargin=margin,
        leftMargin=margin,
        topMargin=margin,
        bottomMargin=margin,
    )
    doc.build(story)

    # Count pages in produced PDF
    page_count = 1
    try:
        with open(output_path, 'rb') as f:
            content = f.read()
        page_count = content.count(b'/Type /Page\n') or content.count(b'/Type/Page') or 1
    except Exception:
        pass

    return {'success': True, 'pageCount': page_count, 'engine': 'python-arabic-reshaper'}


# ── CLI entry point ───────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Excel → PDF with Arabic shaping')
    parser.add_argument('input',  help='Input .xlsx / .xls / .csv file')
    parser.add_argument('output', help='Output .pdf file')
    parser.add_argument('--page-size',   default='a4',       choices=['a4', 'letter', 'legal'])
    parser.add_argument('--orientation', default='landscape', choices=['portrait', 'landscape'])
    parser.add_argument('--font-size',   default=9, type=int)
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(json.dumps({'success': False, 'error': f'Input file not found: {args.input}'}))
        sys.exit(1)

    try:
        result = excel_to_pdf(
            args.input,
            args.output,
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
