---
number: 8
check: `meta` (the rows' `clean` lists: no DynamicDrawUsage in their files) + code review
---
**Rule.** Never `DynamicDrawUsage`; static buffers + `needsUpdate` + update ranges.

**Why.** r187 re-uploads such buffers whole every pass
