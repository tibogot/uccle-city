---
number: 3
check: `motion`: tools/audit/motionAudit.mjs + browser `sharpCheck.motionCoverage()` / `stability()`
---
**Rule.** Everything that moves has a motion source (instance, skinned or rigid previous transform), counted **once**.

**Why.** the chase car was treated as new every frame (shimmer while driving); the falcon's motion was counted twice (ghost)
