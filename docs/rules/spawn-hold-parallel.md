---
status: provisional
added: 2026-11-28
check: `nightwarm` (tools/audit/nightWarmCheck.mjs, the spawn part: main.js teleport runs teleportNow and areaReady side by side for a first teleport into third person, then a second short hold; the kit no longer boots the character first; ?spawnpar=old) + browser row `nightwarm` (the police start's __gameTimes "teleport third (side by side)")
---
**Rule.** Work behind the play loader that does not depend on each other runs side by side, never one after the other. Then one short extra hold (areaReady without settle) covers whatever finished last, so its first frames and pipelines are still done under the cover.

**Why.** claude/policeyard starts the police shift in third person under the loader, to warm the character before the first Get out / Get in (2.5 s / 300 ms frames otherwise). The game kit booted the character first (model, collision world, pipelines: 8-14 s under the loader), and only then teleported and started the area hold (15-28 s). The boot does not need the area and the area does not need the character. The police start's 27.6 s "police spawn" was the two added together: ~11-15 s of play time after the area was already built (docs/perf/QUIET_2026-11-27.md 3c). Now viewer/main.js teleport, for a first teleport into third person, runs teleportNow (which boots the character at the spawn) beside areaReady, then runs a second areaReady({ settle: false }): ~0.6 s when everything is already built.
