---
  name: Legal pages consistency (toolifypdf)
  description: Rules for keeping the 4 legal pages (privacy-policy, terms-and-conditions, cookies-policy, disclaimer) consistent
  ---

  Legal pages must stay English-only (no bilingual Arabic sections) per explicit user decision.

  **Why:** user explicitly requested removing Arabic from legal pages for a professional, single-audience presentation; bilingual pages had drifted (Arabic sections had stale content, e.g. old retention time) since only English was updated.

  **How to apply:** when editing any legal page copy (retention time, file size limits, contact email, ad/analytics disclosures), grep across all 4 pages plus blog posts referencing the same facts (search for the old value, e.g. "1 hour") — these values are duplicated as static strings, not sourced from one config, so they drift easily. Also check components/footer.tsx vs components/minimal-footer.tsx for matching legal links (they are two separate footer implementations and can silently diverge).
  