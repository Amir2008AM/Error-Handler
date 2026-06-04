---
name: Next.js stale .next/types/validator.ts
description: Deleting an API route leaves a stale reference in .next/types/validator.ts that breaks tsc --noEmit locally.
---

When an API route directory (e.g. `app/api/test-excel-engine/`) is deleted, Next.js does not automatically update `.next/types/validator.ts`. The auto-generated file still references the old route and causes a TS2307 error.

**Why:** `.next/types/validator.ts` is only regenerated on `next build` or `next dev` compilation. Deleting a route mid-session leaves it stale until the next full compilation cycle.

**How to apply:** After deleting any API route, run `rm -f .next/types/validator.ts` to clear the stale reference. On Railway/production builds, this is a non-issue since `next build` regenerates it fresh.
