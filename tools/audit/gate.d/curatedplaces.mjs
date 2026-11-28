// gate row `curatedplaces` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "curatedplaces",
  script: "tools/audit/curatedPlacesCheck.mjs",
  args: ["--quiet"],
  guards: "the owner's places the open data lacks (rule curated-place-placed, claude/places1): every extra POI (tools/streetlife/extra_pois.json) sourced and placed in its tile's street life, every curated 'extra:' front with its POI, every hard ground (data/overrides.json grounds) with why / source / switch, at most 10 % under buildings, its bay rows inside its paint frame; Agam nightshop (Ch. de Saint-Job 701: NIGHT SHOP, white house) and Brico Sint-Job (594: Brico, grey shed, its car park with 2 bay rows), White Night's lot. ?bricolot=old: the lots as lawn. (claude/carrefour, rule curated-shed-look) every wide curated front (front.w / du) and its canopy on its own wall; every shed look named with a set; the Carrefour Market by Square Marlow: retail box 529267, front saying Carrefour with its glazing and canopy, car park carrefour_lot with 3 bay rows (?carrefour=old). (claude/carrefour2) every curated store (look shed + store): its front with its sign, glazing and canopy on its own building, its lot on the switch with its bay rows, every bay inside the lot; the Carrefour Market Rue Gatti de Gamond 60 (558122, lot carrefour_gatti_lot; OSM node 9627537495 parking=underground recorded wrong). (claude/places2, rule curated-render-tone) every moved OSM point with an address placed on its address street (Le Pigeon Noir on Rue Geleytsbeek, its LE PIGEON NOIR awning), every render-toned look on a render style with a name and a set (Le Pigeon Noir's mustard, ?places2=old); every playground (data/overrides.json playgrounds) sourced, its kit pieces inside its sand ring and out of buildings, the Chênaie garden in front of Le Pigeon Noir with >= 3 pieces",
  timeout: 120,
  deps: ["tools/streetlife/extra_pois.json", "data/streetlife/", "data/shops/terraces.json", "data/overrides.json", "viewer/grounds.js", "viewer/facadeGeom.js", "viewer/farLookData.js", "viewer/shops/shopLayout.js", "viewer/streetlife/layout.js", "viewer/buildingTypes.js", "viewer/facades.js", "viewer/farLook.js", "tools/streetlife/build_streetlife.py", "viewer/playgroundCity.js", "viewer/main.js", "models/parkkit/timberkit.json", "models/parkkit/playgroundkit.json"],
  meta: {
    features: [{ key: "bricolot", type: "old" }, { key: "carrefour", type: "old" }, { key: "places2", type: "old" }],
    clean: ["viewer/grounds.js"],
    text: [
      { file: "viewer/grounds.js", what: "paints the parking bay rows of a hard ground", test: (s) => /m\.kind === "bays"/.test(s) },
      { file: "viewer/facadeGeom.js", what: "a curated shed look draws a plain clad wall (SHED_PARTY: no house windows, no party-wall ghost)", test: (s) => /look\?\.shed/.test(s) && /SHED_PARTY = 997/.test(s) },
      { file: "viewer/farLookData.js", what: "the far tiles draw a shed look plain too", test: (s) => /look\?\.shed/.test(s) },
      // (claude/xmas1) one helper for the drawn front (frontFace / frontWidth), shared with the Christmas swags
      { file: "viewer/shops/shopLayout.js", what: "a curated front's width past 9.9 m (frontWidth), moved along its wall (frontFace: front.du), and its canopy", test: (s) => /cf\?\.w \? 40 : 9\.9/.test(s) && /export function frontFace/.test(s) && /cf\.du/.test(s) && /const W = frontWidth\(f, cf\)/.test(s) && /cf\.canopy/.test(s) },
      { file: "viewer/streetlife/layout.js", what: "a curated front moved along its wall (front.du, through shopLayout.js frontFace)", test: (s) => /frontFace\(p\.face, curated\[p\.id\]\?\.front\)/.test(s) },
      { file: "viewer/facades.js", what: "a curated render tone tints a rendered house (isRT)", test: (s) => /const isRT = /.test(s) && /band\(nTone, 7\)/.test(s) },
      { file: "viewer/farLook.js", what: "the far tiles tint a render-toned house too", test: (s) => /claude\/places2\) a curated render tone/.test(s) },
      { file: "viewer/facadeGeom.js", what: "the near tiles put the render tone in the style (renderToneStyle)", test: (s) => /renderToneStyle\(/.test(s) },
      { file: "viewer/farLookData.js", what: "the far tiles put the render tone in the style (renderToneStyle)", test: (s) => /renderToneStyle\(/.test(s) },
      { file: "viewer/main.js", what: "the playground kit drawn in the city (addPlaygrounds, ?places2=old none)", test: (s) => /addPlaygrounds\(/.test(s) && /params\.get\("places2"\) !== "old"\) heroes\.push/.test(s) },
      { file: "viewer/playgroundCity.js", what: "the playgrounds built once their tiles are in, compiled before shown", test: (s) => /state === "wait"/.test(s) && /await c\(Object\.values\(fields\)\.map\(\(f\) => f\.group\)\)/.test(s) },
      // (claude/carrefour2) a canopy moved along the wall (canopy.du), a plaque moved out (dz), the LiDAR peaks under a canopy dropped
      { file: "viewer/shops/shopLayout.js", what: "a curated canopy moved along its wall (canopy.du) and a plaque moved out from it (dz)", test: (s) => /cu = c\.du \?\? 0/.test(s) && /\(pl\.dz \?\? 0\)/.test(s) },
      { file: "viewer/main.js", what: "a hard ground's chmClear rings drop the LiDAR peaks under a curated canopy, near and far (groundTreesClear)", test: (s) => /async function groundTreesClear/.test(s) && (s.match(/await groundTreesClear\(/g) || []).length >= 2 },
      { file: "tools/streetlife/build_streetlife.py", what: "a moved OSM point carries its address tags", test: (s) => /o\["tags"\] = \{\*\*\(o\.get\("tags"\)/.test(s) },
    ],
  },
};
