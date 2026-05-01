FROM node:24-bookworm-slim

# Install system dependencies: Ghostscript + qpdf for real PDF processing
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
    # tesseract OCR
    tesseract-ocr \
    libtesseract-dev \
  && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

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

# Build Next.js production bundle
RUN pnpm --filter @workspace/web-toolify run build

# Validate CLI tools are available
RUN gs --version && qpdf --version

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
