FROM node:24-bookworm-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ghostscript \
    qpdf \
    libuuid1 \
    # canvas (node-canvas) native module build deps
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    build-essential \
    python3 \
    python3-pip \
    python3-dev \
    # tesseract OCR + Arabic language pack
    tesseract-ocr \
    tesseract-ocr-ara \
    tesseract-ocr-eng \
    libtesseract-dev \
    # poppler-utils: pdftoppm needed by pdf2image for OCR path
    poppler-utils \
    # libgl for opencv-python-headless
    libgl1 \
    libglib2.0-0 \
    # LibreOffice headless for PPT/PPTX → PDF and Word/Excel → PDF
    libreoffice-impress \
    libreoffice-writer \
    libreoffice-calc \
    # Fonts for accurate rendering of Office documents
    fonts-liberation \
    fonts-dejavu-core \
    fontconfig \
    curl \
  && fc-cache -fv \
  && rm -rf /var/lib/apt/lists/*

# Install Python packages required by the Excel→PDF and PDF→Excel engines
COPY requirements.txt ./
RUN pip3 install --break-system-packages \
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

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Copy workspace config and lockfile first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY tsconfig.base.json tsconfig.json ./

# Copy all package manifests (without source) so pnpm can resolve the graph
COPY lib/db/package.json                  ./lib/db/package.json
COPY lib/api-spec/package.json            ./lib/api-spec/package.json
COPY lib/api-zod/package.json             ./lib/api-zod/package.json
COPY lib/api-client-react/package.json    ./lib/api-client-react/package.json
COPY artifacts/web-toolify/package.json   ./artifacts/web-toolify/package.json
COPY artifacts/api-server/package.json    ./artifacts/api-server/package.json

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy the full source
COPY . .

# Confirm Python processing scripts are present in their expected runtime locations
RUN test -f /app/artifacts/web-toolify/lib/processing/excel_to_pdf.py \
    && echo "excel_to_pdf.py: OK" \
    || (echo "ERROR: excel_to_pdf.py missing!" && exit 1)
RUN test -f /app/pdf_table_extractor.py \
    && echo "pdf_table_extractor.py: OK" \
    || (echo "ERROR: pdf_table_extractor.py missing!" && exit 1)

# Build Next.js production bundle
RUN pnpm --filter @workspace/web-toolify run build

# Validate CLI tools are available
RUN gs --version && qpdf --version && soffice --version

# Railway injects PORT at runtime; Next.js production default is 3000
ENV NODE_ENV=production \
    PORT=3000 \
    # Give libuv enough threads for concurrent sharp/canvas work
    UV_THREADPOOL_SIZE=16 \
    # pdfjs-dist needs this set to avoid worker spawn attempts in Node
    NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

WORKDIR /app/artifacts/web-toolify

CMD ["pnpm", "start"]
