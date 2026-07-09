# Web-Toolify (ToolifyPDF)

A comprehensive PDF and image processing platform at [toolifypdf.online](https://www.toolifypdf.online).

## Stack

| Layer | Tech |
|-------|------|
| Frontend / App | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Background jobs | BullMQ + Redis (5 queues: pdf-fast, pdf-heavy, image, ocr, document) |
| Database | SQLite via Drizzle ORM (`analytics.db`) |
| Monorepo | pnpm workspaces |

## How to run

The workflow `Start application` starts everything:

```
pip install -q -r requirements.txt
redis-server --daemonize yes --loglevel warning
pnpm install
cd artifacts/web-toolify && PORT=5000 REDIS_URL=redis://localhost:6379 UV_THREADPOOL_SIZE=8 pnpm run dev
```

The app is served on **port 5000**.

## Project structure

```
artifacts/
  web-toolify/        ← Next.js app (main frontend + API routes)
    app/
      blog/           ← Blog articles (one folder per post)
      api/            ← API routes for PDF/image tools
    lib/
      blog.ts         ← Blog article registry (PILLAR_ARTICLES + BLOG_ARTICLES)
      bull-queue/     ← BullMQ job queues and workers
    components/       ← Shared UI components
  api-server/         ← Secondary Node.js API server
scripts/
  warmup.py           ← Python warmup script for PDF/OCR tools
```

## Secrets needed for full functionality

| Secret | Purpose |
|--------|---------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot for admin notifications |
| `TELEGRAM_ADMIN_IDS` | Comma-separated admin Telegram IDs |
| `ADMIN_PASSWORD` | Admin panel access |
| `DEV_ADMIN_KEY` | Dev/ops admin key |
| `BREVO_API_KEY` | Email via Brevo (contact form) |
| `OPS_ALLOWED_IPS` | IP allowlist for ops endpoints |
| `REDIS_URL` | Redis connection (default: `redis://localhost:6379`) |

`SESSION_SECRET` is already configured in Replit Secrets.

## Blog system

Blog posts are stored as static Next.js pages under `app/blog/[slug]/page.tsx`. Metadata (title, description, dates, category) is registered in `lib/blog.ts`.

- **Pillar articles** appear pinned at the top of `/blog` using `PILLAR_ARTICLES[]`
- **Regular articles** appear in the grid below via `BLOG_ARTICLES[]`
- To add a new post: create the page file and add an entry to `lib/blog.ts`

## User preferences

- Preserve the existing project structure and stack — do not restructure or migrate.
- Keep all blog content exactly as provided (no summarising or rewriting).
