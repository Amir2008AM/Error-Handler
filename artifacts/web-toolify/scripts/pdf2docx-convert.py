#!/usr/bin/env python3
"""
Fast PDF → DOCX conversion using pdf2docx (pure Python, no LibreOffice).
After conversion, embedded images are re-compressed with Pillow to prevent
the output DOCX from being 3-4× larger than the source PDF.

Usage:
  python3 pdf2docx-convert.py <src.pdf> <out.docx>

Exit codes:
  0  success
  1  conversion error
"""
import sys
import os
import zipfile
import io
import shutil
import tempfile


def compress_docx_images(docx_path: str, quality: int = 82) -> int:
    """
    Re-compress all JPEG/PNG images inside a DOCX (which is a ZIP file).
    Returns bytes saved (negative means it grew, which shouldn't happen).
    """
    try:
        from PIL import Image
    except ImportError:
        return 0  # Pillow not available — skip silently

    original_size = os.path.getsize(docx_path)
    tmp_path = docx_path + ".tmp"

    try:
        with zipfile.ZipFile(docx_path, 'r') as zin, \
             zipfile.ZipFile(tmp_path, 'w', compression=zipfile.ZIP_DEFLATED) as zout:

            for item in zin.infolist():
                data = zin.read(item.filename)
                name_lower = item.filename.lower()

                is_image = name_lower.startswith('word/media/') and any(
                    name_lower.endswith(ext) for ext in ('.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif')
                )

                if is_image:
                    try:
                        img = Image.open(io.BytesIO(data))

                        # Downscale very large images (>2400px on longest side)
                        max_dim = 2400
                        w, h = img.size
                        if max(w, h) > max_dim:
                            scale = max_dim / max(w, h)
                            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

                        buf = io.BytesIO()
                        if name_lower.endswith('.png'):
                            # Convert PNG to JPEG if it has no transparency
                            if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                                img.save(buf, format='PNG', optimize=True)
                                item.filename = item.filename  # keep .png
                            else:
                                img = img.convert('RGB')
                                img.save(buf, format='JPEG', quality=quality, optimize=True)
                                item.filename = item.filename[:-4] + '.jpg'
                        else:
                            img = img.convert('RGB')
                            img.save(buf, format='JPEG', quality=quality, optimize=True)

                        compressed = buf.getvalue()
                        # Only use the compressed version if it's actually smaller
                        data = compressed if len(compressed) < len(data) else data
                    except Exception:
                        pass  # Keep original data if compression fails

                zout.writestr(item, data)

        new_size = os.path.getsize(tmp_path)
        os.replace(tmp_path, docx_path)
        return original_size - new_size

    except Exception:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        return 0


def convert(src: str, dst: str) -> None:
    from pdf2docx import Converter
    import fitz  # PyMuPDF comes with pdf2docx

    doc = fitz.open(src)
    page_count = doc.page_count
    doc.close()

    cv = Converter(src)
    try:
        if page_count > 20:
            try:
                cv.convert(dst, start=0, end=None, multi_processing=True, cpu_count=4)
            except TypeError:
                cv.convert(dst, start=0, end=None)
        else:
            cv.convert(dst, start=0, end=None)
    finally:
        cv.close()


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
        convert(src, dst)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr, flush=True)
        sys.exit(1)

    size = os.path.getsize(dst) if os.path.exists(dst) else 0
    if size < 100:
        print("ERROR: output file too small", file=sys.stderr)
        sys.exit(1)

    # Post-process: re-compress embedded images to shrink DOCX size
    saved = compress_docx_images(dst, quality=82)
    if saved > 0:
        print(f"[compress] saved {saved // 1024} KB by re-compressing images", file=sys.stderr)

    print(f"OK:{dst}", flush=True)
    sys.exit(0)


if __name__ == "__main__":
    main()
