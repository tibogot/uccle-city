---
number: 35
status: provisional
check: `jitter`: tools/audit/jitterCheck.mjs (census tools/audit/census/thinBars.mjs: ceilings 12 / 11 = the after-counts; `?jitter=old` fails)
---
**Rule.** A thin element (a bar, rail, grille, glazing bar: 4V / A under 3 cm) is never drawn as raw geometry where it projects under ~1 internal pixel (1 px = d / 622 m under the TAAU at Auto's floor): beyond that its COVERAGE is drawn instead, pre-filtered (a card whose texture is the bars' exact coverage with box mips, or an analytic box filter), blended, never a hard alpha test at distance, and the card writes depth where it covers (a small depth cut) so the TAAU reprojects it at its own depth (no depth: it smears away while the camera moves); the modelled bars hand over to it by the lodFade dither (no pop), the card fades in under them first, the sun's shadow stays as it was. Every card atlas has a full mip chain that keeps level 0's coverage. A new thin-bar source goes into the census.

**Why.** garden railings / gates (8-16 mm) were drawn as geometry out to 150 m and the façade kit's balcony railings, grilles and glazing bars (8-30 mm) to 115 m: under 1 px beyond 6-28 m, hit or missed per jitter phase and clipped from the history: gates, fences and window grilles shimmered while the camera moved (owner playtest 2026-11-18). Census class J: 421 garden + 312 kit strokes drawn under 1 px (1.57 M stroke-instances city-wide) (claude/jitter)
