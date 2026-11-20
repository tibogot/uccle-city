# Birds in the city and the sky (`viewer/birds/`, `?birds=0` = none)

Branch `claude/birds` (from claude/foundation 3251afb7), 2026-11-15. Two systems:

| | What | Where |
|---|---|---|
| **Sky flocks** | every flying flock in ONE GPU compute simulation (WebGPU compute, storage buffers), drawn in TWO indirect draws | `viewer/birds/skyFlocks.js` (GPU), `viewer/birds/birdMesh.js` (meshes, species), `viewer/birds/cityBirds.js` (the director) |
| **Perched birds** | the falcon flight's feral pigeons round the squares (`viewer/falconFlight/pigeons.js`, run by `cityFlyer.js` in every mode), now flushing from the walker / the third-person character / the player's car / the traffic and landing again elsewhere | `pigeons.js`, `cityFlyer.js`, `cityStream.js` (roosts), threats from `cityBirds.js` |

Switch: `?birds=0` (features.js row, dev panel section **Birds**: sky flocks drawn A/B, "murmuration now", read-outs).

## 1. Research (what it is built on)

- **Boids**: Reynolds 1987 (separation / alignment / cohesion); three.js r187 `examples/webgpu_compute_birds.html` (TSL
  compute, velocity + position passes, the flap in the vertex shader from a phase: the same structure here, but no
  O(N^2) loop for the big flock).
- **Starling murmurations**: each starling keeps to its **6-7 nearest neighbours whatever the distance (topological, not
  metric)**: Ballerini et al. 2008 (PNAS 105: 1232); flocks are thin sheets, much wider than thick. **StarDisplay**
  (Hildenbrandt, Carere & Hemelrijk 2010, Behav. Ecol. 21: 1349): topological neighbours, banking turns, attraction to
  the roost; agitation waves travel through the flock from 2-7 neighbours (Hemelrijk et al. 2015). Murmurations happen
  at dusk over the roost, biggest October-March (UK wildlife trusts / RSPB guides), a predator (sparrowhawk, peregrine)
  sets off the waves.
- **Pigeons**: feral pigeons feed in tight groups on squares, flush at a person's approach at a few metres (urban flight
  initiation distances ~1.5-4 m), the alarm spreads to the neighbours; the falcon flight's HoPE model
  (docs/FALCON_FLIGHT_RESEARCH.md) for the falcon.
- **Brussels**: ring-necked parakeets 8,000-10,000 in Brussels (Natagora counts, Brussels Times), communal roosts in
  parks; jackdaws round church towers; black-headed gulls in winter, lesser black-backed in summer.
- Images looked at only (Google), nothing traced or stored.

## 2. Sky flocks: the GPU simulation (`skyFlocks.js`)

ONE storage buffer, 3 vec4 per bird: `[pos, slot] [vel, wing phase] [bank, wing amplitude, glide timer, epoch]`;
3,584 birds in 7 fixed **slots** (birds2 added the pigeons; the slot rows are 10 vec4 now) (a range of the buffer each, a species, a capacity):

| slot | species | cap | flocking |
|---|---|---|---|
| murmuration | starling | 3072 | topological lattice + formation |
| starlings (feeding party) | starling | 192 | metric, every bird of the flock |
| jackdaws, jackdaws2 | jackdaw | 64 + 64 | metric, circling a tower |
| gulls | gull | 64 | metric, loose, gliding, wide circles |
| parakeets | ring-necked parakeet | 64 | metric, fast |
| pigeons (birds2) | feral pigeon | 64 | topological 7, a party flying loops over a square |

Per frame, ONE `renderer.compute` of 4 nodes: reset the two draw counters, **steer** (forces -> velocity, bank, wings),
**move** (position + the visible lists), clamp. No CPU read-back.

- **Small flocks** (<= 256): each bird looks at every bird of its own slot (256 x 256 = 65k distance tests at most):
  separation within 2.6 spans (a starling 1 m, a jackdaw 1.8 m, a gull 2.6 m), alignment + cohesion within 12 m, a pull
  to the flock's target outside its radius, a circling term (jackdaws round the tower, gulls).
