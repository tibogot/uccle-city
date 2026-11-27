---
status: provisional
added: 2026-11-27
check: `snowsched` (tools/audit/snowScheduleCheck.mjs)
---
**Rule.** The Christmas season's weather comes from ONE three-free resolver, viewer/seasons/snowSchedule.js, read once
at boot (cityWeather.js start): 1-14 December dry (the winter look of rule season-from-date only), 15-26
December the weather's existing "snow cover" by day and "snowfall" (light: 0.4-0.9 cm/h) from 18:00 to 08:00, 27
December - 6 January dry again. Date and hour are Brussels' (the instant decides, not the visitor's clock); a pinned
`?day=` takes the scene's hour (`?time=` / `?hour=`, golden by default), never the wall clock. The numbers (depth
10-17 cm, the night's snowfall, wind, cloud) are seeded by the day: the same date gives the same weather (tours,
gates). It starts the EXISTING presets (their layer, caps, tracks, the snow2 cost-reduced path): nothing new per frame,
no new file before the cover. Any `?wx=` (clear, live, a preset) wins; `?season=summer`, `?xmas=0`, `?weather=old`
and the forced winter look (`?xmas=1` / `?season=winter` outside the real season, the Christmas tour) stay dry;
`?snowsched=old` = no automatic snow, as before. Quick mode (`?quick=1`: every tour view) keeps its
rule, the weather only when asked (`&with=weather`, `?wx=`), and viewer/quick.js imports nothing but the places table
(it is main.js's first import: its body rewrites the URL before any other module reads it).

**Why.** The owner chose snow for Christmas and asked "why no snow" (2026-11-27): the winter look (bare trees, a
December sun) came with the season, but the weather started clear unless `?wx=` asked for snow, so nobody playing the
live site ever saw the snow systems. All of December under snow would hide the first weeks' winter look and Brussels
rarely has it; the second half and the nights' snowfall give a white Christmas with a deterministic start for tours.

**Merge blocked (2026-11-27, tour snow1127).** Two tours of the branch failed their first view (stjob-shops: tile I5
"no answer from the tile worker in 45 s", not ready in 150 s). Not reproduced in five loads of the same view after
(the tour harness on both servers, a cold tile cache), and the view's start path does not touch the schedule
(`?xmas=0`, quick mode). The one change on that path was quick.js importing the schedule (seasonMode.js's SEASON then
evaluated before quick.js's URL rewrite): reverted, quick.js is foundation's again. Checks: row `snowsched` ("tours:"
every view of tools/tour/views*.json on 20 Dec noon / 22:00 gets no scheduled weather; "quick.js: imports the places
table only") and browser row `snowsched` (the stjob-shops view: ready, 0 console errors).
