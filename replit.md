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
- `lib/storage/temp-storage.ts` uses filesystem storage at `/tmp/toolify/{uuid}/` (data + meta.json) with synchronous fs APIs and `crypto.randomUUID()`. Default TTL is 20 minutes; cleanup interval is 60 seconds.
- `lib/queue/job-processor.ts` was rewritten to use the modern processor option-object API and includes `unwrap()` / `toArrayBuffer()` helpers.
- `next.config.mjs` lists `pdf-parse`, `sharp`, `canvas`, `pdfjs-dist`, and `tesseract.js` in `serverExternalPackages`.

### PDF to JPG (`/pdf-to-jpg`)

`lib/processing/pdf-to-image.ts`:
- Uses the **pdfjs-dist v5 legacy build** (`pdfjs-dist/legacy/build/pdf.mjs`) — required for Node.js compatibility.
- Provides `standardFontDataUrl` and `cMapUrl` (both `file://` URLs derived from the installed `pdfjs-dist` package) so embedded fonts and CJK CMaps render correctly. `disableFontFace: true`, `useSystemFonts: false`, `isEvalSupported: false`.
- `GlobalWorkerOptions.workerSrc` is set to the local `pdf.worker.mjs` file URL — pdfjs v5 requires this even for its in-process fake worker.
- The `createRequire` anchor uses `process.cwd() + '/package.json'`, **not** `import.meta.url`. Next.js webpack rewrites `import.meta.url` in the bundled server file to a virtual `[externals]/...` URL, which breaks `nodeRequire.resolve('pdfjs-dist/...')`.
- Renders into a `node-canvas` Canvas, passing both `canvas` and `canvasContext` (cast through `unknown`) to satisfy the v5 `RenderParameters` type.
- The previous silent "blank-image fallback" path has been removed — render errors now propagate so the API returns a real 500 instead of a blank zip.
- The client (`app/pdf-to-jpg/client.tsx`) shows a disclaimer that PDF rendering uses an open-source engine and may not perfectly match Adobe Acrobat for uncommon fonts or complex vector graphics.
