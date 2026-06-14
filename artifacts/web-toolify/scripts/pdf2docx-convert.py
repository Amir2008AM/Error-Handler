#!/usr/bin/env python3
"""
PDF → DOCX conversion using pdf2docx 0.5.x.

Pure conversion — no post-processing, no image manipulation.

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

    src = sys.argv[1]
    dst = sys.argv[2]

    if not os.path.exists(src):
        print(f"ERROR: input not found: {src}", file=sys.stderr)
        sys.exit(1)

    try:
        from pdf2docx import Converter
    except ImportError as e:
        print(f"ERROR: pdf2docx not installed: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        cv = Converter(src)
        cv.convert(dst, start=0, end=None)
        cv.close()
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr, flush=True)
        sys.exit(1)

    if not os.path.exists(dst):
        print("ERROR: output file was not created", file=sys.stderr)
        sys.exit(1)

    size = os.path.getsize(dst)
    if size < 100:
        print(f"ERROR: output file too small ({size} bytes)", file=sys.stderr)
        sys.exit(1)

    print(f"OK:{dst}", flush=True)
    sys.exit(0)


if __name__ == "__main__":
    main()
