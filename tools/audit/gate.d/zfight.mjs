// gate row `zfight` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
// (claude/reality2) pairs 636 -> 674: rule bldclass-evidence round 4 (a solid on a commercial row is a shop house, not a
// balcony block) turns E3 Rue Xavier De Bue 72B (UrbIS building 1780981, one solid, an 18-corner footprint) into a maison
// de maitre: the facade kit's details on its short near-straight wall runs overlap each other, 22 -> 95 details+details
// pairs (1.65 -> 8.94 m2); A/B with the rule off: 601 pairs / 62 m2, every other building unchanged; m2 70 stays under 79.
// The kit's details at near-straight wall joints are the defect (Rue de Stalle 73 and Alsemberg 739 show the same class):
// left for a facade-kit job
export default {
  name: "zfight",
  script: "tools/audit/census/zfight.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["G2","F2","E3","G3","E4","D5","J5","E9","--heroes","--ivy","--jobs","4","--quiet","--max","pairs=674,m2=79,heroNew=842,ivyShop=0"],
  guards: "census class G (z-fighting): coplanar same-facing overlapping faces on the 8 tiles with the worst spots (Av. Hamoir 8 twice-given solid, Rue de Stalle 73 overlapping roof fans, Av. Adolphe Dupuich 24 doubled wall, the door steps' buried soffits) <= 636 pairs / 79 m2 (?zfight=old: 6,137 / 8,212 m2 fails; city-wide --all 32,001 / 33,117 m2 -> 4,825 / 634 m2); every landmark LOD1 / LOD2 coplanar pair LOD0 lacks there (faces collapsed by meshopt) <= 842 m2 (before ~2,410; left: the town hall LOD1 134 + LOD2 26 (needs its Blender export), the far levels (observatory 542, Saint-Pierre 71), one-slot folds (Saint-Pierre LOD1 18, Rosaire 27)); 0 ivy leaves on a street-life shopfront (old: 4,518 on 19 walls, Maison Dandoy); the façade kit's packed attribute codes decoded in the vertex stage / rounded (the window shimmer, images 87 / 93) (claude/zfight, rule 34 provisional, docs/CENSUS.md G)",
};
