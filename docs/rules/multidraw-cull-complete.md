---
number: 21
check: `mdrawcull`: tools/audit/mdrawCull.mjs + browser debug/mdrawAB.js
---
**Rule.** A multi-draw set's cull (viewer/multiDraw.js) draws every instance whose box meets the pass's frustum (chunks tile each part exactly, also when a part overflows CHMAX and falls back to coarser chunks); any change to its chunking or order is A/B'd in the browser and kept only for a measured GPU / CPU gain. When the near-to-far order is on (`?mdsort=1`) it applies to the VIEW camera's opaque draws only; shadow / reflection cameras and blended views keep the part / chunk order (order only: the same records, the same image). One camera rendered twice in a frame with other matrices is culled again. The indirect records go up by update ranges (never DynamicDrawUsage).

**Why.** coarse chunks draw instances that only graze the frustum, and the draw order decides early-z: both looked free wins (docs/AGARGARO.md jobs 1-2), yet in the browser 80 m chunks cut view instances 22-34 % for a GPU gain at 1 view of 3 and +15-25 us of cull, and the sort gained nothing (both left opt-in); the cull is invisible on one spot: a lost chunk is a hole, a reordered blended pass a different picture
