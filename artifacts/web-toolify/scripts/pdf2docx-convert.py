#!/usr/bin/env python3
"""
Fast PDF → DOCX conversion using pdf2docx (pure Python, no LibreOffice).

Usage:
  python3 pdf2docx-convert.py <src.pdf> <out.docx>

Exit codes:
  0  success
  1  conversion error
"""
import sys
import os

def main():
    if len(sys.argv) < 3:
        print("Usage: pdf2docx-convert.py <src.pdf> <out.docx>", file=sys.stderr)
        sys.exit(1)

    src  = sys.argv[1]
    dst  = sys.argv[2]

    if not os.path.exists(src):
        print(f"ERROR: input not found: {src}", file=sys.stderr)
        sys.exit(1)

    try:
        from pdf2docx import Converter
        import fitz  # PyMuPDF comes with pdf2docx

        # Count pages to decide on multi-processing
        doc = fitz.open(src)
        page_count = doc.page_count
        doc.close()

        cv = Converter(src)
        # Enable multi-processing for large documents (>20 pages)
        if page_count > 20:
            cv.convert(dst, start=0, end=None, multi_processing=True, cpu_count=4)
        else:
            cv.convert(dst, start=0, end=None)
        cv.close()

        size = os.path.getsize(dst) if os.path.exists(dst) else 0
        if size < 100:
            print("ERROR: output file too small", file=sys.stderr)
            sys.exit(1)
        print(f"OK:{dst}", flush=True)
        sys.exit(0)
    except TypeError:
        # Older pdf2docx without multi_processing param — fall back
        try:
            from pdf2docx import Converter as CV2
            cv2 = CV2(src)
            cv2.convert(dst, start=0, end=None)
            cv2.close()
            size = os.path.getsize(dst) if os.path.exists(dst) else 0
            if size < 100:
                print("ERROR: output file too small", file=sys.stderr)
                sys.exit(1)
            print(f"OK:{dst}", flush=True)
            sys.exit(0)
        except Exception as e2:
            print(f"ERROR: {e2}", file=sys.stderr, flush=True)
            sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr, flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
