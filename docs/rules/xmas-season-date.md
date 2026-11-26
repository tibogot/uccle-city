---
status: provisional
added: 2026-11-26
check: `xmastest` (tools/christmas/xmasTest.mjs: the date switch rows, instants in UTC round the Brussels midnights)
---
**Rule.** A date-driven layer of the commune (the Christmas layer: 1 December - 6 January) follows the BRUSSELS
calendar (Europe/Brussels through Intl, viewer/christmas/xmasDate.js `brusselsDate`), not the visitor's clock;
`?xmas=1` / `?xmas=0` force it, a simulated `?day=` (day of the year) decides when given. One function
(`xmasActive`) for every part of the layer (main.js, the December windows, the city code). The tests use UTC instants
on both sides of the Brussels midnights, so they hold on a machine in any time zone.

**Why.** `xmasActive` read the visitor's LOCAL date (`getMonth` / `getDate`): a player in Montreal would see the square
switch on six hours after Uccle, one in Tokyo on 30 November. The tests built their dates in the machine's local time,
so they could never see it (and would have failed on a machine east of Brussels at midnight dates).
