---
number: 26
status: provisional
check: `lycee`: tools/audit/lyceeCheck.mjs + browser debug/lyceeCheck.js `ab()`
---
**Rule.** A fixed detail seen from the street that is high-contrast and thinner than the TAAU can hold (~1.5-2 internal px) at the distances it is seen from (railing and gate bars, wires, thin mesh) is pre-filtered: its coverage of the pixel (a box-filtered card or texture: analytic filter or mipmaps), the modelled detail only where it is >= 2 px (dithered out, no pop); its faces never within 1 mm of another's over the same area (rule 2). Every image fix is A/B'd moving in the browser.

**Why.** the Lycée Français railing left of the vehicle gate jittered while the camera moved (owner 2026-11-17): its 2.5 cm white bars every 12 cm (and the gate's black ones every 11 cm) are 0.5-2 internal px from the avenue (8-30 m), rule 23's mechanism on a fixed object; the gate's bar tops also lay in its top rail's top face (120 doubled faces). Browser: the bars as a blended box-filtered card: fence shimmer -43..-54 % at 8-20 m, gate -42..-60 %, equal at 3 m; the same card as alpha-to-coverage (the TAAU's stochastic coverage) only -5..-15 %. Nothing else moves, fades or overlaps there (offline: no garden piece, wall or building face on the line). Stills never showed it