- **The murmuration**: each bird's 6 neighbours are FIXED: its neighbours in a 3D index lattice (they start as lattice
  neighbours), held by a soft spring with a dead band (0.65-1.5 x the rest spacing) + alignment to them; and each bird
  has its own place in a FORMATION round the leader (the director's target): a lens-shaped disc (the lattice mapped to a
  disc, thicker in the middle, a per-bird random offset: no rows, no box corners) in the leader's frame, which the
  director stretches, thins, bends and ripples (slow sums of sines) and turns with the leader's track. A soft pull to
  that place + alignment along the lattice = a fluid sheet that swings, folds and thins; a scare runs across it as a
  wave. 3072 x 6 reads, not 3072^2.
- **Floor**: the city's highest solid (ground, roofs, the landmarks' envelopes in the roof grid: `world.heightAt`) on a
  128 x 128 texture of 8 m cells round the camera (1 km), rebuilt on the CPU in 0.5 ms slices when the camera is 250 m off
  or the tiles change (`textureLoad` in the compute), looked at 1.5 s ahead; + a clearance per flock.
- **Threats** (4): the camera (16 m: an orbit / fly camera passing through), the falcon in the falcon flight (50 m, 90 m
  stooping: the flock scatters), the Saint-Job peregrines on the wing (45 m), and a phantom sparrowhawk crossing the
  murmuration every 20-45 s (the agitation waves). Away harder the closer, faster, flapping (the alarm).
- **Wings**: flapping bursts and glides per species (starling 12 Hz, jackdaw 5.5, pigeon 7, gull 3 with 75 % gliding,
  parakeet 10), none of the gliding when alarmed or climbing; bank from the turn rate x speed / g.
- **Drawing**: after moving, each bird inside a rough clip test is appended (atomics) to the NEAR list (bigger than
  7 px on screen, dithered +-15 % per bird: no line where it changes) or the FAR list; the counts are the
  instanceCount of two indirect draws:
  - **near**: one ~70-triangle bird for every species (`birdMesh.js`), shaped in the vertex shader from a species
    table (span, length, tail, wing planform: root / tip chord, sweep), flapping about the shoulder, coloured by part
    (back, belly, head, beak, tail, wing top / underside by face, dark tips) from field-guide colours (linear albedo);
    Standard material, sun + sky lights only; no shadows.
  - **far**: a flapping chevron (4 triangles) oriented by the bird's span axis, never thinner than ~1 px (no shimmer),
    Lambert lit by sun + sky with an up normal (an unlit colour glowed grey against the night sky).
- **Nothing on**: no compute, both meshes hidden (0 cost at night). Pipelines: the two draws are built in the boot
  warm-up (the meshes exist before it), the compute at start (one dispatch, no flock on): **0 pipelines created** when
  flocks come and go (checked: night -> day -> night with the device's create*Pipeline* hooked).

## 3. The director (`cityBirds.js`): species by place and time

The real sun (`lighting.firmSunDir()`: the solar hour, the day, Brussels; `env.uSunDir` is the light, held above the
horizon after sunset), decisions 4 x a second, targets every frame.

| flock | when | where |
|---|---|---|
| murmuration | evening, sun +6.5 deg .. -8.5 deg (or "murmuration now") | the nearest roost within 3 km: Parc de Wolvendael, Kauwberg, Fond'Roy, La Sauvagère, Brugmann, the rail line at Calevoet; 3072 birds Oct-Mar, 900 Apr-Sep; waypoints 45-110 m up within 160 m, the leader at 14 m/s; at sun -6.2 deg it **drops into the roost** (target 9 m over the ground, clearance 3 m) and fades out there |
| starlings | day | 110-190 crossing between parks / lawns near the camera, 22-38 m up |
| jackdaws x 2 | sun > -3 deg | 28-60 round the two nearest towers within 1.2 km (Saint-Job, Saint-Pierre, Observatory, town hall, Rosaire, Saint-Augustin, Russian church, Stalle), 8-22 m over the top, sallies out and back; to roost at dusk |
| gulls | sun > 3 deg | 6-14 (summer) / 20-34 (winter), ~120 m up, loose wide circles round a point drifting with the camera |
| parakeets | sun > -3 deg | 24-52 round the nearest big park within 1.5 km, 18-30 m up, fast; to the park at dusk |
| night | | none (the perched pigeons sit on their ridges) |

A flock appears 380-460 m from its place, out of view when possible, and flies in; it leaves by flying 1.6 km off (or
dropping into its roost) and is switched off once far and out of view, or faded after 40 s.

## 4. Perched birds (the squares' pigeons)

`cityFlyer.js` already ran the falcon flight's pigeons round the squares in every mode (CPU boids on a 6 m hash grid,
one instanced draw a flock, at most 2 flocks at once). With `?birds` on (default):

