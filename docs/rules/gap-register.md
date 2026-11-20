---
status: provisional
added: 2026-11-20
check: `register` (tools/audit/gapRegister.mjs) + `markings`, `streetprops` (--register, tools/audit/gaps.mjs)
---
**Rule.** A gated detector reports each violation as a finding with a stable id `<row>.<check>:<elementId>:<s0-s1>` (the element an OSM road / data id / kind@x,z, the span in whole metres along it, `0-0` for a point). Its known exceptions live in the gap register `data/gaps.json`, one entry per exception with a cause (from `tools/audit/gaps.mjs CAUSES`: what removes it), evidence, a decision and a date; never a city-wide sum, never a wildcard. The row fails on a finding that is not registered and on a registered entry (of a tile it ran) that no finding matches any more. A fix removes its entries in the same branch; a new exception is registered only with its cause.

**Why.** The ceilings were city-wide sums set at the after-count, so fixing 9 m anywhere freed 9 m for a new defect elsewhere; the owner's Ch. de Saint-Job / Rue Engeland diagonal WAS flagged by the census, and the markings ceilings let it through (docs/STREET_MODEL_PLAN.md 1 c, 2).
