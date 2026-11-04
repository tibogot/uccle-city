# vendor/volumetric-fog: local changes (marked `[uccle-city CHANGES.md #n]`)

1. **Reversed depth buffer.** Uccle renders with `reversedDepthBuffer: true` (depth = 1 - standard; the
   renderer reverses every camera, the sun's shadow camera included). `vfU[10].x` (the enabled flag, tested
   `< 0.5`) is 2 for reversed: the scene depth is flipped before use and the shadow test compares the other way.
