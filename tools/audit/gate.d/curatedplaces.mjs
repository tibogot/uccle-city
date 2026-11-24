// gate row `curatedplaces` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "curatedplaces",
  script: "tools/audit/curatedPlacesCheck.mjs",
  args: ["--quiet"],
  guards: "the owner's places the open data lacks (rule curated-place-placed, claude/places1): every extra POI (tools/streetlife/extra_pois.json) sourced and placed in its tile's street life, every curated 'extra:' front with its POI, every hard ground (data/overrides.json grounds) with why / source / switch, at most 10 % under buildings, its bay rows inside its paint frame; Agam nightshop (Ch. de Saint-Job 701: NIGHT SHOP, white house) and Brico Sint-Job (594: Brico, grey shed, its car park with 2 bay rows), White Night's lot. ?bricolot=old: the lots as lawn. (claude/carrefour, rule curated-shed-look) every wide curated front (front.w / du) and its canopy on its own wall; every shed look named with a set; the Carrefour Market by Square Marlow: retail box 529267, front saying Carrefour with its glazing and canopy, car park carrefour_lot with 3 bay rows (?carrefour=old)",
  timeout: 120,
  deps: ["tools/streetlife/extra_pois.json", "data/streetlife/", "data/shops/terraces.json", "data/overrides.json", "viewer/grounds.js", "viewer/facadeGeom.js", "viewer/farLookData.js", "viewer/shops/shopLayout.js", "viewer/streetlife/layout.js"],
  meta: {
    features: [{ key: "bricolot", type: "old" }, { key: "carrefour", type: "old" }],
    clean: ["viewer/grounds.js"],
    text: [
      { file: "viewer/grounds.js", what: "paints the parking bay rows of a hard ground", test: (s) => /m\.kind === "bays"/.test(s) },
      { file: "viewer/facadeGeom.js", what: "a curated shed look draws a plain clad wall (SHED_PARTY: no house windows, no party-wall ghost)", test: (s) => /look\?\.shed/.test(s) && /SHED_PARTY = 997/.test(s) },
      { file: "viewer/farLookData.js", what: "the far tiles draw a shed look plain too", test: (s) => /look\?\.shed/.test(s) },
      // (claude/xmas1) one helper for the drawn front (frontFace / frontWidth), shared with the Christmas swags
      { file: "viewer/shops/shopLayout.js", what: "a curated front's width past 9.9 m (frontWidth), moved along its wall (frontFace: front.du), and its canopy", test: (s) => /cf\?\.w \? 40 : 9\.9/.test(s) && /export function frontFace/.test(s) && /cf\.du/.test(s) && /const W = frontWidth\(f, cf\)/.test(s) && /cf\.canopy/.test(s) },
      { file: "viewer/streetlife/layout.js", what: "a curated front moved along its wall (front.du, through shopLayout.js frontFace)", test: (s) => /frontFace\(p\.face, curated\[p\.id\]\?\.front\)/.test(s) },
    ],
  },
};
