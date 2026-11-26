---
status: provisional
added: 2026-11-26
check: `villa` (tools/audit/villaCheck.mjs 2d: every fabrics.json layer listed in models/villa/LICENCES.md with CC0 and its polyhaven.com/a/<id> page)
---
**Rule.** Every external asset the villa ships (scans, models, textures) is listed in models/villa/LICENCES.md, one line
each: the asset, its licence (quoted from the licence page, read before use), its source page, what it is used as and
the date read. Only CC0 / public-domain sources (or a licence the owner approved); AI generation only if nothing else
fits, flagged to the owner first. The source files stay out of git; the shipped file is the re-packed one.

**Why.** The v3 plan (docs/VILLA_V3_PLAN.md) brings CC0 scans (Poly Haven fabrics now; museum scans for the sculptures
later): an asset whose licence nobody recorded cannot be checked when the site is published.
