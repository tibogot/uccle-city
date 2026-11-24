---
status: provisional
added: 2026-11-24
check: `sunshadowstep` (tools/audit/sunShadowStepCheck.mjs: viewer/sunStep.js's step angle and a simulated day at 1x and 60x (tip error, steps / frame, the lead, a still sun), the far plane against a brute-force deepest receiver, the switches, the cache key's text) + browser row `sunshadowstep` (debug/sunStepProbe.js: full redraws / frames at sun speed 60x, the per-frame strip; the tour view far-300m vs far 2000 m)
---
**Rule.** A cached shadow keys on a QUANTISED light state. The quantum is the largest error nobody can see: one map texel of the current box at the reference caster height (H = 30 m), never float precision. Only the shadow camera steps; the shading (the light's own direction, its colour, the sky) stays on the live sun. A shadow's depth range reaches the deepest receiver its box can hold at the sun's elevation (box / tan(e) + down / sin(e) past the focus); a receiver past the far plane fades to lit, never to dark.

**Why.** The sun's static shadow cache (lighting.js CachedSunShadowNode, perfgame round 3, -2 ms a frame) was keyed on the sun's direction to 6 decimals. Any sun motion changed the key every frame:

| police spawn, golden, 20 s (claude/sunstep, busy machine, ~40 fps) | `?sunstep=old&sunfar=old` | default |
|---|---|---|
| sun still | 28 / 832 frames = 3.4 % (refresh) | 28 / 816 = 3.4 % (refresh) |
| sun speed 1x (real time) | **690 / 695 = 99 %** (key) | 28 / 806 = 3.5 % (3 steps, 25 refresh) |
| sun speed 60x | **695 / 695 = 100 %** (key) | 184 / 783 = 23.5 % (161 steps, 23 key: the far plane moving with a step) |

Even the real-time sun undid the cache. Each full redraw is the heaviest render of a frame (~135 casters at the spawn).

**The step** (viewer/sunStep.js). Turning the light by d moves a caster's tip by H d / sin(e) map texels (elevation and azimuth alike, to first order), so the step is texel x sin(e) / H, clamped to [0.002, 0.5] deg. It leads the sun's motion: the shadow direction is put one step ahead, so the error runs +1 -> 0 -> -1 texel between steps (twice the interval for the same error). A sun that stops for 60 frames gets the shadow put on it. Simulated day (06-21 h, day 200): at 60x steps on 5.6-12 % of frames (box 400-60 m), at 1x one step every 7-11 s or more above 15 deg. (The research note's sin^2(e) form measured the tip in ground metres against a map texel; a map texel on the ground along the sun is texel / sin(e) long, so one texel of the map is the visible limit.)

**Smooth.** Per-frame strips at the spawn (lawn and trees with shadows, 120 stepped frames, share of pixels changing > 20 / 255): sun still p50 0.14 %; 60x default p50 0.17 %, at the step frames 0.29 %, max 0.66 %; 60x `?sunstep=old` (a redraw every frame) p50 0.18 %, max 0.34 %. The diff image of a step frame is scattered TAA / leaf noise with no coherent shadow edge: the 1-texel steps do not show, so phase B (a sliced build and a cross-fade) is not needed.

**The past-far band.** r187's frustum test checks only z <= 1. Under the reversed depth buffer, a receiver past the far plane (z < 0) compared against the cleared map and read as shadowed. The far plane (perfgame round 2) was 900 + box x 1.42 + 110 m, sized for a high sun; at golden (9.4 deg) the ground under the 400 m box runs to box / tan(e) = 2.4 km, so from 300 m up the lower-right foreground was a dark band. The far plane is now the light's distance + box / tan(e) + down / sin(e) (exact for an orthographic light: depth = y / tan(e) - h / sin(e)), rounded up to 25 m, capped at 6 km; `down` = 110 m + the focus's height over the ground in 50 m steps (flight). The shadow bias is a share of the depth range, so it is scaled by oldFar / far and stays the same in metres. Tour view far-300m against far 2000 m (`&shadowfar=old`, the true shadows): before 0.69 % of pixels off (2.7 % of the lower-right quarter), now 0.03 %. stjob-60m moves 0.09 %.

**Cost.** The far plane is no deeper than before at a high sun (58 deg: 1350 vs 1628 m for the 400 m box). At golden: the spawn's full redraw draws the same 135 casters (far 2175 vs 1188 m); the far-300m view's 122 vs 102 (far 4350 vs 1628 m), +0.6 ms CPU on a full redraw only. Timed A/B (GREEN, police spawn, 60x, scale pinned, interleaved in one page; A = a redraw every frame as `?sunstep=old` does): GPU frame 7.82 -> 5.35 ms (-2.47 +- 0.67), shadow pass CPU 2.27 -> 1.06 ms, redraws 100 % -> 35 % (the sun sank from 9 to -2 deg during the run). docs/PERF_GAME.md (sunstep).
