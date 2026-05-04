# Web-Toolify

A Next.js 16.2 monorepo (pnpm workspaces) providing free online PDF, image, OCR, and document processing tools.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| Runtime | Node.js v24, React 19 |
| Styling | Tailwind CSS 4 |
| Package manager | pnpm workspaces |
| PDF engines | Ghostscript 10 + qpdf 11 + pdf-lib 1.17 + pdfjs-dist 5 |
| Image engine | Sharp 0.33 |
| OCR engine | Tesseract 5 (native binary, LSTM oem 1) |
| Document engine | LibreOffice (via system binary) |
| Monorepo root | `/home/runner/workspace` |
| App root | `artifacts/web-toolify/` |

## Architecture

### Processing Pipeline

```
User Upload → Direct API Route → Engine → Store → Download
                    ↕
              Job Queue API → In-Memory Queue → Worker → Engine → Store → Poll Result
```

All heavy operations can go through either:
1. **Direct API routes** (`/api/compress-pdf`, `/api/ocr/image`, etc.) — synchronous, returns result immediately
2. **Job queue** (`POST /api/jobs/create`, `GET /api/jobs/[id]`) — async, fire-and-forget with polling

### Queue System (`lib/queue/`)

- **Backend**: In-memory (`JobManager`) — no Redis required for single-server deploy
- **Concurrency**: Max 3 simultaneous jobs, configurable via `DEFAULT_QUEUE_CONFIG`
- **Timeouts**: Per-operation (`TIMEOUTS` in `lib/processing/timeout.ts`), per-job 5-minute overall cap
- **Retries**: Up to 2 automatic retries with 1s/2s exponential backoff
- **TTL**: 10 minutes per job; completed files stored 20 minutes in temp storage
- **Cleanup**: Automatic per-minute sweep of expired jobs and files

**Redis/BullMQ upgrade path**: See `lib/queue/adapter.ts` for the `QueueBackend` interface and BullMQ scaffold. Set `REDIS_URL` env var + implement `BullMQBackend` to enable distributed queue.

### Job Types Covered (25 total)

| Worker Group | Job Types |
|---|---|
| PDF | merge, split, rotate, compress, watermark, add-page-numbers, organize, image-to-pdf, repair, delete-pages, extract-pages |
| PDF Security | protect, unlock, sign |
| PDF Convert | pdf-to-jpg, pdf-to-word |
| OCR | ocr-image, ocr-pdf |
| Image | compress-image, resize-image, convert-image, crop-image |

### Rate Limiting (`lib/middleware/rate-limit.ts`)

Sliding-window in-memory rate limiter (no Redis required):

| Endpoint | Limit |
|---|---|
| `POST /api/jobs/create` | 20 requests/minute per IP |
| `GET /api/jobs/[id]` | 120 requests/minute per IP |
| `GET /api/files/[id]` | 60 requests/minute per IP |

Returns `429 Too Many Requests` with `Retry-After` header.

### File Validation (`lib/validation.ts`)

Magic-byte validation (not extension-based) for:
- PDF: `%PDF` header
- Images: PNG, JPEG, GIF, BMP, WebP, TIFF
- Max file size: 100 MB per file, 500 MB total

### Storage (`lib/storage/temp-storage.ts`)

- **Backend**: Local filesystem (`/tmp/toolify/`)
- **I/O**: Fully async (no sync `fs` calls)
- **Writes**: Atomic (temp-file → rename)
- **Streaming**: `storeStream()` pipes without buffering in heap
- **Cleanup**: Automatic TTL expiry + capacity-based eviction

### OCR (`lib/processing/ocr-processor.ts`)

- Uses native Tesseract 5 binary via `execFile` (no JS port)
- Image preprocessing: upscale (min 1800px), grayscale, normalize, linear contrast, sharpen
- Dual-pass retry: if confidence < 35% or text < 5 chars, retries with aggressive thresholding
- PSM selection: PSM 3 for Latin, PSM 6 for RTL/CJK/Indic
- Language family detection for 130+ Tesseract languages
- Zero state between jobs (new class instance per job)

### i18n (`lib/i18n/`)

- Custom React context (no external i18n library)
- 9 languages: English, Arabic, French, German, Spanish, Portuguese, Russian, Chinese, Japanese
- Lazy-loaded locale files
- RTL support (Arabic)
- Browser language auto-detection on first visit

## Key Files

```
lib/
  queue/
    job-manager.ts      In-memory job registry with TTL cleanup
    job-processor.ts    25 job type handlers + retry logic
    adapter.ts          QueueBackend interface (Redis/BullMQ upgrade path)
    types.ts            All queue types and defaults
  middleware/
    rate-limit.ts       Sliding-window IP rate limiter
  processing/
    pdf-processor.ts    PDF operations (pdf-lib + Ghostscript)
    pdf-security.ts     Encrypt/decrypt/sign (qpdf + pdf-lib)
    pdf-to-image.ts     PDF→images (Ghostscript + pdfjs fallback)
    image-processor.ts  Image operations (Sharp)
    ocr-processor.ts    OCR (native Tesseract 5 + Sharp preprocessing)
    concurrency.ts      Bounded concurrency (mapWithConcurrency)
    timeout.ts          withTimeout + TIMEOUTS constants
  storage/
    temp-storage.ts     Async filesystem temp store
  validation.ts         Magic-byte file validation
  i18n/                 i18n context + 9 locale files
  safe-filename.ts      Sanitizes Content-Disposition filenames

app/api/
  health/route.ts       GET /api/health — queue + storage stats
  jobs/create/route.ts  POST /api/jobs/create (rate limited)
  jobs/[id]/route.ts    GET/DELETE /api/jobs/[id] (status, cancel)
  files/[id]/route.ts   GET /api/files/[id] — streaming download
  compress-pdf/         Direct tool routes (25 total)
  ocr/image|pdf/        ...
  ...
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Dev server port (default 3000, workflow sets 5000) |
| `REDIS_URL` | No | If set, enables Redis/BullMQ queue backend (see adapter.ts) |
| `NODE_ENV` | Auto | `production` enables immutable cache headers, HSTS |

## Monitoring

`GET /api/health` returns:
- Queue stats (pending/processing/completed/failed)
- Storage usage (files, bytes, percent)
- Uptime, Node version, platform

## Scaling Roadmap

1. **Current (single server)**: In-memory queue, local-fs storage — works for moderate traffic
2. **Next step (Redis)**: Install `bullmq` + `ioredis`, set `REDIS_URL`, implement `BullMQBackend` in `lib/queue/adapter.ts`
3. **File storage**: Replace `TempStorage` with S3-compatible storage (interface already abstracted)
4. **Horizontal**: Multiple Next.js instances sharing Redis queue + S3 storage — zero code changes to tool routes needed
