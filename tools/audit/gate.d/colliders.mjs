// gate row `colliders` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "colliders",
  script: "tools/audit/colliderAudit.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["F1","E4","B6","D4","--jobs","4","--quiet","--worst","0","--max","gate=0,lane=75,missing=6,invisible=8,offset=17"],
  guards: "colliders vs what is drawn on 4 tiles (Carre Cassimans F1, the police station E4, Professeur Hustin B6, the D4 slope block): the police gate mouth clear, building colliders traced from the SUNK walls (?colfeet=old: missing 10 / invisible 13 / offset 34 fails), no new lane blocker (ceilings); city-wide: --all (claude/collisions, rule 25 provisional, docs/COLLIDER_AUDIT.md); invisible 8 since claude/walls2 (rule walls-closed-from-street): E4 (-696.5, -6.1) 5.9 m2, building 529646: its car-band wall ring closes now that the feet no longer tear it, so its collider fills inside, while the drawn walls traced on the audit's lattice leave a dotted gap along its NW wall (foot 54.68, at the top of the 0.3-1.3 m band over the lower drive surface); the same fix took missing 7 -> 5 and offset 19 -> 17 on these tiles",
};
