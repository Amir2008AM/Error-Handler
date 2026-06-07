#!/usr/bin/env python3
"""
Persistent-UNO LibreOffice converter.

Usage:
  python3 uno-convert.py <src_path> <out_path> <out_format> [port]

  src_path   -- absolute path to the input file
  out_path   -- absolute path where the output should be written
  out_format -- target extension without dot: docx | pptx | pdf | xlsx
  port       -- UNO socket port (default 2002)

Exit codes:
  0  success
  1  UNO connection failed (caller should fall back to soffice --convert-to)
  2  conversion error
"""

import sys
import os
import time

LO_PROG = "/nix/store/jv4c3vagnjcs8yb40izszdxfh8hr94k6-libreoffice-25.2.3.2/lib/libreoffice/program"

sys.path.insert(0, LO_PROG)
os.environ.setdefault('LD_LIBRARY_PATH', LO_PROG)
if LO_PROG not in os.environ.get('LD_LIBRARY_PATH', ''):
    os.environ['LD_LIBRARY_PATH'] = LO_PROG + ':' + os.environ.get('LD_LIBRARY_PATH', '')

FILTER_MAP = {
    'docx': 'MS Word 2007 XML',
    'doc':  'MS Word 97',
    'pptx': 'Impress MS PowerPoint 2007 XML',
    'ppt':  'MS PowerPoint 97',
    'pdf':  'writer_pdf_Export',
    'xlsx': 'Calc MS Excel 2007 XML',
    'xls':  'MS Excel 97',
    'txt':  'Text',
    'html': 'HTML (StarWriter)',
    'odt':  'writer8',
}

def make_property(name, value):
    from com.sun.star.beans import PropertyValue
    p = PropertyValue()
    p.Name = name
    p.Value = value
    return p

def connect(port, retries=2):
    import uno
    local_ctx = uno.getComponentContext()
    resolver = local_ctx.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local_ctx)
    url = f"uno:socket,host=localhost,port={port};urp;StarOffice.ComponentContext"
    for i in range(retries):
        try:
            return resolver.resolve(url)
        except Exception:
            if i < retries - 1:
                time.sleep(0.3)
    return None

def convert(src, dst, fmt, port):
    import uno
    ctx = connect(port)
    if ctx is None:
        print("UNO_CONNECT_FAILED", flush=True)
        sys.exit(1)

    smgr = ctx.ServiceManager
    desktop = smgr.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)

    src_url = uno.systemPathToFileUrl(os.path.abspath(src))
    dst_url = uno.systemPathToFileUrl(os.path.abspath(dst))

    load_props = (
        make_property("Hidden", True),
        make_property("MacroExecutionMode", 0),
        make_property("ReadOnly", False),
    )

    doc = desktop.loadComponentFromURL(src_url, "_blank", 0, load_props)
    if doc is None:
        print(f"Failed to load: {src}", file=sys.stderr, flush=True)
        sys.exit(2)

    filter_name = FILTER_MAP.get(fmt, fmt)
    store_props = (
        make_property("FilterName", filter_name),
        make_property("Overwrite", True),
    )

    try:
        doc.storeToURL(dst_url, store_props)
    finally:
        try:
            doc.close(True)
        except Exception:
            pass

    print(f"OK:{dst}", flush=True)
    sys.exit(0)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: uno-convert.py <src> <dst> <format> [port]", file=sys.stderr)
        sys.exit(2)

    src_path  = sys.argv[1]
    out_path  = sys.argv[2]
    out_fmt   = sys.argv[3].lower()
    lo_port   = int(sys.argv[4]) if len(sys.argv) > 4 else 2002

    try:
        convert(src_path, out_path, out_fmt, lo_port)
    except SystemExit:
        raise
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr, flush=True)
        sys.exit(2)
