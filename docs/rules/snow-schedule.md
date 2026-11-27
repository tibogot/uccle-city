---
status: provisional
added: 2026-11-27
check: `snowsched` (tools/audit/snowScheduleCheck.mjs)
---
**Rule.** The Christmas season's weather comes from ONE three-free resolver, viewer/seasons/snowSchedule.js, read once
at boot (cityWeather.js start, quick.js): 1-14 December dry (the winter look of rule season-from-date only), 15-26
December the weather's existing "snow cover" by day and "snowfall" (light: 0.4-0.9 cm/h) from 18:00 to 08:00, 27
December - 6 January dry again. Date and hour are Brussels' (the instant decides, not the visitor's clock); a pinned
`?day=` takes the scene's hour (`?time=` / `?hour=`, golden by default), never the wall clock. The numbers (depth
10-17 cm, the night's snowfall, wind, cloud) are seeded by the day: the same date gives the same weather (tours,
gates). It starts the EXISTING presets (their layer, caps, tracks, the snow2 cost-reduced path): nothing new per frame,
no new file before the cover. Any `?wx=` (clear, live, a preset) wins; `?season=summer`, `?xmas=0`, `?weather=old`
and the forced winter look (`?xmas=1` / `?season=winter` outside the real season, the Christmas tour) stay dry;
`?snowsched=old` = no automatic snow, as before.

**Why.** The owner chose snow for Christmas and asked "why no snow" (2026-11-27): the winter look (bare trees, a
December sun) came with the season, but the weather started clear unless `?wx=` asked for snow, so nobody playing the
live site ever saw the snow systems. All of December under snow would hide the first weeks' winter look and Brussels
rarely has it; the second half and the nights' snowfall give a white Christmas with a deterministic start for tours.
