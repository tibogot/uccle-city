// gate row `renders` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "renders",
  script: "tools/audit/rendersCheck.mjs",
  node: ["--import", "./tools/christmas/hook.mjs"],
  args: ["--quiet"],
  guards: "renders per frame (rule renders-per-frame, claude/renders, perf job D): the sun shadow cache redraws whole only for a change the map can show: a fade / tile mark redraws only when its caster bounds (or the tile's area) meet the light's frustum (no-caster groups, far tiles: none; frustumCulled = false counts anywhere; measured once, so a disposed group keeps its answer); the light's 25 m depth step is the lay-back's constant depth offset -P[10] x d (proved on the orthographic camera, normal and reversed depth), one step at most, the far plane +SUN_QZ, empty texels kept; main.js names the tile area at every tile mark; each behind its ?x=old",
  meta: {
    features: ["sunfadecast", "sundepthstep"].map((key) => ({ key, type: "old", group: "perf", sub: "Renders per frame" })),
  },
};
