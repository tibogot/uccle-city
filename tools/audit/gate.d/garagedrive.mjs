// gate row `garagedrive` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "garagedrive",
  script: "tools/audit/garageDriveCheck.mjs",
  args: ["--quiet", "--max", "E=61"],
  guards: "(claude/reality2, rule garage-has-drive, class C5) every garage door the facade paints (tools/gardens/faces.mjs garageAt) has a paved drive to the street line in data/gardens/<T>.json drives, or stands on the sidewalk line (noRun); every drive square to its door (door width + 0.3 m a side), its end on the drawn sidewalk edge (gap <= 0.2 m), a 1-140 m2 quad with no wall / railing segment, pier, gate post or hedge point in it; ceilings E 61 (2 %: a corner ray meeting another street surface first, private lanes) of 3,136 drives; viewer/main.js draws them (?garagedrive=old none)",
  timeout: 600,
  deps: ["data/gardens/", "tools/gardens/build_gardens.py", "tools/gardens/faces.mjs", "viewer/main.js", "viewer/grounds.js", "tools/gardens/drawnSurfaces.mjs", "data/tiles/"],
  meta: { features: [{ key: "garagedrive", type: "old" }] },
};
