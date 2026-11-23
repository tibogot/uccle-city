# Christmas layer plan, 2026 (written 2026-11-23)

Goal from the owner: a Christmas layer before Christmas 2026, work starting by about 1 December. It needs Christmas
trees on Place Saint-Job and the Parvis Saint-Pierre and garlands and lights in the streets. This plan builds on
docs/CHRISTMAS.md (the build log) and must follow rule 19 (docs/rules/seasonal-layer-placement.md).

## For the owner, in plain words

- **Most of it is already built and merged.** Since 17-20 November `claude/foundation` has these:
  - a 10 m decorated Nordmann fir on Place Saint-Job and a 9 m one on the Parvis Saint-Pierre, with needle cards up
    close, warm LEDs and baubles;
  - a 6-chalet market on Place Saint-Job;
  - 56 LED garlands across the streets, with a hanging star in the middle when the span is not over a tram line;
  - fir swags over 107 shopfronts;
  - 120 door wreaths;
  - LED snowflakes on two street lamps in three.

  The streets are the Chaussée de Saint-Job, Place de Saint-Job, Rue Xavier De Bue, Chaussée d'Alsemberg and the Parvis
  Saint-Pierre.
- **It turns itself on by date.** It runs from 1 December to 6 January on the real date, including on the live
  Vercel site. `?xmas=1` forces it on and `?xmas=0` forces it off. Nothing has to be "switched on". The real question is
  whether it is good and cheap enough by 1 December to show to everyone who opens the site.
- **Cost:** about +0.00 ms on a quiet machine at street level when last measured on GREEN. On a busy machine it was
  +0.33-0.59 ms. The fir alone, when it fills the screen, is modelled at about 0.1 ms after round 3.
- **What is left is small:**
  - one width bug, which is latent: no decorated shop is affected today;
  - a proper tour of the Christmas views at night;
  - a boot and perf check with the layer on, because every visitor gets it from 1 December;
  - your review in the game;
  - a few optional extras: garlands on poles where Saint-Job's houses are too low, lights in the square's plane trees,
    warm lights in windows.
- **What Uccle really does:** online sources are thin. Nothing recent was found about the trees, the garlands or a
  December market. That covers press, uccle.be, the CCU and agendas; see section 2. Your word from 2026-11-17 is our
  best source: a big fir on both squares and a small chalet market on Place Saint-Job. A quick Street View look is
  planned (job 4).
- **Your choices** are in section 6. The main ones:
  - the dates: keep 1 Dec - 6 Jan, or start on the last weekend of November as Brussels does;
  - keep the market;
  - snow by default or not;
  - which extras to do.

## 1. What exists (read from the code and docs, 2026-11-23)

**Merged on `claude/foundation`.** `claude/christmas`, `claude/xmasfir` and `claude/xmasfir3` are all 0 commits ahead.

| part | where | state |
|---|---|---|
| Blender kit: tree, chalet, swag, wreath, lampmotif, spanmotif, each with 3 LODs | `tools/blender/christmasKit.py`, `tools/blender/firNeedles.py`, `tools/christmas/fir_needles_ktx2.py` | merged. Mesh audit 0 blocking (`models/christmas/audit/`). OptiX AO bake |
| pack + LODs | `tools/christmas_pack.mjs` -> `models/christmas/christmas.glb` (6.0 MB), `fir_needles.ktx2` (0.76 MB), `christmas.json` | merged. The raw GLB is gitignored |
| placement | `tools/christmas/build_site.py` -> `models/christmas/site.json` | 2 trees, 6 chalets, 56 spans (13 at Saint-Job, 43 at Saint-Pierre; 31 over a tram at 7.3 m with no star), 107 fronts, 120 wreaths, 29 street lines. `config.streets[...]` switches spans / swags / wreaths / lamps per street, and `config.chalets` switches the market |
| city code | `viewer/christmas/xmasCity.js` (`addChristmas`, `xmasActive`), `viewer/christmas/xmasKit.js` (materials, TSL) | merged. Loaded in the background from the heroes queue in `viewer/main.js` (~l.1556), so it never holds the boot |
| switches | `viewer/features.js`: `?xmas` (by date / 1 / 0), `?xmaschalets=0`, `?firprepass=0`, `?firshadow=cards`, `?day=` (day of year) | by date: 1 Dec - 6 Jan |
| fir round 3: the cards' depth pre-pass, the shadow from the far fronds, the card shell at the middle level | xmasKit.js / xmasCity.js | merged 2026-11-20 on the fast lane. The saving was not measurable on a busy machine (RED preflight) |
| gate rows | `xmas` (`tools/audit/xmasCheck.mjs`), `xmastest` (`tools/christmas/xmasTest.mjs`), browser row `xmasfir3` (`tools/audit/gate.d/browser/xmasfir3.mjs`) | in mergeGate. `xmas` also checks: no light added, no DynamicDrawUsage under `viewer/christmas/` |
| rule | QUALITY_RULES row 19, `docs/rules/seasonal-layer-placement.md` | |
| tour | `tools/tour/views_xmas.json` = the 22 city views with `xmas=1`. The main tour runs with `xmas=0` so its baseline does not flip on 1 Dec | only 3 views show the layer (stjob-shops, stjob-60m, stpierre-parvis), all at golden hour |
| images | `docs/christmas/*.jpg`, `docs/christmas/blender/` | day and night, both squares, the 45 m LOD switch |

