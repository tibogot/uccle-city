// ?grade=nte: the NTE fine-tune of the look (docs/LOOK_NTE.md steps 1-3), one A/B switch, default OFF.
// (The study asked for ?look=nte, but `look` is already quick mode's look-at point: docs/QUICKTEST.md.)
// Only uniforms and parameters change: no new light (rule fixed-light-count), no new pass. With the switch off nothing
// here is read and the shaders are built exactly as before (post.js / lighting.js only add their nodes when NTE).
export const NTE = typeof location !== "undefined" && new URLSearchParams(location.search).get("grade") === "nte";

// 1. THE GRADE (viewer/post.js LOOKS): merged over each look. toe = a shadow lift (linear, pre tone map, tinted by the
// shadow tint, fading out by luma 0.25); vib = the vibrance (the default grade's 0.1); tint = the shadow tint (default
// 0.965, 1.005, 1.045). Golden stays warm: it only gains the lift. Night = the blue hour: more bloom, a lower threshold.
export const NTE_LOOKS = {
  midday: { exposure: 1.04, saturation: 1.18, vib: 0.2, toe: 0.009, tint: [0.95, 1.0, 1.06], balance: [1.01, 1.0, 0.99] },
  golden: { toe: 0.008 },
  misty: { toe: 0.008 },
  overcast: { toe: 0.008, vib: 0.14 },
  twilight: { saturation: 1.12, vib: 0.16, toe: 0.012, tint: [0.94, 1.0, 1.07], bloom: 0.36, threshold: 0.92 },
  night: { saturation: 1.1, vib: 0.16, toe: 0.01, tint: [0.92, 1.0, 1.1], balance: [1.0, 1.0, 1.015], bloom: 0.42, threshold: 0.85 },
};

// 2-3. THE SKY (viewer/lighting.js, Firmament): per time preset.
//   env       the sky environment's intensity (the ambient fill: blue, lifted shadows; default 1)
//   envNight  the same at full night (eased with Firmament's night factor): the blue-hour ambient
//   fogBlue   how far the aerial fog's colour goes toward a pale blue of the same brightness (0 = the horizon's own)
//   fogMul    x the preset's fog density (the far city separates into layers)
//   haze      Firmament's air haze (its default 1.6)
//   coverage  the cumulus coverage (FIRM_TIMES; bigger clouds)
//   nightEV   Firmament's night-look exposure in stops (default ?nightev 0.6): +0.5 stop
//   nightBlue Firmament's rod-blue of the darks (default 0.8)
export const NTE_SKY = {
  midday: { env: 1.18, fogBlue: 0.45, fogMul: 1.5, haze: 2.0, coverage: 0.46 },
  golden: { env: 1.12, fogMul: 1.15 },
  misty: { env: 1.1 },
  overcast: { env: 1.12 },
  twilight: { env: 1.2, envNight: 1.6, fogBlue: 0.3, nightEV: 1.1, nightBlue: 1.0 },
  night: { env: 1.2, envNight: 2.4, fogBlue: 0.3, nightEV: 0.85, nightBlue: 1.05 },
};
export const NTE_FOG_BLUE = [0.8, 0.93, 1.16];   // the blue the far air takes (x the fog colour's luma)
