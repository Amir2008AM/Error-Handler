# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Toolify (artifacts/web-toolify)

Next.js 16 + React 19 web app providing free PDF/image/text utilities. Workflow: `Web Toolify` runs `PORT=3000 pnpm --filter @workspace/web-toolify run dev`.

### Migration / setup notes

- Native modules: `canvas` requires the `libuuid` system dependency.
- `lib/storage/temp-storage.ts` uses filesystem storage at `/tmp/toolify/{uuid}/` (data + meta.json) with **fully async** `fs/promises` APIs and `crypto.randomUUID()`. Default TTL is 20 minutes; cleanup interval is 60 seconds. Exposes `storeStream()` / `getStream()` for backpressured I/O and a cached `totalSize` so writes don't walk the directory each time.
- `lib/queue/job-processor.ts` was rewritten to use the modern processor option-object API and includes `unwrap()` / `toArrayBuffer()` helpers. Every operation is wrapped in `withTimeout` from `lib/processing/timeout.ts`, and batch image-compression uses `mapWithConcurrency` from `lib/processing/concurrency.ts` (cap = libuv pool size).
- `lib/processing/image-processor.ts` runs every op as a single sharp pipeline with `failOn:'error'`, `limitInputPixels` (decompression-bomb defense), and `toBuffer({resolveWithObject:true})` — no double `metadata()` reads, no extra encode passes.
- `lib/validation.ts` performs **magic-byte sniffing** on the first 12 bytes of every upload (PDF/PNG/JPEG/GIF/BMP/TIFF/WebP). All `validateFile()` callers in `app/api/*` were converted to `await`.
- `app/api/files/[id]/route.ts` returns a `NextResponse` whose body is a Web `ReadableStream` adapted from `fs.createReadStream` — large downloads never hit the JS heap.
- `next.config.mjs` lists `pdf-parse`, `sharp`, `canvas`, `pdfjs-dist`, and `tesseract.js` in `serverExternalPackages`. `experimental.proxyClientMaxBodySize: '100mb'` raises Next.js 16's default 10MB request cap for file-processing routes.

### CLI Tool Integration (Ghostscript + qpdf)

System binaries used for real PDF processing — no JavaScript fallbacks:

- **Ghostscript (`gs` 10.05.1)** — powers `compress-pdf`. Three levels:
  - `low` → `-dPDFSETTINGS=/ebook` (150 dpi images)
  - `medium` → `-dPDFSETTINGS=/screen` (72 dpi)
  - `high` → `/screen` + aggressive downsampling + font subsetting flags
  - Implementation: `lib/processing/pdf-processor.ts` → `PDFProcessor.compress()`
  - `runGs()` helper wraps `spawn('gs', ...)` with a 2-minute `SIGKILL` timeout
  - `withGsTempDir()` guarantees temp-file cleanup via `rm -rf` in `finally`
- **qpdf (11.10.1)** — powers `protect-pdf` and `unlock-pdf`:
  - `protect`: AES-256 encryption via `--encrypt`; passwords written to an `@argfile` (not exposed in `ps` output)
  - `unlock`: `--decrypt` with `--password-file=<tmp>` to avoid shell-visible password
  - Wrong password → `WrongPasswordError` → HTTP 400 with clear user message
  - Implementation: `lib/processing/pdf-security.ts` → `PDFSecurityProcessor`

**Dockerfile** (root of repo) targets Railway deployment:
- Base: `node:24-bookworm-slim`
- Installs `ghostscript`, `qpdf`, `libuuid1`, native build deps (canvas, tesseract)
- Runs `pnpm install --frozen-lockfile` then `next build`
- `CMD ["pnpm", "start"]` from `artifacts/web-toolify/`
- Validates `gs --version && qpdf --version` at build time

### Streaming Upload System

`lib/stream-upload.ts` — replaces `request.formData()` buffering:
- `streamUpload(request)` pipes the multipart body through `busboy` directly to disk (`os.tmpdir()`), never reading the full payload into RAM.
- Returns `{ fields, files, cleanup }`. Each `file` has `.path` (absolute temp path), `.size`, `.filename`, `.fieldname`.
- `validateStreamedFile(file, type)` reads only the first 12 bytes from disk (magic bytes) for type validation.
- All three PDF routes (`compress-pdf`, `protect-pdf`, `unlock-pdf`) pass the on-disk path directly to Ghostscript/qpdf — no memory copy during or after upload.

### Processed-File Download System

After processing, all PDF tools store results in `TempStorage` (20-min TTL) and return JSON `{ success, fileId, filename, ...metadata }` — the file is **not** streamed in the response body (avoids double bandwidth).

**Flow:**
1. API route processes file → stores result via `getTempStorage().store()` → returns `{ fileId }` JSON.
2. Client reads `fileId`, stores in state, renders `<ProcessedFileCard>`.
3. `ProcessedFileCard` (`components/processed-file-card.tsx`) auto-downloads from `/api/files/<fileId>` on mount, then shows a persistent **Download** button.
4. If auto-download is blocked (popup blocker, mobile browser), a "Didn't start?" hint appears after 4 s.
5. The manual Download button fetches the file from `/api/files/<fileId>` — re-download without any reprocessing — and shows "Retry" on fetch failure.
6. `GET /api/files/[id]` streams the file from disk via `getStream()` (never buffers into JS heap).

**Progress bar stages** (`components/real-progress-bar.tsx` `PROGRESS_STAGES`):
- `UPLOAD_END: 50` — upload occupies 0–50% of the bar (XHR `upload.progress` events)
- `VALIDATION_END: 55` — brief server validation
- `PROCESSING_END: 90` — server-side work (Ghostscript/qpdf)
- `DONE: 100`

### PDF to JPG (`/pdf-to-jpg`)

`lib/processing/pdf-to-image.ts`:
- Uses the **pdfjs-dist v5 legacy build** (`pdfjs-dist/legacy/build/pdf.mjs`) — required for Node.js compatibility.
- Provides `standardFontDataUrl` and `cMapUrl` (both `file://` URLs derived from the installed `pdfjs-dist` package) so embedded fonts and CJK CMaps render correctly. `disableFontFace: true`, `useSystemFonts: false`, `isEvalSupported: false`.
- `GlobalWorkerOptions.workerSrc` is set to the local `pdf.worker.mjs` file URL — pdfjs v5 requires this even for its in-process fake worker.
- The `createRequire` anchor uses `process.cwd() + '/package.json'`, **not** `import.meta.url`. Next.js webpack rewrites `import.meta.url` in the bundled server file to a virtual `[externals]/...` URL, which breaks `nodeRequire.resolve('pdfjs-dist/...')`.
- Renders into a `node-canvas` Canvas, passing both `canvas` and `canvasContext` (cast through `unknown`) to satisfy the v5 `RenderParameters` type.
- The previous silent "blank-image fallback" path has been removed — render errors now propagate so the API returns a real 500 instead of a blank zip.
- The client (`app/pdf-to-jpg/client.tsx`) shows a disclaimer that PDF rendering uses an open-source engine and may not perfectly match Adobe Acrobat for uncommon fonts or complex vector graphics.
