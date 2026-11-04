# vendor/volumetric-fog: origin

`volumetricFog.js` from the owner's read-only engine **tibogot/game-engine-v1** (`v3/render/fog/volumetricFog.js`,
last commit `b8fa1155b233e2b33a867c7aad285a32a41467d4`, clean when copied 2026-11-04). Valley fog / mist with sun
shafts as a post pass on the linear HDR frame (height layer + tiling 3D noise, sun through the shadow map,
multiple scattering, half-res march + temporal reprojection). Local changes: `CHANGES.md`. Adaptation:
`viewer/lighting.js` (hazeHook).
