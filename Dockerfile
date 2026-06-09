# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim

# ── System packages ────────────────────────────────────────────────────────────
# Cache mount keeps apt lists + downloaded .deb files between builds.
# After the first build these layers are served from cache — no re-download.
RUN --mount=type=cache,id=s/${RAILWAY_SERVICE_ID}-apt-cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=s/${RAILWAY_SERVICE_ID}-apt-lists,target=/var/lib/apt/lists,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
      ghostscript \
      qpdf \
      libuuid1 \
      libcairo2-dev \
      libpango1.0-dev \
      libjpeg-dev \
      libgif-dev \
      librsvg2-dev \
      build-essential \
      python3 \
      python3-pip \
      python3-dev \
      tesseract-ocr \
      tesseract-ocr-ara \
      tesseract-ocr-eng \
      libtesseract-dev \
      poppler-utils \
      libgl1 \
      libglib2.0-0 \
      libreoffice-impress \
      libreoffice-writer \
      libreoffice-calc \
      fonts-liberation \
      fonts-dejavu-core \
      fontconfig \
      curl \
    && fc-cache -fv

# ── Python packages ────────────────────────────────────────────────────────────
# pip cache mount avoids re-downloading wheels that haven't changed.
RUN --mount=type=cache,id=s/${RAILWAY_SERVICE_ID}-pip,target=/root/.cache/pip \
    pip3 install --break-system-packages \
      arabic-reshaper==3.0.0 \
      python-bidi==0.4.2 \
      "reportlab>=4.0.0" \
      "openpyxl>=3.1.0" \
      "Pillow>=10.0.0" \
      pdfplumber \
      numpy \
      pandas \
      pdf2image \
      pytesseract \
      "opencv-python-headless>=4.8.0" \
      "camelot-py[cv]" \
    && python3 -c "import arabic_reshaper, bidi, reportlab, openpyxl, \
       pdfplumber, numpy, pandas, pdf2image, pytesseract, cv2, camelot; \
       print('PYTHON PACKAGES VERIFIED OK')"

# ── pnpm ───────────────────────────────────────────────────────────────────────
RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# ── Dependency manifests only (change rarely → stable cached layer) ────────────
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY tsconfig.base.json tsconfig.json ./

COPY lib/db/package.json                  ./lib/db/package.json
COPY lib/api-spec/package.json            ./lib/api-spec/package.json
COPY lib/api-zod/package.json             ./lib/api-zod/package.json
COPY lib/api-client-react/package.json    ./lib/api-client-react/package.json
COPY artifacts/web-toolify/package.json   ./artifacts/web-toolify/package.json
COPY artifacts/api-server/package.json    ./artifacts/api-server/package.json

# ── Node modules ───────────────────────────────────────────────────────────────
# pnpm store cache mount: packages are fetched once and reused across builds.
# The layer itself is still rebuilt when lockfile changes, but download is free.
RUN --mount=type=cache,id=s/${RAILWAY_SERVICE_ID}-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ── Full source ────────────────────────────────────────────────────────────────
COPY . .

# ── Sanity-check Python scripts ───────────────────────────────────────────────
RUN test -f /app/artifacts/web-toolify/lib/processing/excel_to_pdf.py \
    && echo "excel_to_pdf.py: OK" \
    || (echo "ERROR: excel_to_pdf.py missing!" && exit 1)
RUN test -f /app/pdf_table_extractor.py \
    && echo "pdf_table_extractor.py: OK" \
    || (echo "ERROR: pdf_table_extractor.py missing!" && exit 1)

# ── Next.js production build ───────────────────────────────────────────────────
# .next/cache mount preserves Turbopack's incremental compilation cache.
# Unchanged pages are not recompiled — huge win on repeated deploys.
RUN --mount=type=cache,id=s/${RAILWAY_SERVICE_ID}-nextjs-cache,target=/app/artifacts/web-toolify/.next/cache \
    pnpm --filter @workspace/web-toolify run build

# ── Validate CLI tools ─────────────────────────────────────────────────────────
RUN gs --version && qpdf --version && soffice --version

ENV NODE_ENV=production \
    PORT=3000 \
    UV_THREADPOOL_SIZE=16 \
    NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

WORKDIR /app/artifacts/web-toolify

CMD ["pnpm", "start"]
