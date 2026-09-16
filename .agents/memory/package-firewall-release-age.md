---
name: Package firewall release age
description: Replit package-firewall behavior that can block fresh pinned dependencies during imported-project startup.
---

When an imported pnpm workspace fails before its dev server starts with `ERR_PNPM_FETCH_403`, first check whether the blocked package version is too recent for the workspace’s minimum release-age policy. Prefer updating the direct dependency to the newest stable version outside that window, then let the normal workflow regenerate the lockfile.

**Why:** A blocked tarball leaves the workspace without `node_modules`, so the later `next: command not found` or similar error is only a secondary symptom.

**How to apply:** Trace the blocked package to its direct workspace manifest, check registry publish times, update the manifest and lockfile together, then restart and verify the actual preview.