- **They flush from people and cars**: `cityBirds.groundThreats()` hands them the walker (3.8 m), the third-person
  character (3.8 m), the player's car / motorbike (6 m) and the traffic within 150 m of the camera (2.2 m: city pigeons
  are used to cars). A bird inside the distance goes up (away from it) after 0.02-0.14 s, the alarm spreads to 60 % of
  the birds within 3.5 m (a local flush, not the whole square: `why[]` keeps a ground alarm local); they circle, then
  land on a free roost **not** next to a threat (a landing bird aborts and goes round if someone is there).
- **Feeding groups**: 4 spots of 16 ground points within ~2 m on each square (`cityStream.feedClusters`), 40 % of the
  birds start on the ground.
- **Lamp posts**: the drawn street lamps' lantern caps (`cityStream.lampRoosts`, the cap's top measured from the lamp
  model) are roosts too, besides the roof ridges, the church's ridges, the trees' crowns and the paving.
- **Jackdaws** among them (10-12 %, black-grey; the pigeon's shape).
- **More squares**: the Square des Héros and the Vanderkindere crossing (Rue Vanderkindere x Avenue Brugmann) besides
  Saint-Job, Vander Elst, Parvis Saint-Pierre and Wolvendael.
- **Life size** on foot / in a car (the falcon flight keeps its readable 1.4 x).
- **Quiet at night** (sun < -6 deg): no spontaneous flights, no newcomers.
- **Colour fix** (all modes): the pigeon palette was written in sRGB and used as linear albedo: near-white birds at
  noon; converted to linear.

## 5. Cost (2026-11-15; preflight **RED**: another agent's WebGPU tab rendering, GPU 98 % busy at rest, 83 C, power cap)

Interleaved in-page A/B, the tab in front; GPU timestamps are quantised to 0.066 ms in this Chrome.

| case | birds | result |
|---|---|---|
| compute (steer + move + reset + clamp), murmuration on (3072) + 4 flocks, timed alone (`TimestampQuery.COMPUTE`, 10 runs, loop paused) | 3,520 slots | median **0** (< 0.066 ms; 2 of 10 runs one tick) |
| the two bird draws alone (the camera inside the murmuration: 1,151 near meshes + 1,360 far) vs an empty scene | 2,511 drawn | **0.131 vs 0.066 ms** -> ~0.07 ms |
| whole frame, flocks on / off, Wolvendael at midday (5 flocks, 276 far in view) | | **-0.04 ms** (pairs -0.2..+0.07) |
| whole frame, flocks on / off, the camera 70 m from the winter murmuration (223-416 near + 2,656-2,849 far) | | +0.27 ms (pairs -0.85..+1.83: noise of the RED machine) |
| night | 0 | no compute, no draw |
| CPU: the director + floor slices | | 0.08-0.3 ms (0.5 ms slices while the floor rebuilds after a 250 m move) |
| CPU: the perched pigeons (existing) | 150 / square | ~0.07-0.3 ms |

Draws: 2 for all sky birds (+ 1 per perched flock, at most 2, as before). Per frame: uniform writes only, no
allocation in the per-frame path (decisions 4 Hz).

## 6. Images (`docs/birds/`)

- `murmuration_dusk_3_winter.jpg`, `murmuration_dusk_2.jpg`, `murmuration_dusk.mp4` (12 s screencast): the winter
  murmuration over Parc Fond'Roy at dusk (`?time=twilight&day=330&hour=16.45`).
- `murmuration_dusk_1_lattice_before.jpg`: the first version (a lattice box: rows and corners; fixed by the disc mapping).
- `jackdaws_saint_job.jpg`: jackdaws over Saint-Job at midday.
- `pigeons_walk_1_feeding.jpg`: a feeding group on the Place Saint-Job (walk mode); walking in flushes them (checked by
  the takeoff counter: the 3 nearest went up at 3.8 m, their neighbours partly).
- `grass_heros_before.jpg` / `grass_heros_after.jpg`: the grass review (docs/GRASS.md §11).

## 7. Weak spots / next

- The sky flocks do not take off from / land on the perched birds' roosts: perched pigeons fly in their own CPU flock
  (the falcon game needs their positions); the GPU flocks come and go at a distance.
- Roof gutters and tram / catenary wires are not roosts yet (ridges, lamp caps, crowns, paving are).
- Perched jackdaws use the pigeon's shape, tinted black-grey.
- The floor texture does not hold the trees: low flocks (parakeets) can pass through crowns; the landmarks' envelope
  is the replaced UrbIS solid (spires as blocks).
- The murmuration's shape is a directed formation (shape parameters animated by the director) plus local flocking,
  not an emergent StarDisplay simulation; a falcon stoop makes a hole and a wave but the flock reforms to its formation.
- A phantom hawk is invisible (a threat point only).
- Cost measured on a RED machine: re-measure the frame A/B on GREEN (the compute and draws alone are well under the
  0.2 ms budget).
- Flushed pigeons do not refill the feeding groups preferentially (they land on any free roost, 25 % on the ground).

## 8. birds2: no more balls (claude/birds2, 2026-11-18; `?birds2=old` = before)

Owner playtest (day, driving): "boids of birds in the sky look like a ball; they were supposed to make some nice dancing
movement like real birds" (a small dark spiky ball in the sky).

**Root cause.** Every day flock was pulled to ONE point that then **stood still** for 20-60 s (a park's waypoint reached,
the jackdaws' tower), with all-to-all metric cohesion (every bird within 12 m pulled to the centroid) and a 1 m personal
space: 110-190 starlings at 9-17 m/s orbiting a fixed point = a gnat swarm, a ~6 m (sigma) ball of overlapping birds
(the gate's mirror of the old rules: c/a 0.90, 100 % ball-like, 35 px across from 150 m, 93 % of the birds merging on
screen).

**Rule.** A flock follows a moving leader on a path, each bird keeps to its 7 nearest neighbours a few body lengths off;
no flock is ever pulled to a fixed point. Check: `tools/audit/birdGate.mjs` (merge gate row `birds`).

**What it is now** (`viewer/birds/flockModel.js`, shared by the GPU step, the director and the gate):
- **Day parties**: starlings 25-60, feral pigeons 15-45 (new slot: loops over the nearest square), jackdaws 12-40 (over
  their tower), parakeets 10-30, gulls 6-34 (loose, high). Each flock has a **leader** (`LeaderPath`: a CPU point flying
  at the species' cruise speed, its turn rate an Ornstein-Uhlenbeck process, homing to its area or heading for a goal;
  starlings cross from lawn to lawn). On the GPU each bird finds its **7 nearest neighbours** exactly (a sorted insertion
  over the slot each frame; Ballerini et al. 2008: 6-7, topological) and interacts with those within last frame's 7th
  distance (packed in `p.w`): separation inside its own spacing (0.75-1.25 x the species' 2.2-10 m, weaker vertically),
  a dead band to 1.4 x, the mean pull beyond, alignment. **Informed** birds (30-50 %, Couzin et al. 2005) steer for the
  leader's point 3 s ahead, each to its own place across the front; the rest only when they stray; level with the
  leader's climb. Now and then half the informed birds follow a second leader 25-45 m to the side for 6-12 s: the party
  splits and regroups.
- **The murmuration**: the lattice (6 fixed topological neighbours) + its formation, now driven through **manoeuvres**
  (`MurmurShape`: sheet, ribbon, fold, hourglass / two lobes, S curve, banked tilt, eased over ~2.4 s, a new one every
  5-13 s, a slow wobble on top), a **density wave** running back through the flock (compression bands), a **banking
  wave** across the sheet (the dark bands of real murmurations: Procaccini et al. 2011; bigger during a hawk pass), the
  leader on a swooping path round the roost (45-110 m up). The formation pull is softer (0.32 vs 0.45): the sheet lags,
  stretches and folds on the turns.
- Splitting / joining slots, the floor, the threats, wings, drawing: unchanged.
- **Falcon flight / game** (`flyer.on`): the prey flocks keep their sizes from before (`PREY_SIZES`: starlings 110-190,
  jackdaws 28-60, parakeets 24-52: the hunt's prey density unchanged) with the new rules (gate rows `prey-*`: loose flat
  flocks at 190 / 60 / 52, c/a median 0.14-0.30, 0 % ball-like); no sky pigeons there (not prey); the prey list
  (`gpuPrey.js`) untouched. A flock spawned before the flight came on (or after it went off) leaves and is replaced at the
  right size; `?game=falcon` counts from the boot.
- **Leader over the GPU floor** (browser turn): outside the floor texture's 1 km window the GPU floor is the camera's
  ground + 30 m; a leader under it pinned its flock flat on it (parakeets 500 m off, every bird at one height). The
  leader's altitude band is now over max(ground, the floor + the clearance).

**The gate** (`node --preserve-symlinks --import ./tools/characters/threeHook.mjs tools/audit/birdGate.mjs`): the CPU mirror
of the GPU step (`CpuFlock`, the same equations and per-bird hashes) runs every species (3 seeds) and the 3072 / 900
murmuration 90 s with the director's own leader / manoeuvre code: principal axes (c/a median <= 0.45, ball-like <= 10 %
of the time, b/a varying), the flock's track reaching >= 150 m (not hovering), nearest neighbour >= 3 spans (p5 >= 1),
on screen from 150 m >= 40 px wide with <= 35 % of birds merging (murmuration: >= 120 px from 300 m, <= 60 % merging from
150 m); the old rules shown failing; the compute of both modes compiled to WGSL headless (three's WGSLNodeBuilder on a
stub renderer); pair tests a frame 10,881 at the largest counts (old 47,160), no DynamicDrawUsage, no light, compute
built once. In the browser: `debug/birdShape.js` `run()` reads the GPU buffer back and reports the same metrics + the
pipelines created while it runs (0 expected).

| (90 s, mirror) | c/a median | ball-like | nn median | from 150 m |
|---|---|---|---|---|
| starlings 45 (new) | 0.24 | 0 % | 5.8 spans | 131 x 50 px, 9 % merging |
| jackdaws 26 (new) | 0.10 | 0 % | 6.1 spans | 477 x 68 px, 0 % |
| starlings 150 (old) | 0.90 | 100 % | 2.5 spans | 35 x 32 px, 93 % |
| jackdaws 44 (old) | 0.78 | 84 % | 1.5 spans | 25 x 22 px, 100 % |
| murmuration 3072 (new) | 0.18 | 0 % | 3.5 spans | 52 % merging (dense by nature) |

**Browser turn (2026-11-18, GPU read-back `debug/birdShape.js`):** day at Saint-Job: starlings 53 / jackdaws 16 + 23 /
gulls 25 / parakeets 12 / pigeons 43, every flock c/a median 0.14-0.44 (gulls), 0 % ball-like, nn 4.6-9.7 spans; dusk
murmuration 3072: c/a 0.18, b/a 0.33-0.70, 0 % ball-like; falcon game: prey sizes 170 / 49 / 48 / 33, 0 % ball-like,
`GpuPrey` reads 277 prey (starling / jackdaw / parakeet, as before); 0 compute / render pipelines created while running.
The flocks' compute (4 nodes, the murmuration + 3 day flocks) <= ~0.02 ms a dispatch (indicative: timestamps, preflight
not run). Tour vs foundation2: 0 of 22 views flagged. Images: `docs/birds/birds2_pigeons_14m.jpg`, `_40m.jpg`,
`birds2_starlings_60m_new.jpg` vs `_old.jpg` (the ball, `?birds2=old`), `birds2_murmuration_1.jpg`, `_2.jpg`.

## Falcon game: the dead flag (claude/falcongame1, docs/FALCON_GAME.md)

A bird caught by the falcon game is marked dead on the GPU by `SkyFlocks.kill(i)`, a 1-thread compute that sets its
epoch to epoch + 0.5. In steer, a dead bird is not respawned. In move, it is still integrated (it flies on with its
flock, so lattice neighbours are not torn), but it is never appended to the near / far lists, so it is never drawn.
It respawns only with the slot's next epoch. The game reads the bird buffer back through one reusable
`ReadbackBuffer`, and only while a prey flock is within 450 m of the falcon (`viewer/falconGame/gpuPrey.js`).
