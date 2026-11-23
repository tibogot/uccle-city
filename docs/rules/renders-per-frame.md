---
status: provisional
added: 2026-11-23
check: `renders` (tools/audit/rendersCheck.mjs: the sun cache's caster test (no-caster groups, far casters, frustumCulled = false, a tile's area, measured once), the queued dirty marks, the depth step = the constant depth offset -P[10] x d on the light's orthographic camera (normal and reversed depth), the switches, main.js's tile marks) + browser row `renders` (debug/renderCount.js renders a frame by caller + the sun cache's redraw causes over a police drive; debug/sunDepthStep.js: the cache laid back after a depth step = a full redraw)
---
**Rule.** A cached pass is redrawn whole only for a change its image can show. Before a change marks a cache dirty, ask whether it puts anything into that image: a group with no shadow caster, or one outside the light's frustum, does not. A change that is a pure transform of the cached image is applied when the cache is laid back. A whole-texel slide across the light is one such change; a step of the light along its own axis is another, since an orthographic depth moves by the constant -P[10] x d. The tile, landmark and pool code that marks the sun shadow cache dirty names what changed: the tile's area, or its groups. `markSunShadowDirty()` with no argument means "anything may have changed" and redraws. Count before cutting: `debug/renderCount.js` lists every render of a frame by caller, with its objects and its self time. A cut aims at the renders that carry objects. A one-quad post pass costs a fixed ~0.05-0.1 ms of CPU. A 100-object redraw costs 3-8 ms.

**Why.** The measured CPU profile of the police drive (rule alloc-rate, round 2) counted 32 renders a frame, with three's per-object work at 30 % of the main thread, and read the count as the multiplier. debug/renderCount.js (claude/renders, 2026-11-23) shows something else. Of the 32 renders, 30 are one-quad passes that draw one object each:
- bloom, 12;
- SSR, 6;
- the sky's haze, 4;
- GTAO + denoise, 2;
- TAAU, the beauty RTT, the HDR copy, the output, 1 each.

The objects are in two renders. The main scene pass draws ~290 objects every frame. The sun shadow cache's full redraw draws ~106-118 casters, on 1 police-drive frame in 8-10; the movers drawn on top every frame are 13-19. Half of those redraws were for changes the map could not show:
- tile fades of far-LOD tiles, which cast no shadow at all;
- terrain and road groups, which cast no shadow either;
- tiles landing or retiring 1-3 tiles away, outside the light's box;
- the light's 25 m depth step along the sun, a constant depth offset (every ~1.6 s, driving toward or away from the sun).

Over 8 s of drive: 43 redraws, of which fade 18, shift 10, refresh 6, key (depth step) 5, dirty 4.

**Measured** (claude/renders, 2026-11-23; RED preflight: another agent's gate on the CPU, so redraw counts are the robust figure):

| | police drive, before | police drive, after |
|---|---|---|
| renders a frame | 31.8 (top-level 7.3) | 31.9 (unchanged: the quads stay) |
| objects drawn a frame | 353 | 350 |
| sun cache full redraws | 43 in 433 frames (0.10 a frame; fade 18, shift 10, refresh 6, key 5, dirty 4) | 22 in 320 frames (0.069; shift 20, refresh 2, fade 0, key 0, dirty 0) |
| falcon flight | | 19 in 558 frames (0.034; refresh 11, step 5, shift 3) |

debug/sunDepthStep.js: after a 25 m step, the laid-back cache matches a full redraw on 99.52 % of the caster texels. A second full redraw with no step matches on 99.31 %: the noise floor, because the trees' wind moves the leaves between frames. Without the offset, 100 % of the texels are off.

**Not cut, and why** (candidates for later; each needs a look check or touches vendor/):
- **Bloom's 12 quads.** three's BloomNode has 5 mips with a blur pair each. Fewer mips, or bloom every 2nd frame, changes the glow, or lags it one frame behind the police lights.
- **SSR's 6.** The roughness blur mips.
- **The HDR copy (post.js renderScene) and the haze's copy back (vendor firmamentSky.postProcess).** Two full-frame copies of the same colour. Sharing one texture between the MRT target and the haze target breaks on the dynamic resolution's resizes: three disposes a render target's textures on setSize. Removing the haze's copy needs vendor/ (read-only).
- **Firmament's environment re-bake.** Every 90 frames: one frame with 6 cube faces + the PMREM blur, ~48 quads. The pace is set in vendor/.
- **The warm stand-ins (`boot3-late-warm`).** They are drawn in the main pass as well as the shadow pass, ~0.5 objects a frame. A shadow-only layer would cut them from the main pass, but interior/portal.js resets the sun camera's layers.
