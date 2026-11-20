// gate row `dent` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "dent",
  script: "tools/audit/dentGate.mjs",
  node: ["--preserve-symlinks","--import","./tools/christmas/hook.mjs"],
  args: ["--quiet"],
  guards: "car dents never a hole (rule 41, docs/CARHIT.md): every model of the 4 packs at every LOD dented 28 cm on each corner + all four by the shader's own field (carDent.js): 0 wound-round triangles seen from outside (17 views) on levels nearer than 55 m, 0 see-through holes >= 4.5 cm, 0 plate glyphs sunk, 0 torn seams, nothing across the mid-planes or into the cabin box, no NaN, the wheels untouched; ?dent=old measured failing; a features row, no draw call / light / DynamicDrawUsage, the materials compile to WGSL with the dent",
  meta: {
    features: [{ key: "dent", type: "old" }],
    clean: ["viewer/drive/carDent.js", "viewer/drive/carPacks.js", "viewer/police/props.js", "viewer/traffic/trafficFleet.js", "viewer/carFleet.js"],
  },
};
