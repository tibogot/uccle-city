// gate row `tramsnap` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "tramsnap",
  script: "tools/tramfit/tramSnap.mjs",
  args: ["--max","stepDevP999=0.15,yawRateP999=5.5,yawRateMax=15.5,rUnder18=245"],
  guards: "tram 92 on the fitted tracks: a self-test first (claude/tramfix, rule no-undefined-refs: a made-up two-track line over two tiles, both snap paths finish, every snapped point < 0.2 m from its track, pts / cum / tan swapped in together), then its GTFS shapes snapped by the city's own code (viewer/tramSched.js createTrackSnap, which viewer/tramline.js runs), no more shape points unsnapped than on the OSM ways, the path's sideways jumps / yaw rate / sub-18 m radii under today's ceilings (claude/tramfit)",
};
