# The night loader (claude/nightload, 2026-11-28)

## Root cause

viewer/nightLights/cityNight.js warms the two shadowed lamps' passes for every street-scale caster (the by-day warm-up:
both shadow lamps pointed at the city from 350 m up for one frame, WARM_LAYER). It was called only from the by-day branch
(`lastScale <= 0`). A police game started at night (?game=police&time=night) never ran it: `warmPending()` stayed at
~750 (763 measured: every tagged caster), the spawn's area hold (main.js areaReady `settled`) waited to its 70 s limit,
the hold failed so `bootSettled` stayed false and the police game's own area hold waited for it AGAIN (70 s): play at
181.8 s (?nightwarm=old, measured 08:45 under load). Foundation is the same (?policeyard=old).

## Fix (rule night-warm-at-night, row nightwarm)

At night the lamps' passes are warmed IN PLACE: one stand-in per (material, geometry layout), the key the node build and
pipeline are shared by, drawn with a zero-scale matrix (no pixel) on the lamps' own layer (never the main camera's), both
maps forced to one full render, kept until both passes drew it. No light moved, added or dimmed; no DynamicDrawUsage.
Under the play loader 48 keys a frame and the loader waits for the spawn ring's (`warmPending({ x, z, r })`); after play
one key every 12 frames. The police spawn's 763 casters are 279-286 keys.

## Numbers (system preflight YELLOW: CPU 11 % at rest, servers 8838 / 8841; page preflight CPU 76.9 vs 73.8 OK, GPU 4.26
OK, boot-to-cover 27.1 vs 21.1 s RED (the city's own boot, +22 % already this morning); browser.lock held, page in front
(hasFocus true at every poll), fresh tab per load, lock owner + other processes checked after each run)

Night police start, 3 + 3 alternated 09:41-09:50 (NEW = default, OLD = &nighthold=old: the loader does not wait; both
with the spawn change that was then on and is now reverted, so absolute times are ~3-5 s high, the A/B holds):

| run | play | cover | hold (cover -> play) | spawn area hold | night keys left at play |
|---|---|---|---|---|---|
| NEW 1 | 59.0 s | 23.3 | 35.7 | 29.4 ok | 0 (284 warmed) |
| OLD 1 | 57.5 | 22.4 | 35.1 | 28.9 ok | 249 |
| NEW 2 (one other process alive just before) | 63.9 | 25.2 | 38.8 | 31.5 ok | 0 |
| OLD 2 | 60.9 | 23.4 | 37.4 | 32.0 ok | 248 |
| NEW 3 | 56.4 | 22.0 | 34.5 | 28.4 ok | 0 |
| OLD 3 | 55.9 | 21.8 | 34.1 | 28.2 ok | 254 |

- Medians: NEW play 59.0 / hold 35.7, OLD (no wait) 57.5 / 35.1: warming the spawn's 284 keys under the cover costs
  ~0.6 s of hold. Before the fix the same start took 181.8 s (?nightwarm=old).
- Final code (spawn change reverted), night: play 54.0 s, hold 32.0 (character boot 10.4 + area hold 14.0), 286 keys, 0 lost.
- After play, the spread (OLD 3's 254 keys left): 45 keys warmed in 9 s, 540 frames, avg 16.7 ms, p99 16.9, worst 17,
  0 over 25 ms. Four consecutive screenshots with a lit lamp in view during it: 0.009-0.012 % of pixels > 24 apart (the
  dispatch timer bar): no lamp-shadow flash.
- Day police start (no &time): with the spawn change 62.9 s / hold 37.7; ?spawnpar=old (= now the default) 57.0 / 32.6.

## The police yard spawn (11-15 s after the area)

`__gameTimes` (new marks in game/kit.js spawnPlayer and main.js teleport): the kit boots the character first ("spawn
third person boot" 9.1-10.4 s quiet, 14 s loaded), then the teleport's area hold (14-18 s; the `"?"` trace is this spawn
hold: the kit's teleport has no label, and there is no separate boot hold in the game). Tried: the boot BESIDE the area
hold (?spawnpar): slower (day 32.4 s spawn vs 27.5): during the sequential boot the tiles keep streaming anyway (done
13.2 s into the following hold), side by side the boot's main-thread / compile work held the tiles back to 30.7 s.
Reverted. The levers left: the character boot itself (9-10 s: model, collision world, pipelines; split it into what
the first frames need and the rest), and the area's tiles (the slowest ring tiles under the loader). Not done here.
