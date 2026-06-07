---
name: Toolify 5-queue BullMQ architecture
description: Queue group names, concurrency, and per-stage timing after the pdf-fast/pdf-heavy split
---

## Rule
The Toolify BullMQ backend uses FIVE worker groups. Any change to group names must propagate to all six locations below — missing one causes silent routing failures.

## Five groups (as of June 2026)

| Group      | Queue name           | Concurrency (4 CPU) | Job types                                                     |
|------------|----------------------|---------------------|---------------------------------------------------------------|
| pdf-fast   | toolify-pdf-fast     | 4                   | rotate, watermark, page-numbers, organize, protect, unlock, sign, extract-pages, delete-pages |
| pdf-heavy  | toolify-pdf-heavy    | 2                   | merge, split, compress, repair, pdf-to-jpg, pdf-to-word, pdf-to-excel |
| image      | toolify-image        | 4                   | compress/resize/convert/crop image, image-to-pdf              |
| ocr        | toolify-ocr          | 2                   | ocr-image, ocr-pdf                                            |
| document   | toolify-document     | 2                   | word-to-pdf, excel-to-pdf, html-to-pdf, ppt-to-pdf, pdf-to-ppt |

## Six files that must stay in sync
1. `lib/queue/bullmq-backend.ts` — WorkerGroup type, PDF_FAST_TYPES, PDF_HEAVY_TYPES, QUEUE_NAMES, CONCURRENCY, KNOWN_GROUPS (parsing order: longest names first)
2. `lib/tool-registry.ts` — WorkerGroup type + every ToolMeta.workerGroup value
3. `lib/telegram/analytics-cache.ts` — QUEUE_NAMES array
4. `lib/telegram/metrics.ts` — QUEUE_NAMES array
5. `lib/telegram/worker-control.ts` — QUEUE_NAMES array
6. `lib/queue/types.ts` — JobTimings interface (queueWaitMs, fileLoadMs, engineMs, totalMs)

## Job ID format
`bq-<group>-<bullId>` e.g. `bq-pdf-fast-abc123`, `bq-pdf-heavy-xyz789`

Parsing: iterate KNOWN_GROUPS in order (pdf-fast before pdf-heavy, both before any hypothetical 'pdf') and match `rest.startsWith(g + '-')`.

## Per-stage timing
Worker embeds `_timings: { fileLoadMs, engineMs, queueWaitMs }` in `JobResult.metadata`.
`getBullMQJobStatus` extracts and adds `totalMs` (finishedOn - timestamp), exposes as `response.timings`.

## Why
A single heavy compress-pdf job (2–30 s) used to block rotate-pdf (0.3 s) jobs. Separating queues means fast tools always get an available worker.

**How to apply:** When adding a new job type, decide: does it spawn a heavy subprocess or process >5 MB in JS heap? → pdf-heavy (or document). Otherwise → pdf-fast.
