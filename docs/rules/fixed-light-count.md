---
number: 7
check: `meta` (the rows' `clean` lists: no light made in their files) + code review
---
**Rule.** Never add or remove lights at runtime; fixed pools only.

**Why.** each light change rebuilds every shader (a freeze)
