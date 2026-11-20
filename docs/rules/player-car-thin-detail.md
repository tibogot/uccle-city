---
number: 23
check: `policerear`: tools/audit/policeRear.mjs (+ tools/cars/rearThin.mjs budget) + browser debug/rearCheck.js `ab()`
---
**Rule.** A detail of the player's car (big and close in the chase view, moving with the camera) is never a high-contrast feature thinner than the TAAU can hold (~1.5-2 internal px at the chase distance) unless it is pre-filtered (a texture: mipmaps + anisotropy integrate the pixel's footprint whatever the jitter). Every image fix is A/B'd moving in the browser and kept only when it measures.

**Why.** the cars2 rear plate is geometry (4 mm border, 8.6 mm strokes = 0.8-1.7 px at the chase camera): jitter phases whose 3 x 3 neighbourhood misses a stroke clip it out of the TAAU history, the plate blinks and crawls while driving (owner playtest 2026-11-16, TODO 8c; offline 91 % of the rear's thin-feature misses, browser: plate crop shimmer -26 %, hot pixels -42 %); the car was judged on stills / parked views only. Three more plausible fixes (specular AA, no SSR, shut-line pre-filter) measured nothing and were dropped
