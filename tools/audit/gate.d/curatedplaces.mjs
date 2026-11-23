// gate row `curatedplaces` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "curatedplaces",
  script: "tools/audit/curatedPlacesCheck.mjs",
  args: ["--quiet"],
  guards: "the owner's places the open data lacks (rule curated-place-placed, claude/places1): every extra POI (tools/streetlife/extra_pois.json) sourced and placed in its tile's street life, every curated 'extra:' front with its POI, every hard ground (data/overrides.json grounds) with why / source / switch, at most 10 % under buildings, its bay rows inside its paint frame; Agam nightshop (Ch. de Saint-Job 701: NIGHT SHOP, white house) and Brico Sint-Job (594: Brico, grey shed, its car park with 2 bay rows), White Night's lot. ?bricolot=old: the lots as lawn",
  timeout: 120,
  deps: ["tools/streetlife/extra_pois.json", "data/streetlife/", "data/shops/terraces.json", "data/overrides.json", "viewer/grounds.js"],
  meta: {
    features: [{ key: "bricolot", type: "old" }],
    clean: ["viewer/grounds.js"],
    text: [
      { file: "viewer/grounds.js", what: "paints the parking bay rows of a hard ground", test: (s) => /m\.kind === "bays"/.test(s) },
    ],
  },
};
