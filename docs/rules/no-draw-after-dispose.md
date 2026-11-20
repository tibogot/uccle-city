---
number: 15
check: `heap` (tools/heap/queueCheck.mjs) + browser 5-boot list: 0 heapDrop / WebGPU errors
---
**Rule.** Nothing draws or compiles a geometry after its dispose(); any deferred draw (a queue, a later frame) checks when it runs, not when it was queued.

**Why.** the warm-up compile queue drew far tiles already replaced by their full tiles: a GPU leak, then WebGPU errors once arrays were dropped
