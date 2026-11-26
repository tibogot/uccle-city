// gate row `garagedrive` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "garagedrive",
  script: "tools/audit/garageDriveCheck.mjs",
  args: ["--quiet"],
  guards: "(claude/reality2, rule garage-has-drive, class C5) every garage door the facade paints (tools/gardens/faces.mjs garageAt) has a paved drive to the street line in data/gardens/<T>.json drives, or stands on the sidewalk line (noRun); every drive a 2-140 m2 quad with no wall / railing segment, pier, gate post or hedge point in it; viewer/main.js draws them (?garagedrive=old none)",
  timeout: 120,
  deps: ["data/gardens/", "tools/gardens/build_gardens.py", "tools/gardens/faces.mjs", "viewer/main.js", "viewer/grounds.js"],
  meta: { features: [{ key: "garagedrive", type: "old" }] },
};
