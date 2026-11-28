// gate row `zfight` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
// (claude/reality2) pairs 636 -> 674: rule bldclass-evidence round 4 (a solid on a commercial row is a shop house, not a
// balcony block) turns E3 Rue Xavier De Bue 72B (UrbIS building 1780981, one solid, an 18-corner footprint) into a maison
// de maitre: the facade kit's details on its short near-straight wall runs overlap each other, 22 -> 95 details+details
// pairs (1.65 -> 8.94 m2); A/B with the rule off: 601 pairs / 62 m2, every other building unchanged; m2 70 stays under 79.
// The kit's details at near-straight wall joints are the defect (Rue de Stalle 73 and Alsemberg 739 show the same class):
// left for a facade-kit job
// (claude/facades5, rule strip-square-to-edge) that job: the class was the DETAIL strips, not the kit's opening pieces:
// strips took their face's mean normal (edges ~1-2 deg off it) so collinear cornice pieces did not merge; one cornice's
// faces a few cm apart in height split by the 1 cm key; strips facing each other across a slot / notch ran through each
// other; one ridge given twice drew two beams. Gate tiles 674 / 70 m2 -> 422 / 33 m2 (details+details 580 -> 319);
// city-wide --all 4,903 / 597 m2 -> 3,094 / 278 m2 (details+details 4,157 -> 2,337; buildings >= 1 m2 109 -> 42);
// BUILD_OVER='{"stripFit":false}' (= ?stripfit=old) gives 674 / 70 / 580 and fails
export default {
  name: "zfight",
  script: "tools/audit/census/zfight.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["G2","F2","E3","G3","E4","D5","J5","E9","--heroes","--ivy","--jobs","4","--quiet","--max","pairs=440,m2=36,details=335,heroNew=842,ivyShop=0"],
  meta: { features: [{ key: "zfight", type: "old" }, { key: "stripfit", type: "old" }] },
  guards: "census class G (z-fighting): coplanar same-facing overlapping faces on the 8 tiles with the worst spots (Av. Hamoir 8 twice-given solid, Rue de Stalle 73 overlapping roof fans, Av. Adolphe Dupuich 24 doubled wall, the door steps' buried soffits) <= 440 pairs / 36 m2, the detail strips' own pairs <= 335 (claude/facades5, rule strip-square-to-edge: cornice pieces square to their edge and merged, facing strips cut back, one ridge one beam; ?stripfit=old 674 / 70 / 580 fails) (?zfight=old: 6,137 / 8,212 m2 fails; city-wide --all 32,001 / 33,117 m2 -> 4,825 / 634 m2); every landmark LOD1 / LOD2 coplanar pair LOD0 lacks there (faces collapsed by meshopt) <= 842 m2 (before ~2,410; left: the town hall LOD1 134 + LOD2 26 (needs its Blender export), the far levels (observatory 542, Saint-Pierre 71), one-slot folds (Saint-Pierre LOD1 18, Rosaire 27)); 0 ivy leaves on a street-life shopfront (old: 4,518 on 19 walls, Maison Dandoy); the façade kit's packed attribute codes decoded in the vertex stage / rounded (the window shimmer, images 87 / 93) (claude/zfight, rule 34 provisional, docs/CENSUS.md G)",
};
