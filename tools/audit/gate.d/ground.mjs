// gate row `ground` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "ground",
  script: "tools/audit/census/ground.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--all","--quiet","--jobs","4","--max","tilt=811,roadTilt=380,over=310,lump=867,spike=171,hole=3,gardenVoid=0,blade=0,stacked=0,bareBank=575,gateNoSteps=0"],
  guards: "census class C, all 120 tiles: sidewalks level with the kerb (tilt: sidewalk patches > 15 % across the kerb, 4,052 with ?sidewalk=old), road cross-fall bumps > 12 % (1,462 old), terrain drawn over a street (over, 361 old), weld lumps > 0.5 m (1,232 old), grid spikes (463 old), pits under the street (holes, 3 old), no retaining wall line behind another (stacked 0), bare > 42 degree earth over a wall's lawn (bareBank, 575 left: hillsides rising > 1.2 m within 3 m of the strip; G3 + H6 + E6 + I9 144 -> 60 with the round-5 bank), a gate in a wall over a > 0.3 m jump without steps (gateNoSteps 0; 44+ on 5 tiles with no steps built); rail cuttings / bridge abutments and the bank cut to a street edge are intended (claude/sidewalk, rule 31 provisional, docs/SIDEWALK.md)",
};