**How it is built:**
- **Instancing:** one InstancedMesh per piece, level and slot, with shared matrix and band buffers that are uploaded
  once. The buckets are re-made when the camera has moved 4 m.
- **Fixed caps:** tree 8, chalet 32, others 2048.
- **Street spans:** the garlands across the streets are 2 merged static meshes, 2,282 LEDs.
- **Smooth LOD:** a per-instance `xlod` band and a dithered cross-fade, with solid and fade mesh sets.
- **Light:** emissive only, with a shimmer and flash bulbs, x9 at night, plus the city's bloom (`viewer/post.js`).
- **Shadows:** only the firs (shadow-only copies of the far fronds on layer 25) and the chalets cast.
- **Colliders:** the planter and the chalets are drive colliders for the car only.

**Open (from docs/CHRISTMAS.md §9, TODO.md "Christmas", and this read):**
1. **The swag width ignores the curated front (the claude/carrefour finding).** `xmasCity.js` l.244 does
   `W = clamp(f.w, 2, 9.9)` from `site.json`'s own `w`, and `build_site.py` caps it at 6.5 m. It never reads the
   curated `data/shops/terraces.json` `front.w` / `front.du`. `shopLayout.js` l.118 now allows up to 40 m when `cf.w` is
   set and moves the front by `du`.
   - Today this is **latent**: the one curated wide front (Carrefour Marlow, `osm:n255033292`, 18 m, du 11.8) is not
     among the 107 decorated fronts.
   - It bites as soon as a decorated street gets a curated wide or moved front, or the decorated area grows.
   - Fix: take W and the centre from the same curated data as `layoutShop`, through one shared helper so the two
     cannot drift apart again.
2. **The Christmas tour is thin.** There is no night view, no garland street view (Xavier De Bue, Alsemberg), no lamp
   snowflake view, and no market at night. Its baseline is the old "christmas" run, from before many merges.
3. **Not re-measured on GREEN** since round 3. The pre-pass gain is unproven, and the whole layer read +0.33-0.59 ms
   on YELLOW.
4. **Boot impact when on by date:** 6.0 + 0.76 MB extra download, the shader warm-up (`window.xmas.tComp`), and the
   HEAP 5-boot line. All of this needs re-checking after the merges since 17 Nov (perf idea 8 wants Christmas fetched
   at `priority: 'low'`).
5. **The owner's review in the game** has not happened yet (TODO l.209).
6. **Saint-Job has only 13 spans:** the walls of the two-storey houses rarely reach 6.8 m. Brussels also hangs
   garlands from poles (not done).
7. **Not done:**
   - lights in the square's plane trees;
   - decorations in the shop windows;
   - warm strings in house windows;
   - the planter and chalets as colliders for the walker (only the car is blocked now).
8. **Not verified against reality:** the tree spots and sizes, the garland pattern, the lamp motifs (estimates, §2).
9. **site.json was built before the data/raw restore** (docs/DATA_RESTORE_2026-11-23.md). It has to be rebuilt from
   the restored data with the diff checked: it should be byte-identical or explained.

## 2. What Uccle really does (online, look only, 2026-11-23)

Searched: uccle.be, ccu.be, BX1, L'Avenir / DH, La Libre, visit.brussels, quefaire.be, in FR and NL. No image was
stored.

