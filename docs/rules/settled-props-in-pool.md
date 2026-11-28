---
status: provisional
added: 2026-11-26
check: `props` (tools/propsTest.mjs glue row; the empty-proxy hide: browser census, every visible InstancedMesh with count 0 in the scene = 0 -> tools/props/glueSmoke.mjs: a bin knocked over, asleep: back in its pool at its pose (source + live copy), no proxy draw; hit again: out of the pool (zero scale) in the frame its proxy draws it; asleep again; the tile's reset restores the rest; --settleold: the old path keeps the proxy)
---
**Rule.** A displaced physics prop is drawn by a proxy only while it moves. Once it is asleep where it landed, it goes back into its own layer's pool at that pose: the pool's source and its live copy, through StreamPool.patch, or a plain instanced mesh's matrix. From then on the pool's merged multi-draw sets draw it. When it is hit again, it leaves the pool (zero scale) in the same frame its proxy starts drawing it. When its tile unloads, it is reset to its rest pose, as before.

**An empty proxy is hidden every frame** (`?propshide=old` = before). In the same census, the 47 proxy draws were not displaced props at all. All 48 proxy meshes were visible with count 0: their warm-up state (visible, not frustum-culled) had been put back by a later save / restore of the boot, and render() returned early when no prop was displaced. Now render() hides an empty proxy before its early returns. The police drive's main pass went from 298-314 to 270 render objects a frame, props 47 -> 0.

**Why.** Every prop the car knocked over stayed a proxy until its tile unloaded. That cost one draw per piece and per LOD band it lay in. On the 2026-11-26 police drive (debug census, 754 frames) the proxies were the largest single group in the main pass: 47 of ~300 render objects a frame, at ~28 us of three r187 CPU each. A prop asleep on the ground needs no motion vectors, and its pool already draws its piece in one multi-draw per material.
