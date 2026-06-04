---
name: Dynamic import blind spot
description: Static grep misses await import() usages — caused near-deletion of an actively-used lib file.
---

When scanning for unused files with `grep -rl "from.*filename"`, dynamic imports like `await import('@/lib/monitoring/worker-health')` are NOT matched because they use string literals, not static `from` specifiers.

**Why:** `lib/monitoring/worker-health.ts` showed zero grep matches but was actively used by `app/api/ops/stream/route.ts` via `await import('@/lib/monitoring/worker-health')` inside an async function. It was deleted and had to be restored from git.

**How to apply:** Before deleting any `lib/` file, also run `grep -r "import(.*filename"` to catch dynamic imports. Or check git for the file content before deleting, so recovery is fast.