- **No recent Uccle Christmas market was found.**
  - The last documented "Marché de Noël d'Uccle" on Place Saint-Job was the 13th edition, 27-30 **November** 2008,
    with ~100 exhibitors ([L'Avenir, 14 Nov 2008](https://www.lavenir.net/regions/bruxelles/uccle/2008/11/14/noel-a-saint-job-WLC5MOIPWZG4HKMHY5ABSI5ZHE/)).
  - Agenda round-ups for December 2025 list markets in other communes, but nothing on the Uccle squares
    ([L'Avenir, 5 Dec 2025](https://www.lavenir.net/regions/bruxelles/2025/12/05/ce-week-end-a-bruxelles-idoles-des-jeunes-et-des-plus-tres-jeunes-cadeaux-de-caracteres-et-frites-sauce-vin-chaud-14-sorties-dont-8-marches-de-noel-NKSDV2HVZNCVDN2MFB5GQSHY6Q/),
    [visit.brussels market selection](https://www.visit.brussels/fr/visiteurs/agenda/noel-a-bruxelles-notre-selection-de-marches)).
  - The one Uccle date found is an artisan day at La Roseraie on 6 Dec 2025.
  - The commune's own September event on the square is the "Marché annuel de Saint-Job"
    ([uccle.be](https://www.uccle.be/fr/agenda/marche-annuel-de-saint-job)).
  - The owner said on 2026-11-17 that there WILL be a small chalet market on Place Saint-Job. We keep it, as an owner
    fact.
- **Trees:** no article or photo found for Saint-Job or Saint-Pierre. The owner confirms both. There was a Christmas
  concert in the Église Saint-Pierre on 12 Dec 2025
  ([allevents](https://allevents.in/uccle/uccle-chante-no%C3%ABl/200025780177812)).
- **Shopping streets:**
  - The Uccle-Centre traders' union, the commune, STIB and hub.brussels ran a 14 Dec - 16 Jan Christmas QR-code hunt.
    It covered Rue Xavier De Bue, the Chaussée d'Alsemberg and the Parvis Saint-Pierre, the same streets we decorate
    ([BX1](https://bx1.be/categories/news/uccle-une-action-pour-soutenir-les-commercants-touches-par-les-travaux-de-la-ligne-51/),
    from the tram 51 works period; the year is not shown).
  - The commune gives 2 h of free parking on Saturdays in the holidays to support the shops
    ([L'Avenir, 29 May 2026](https://www.lavenir.net/regions/bruxelles/uccle/2026/05/29/stationnement-gratuit-de-2-heures-pendant-les-fetes-uccle-debourse-plus-de-18000-par-samedi-OPD3BCDFOJCFBPFQYJJPRYZVBY/)).
  - No source describes Uccle's garland style.
- **Brussels practice (the default style):**
  - The City of Brussels' "Enjoy BXL by Lights" ran **26 Nov 2025 - 4 Jan 2026**, 13:00-01:00
    ([brussels.be](https://www.brussels.be/christmas-lights-shopping-streets-brussels-lights)).
  - The Grand-Place tree was lit on 28 Nov 2025
    ([Paris Match, 17 Nov 2025](https://www.parismatch.be/lifestyle/tendances-et-loisirs/2025/11/17/voici-quand-le-sapin-de-noel-2025-sera-installe-sur-la-grand-place-de-bruxelles-YKMM5ZU6PVGKRL2U7RZ2KNLABQ/)).
  - Earlier finds (docs/CHRISTMAS.md §1): warm-white LED strings across the streets and red / gold / champagne
    baubles. Real lights in Brussels go on in the **last week of November**, not on 1 December.
- **Weather note:** Christmas 2025 in Uccle was the coldest since 2010, with a high of about -0.3 °C
  ([Paris Match, 25 Dec 2025](https://www.parismatch.be/actualites/environnement/2025/12/25/le-noel-le-plus-froid-depuis-2010-les-temperatures-nont-pas-depasse-zero-degre-en-belgique-en-ce-jour-festif-BX4SKYU425CCNHETERYZWNRSSI/)).
  Frost and a light snow cover are believable, but not the norm.
- **Not verified (job 4):** where the trees stand and how big they are, the garland pattern, and the lamp motifs. A
  Street View look, only if December captures exist, look only.

## 3. Perf constraints (from our docs and rules)

- **Lights:**
  - Never add or remove a light at runtime (memory fixed-light-count; adding one rebuilds every shader and freezes the
    game). Every Christmas light is **emissive + bloom**, never a PointLight.
  - A new "glow" on the ground or a wall is an emissive decal or a texture term, not a light.
  - Gate: the `xmas` row's no-light check.
- **Buffers:**
  - No `DynamicDrawUsage` (r187 re-uploads such a buffer whole every pass). Instance buffers are static, with
    `needsUpdate` and update ranges.
  - Shimmer and flash happen in the shader from time + a per-instance phase, never as per-frame buffer writes.
  - Gate: the `xmas` row's DynamicDrawUsage check.
- **New pieces:**
  - Every new piece joins `XmasField`: one InstancedMesh per piece, level and slot, under the fixed caps, with the
    shared band buffers.
  - Empty meshes are hidden.
  - Its shaders are compiled in the warm-up before anything shows.
- **Smooth LOD** (memory smooth-lod-no-popping):
  - Each new piece gets 3 levels with the dithered `xlod` band, the solid set inside the band, and the fade set only
    near a switch.
  - No piece pops. It is checked by walking and driving through the switches.
- **Shadows** (docs/SHADOWS_RESEARCH_2026-11.md):
  - Small pieces cast nothing. Only the firs (far fronds on layer 25) and the chalets cast.
  - Alpha-tested cards never go into the sun's map.
  - The coming `sunstep` and shadow stand-ins jobs (layer 3) must keep layer 25 enabled on the sun's shadow camera.
    Add that as a gate test in whichever branch touches the shadow camera.
- **Budget** (docs/CHRISTMAS.md §6):
  - < 0.3 ms GPU at night at street level for the whole layer;
  - ~0 away from the decorated areas;
  - the fir's cards <= 0.1 ms at 8 m;
  - any extra (poles, plane-tree lights, windows) <= +0.05 ms each, measured with `debug/gpuAB.js alternate`.
- **Measurement:** measure only on GREEN (`tools/perf/preflight.ps1` + `debug/preflight.js`), one Chrome tab, and time
  claimed regressions old/new interleaved (rule timing-rows).
- **Boot:**
  - From 1 Dec the layer is on for everyone. Its fetches must not compete with the start tile: use
    `priority: 'low'` (PERF_RESEARCH idea 8) and start after the spawn is built.
  - Time to play must not grow (police ~43 s today).

## 4. Jobs, in order (1-2 items each; small jobs, fast checks)

Each job: switch-guarded where it changes the look (`?x=old`), the merge gate (`tools/audit/mergeGate.mjs`), and the
tour. The main tour (`views.json`, xmas off) must show 0 flagged, and the Christmas tour (`views_xmas.json`) is
compared against its new baseline. Each job deletes its worktree after the merge.

| # | job (items) | gate checks | tour view | by |
|---|---|---|---|---|
| 0 | **Data audit, offline, no browser:** (a) rebuild `site.json` from the restored data/raw and diff it; (b) run `xmas` + `xmastest` on the current foundation | `xmas`, `xmastest` PASS; site.json diff empty or explained in docs/CHRISTMAS.md | none | Wed 25 Nov |
| 1 | **Swag width from the curated front** (open item 1): one helper shared by `shopLayout.layoutShop` and `xmasCity` for W (`cf.w ? 40 : 9.9`) and the shift `du` | new `xmas` sub-check: every swag run lies inside its front's DRAWN span (same W and centre as layoutShop), tested on a synthetic curated 18 m front + the Carrefour id; `curatedplaces` still PASS | stjob-shops (unchanged) | Thu 26 Nov |
| 2 | **Christmas tour views + baseline:** add to `views_xmas.json` stjob-night (the fir + market), debue-garlands-night, alsemberg-spans-night (a tram span at 7.3 m), stpierre-night, stjob-lamp-snowflake (eye height), one 45 m fir-switch view; record a new "xmas2026" baseline | `tourdet` (determinism of the new views); the main tour 0 flagged | the new views | Fri 27 Nov |
| 3 | **Boot and perf with the layer on (browser turn, GREEN):** (a) Christmas fetches `priority: 'low'`, started after the spawn is built; (b) HEAP 5-boot line + time to play + `gamePerf police` with `xmas=1` vs `xmas=0`; the XMASFIR3 A/B re-measured | browser rows `xmasfir3`, `heap`; new offline check that the Christmas fetches carry `priority: 'low'`; numbers into docs/CHRISTMAS.md | all `views_xmas` views | Sun 29 Nov |
| - | **Deploy** the foundation to Vercel before 1 Dec (it flips on by date). Owner OK first | full gate on main | full city tour, xmas off and on | Mon 30 Nov |
| 4 | **Owner review + reality look:** the owner plays `?xmas=1`; a Street View look at both squares and the Xavier De Bue / Alsemberg / Saint-Job garlands (look only, December captures if any). Fixes are site.json `config` edits only (per-street on/off, tree yaw / scale) | `xmas` (placement rule 19) | stjob-night, stpierre-night | Thu 3 Dec |
| 5 | **Garlands on poles at Saint-Job** (if the owner wants them; open item 6): build_site adds a slim pole each side where no wall holds a 6.8 m hook. Poles on paving, clear of doors and tram, joined to the ground | `xmas`: pole on paving, clear of doors / trunks / tram, foot within 2 cm of the ground (joins rule), span >= 4.4 m over the street; mesh audit 0 blocking | new `stjob-chaussee-night` | Tue 8 Dec |
| 6 | **Light strings in Place Saint-Job's plane trees** (optional): emissive bead strips instanced along the drawn trees' trunks and major limbs, one draw, LOD dithered, off by day | `xmas` no-light / no-DynamicDraw; a new check that every bead is within 15 cm of a trunk or limb; gpuAB <= +0.05 ms | stjob-night | Fri 11 Dec |
| 7 | **Warm window strings** (optional): in December a fraction of the lit house and shop windows get a warm LED-string term in the facade shader (a uniform, no new material) | `xmastest`: the uniform is 0 when the layer is off (main tour unchanged); gpuAB <= +0.03 ms | night-vanderkindere (xmas tour) | Tue 15 Dec |
| 8 | **Walker colliders** for the planter and the chalets (third person, kid game) | collider audit row: the walker cannot enter the planter or the chalet footprints | none | Wed 16 Dec |
| 9 | **Final:** full gate, both tours, GREEN perf on the whole layer at both squares day / night / snow, deploy | everything | everything | Fri 18 Dec |
| - | Buffer | | | Sun 20 Dec |

Jobs 5-7 are extras that need the owner's yes. If any of them is not on time it stays behind its switch, off. The
layer as merged is already shippable, so jobs 0-4 are the must-haves.

## 5. Risks

- **The live site flips on 1 December by itself.** If job 3 finds a boot or perf regression, the fallback is
  `config` in site.json (chalets off, streets off) or a one-line date change. Do not leave a broken layer on for every
  visitor.
- **Perf is noisy on this laptop.** Round 3's gain was not measurable on RED. Measure only on GREEN. Without GREEN
  before 30 Nov, ship with the YELLOW numbers flagged.
- **The shadow jobs** (`sunstep`, stand-ins) could drop layer 25 from the sun camera: the firs would then cast no
  shadow. Covered by the gate test in §3.
- **Shared code drift:** the swag width bug came from `shopLayout.js` changing without `xmasCity.js`. Job 1's shared
  helper prevents a repeat.
- **Data drift:** a rebuild of the roads, shops or UrbIS can move the fronts and walls. site.json is baked, so swags
  could float. Job 0 and the `xmas` placement checks catch it, but only if site.json is rebuilt with the data.
- **Owner availability:** the review (job 4) gates the extras. If it slips past 5 Dec, drop 6-7.
- **Agent count:** max 2 at a time (GPU noise). Christmas jobs are small, so run them alongside the other work, not
  in parallel with each other.

## 6. What needs the owner's choice

1. **Dates:** keep **1 Dec - 6 Jan** (today's code, Epiphany end), or start like Brussels, about **26-28 Nov** (the
   last weekend of November), so the site matches the real streets. It is a one-line change in `xmasActive` +
   site.json `season`.
2. **On by default** on the live site in that window (today: yes, by date)? Or only with `?xmas=1` until job 3
   passes?
3. **The market:** keep the 6 chalets on Place Saint-Job (your 2026-11-17 word), or only on market days?
4. **Tree style:** keep the warm-white LEDs with red / gold / champagne baubles and the gold star (the Brussels look),
   or another palette (all warm white, or with colour)?
5. **Snow:** a light snow cover by default on some days (e.g. a seeded chance per day), or only on demand (`wx=snow_cover`)?
6. **Extras:** garlands on poles at Saint-Job (job 5), lights in the plane trees (job 6), warm window strings (job 7).
   Which, if any?
7. **More streets?** Today: Chaussée de Saint-Job, Place de Saint-Job, Rue Xavier De Bue, Chaussée d'Alsemberg, the
   Parvis Saint-Pierre. Others (Rue Vanderkindere, the Chaussée de Waterloo at Fort-Jaco) are one config line plus a
   site rebuild each.
