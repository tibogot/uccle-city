---
status: provisional
added: 2026-11-26
check: `winter` (tools/audit/winterCheck.mjs "season:" and "sun:" rows)
---
**Rule.** The city's season comes from ONE resolver, viewer/seasons/seasonMode.js (`SEASON`, three-free), that every
system reads at boot: winter exactly while the Christmas season is on (the Brussels date in 1 December - 6 January,
the layer's own `xmasActive`, or `?xmas=1`), summer otherwise. In winter the sun is the real December day's
(lighting.js `DAY = SEASON.day`), and the time presets are times of DAY: they keep their place against that day's
sunrise / sunset (`presetHour`: golden 1.3 h before sunset, twilight 0.45 h after, misty 0.8 h after sunrise, midday /
overcast 12:30 solar, night unchanged). The season's uniforms (viewer/seasons/season.js: lawns, shrubs, hedges, ivy,
the weather's crown shelter) are set on the lighting's day at boot (main.js), not only when the weather runs.
`?season=summer|winter` forces the mode (the A/B), `?day=` pins the day, `?hour=` / `?time=` / the sky panel the hour.
Outside the season nothing changes (day 200, the presets' July hours).

**Why.** The owner chose the winter look for Christmas (2026-11-26). The game review found the firs and the market
under green July plane trees in a golden July light: lighting.js had a fixed day 200, and the season uniforms followed
the lighting's day only through the weather (off under `?weather=old` / quick mode). A July "golden" hour (18:42 solar)
on a December day would be night.
