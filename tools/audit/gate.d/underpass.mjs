// gate row `underpass` (docs/WORKFLOW.md: one file per row): the Calevoet pedestrian underpass U1 (claude/underpass1,
// rule underpass-wells, docs/CALEVOET_UNDERPASS_PLAN.md; round 2: rules pane-faces-apart, sign-uv-reads-right, ao-ktx2, shadow-warm-static-pass)
export default {
  name: "underpass",
  script: "tools/audit/underpassCheck.mjs",
  args: ["--quiet"],
  guards: "the Calevoet pedestrian underpass U1 (viewer/underground/, models/underpass/): its 6 OSM ways + tags, each stair mouth within 1 m of its OSM street end, the hide lists = full UrbIS URIs of tile D6 and each kiosk covering its UrbIS box (overlap / union >= 0.85); budgets (LOD0 16k / LOD1 3k / LOD2 400 tris, inside 35k, collision 1.5k, <= 6 draws a level, <= 8 inside, named slots, no light, both bakes on every inside primitive, <= 6 MB); the ground cut by the worker's own code on tile D6's terrain: triangles dropped / clipped only at the wells, nothing left inside, every new vertex on a well's rim line, the cut area = the wells' area; the west well a hole in its sidewalk, no partial overlap; the kiosks' LOD0 + throat meet the cut terrain (contact.js 0 floating / 0 overhang); an offline walker (CharacterController + the field's voids + the collision mesh) east -> west and back: reaches each street, never > 5 cm inside the model, never above the corridor's soffit; a walker on the ground over the corridor stays on it; round 2: no frosted pane with both faces on one plane (LOD0 + throat, LOD0 + inside) and the kiosks' heroshell ceiling 0 m2; every lettered face reads left to right, upright, unstretched, sampled without a mirror; the AO a listed BC4 KTX2 with mips, the mural KTX2 with mips, one meshopt pool, the static shadow pass warmed one stand-in a frame; the downpipes, red bollard bands and underpass signs in LOD0; round 1 kept in models/underpass/r1/ (?underpass=old)",
  timeout: 300,
  deps: ["models/underpass/", "viewer/underground/", "viewer/character/", "data/tiles/D6/", "data/raw/osm/area.json", "viewer/aoKtx2List.js", "tools/audit/heroShell.ceil.json", "tools/mesh_audit/glb.mjs"],
  meta: {
    features: [{ key: "underpass", type: "on" }],
    clean: ["viewer/underground/"],
    text: [
      { file: "viewer/main.js", what: "adds the underpass with the landmarks (addUnderpass, ?underpass=0 off) and passes the switch to the tile worker", test: (s) => /const UNDERPASS = params\.get\("underpass"\) !== "0"/.test(s) && /m\.addUnderpass\(\{/.test(s) && /underpass: UNDERPASS/.test(s) },
      { file: "viewer/tileData.js", what: "cuts the wells in the drawn terrain, holes the street surfaces, leaves the tunnel ways out of the land cover (entry.underpass)", test: (s) => /underpassTerrain\(upass, terrain\)/.test(s) && /underpassSurfaces\(surf, upass\)/.test(s) && /underpassLines\(feats\)/.test(s) && /entry\.underpass/.test(s) },
      { file: "viewer/character/world.js", what: "the Heightfield's voids (off in the wells, off under the corridor's soffit only)", test: (s) => /export function inVoid\(/.test(s) && /this\.voids !== null && inVoid\(this\.voids/.test(s) },
      { file: "viewer/heroColliders.js", what: "the underpass root collides by its LOD0 (incl. the collision mesh)", test: (s) => /UNDERPASS_ROOT\]/.test(s) },
    ],
  },
};
