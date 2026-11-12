# vendor/slop-water: Mr.doob's wind-wave texture (MIT)

- Source: https://github.com/mrdoob/slop-newyork, commit 536a907c605964421563f12f15c5e00d735fc94f (2026-11-06),
  `js/tsl-materials.js` lines 2723-2876: `fft2DInverse` and `getWaterWaveTexture` (a random-phase directional wind-sea
  spectrum inverse-FFT'd once on the CPU into a tileable RGBA half-float texture: slopes, squared slope, height, with a
  box-filtered float mip chain for LEAN mapping). Read as data in a scratch clone; never run from there.
- Licence: MIT, (c) 2026 Mr.doob (`LICENSE`, copied as-is).
- Changes: `import * as THREE from "three/webgpu"` added, `getWaterWaveTexture` exported; nothing else.
- Used by `viewer/water/pondWater.js` (the park ponds: Wolvendael first). The pond shader there is ours, written after
  his calm "park lake" variant of `createWaterMaterial` (`js/tsl-materials.js:2894-2963`): finer, calmer ripples, a
  greener, duller body, Fresnel-weighted reflections; plus a planar reflection of our own (his relies on SSR + IBL).
- Do not edit here; if a change is ever needed, log it in a `CHANGES.md` beside this file with the reason.
