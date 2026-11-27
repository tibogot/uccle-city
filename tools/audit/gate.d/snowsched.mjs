// gate row `snowsched` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "snowsched",
  script: "tools/audit/snowScheduleCheck.mjs",
  args: ["--quiet"],
  guards: "the Christmas snow schedule (owner 2026-11-27 'why no snow', rule snow-schedule, claude/snowseason): viewer/seasons/snowSchedule.js gives the start weather from the Brussels date and hour (UTC instants round the midnights and the 18:00 / 08:00 edges): 1-14 Dec dry, 15-26 Dec the existing snow cover by day and cover + a light snowfall (0.4-0.9 cm/h) 18:00-08:00, 27 Dec on dry; a pinned ?day= uses the scene's hour (?time= / ?hour=, golden by default), never the wall clock; seeded by the day (same date = same weather); any ?wx= / ?season=summer / ?xmas=0 / ?snowsched=old / ?weather=old and ?xmas=1 outside the season: no automatic snow; cityWeather.js starts the existing presets from it (nothing new per frame), quick.js brings the weather on a snow day",
  meta: {
    features: [{ key: "snowsched", type: "old", group: "world" }],
    clean: ["viewer/seasons/snowSchedule.js"],
  },
};
