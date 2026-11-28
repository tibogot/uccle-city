// gate row `missions` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "missions",
  script: "tools/audit/missionAudit.mjs",
  node: ["--import", "./tools/road_audit/register.mjs"],
  args: ["--quiet"],
  deps: ["data/transit/stib-92.json", "data/game/police_spots.json", "data/roads/network.json", "data/tiles/manifest.json", "models/cars/cars2.glb", "viewer/carFleet.js", "viewer/police/policeMissions.js", "viewer/police/policeGame.js", "viewer/tramline.js"],
  meta: {
    features: [{ key: "missions", type: "old" }],
    clean: ["viewer/police/missionPremise.js", "viewer/tramSched.js", "viewer/police/policeMissions.js"],
    text: [
      { file: "viewer/tramline.js", what: "draws the trams from the shared timetable / blocked-track code", test: (s) => /createTramSched\(\{ shapes, trips, doc \}\)/.test(s) && /tripTime\(t, T\)/.test(s) },
      { file: "viewer/police/policeMissions.js", what: "places the blocked tram with pickTramSpot (the timetable), not by distance alone", test: (s) => /pickTramSpot\(tl, P, rng/.test(s) },
      { file: "viewer/police/policeMissions.js", what: "places the crash with placeAccident and the speeder with pickSpeeder / speederMissed", test: (s) => /placeAccident\(j, snap, rng/.test(s) && /pickSpeeder\(sim, at/.test(s) && /speederMissed\(sim/.test(s) },
      { file: "viewer/police/policeGame.js", what: "makes the premise at the call and watches it (1 Hz), cancelling without a penalty", test: (s) => /p\.setup\(\); G\.live = p/.test(s) && /watchPremise\(kit\);/.test(s) && /m\.abort\(\); kit\.mission = null/.test(s) },
    ],
  },
  guards: "every police job's premise true where it plays (rule mission-premise, claude/missions, viewer/police/missionPremise.js): tram 92's real timetable (viewer/tramSched.js, the code tramline.js draws with) over 400 seeds (day type, clock 0-24 h, the player anywhere in the built city): every blocked-tram spot has a tram held right behind the car (front within gap + 4 m) by the promised time, never later than the quickest arrival, for 180 s with 7 s frame gaps (no creep), no car put inside a tram, no job with the trams off or outside service hours, a job on >= 80 % of the day-time seeds; every junction spot's crash: both damaged cars within 12 m of the scene and <= 4.5 m off an OSM road line (the map worker's snap), the cones on the road, no road = no job; the real TrafficSim on F2 F3 G3: the stolen car taken at the call alive and held for 180 s while fleeing, the radar's speeder a car on its way past the sign (>= 60 % come within 22 m, every spot with traffic gets one in 150 s); ?missions=old fails it",
};
