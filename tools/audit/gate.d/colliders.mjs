// gate row `colliders` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "colliders",
  script: "tools/audit/colliderAudit.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["F1","E4","B6","D4","--jobs","4","--quiet","--worst","0","--max","gate=0,lane=75,missing=6,invisible=7,offset=17"],
  guards: "colliders vs what is drawn on 4 tiles (Carre Cassimans F1, the police station E4, Professeur Hustin B6, the D4 slope block): the police gate mouth clear, building colliders traced from the SUNK walls (?colfeet=old: missing 10 / invisible 13 / offset 34 fails), no new lane blocker (ceilings); city-wide: --all (claude/collisions, rule 25 provisional, docs/COLLIDER_AUDIT.md)",
};
