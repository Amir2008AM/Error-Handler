# Web-Toolify

A comprehensive web-based utility platform providing free online tools for PDF, image, OCR, and document processing.

## Stack

- **Framework**: Next.js 16.2 (App Router, Turbopack), React 19
- **Styling**: Tailwind CSS 4, Radix UI, Lucide React
- **Queue**: BullMQ + Redis (optional; falls back to in-memory JobManager)
- **Processing engines**: Ghostscript, qpdf, pdf-lib, pdfjs-dist (PDF); Sharp (images); Tesseract.js (OCR); LibreOffice (documents)
- **Database**: Drizzle ORM with SQLite (`analytics.db`) / PostgreSQL
- **Package manager**: pnpm workspaces (monorepo)

## How to run

The workflow `Start application` runs everything:
```
pip install -q -r requirements.txt 2>/dev/null
redis-server --daemonize yes --loglevel warning 2>/dev/null
pnpm install 2>/dev/null
cd artifacts/web-toolify && PORT=5000 REDIS_URL=redis://localhost:6379 UV_THREADPOOL_SIZE=8 pnpm run dev
```

App is served on **port 5000**.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `SESSION_SECRET` | Optional | Session signing secret |
| `REDIS_URL` | Optional | Defaults to `redis://localhost:6379`; Redis is started by the workflow |
| `UV_THREADPOOL_SIZE` | Optional | Set to 8 for better async I/O throughput |

## Project structure

```
artifacts/web-toolify/
  app/               # Next.js App Router pages & API routes
  lib/               # Core processing engines (PDF, image, OCR, document)
  components/        # Shared React components
  analytics.db       # SQLite analytics database (gitignored)
```

## User preferences
