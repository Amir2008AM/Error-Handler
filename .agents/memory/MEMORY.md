- [Dynamic imports miss static grep](dynamic-import-blind-spot.md) — `grep` for unused files misses `await import(...)` calls; always check for dynamic imports before deleting lib files.
- [Next.js stale validator](nextjs-stale-validator.md) — deleting an API route leaves a stale reference in `.next/types/validator.ts`; delete that file to keep `tsc --noEmit` clean.
- [Toolify 5-queue architecture](toolify-queue-arch.md) — BullMQ split into pdf-fast/pdf-heavy/image/ocr/document; WorkerGroup type + QUEUE_NAMES + tool-registry + 3 Telegram files all must stay in sync.

- [Legal pages consistency](legal-pages-consistency.md) — toolifypdf legal pages (privacy/terms/cookies/disclaimer) must stay English-only, single source of truth for retention time, footer links.
