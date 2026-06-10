#!/usr/bin/env python3
"""
Pre-warm Python module imports so the first real conversion request
doesn't pay the cold-start import cost (pdf2docx alone takes 5-10s).
Run once at server startup — exits immediately after imports.
"""
import sys

def warmup():
    try:
        import fitz          # PyMuPDF (bundled with pdf2docx)
        from pdf2docx import Converter
        print("WARMUP:OK", flush=True)
    except Exception as e:
        print(f"WARMUP:SKIP:{e}", flush=True)

if __name__ == "__main__":
    warmup()
    sys.exit(0)
