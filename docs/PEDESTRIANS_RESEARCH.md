# Pedestrians: what Mr.doob does, what others do, and a design for Uccle

Research only (2026-11-11). No code was changed and nothing was run: no browser, no GPU, no Blender, and none of
slop-newyork's code. Our code is cited as `file:line` on `claude/foundation` (d565237) unless a branch is named.
Mr.doob's code is cited as `his js/file.js:line` at **536a907** (2026-11-06, his HEAD, shallow clone in the
scratchpad). The owner's engine (`game-engine-v1`, read-only) is cited as `engine path:line`. Outside claims have a
URL. Anything marked **(guess)** has not been measured.

---

## 0. One page for the owner

**Today the city has no people.** No branch has a crowd (`docs/SLOP_NEWYORK_AUDIT.md:72`). The only person is the
player (Quaternius CC0 on `claude/capsule` / `claude/character-audit`, Mixamo Y Bot on `claude/character2`).

**What Mr.doob does (slop-newyork, MIT).** 340 people (`his js/pedestrian-system.js:7`). Every body is generated in
code: lofted rings, male and female shapes, build, height, hair (`his js/pedestrians.js:104-713`). The clothes are
painted by the shader from a seed: coat, lapels, zip, hem, trousers, shoes, face (`:718-962`). There are **no
animation clips**. Each visible person runs a procedural gait on the CPU: footsteps planted in the world, two-bone IK,
turns, kerb steps, standing weight shifts (`:1036-2165`). The result is 15 bone transforms per person, written into
one storage buffer. **One instanced draw per LOD** (near and far, switch at 34 m) skins the vertices in the vertex
shader (`:967-1031`). People walk on 1-D "tracks" along the sidewalks, queue at the kerb, cross only on WALK, talk in
pairs, and dodge or dive away from the player's car (`his js/pedestrian-system.js`, `js/pedestrian-routes.js`).
The look is good. The feet never slide, because nothing is a clip. The cost is CPU per visible person.

**What the industry does.** Large crowds bake the animation once: either vertex positions into a texture (VAT:
Unreal's AnimToTexture, Houdini / OpenVAT) or bone matrices into a table (Unity "animation instancing", the owner's
engine `v3/render/crowdSkinning.js`). The GPU then plays the bake. CPU cost becomes almost flat with crowd size.
Animation LOD (fewer updates far away) and AI LOD (simpler logic far away) are standard (Assassin's Creed Unity,
Hitman). Pedestrians walk on sidewalk lane graphs with crossing lanes (Cities: Skylines II, SUMO). Life comes from
"scenario points" (benches, phones, smoking: GTA V) and small groups.

**Recommendation, in short:**
1. **Bodies:** vendor Mr.doob's body generator (MIT, `vendor/slop-ped/` with LICENSE + ORIGIN, like
   `vendor/slop-trees/`), then extend it: children, older people, coats / skirts / scarves / hats, umbrellas, bags,
   prams, dogs, palettes by season. Everything stays scripted.
2. **Animation:** a **bone-animation table**, not VAT (section 3.2). Clips are baked offline. The walk / run / idle
   / turn clips come from **Mr.doob's own procedural gait, run on a treadmill in a Node tool**, so they are scripted
   and carry no licence. Sit, wait, phone, push and talk come from CC0 clips (Quaternius UAL) or are keyframed in
   code. In the shader, **two slices per person with a bone mask** let the legs walk while the arms hold a phone, an
   umbrella or a pram.
3. **LOD:** the nearest ~24 people get the live rig with planted feet. Up to ~80 m: baked clips, full mesh. Up to
   ~250 m: baked clips at a stepped frame rate on a ~150-triangle mesh. Past ~250-300 m: nothing (dithered fade).
   **No impostors for walkers**: a person at 250 m is about 7 px tall, and a tiny skinned mesh is cheaper and
   moves (section 3.3).
4. **Where they walk:** a walk graph built in the tile worker from the measured UrbIS surfaces (sidewalk / square /
   path classes, `viewer/surfaces.js:32`), OSM footways and park paths, and roads v2's measured crossings
   (`claude/roads2`, `markings.json`). Tram platforms and stops are part of it.
5. **Rules:** one signal clock with the cars (`claude/traffic viewer/traffic/signals.js`, `walkState`). Cars yield
   on the crosswalk. Pedestrians have priority on zebras (Belgian rule, to confirm). Density follows the city clock,
   the kind of place and the weather.
6. **Targets:** 300 people on screen for **≤ 1 ms GPU and ≤ 0.5 ms CPU** per frame. No pops, no foot slide above
   3 cm/s at the near band.

**A Pedestrian Lab comes first** (section 4), then the city behind `?peds=1`.

---

## 1. Mr.doob's pedestrians in detail

Files: `his js/pedestrians.js` (2,213 lines: skeleton, body, material, crowd, rig), `js/pedestrian-system.js` (665
lines: population, routes, queues, avoidance), `js/pedestrian-routes.js` (219 lines: sidewalk and crosswalk tracks).
Traffic owns the signals and calls the system (`his js/traffic.js:429-438`, `:2000`). The same rig drives the player
on foot and the cyclist (`his js/controllers.js:26, 471-473, 739-741`).

### 1.1 Skeleton and pose buffer

- **15 bones**: pelvis, chest, head, 2 x (upper arm, forearm), 2 x (thigh, shin, foot, toe) (`pedestrians.js:38-55`).
  There are no hand, neck or spine bones. A 1.75 m bind pose with measured limb lengths (`:59-102`).
- **Pose = 31 vec4 per person**: per bone, a quaternion and (translation, scale), plus one vec4 (seed, female, girth,
  hair) (`:56-57`). That is 496 bytes per person, or 149 KB per frame for 300 people.

### 1.2 Bodies made in code

- **`BodyBuilder.loft`**: closed lofts through rings (superellipse rings with bumps for the nose, brow, chin and
  bust), uv, a part id and a per-vertex skin record (`:107-283`).
- **Profile tables** give the male base and a **female target with the same topology**. The shader mixes them by
  `info.y`, so one geometry serves both sexes (`:285-333`, `:752-760`). The same tables exist for legs, arms,
  hands, head, hair shell, long hair and shoes (`:335-565`).
- **Girth** is an `extra` offset scaled per person. **Hair** is a shell plus a long-hair loft. Both are pushed out by
  `hairDelta` times the hair amount, so every person carries the hair vertices even when bald (`:755-760`, `:690-701`).
- **LOD by ring removal**: each table row has a "keep in far LOD" flag, and the ring sides drop from 16/12/10/8/20/12
  to 8/6/6/4/8/6 (`:566-578`). From the row counts (torso 17/9, leg 16/9, arm 15/9, hand 7/4, head 12/6, shoe 10/6),
  the near mesh is **about 1.8k vertices / 3.4k triangles** and the far mesh **about 0.5k / 0.9k** (guess, counted
  from the tables, not built).

### 1.3 Skinning and clothes in the shader

- **Vertex stage**: each vertex has two bones and a weight. It is rotated by each bone's quaternion, then the two
  results are mixed: rigid-pair blending, not matrix palette skinning (`:752-771`). The normal is blended the same
  way. This is cheap and fine at crowd distances.
- **Clothes are procedural in the fragment stage**, chosen per part id from palettes (`:718-724`) by hashes of the
  seed (`:788-800`):
  - torso: tailored jacket (lapels, shirt V) or a casual coat (zip, collar band), a hem height per person;
  - trousers with a crease; sneakers with laces, or leather shoes;
  - shirt cuffs under the sleeves;
  - hair strands or a bald scalp;
  - face: eyes, brows, mouth (`:860-958`).

  Roughness comes from a varying. There are no textures at all.
- Variety is limited by design: 8 coat colours per sex, 4 shirts, 5 skin tones. Everyone is an adult in city
  clothes. No children, no bags, no umbrellas.

### 1.4 The crowd draw

- `PersonCrowd` (`:967-1031`): one `attributeArray` pose buffer per LOD and one `Mesh` per LOD. Each frame,
  `add(rig, distance)` copies the person's pose into the next slot of the near or far buffer (`farDistance` 34 m,
  `:972`, `:994-999`). `end()` sets `mesh.count` and an update range.
- When a buffer is empty, it keeps one zeroed person for two frames, so the pipelines compile at warm-up
  (`:1001-1031`).
- Only the near LOD casts shadows (`:982`). `frustumCulled = false`: the system culls on the CPU instead
  (`pedestrian-system.js:594`, side planes only, `his js/traffic.js:611-618`).

### 1.5 The rig: animation without clips

- **`PersonRig.update`** (`:1312-1458`): smoothed body velocity, heading, walk / run / sprint blends, lean.
- **`updateGait`** (`:1559-1719`): the cadence comes from speed and leg length (`:1572-1580`). Each foot has a stance
  and a swing. A planted foot stays where it touched down (`stanceFoot :1745`). A swinging foot is carried to a
  landing point ahead of the hips, over kerbs (`swingFoot :1785-1879`).
- The gait constants are taken from clinical gait data (`GAIT :1039-1065`): 60 % duty cycle walking, heel strike /
  toe-off pitches, 2.5 cm pelvis bob, arm lag.
- **Standing**: the weight shifts between legs every 3.5-11 s (`IDLE :1068`).
- **Two-bone IK** with a pole for each leg and arm (`limb :1939-1981`, `solveLeg :1983-1990`). `solve()` writes the 15
  bones (`:2039-2165`).
- Also: evasive dives with keyframed get-up poses (`DIVE_POSES :1076-1099`, `solveDive :1991`), jumps, and cycling
  (`ride :2166`).
- **Hidden people still step** (the gait state advances), but their pose is solved only when drawn. The tests check
  that this changes nothing (`his tools/benchmark-pedestrians.mjs:13-60`; commits `55e33f6`, `1fe128d`).

### 1.6 Population, routes and behaviour

- **Population** (`pedestrian-system.js:7-11`, `:34-88`):
  - 340 pooled people within 320 m of the focus, with seeded body parameters and speeds of 1.22-1.70 m/s
    (`:56`, `:78-86`).
  - At most **6 respawns per frame**, placed 60-280 m away and never in view within 150 m (`:633-645`, `:159`).
  - Everything else is reused: no allocation.
- **Tracks** (`pedestrian-routes.js`):
  - Each road edge gets **two walking lines per side**, 1.7 m and 2.8 m in from the road edge (`:28-46`).
  - A small grid search makes a detour around obstacles (`:103-154`).
  - Corners join the offset lines by meeting their extensions (`:156-194`).
  - Crosswalks exist **only at signalled junctions** (`:53`). Each has two lines, 0.75 m either side of the middle
    (`:58`).
  - There is no global path search. At the end of each track, the next one is chosen greedily towards a random goal,
    plus noise (`next :196-208`, goals `:392-397`).
- **Kerb queues**:
  - People wait 1.6 m into the crosswalk track (`KERB :90`), 0.62 m apart (`QUEUE_GAP :111`).
  - Arrivals from different directions merge in turn (`:411-449`).
- **Crossing**:
  - People step off only when the WALK for their side is on, after a personal 0.2-1.5 s reaction delay (`:54`,
    `:451-461`), and when no car is committed (`his js/traffic.js:822-833`).
  - Cars in turn check `pedestrianOn` before entering a crosswalk (`his js/traffic.js:837-849, 974-975`).
  - One global signal clock drives every junction (`his js/city-config.js:723-727`, `traffic.js:1883-1884`).
- **Social**:
  - People pause at random every 35-90 s (`:403-406`).
  - Pairs within 0.75-2 m on the same block talk for 6-12 s, matched once a second on a 2 m hash grid
    (`meet :527-578`).
  - Talking partners face each other (`:615`).
- **The player**:
  - People ahead of the player's car or bike run a swept-box test over 1.5 s against the vehicle's footprint
    (`playerContactTime :230-272`).
  - They stop, run, turn back, side-step 1.9 m or **dive** (`avoidPlayer :297-381`).
  - The check is limited to once per 120 ms per person (`:11`, `:318`).
  - On foot, the player is only kept out of spawns (`:160`).
- **Ground**:
  - Only two heights: sidewalk 0.22 m and crosswalk 0.012 m (`:580-588`). The rig steps down and up the kerb.
  - There is no terrain and no slope. Uccle has both.

### 1.7 Cost

He publishes no frame cost. The benchmark measures CPU for 340 rigs in Node (`tools/benchmark-pedestrians.mjs:1-3`),
but we may not run it. My reading:

- **GPU**: one draw per LOD plus one shadow draw. About 1.8k vertices near and 0.5k far. Small **(guess:
  0.2-0.4 ms for 300 people with shadows on the near band)**.
- **CPU**: the rig is about 900 lines of float math per **drawn** person per frame, plus gait stepping for hidden
  people within 50 m (`pedestrian-system.js:599`). **Guess: 5-15 µs per drawn person.** With 150 drawn, that is
  0.8-2 ms on the main thread, which is over our 0.5 ms target. The 6-per-frame spawn and the throttled avoidance
  are already cheap.

### 1.8 What we copy, what we improve

| Piece | Copy (MIT) | Improve |
|---|---|---|
| Skeleton + pose layout (`:38-102`) | yes, as the crowd skeleton | maybe a neck and a hand bone (for phones and umbrellas) |
| Body generator (`:104-713`) | yes | children, elderly posture, coats to the knee, skirts, scarves, hats, backpacks; hair geometry only where needed (2-3 hair variants as separate ranges, not on everyone) |
| Procedural clothes shader (`:718-962`) | yes | season palettes (November = coats, umbrellas), patterns (checks, stripes), Brussels mix |
| `PersonCrowd` draw (`:967-1031`) | the pattern | 3 LOD bands + dithered cross-fade via `viewer/lodFade.js`; bone-table playback (not a CPU pose for everyone) |
| `PersonRig` gait + IK (`:1036-2165`) | yes, **as the near-band rig AND as the offline clip baker** | real terrain heights and slopes (his ground has two heights only) |
| Tracks and corners (`pedestrian-routes.js`) | the ideas | ours come from measured surfaces, not road half-widths; a real graph per tile; squares and parks |
| Queues, WALK reaction, cars yielding (`:384-512`, `his traffic.js:816-849`) | yes, logic | per-junction phases (ours are per post, `signals.js`), zebras without signals |
| Conversations, pauses (`:403-406`, `:527-578`) | yes | groups that walk together, benches, shop windows, tram stops |
| Car dodge / dive (`:230-381`) | the swept test | a calmer default (step back, glare); dives only at speed |

**How to vendor it:** `vendor/slop-ped/` with `LICENSE` (MIT © Mr.doob, copied) and `ORIGIN.md` (repo, commit 536a907,
file list, "only changes: …"). The same rules as `vendor/slop-trees/ORIGIN.md:1-20`: no edits without a `CHANGES.md`
line, and the adaptation lives in `viewer/peds/`.

---

## 2. Survey

### 2.1 How a crowd is animated on the GPU

| Method | How | Memory | CPU per person | Blending / layering | Used by |
|---|---|---|---|---|---|
| **Per-object `SkinnedMesh`** | A mixer and a skeleton each | small | high (mixer + bone update), 1 draw each | full | three.js default; the owner's engine says it is "unshippable" past a few (`engine v3/render/crowdSkinning.js:6-9`) |
| **Instanced skinning, shared pose** | One mixer for all instances | small | flat | none (everyone in the same pose) | three.js `webgpu_skinning_instancing` (one mixer, per-instance colour only: https://github.com/mrdoob/three.js/blob/dev/examples/webgpu_skinning_instancing.html) |
| **Per-instance bone texture** | A CPU-posed skeleton per instance, written into a texture | bones x instances | medium (the mixer still runs per instance) | full | `@three.ez/instanced-mesh` (InstancedMesh2: "a bone texture stores bones for instances", 20k demo: https://agargaro.github.io/instanced-mesh/getting-started/00-introduction, https://www.npmjs.com/package/@three.ez/instanced-mesh) |
| **CPU procedural pose + storage buffer** | Own rig per person, a pose buffer, one draw | 0.5 KB per person | medium-high (the rig) | anything | Mr.doob (section 1) |
| **Baked bone-matrix table** ("animation instancing") | Clips sampled once into a [frame][bone] table; the GPU skins from (clip, frame) per instance | bones x frames (small, shared by every body on the skeleton) | **tiny** (a phase counter) | mix 2 slices; masks per bone possible | Unity "Animation Instancing" (https://blog.unity.com/engine-platform/animation-instancing-for-skinnedmeshrenderer), gitee demo "0.5 MB for 81 bones, 4 clips" (https://gitee.com/wuwuhb/UnityGpuInstancedAnimation), GPU Instancer Pro Crowd (https://discussions.unity.com/t/released-gpu-instancer-pro/1488733/314), **the owner's engine** (`engine v3/render/crowdSkinning.js:10-31`: clips baked to a table, a compute pass skins every soldier, one draw; CPU "measured flat from 200 → 1000 soldiers") |
| **Vertex animation texture (VAT)** | Every vertex's position (and normal) per frame into a texture | vertices x frames **per body mesh** (large) | tiny | crossfade 2 frames; no layering | Unreal AnimToTexture (City Sample, UE 5.1: https://forums.unrealengine.com/t/community-tutorial-animtotexture-plugin-how-to-use-it-to-make-vertex-animation-textures-for-crowds/746648), OpenVAT for Blender (https://extensions.blender.org/add-ons/openvat/), three-vat runtime (WebGL / onBeforeCompile, no licence stated: https://github.com/manthrax/three-vat), Unity mesh-animation packages (https://github.com/chenjd/Render-Crowd-Of-Animated-Characters) |
| **Compute skinning into a vertex buffer** | A compute pass writes skinned positions once per frame; every pass (beauty + shadows) reads them | instances x vertices x 32 B | tiny | as the table | the owner's engine (`crowdSkinning.js:15-16`, `:283-330`); three r18x read-write storage in vertex stages is noted as the newer path (`engine v3/THREE_UPGRADES.md:236, 258`) |

Notes:
- `BatchedMesh` in three r187 has no skinning: there is no "skin" anywhere in `src/objects/BatchedMesh.js`
  (`engine node_modules/three` 0.187.0, grepped).
- **Owner's numbers**: GPU crowds "under ~0.5 ms at 600" soldiers. On their RTS the wall was the **simulation**
  (~10 µs per soldier per step), not the drawing (`engine games/alg-rts/TODO.md:3864-3875`). People off-screen and
  out of shadow reach are neither skinned nor drawn, but their clip state advances (`:2215-2219`). That is the same
  lesson as Mr.doob's "solve only when drawn".

**VAT vs bone table for us.** VAT memory is about vertices x frames x 8 B (half-float position + packed normal) per
body mesh. Example: 1,800 vertices x 600 frames (10 clips of ~2 s at 30 fps) = **8.6 MB per body variant**, and every
LOD and every body morph needs its own (guess, arithmetic). A bone table is 15 bones x 600 frames x 32 B
(quaternion + translation/scale, Mr.doob's layout) = **0.29 MB for all bodies**. Morphs (sex, girth, age) stay in the
shader on top of it. VAT wins only for things a skeleton cannot do: cloth, hair simulation, a pram's folding hood.
**Choose the bone table.**

**Vertex-stage vs compute skinning.** Compute writes the skinned vertices once and every pass reads them: the
owner's choice, because of the many shadow cascades in an RTS. The cost is memory: 300 people x 1.8k vertices x 32 B =
17 MB. With Mr.doob's rigid-pair skinning (2 bones, quaternion rotation), the vertex stage costs a few dozen ALU ops
per vertex. Only the near band (≤ ~40 people) casts shadows. So **vertex-stage skinning is enough** and keeps memory
small. Revisit only if the Lab shows the shadow passes costing more than 0.2 ms.

### 2.2 Animation LOD and AI LOD in games

- **Assassin's Creed Unity**: crowds of thousands. "AI recycling" swaps low-resolution NPCs for high-resolution ones
  from a pool without the player noticing. AI and animation are switched by distance, which also cuts drawing cost
  (GDC 2015, https://www.gdcvault.com/play/1022141/Massive-Crowd-on-Assassin-s; Japanese summary
  https://game.watch.impress.co.jp/docs/news/20150307_691715.html). That is Mr.doob's pool of 340, and ours.
- **Hitman: Absolution**: 1,200 characters per zone, 500 on screen, 30 fps on consoles
  (https://gdcvault.com/play/1015315/Crowds-in-Hitman). Intel's Hitman 2 deck: crowd animation is asynchronous and
  time-sliced over frames, and nearer characters get better animation
  (https://www.intel.com/content/dam/develop/external/us/en/documents/06-create-a-scalable-and-destructible-world-in-hitman2-807276.pdf).
- **Total War**: the simulation and animation are decoupled from the display (https://gamedeveloper.com/design/designing-i-total-war-warhammer-ii-i-to-handle-tons-of-units-and-massive-battles),
  and the engine instances heavily (Three Kingdoms: https://www.intel.com/content/dam/develop/external/us/en/documents/instancing-and-oit-in-total-war-three-kingdoms.pdf).
  I found no primary source that it uses animated impostors (only forum claims). Academic per-body and per-part
  impostor crowds exist (Tecchia and Chrysanthou; Aubel et al., survey:
  https://ics-websites.science.uu.nl/docs/vakken/mcrws/papers_new/Ryder_Day%20-%202005%20-%20Survey%20of%20real-time%20rendering%20techniques%20for%20crowds.pdf).
- **Cities: Skylines II**: no cap on agents; the cost is pathfinding on the CPU (https://colossalorder.fi/?p=1597). At
  launch the characters had **no LODs**, the developers called that a real cost, and later diaries prioritised LOD
  models (https://pcgamer.com/cities-skyline-2-dev-says-yes-our-characters-have-teeth-no-the-characters-teeth-are-not-affecting-performance,
  https://gamingshogun.com/?p=129867). Lesson: plan the LOD chain on day one. Pedestrian lanes and crossings are
  flagged lanes in its road network (https://ps1ke.github.io/Cities-Skylines-2-Modding-Guide/Game/Net/PedestrianLaneFlags,
  already in `docs/ROADS_V2_RESEARCH.md:339, 920`).
- **Impostors for people**: our own impostor research rates crowds as "static or idle far crowds (> 150 m) only;
  walking needs a skinned low LOD or vertex-animation textures, not octa" (`docs/IMPOSTORS_RESEARCH.md:396`, budget
  row `:501`, phase `:583`). The kit (`claude/impostors`, `docs/IMPOSTOR_KIT_RESUME.md`) costs about +1.4 ms for 2k
  trees with its depth pass (PDO) on. That is far more than a few hundred 150-triangle people.

### 2.3 Navigation and behaviour in city games

- **Sidewalk lane graphs + crossing lanes**: CS2 (above), SUMO's pedestrian model with sidewalks, crossings and
  walking areas at corners (https://sumo.dlr.de/docs/Simulation/Pedestrians.html). Our roads v2 research already says
  "a crossing is a pedestrian lane plus a polygon, so the mesh, future pedestrians and the signal phase share one
  thing" (`docs/ROADS_V2_RESEARCH.md:369`, `:673`).
- **GTA V**: undisturbed pedestrians use predefined behaviours (phone calls, smoking, tablets, eating, drinking) and
  sit on benches and chairs placed in the world ("scenarios" / scenario points). Mods tune pedestrian and scenario
  density by time of day and area (https://www.gamepressure.com/e.asp?ID=1605, https://gta.fandom.com/wiki/Vehicles_in_GTA_V/Scenarios,
  https://gta5mod.net/gta-5-mods/scripts/immersive-santos-v1-1/). The point-of-interest pattern is what we want for
  benches, shop windows and tram stops.
- **Watch Dogs 2**: civilian AI as an "anecdote factory", with moods (relaxed, happy, anxious, angry) driving the
  reactions (GDC 2017, https://gdcvault.com/play/1024152/Helping-It-All-Emerge-Managing,
  https://gamedeveloper.com/design/video-how-i-watch-dogs-2-i-created-a-reactive-crowd-of-npcs). Watch Dogs: Legion
  has a talk on group behaviour architecture (https://gdcvault.com/play/1027239). For us: a tiny mood (calm /
  hurried / startled) that changes speed and reactions is enough.
- **Walking speeds**: mean ~1.3 m/s at crosswalks. A Shanghai study measured children 1.30, adolescents 1.41, adults
  1.26 and older people 1.23 m/s, roughly normally distributed. In Istanbul, men walked 1.41 and women 1.32 m/s
  (summaries in https://staff.najah.edu/media/published_research/2020/04/30/TOTJ-14-44.pdf and
  https://www.e3s-conferences.org/10.1051/e3sconf/20183401023). Mr.doob's 1.22-1.70 m/s (`:56`) is a bit fast for a
  residential commune. Use a normal distribution around 1.30 m/s (sd ~0.18) and slow it with age (guess for the sd).

### 2.4 Bodies and clip licences

| Source | Licence | Fits our rules? |
|---|---|---|
| Mr.doob's body generator | MIT (`LICENSE` in his repo) | **yes**: scripted, no asset |
| MakeHuman core assets / exports | **CC0** for core assets and for exports from an official, unmodified build; some asset packs are CC-BY (https://static.makehumancommunity.org/about/license.html, https://static.makehumancommunity.org/assets/assetpacks/index.html) | the assets are fine. Whether a script that drives a body generator counts as "scripted" is the owner's call |
| MPFB2 (MakeHuman for Blender) | code **GPLv3**, bundled assets **CC0**; Blender 4.2+ (https://www.cgchannel.com/2025/03/check-out-open-source-blender-character-generation-plugin-mpfb-2, https://extensions.blender.org/add-ons/mpfb/versions/) | could be driven headless by our Blender 5.0 pipeline. GPL covers the add-on, not the meshes it outputs (guess; confirm). Meshes are heavy (~13k+ vertices base, guess) and need meshoptimizer LODs |
| Quaternius Universal Animation Library (UAL1) | **CC0**; locomotion in 8 directions, jog, sprint, **push, sitting**, emotes, ~120 clips (https://quaternius.com/packs/universalanimationlibrary.html, https://quaternius.itch.io/universal-animation-library) | **yes**. The phone / texting clip is not confirmed (check the viewer) |
| Quaternius UAL2 | **CC0**, 130+ clips (combat, parkour, farming, zombie); already in `data/raw/characters/ual2/` (`claude/character2 CREDITS.md:92`) | yes, but few city clips |
| Quaternius Ultimate Modular Men | **CC0** (`CREDITS.md:91`, player character) | yes, but limited variety |
| Mixamo (Adobe) | royalty-free in games and apps, **no redistribution of the files themselves** (community FAQ: https://community.adobe.com/t5/mixamo-discussions/mixamo-faq-licensing-royalties-ownership-eula-and-tos/m-p/13234775; the helpx FAQ returned 403 when fetched) | our repo keeps them git-ignored (`claude/character2 CREDITS.md:94-100`). A static site serves its files to anyone, so shipping Mixamo clips is the open owner decision already recorded there. **The crowd should not depend on Mixamo** |

---

## 3. Recommended design for Uccle

### 3.1 Bodies

- **Base**: Mr.doob's `buildPersonGeometry` and material, vendored, extended in `viewer/peds/bodies.js`.
- **One topology per LOD.** Variation comes from per-person shader parameters: sex, girth, height, **age**, posture.
  Morph targets are deltas with the same topology, as in his female target (`:752-760`).
  - Child: head-to-body ratio and shorter limbs. A delta set plus a bone-length scale per person in the pose
    header.
  - Older: stoop (a chest bone offset in the clip layer), slower gait.
  - Clothing silhouettes:
    - coat to the knee (a longer torso hem flare);
    - skirt / dress (the legs' upper rings flared, the trousers shader off);
    - puffer jacket (girth up on the torso only);
    - scarf (a ring at the neck);
    - hat / cap (a small cap loft);
    - hood up in the rain.
- **Accessories as separate small instanced meshes on the same pose buffer**: umbrella, shoulder bag, backpack,
  shopping bag, phone, pram, bicycle (walked), dog lead. Each is skinned rigidly to one bone, so all of them come in
  1-2 extra draws per LOD. **A dog** is its own little skeleton (4 legs, trotting procedurally). Mr.doob's rig ideas
  and the owner's herd crowds (`engine games/nam-rts/TODO.md:699`, animals on the soldiers' GPU crowd path) are the
  know-how.
- **Palettes by season and place**: November = dark coats, scarves, 30-60 % umbrellas in rain; summer = shirts,
  dresses, sunglasses. The weights also change near the lycée or school at 8:00 and 16:00 (pupils with backpacks)
  and on market days at Saint-Job (guess, a tuning table).
- **Quality bar**: flat normals on flat parts, enough ring segments on round parts, no triangle fans at the caps
  (Mr.doob caps with centroid fans, `:146-149`: check them with the mesh checker; `docs/TODO.md` rule,
  `HANDOFF.md` "Rules that still hold").
- **The LOD meshes**: LOD0 = his near rings, LOD1 = his far rings, **LOD2** = a new ~150-triangle body
  (torso box-loft, 4-sided limbs, no hands, no hair shell). LOD2 is made in JS from the same tables with a
  "keep in LOD2" flag, then meshoptimizer `simplify` as a check (the owner's rule: LODs with meshoptimizer in JS).

### 3.2 Animation

**The skeleton**: Mr.doob's 15 bones, plus maybe neck and right hand (17), so phones and umbrellas look held. It is
the crowd's own skeleton. It is **not** the player's: `claude/character2` owns the Y Bot / Mixamo skeleton and we do
not touch it. Retargeting a clip onto the crowd skeleton uses the character chat's retarget pipeline (canonical
Mixamo-layout bone maps, `claude/character-audit` commit 1b730dc `tools/characters/retarget.mjs`). Read it; ask that
chat before reusing it.

**The clips** (baked into one bone table, about 30 fps, cyclic where cyclic):

| Clip | Source | Notes |
|---|---|---|
| walk 0.9 / 1.3 / 1.7 m/s, run 3.0, jog 2.2 | **Mr.doob's `PersonRig` on a treadmill**, run offline in a Node tool (`tools/peds/bakeGait.mjs`), sampled over one gait cycle | scripted, MIT, no clip licence. Foot-contact flags come out of the rig itself (stance / swing) |
| turn L / R in place, start, stop | same rig, scripted inputs | |
| idle weight shift (2 variants) | same rig (`IDLE :1068`) | |
| wait at kerb (impatient: shift + look at the light) | rig + a head overlay | |
| stroll (slow, arms behind / hands in pockets) | rig with arm overrides | |
| sit on bench (down, loop, up) | UAL1 "sitting" (CC0), retargeted, or keyframed in code | needs the bench's seat height and depth |
| phone (look down, hand up), talk (gestures) | **overlay** (arms + head only), keyframed in code or UAL emotes | |
| push pram, hold lead, hold umbrella, carry bag | overlays (arms) | pram and dog are separate instanced props |
| look at player / car | head + chest overlay, computed (not baked) for the near band | |

**Playback in the shader** (`viewer/peds/crowdMaterial.js`):
- Per person: a transform plus two slices (slice A = locomotion frame, slice B = overlay frame) and a per-bone-group
  mask (legs / pelvis from A, arms / head from B, or a blend weight). These are two vec4 in a storage buffer.
- The vertex shader reads the 2 bones' quaternions from the table for the slice its bone group uses. That is Mr.doob's
  rigid-pair skinning (`:752-771`), with the table taking the place of the per-person pose.
- **Crossfades between locomotion clips**: skin against both and mix, as the owner's engine does (mixing results, not
  matrices: `crowdSkinning.js:300-304`).

**No sliding by construction**:
- The locomotion phase advances by **distance walked / stride length** of the clip (stride and contact frames are
  stored with the bake). It does not advance by time.
- Speed changes blend between the 3 walk bakes, phase-matched.
- The CPU work per person is a phase counter and two indices (a few ns).

**The near band (≤ ~15-20 m, at most ~24 people)** keeps **Mr.doob's live rig**:
- planted feet on real ground heights (our terrain, kerbs at 13 cm, `viewer/surfaces.js:33`, slopes), so feet meet
  kerbs exactly;
- live overlays (head look);
- it writes a full pose into a "live" slot of the same buffer.

**Hand-over between the live rig and the table** (the owner's rule: no popping, `smooth-lod-no-popping`):
- Both use the same skeleton, so the switch is a **pose blend over ~0.4 s** on the CPU (the live rig starts from the
  table pose at the same phase).
- The mesh LOD switch (LOD0 to LOD1) is a dithered cross-fade (`viewer/lodFade.js`), at a different distance from the
  animation switch, so the two never happen together.

### 3.3 LOD chain

| Band | Distance (guess, tune in the Lab) | Mesh | Animation | Shadow | Max count |
|---|---|---|---|---|---|
| near | 0-18 m | LOD0 ~3.4k tri | live rig + IK, 60 Hz | cast + receive | 24 |
| mid | 18-60 m | LOD0 then LOD1 (fade at ~35 m) | bone table, 30 fps | cast until ~45 m (faded, `FadedShadowNode`, `docs/SMOOTH_LOD.md`) | 120 |
| far | 60-250 m | LOD2 ~150 tri | bone table, frames stepped to 15 fps, no overlays past 120 m | receive only | 300 |
| very far | > 250-300 m | none (dithered fade-out over 30 m, object-anchored noise) | sim only for those on screen-relevant routes, or none | - | - |

**Impostors**: not for walkers. A 1.75 m person at 250 m with a 55° vertical FOV at 1080p is about 7 px tall
(1.75 / (2 x 250 x tan 27.5°) x 1080 ≈ 7.3 px). A 150-triangle skinned mesh at that size costs far less than an
octahedral impostor field with its depth pass (section 2.2). The impostor kit stays an option only for **static** far
crowds, such as café terraces or market crowds seen from the air, and that probably isn't needed.

### 3.4 Navigation: where people walk

All of it is built **in the tile worker** (`viewer/tileData.js` stage; bundle rebuilt with `node tools/build_worker.mjs`,
`HANDOFF.md` "How to run" step 4), as typed arrays per tile, like the traffic graph (`claude/traffic
viewer/traffic/trafficGraph.js`).

1. **Walkable raster**: the UrbIS class raster at 0.5 m (`viewer/surfaces.js:32, 67, 322-345`): sidewalk 5,
   square 4, path 7, ramp 8, tram platform (tram.js platforms, `viewer/tram.js:88-89`). Building footprints, tree
   pits (`:201-240`), street furniture (`viewer/furniture.js`) and parked cars are obstacles.
2. **Sidewalk lines**: on each sidewalk strip between the kerb (kerb frames, `surfaces.js:63-65`) and the façade line:
   - one walking line if narrower than 2.2 m, two otherwise, about 0.6 m from the façade and 0.5 m from the kerb
     (guess; Uccle sidewalks are often 1.5-2.5 m, much narrower than Mr.doob's fixed 1.7 / 2.8 m insets,
     `pedestrian-routes.js:30`);
   - detours round pits and posts with his grid-search idea (`:103-154`).
3. **Crossings**: roads v2's measured crossings (`claude/roads2 docs/roads/PHASE01.md`: BM polygons 1,261, Topo 65,
   OSM 105, in `data/tiles/<T>/markings.json` with outline and road axis).
   - Each crossing is an edge kerb to kerb, two lines.
   - **Signalled** if an OSM signal post sits on it; its phase is the walk phase of that post (`signals.js
     walkState`, `phaseOfDir`).
   - Otherwise a **zebra** (pedestrian priority).
   - The 391 "engine (unmapped)" crossings are used only if the owner wants them.
   - Note from roads v2: pedestrian-signal 2-arm nodes on I6 went from 2 to 0 after the refine
     (`PHASE01.md`, "Traffic" item 4). Check when building.
4. **Corners**: join the lines round the kerb radius (his `links :156-194` meeting-point idea), staying on the
   walkable raster.
5. **Squares** (Place de Saint-Job, Place communale, Altitude Cent):
   - a coarse visibility graph over the square polygon (corners + a few interior nodes);
   - free walking between nodes with local avoidance (below);
   - plus "scenario points": benches (`viewer/furniture.js` OSM benches), shop fronts (OSM shops), the church
     steps.
6. **Parks and forest paths**: OSM `footway / path / steps / pedestrian` lines (`pipeline/build_features.py:23-24`)
   over UrbIS class 7. People walk along them at the path's width (Wolvendael, Parc de la Sauvagère, Kauwberg,
   Verrewinkel).
7. **Tram stops**: the platforms from `viewer/tram.js` and the stop times from `viewer/tramline.js:5-6, 255-262`:
   - people gather 0-6 min before an arrival;
   - at arrival they walk to the nearest door and vanish there (dithered over 0.3 s, behind the door leaf);
   - alighting people appear at the doors and walk off;
   - bus stops (`viewer/furniture.js:109-112`) get the same treatment without a vehicle.
8. **Graph**: nodes at line ends, edges with width, class (sidewalk / crossing / square / path / platform), tile id,
   and a signal phase for crossings.
   - Edges cross tile borders through shared endpoint keys, like the traffic world's twins (`claude/traffic
     docs/TRAFFIC.md`, `trafficWorld.js`).
   - Routing: Mr.doob's greedy goal-plus-noise choice at each node (`pedestrian-routes.js:196-208`) for most
     people. A real A* only for "purposeful" trips (home to tram stop to shop), which can be cached per tile pair.

**Local movement**:
- On lines: 1-D along the line plus a lateral offset ("lane", ±0.4 m) to pass and to side-step. That is his `dodge`,
  extended (`:503-506`).
- In squares: a cheap velocity-obstacle step at 10 Hz against neighbours in a 2 m hash grid (his `meet` grid,
  `:522-578`).

### 3.5 Behaviour

- **Signals shared with traffic**:
  - People read `walkState(phase, t)` from `signals.js` on the shared `signalClock`, with a personal reaction delay of
    0.2-1.5 s (his `:54`).
  - A few late walkers hurry on the flashing phase.
  - Rare "red runners" only on empty narrow streets (guess, 2 %, owner's call).
- **Cars yield**:
  - The traffic sim (`claude/traffic trafficSim.js`) already takes the walker as an obstacle and virtual leader
    (`docs/TRAFFIC.md`, `trafficSim.js` row).
  - Pedestrians publish their crossing occupancy per crossing edge (who is on it, or waiting to step off, as his
    `pedestrianOn`, `his traffic.js:837-849`).
  - Turning cars hold. On **zebras** cars stop for anyone waiting at the kerb who wants to cross (the Belgian rule:
    drivers must let pedestrians cross on a zebra; *to confirm against the Code de la route, art. 40*).
  - People cross a zebra only when an approaching car can stop (`canStop`, as `his traffic.js:822-833`).
- **Density** = base x hour curve(place kind) x weekday factor x weather factor:
  - the city clock is tram 92's clock (`docs/TRAFFIC.md` "population per road class x hour");
  - place kinds come from the data: shop frontage (OSM shops), tram / bus stop, school, park, residential,
    forest;
  - weather from the dev panel's Weather folder (`viewer/devPanel.js:119-120`): rain x0.5 and umbrellas; night after
    22:00 x0.1 (guesses, a table in the Lab).
- **Groups** (about 30 % of people, guess):
  - couples (side by side on wide sidewalks, in single file on narrow ones);
  - a parent and child holding hands (a hand-to-hand IK in the near band only);
  - 3-4 teenagers after school;
  - a dog walker (the dog sniffs and stops at trees);
  - a pram pusher (slower, wider, uses dropped kerbs: roads v2 `CR42L` driveways / ramps).
  - A group is one route with offsets, so it costs about the same as one person.
- **Scenario points**:
  - benches (sit 1-10 min);
  - shop windows (stop 3-20 s, facing the façade);
  - a bus or tram stop (wait, phone overlay);
  - doorways (enter and fade, exit and appear: people come out of houses in the morning);
  - café terraces at Saint-Job;
  - Mr.doob's conversations (`:527-578`).
- **The player character**:
  - On foot: people within 3 m on a collision course slow down and step aside to their right (Belgian keep-right,
    guess), turn their head (near band), and keep a 0.6 m personal radius.
  - Bumping makes them stop and glance (no physics push).
  - In drive mode: Mr.doob's swept-box test against the car (`:230-272`). Step back to the kerb at low speed; run or
    jump aside only at > 20 km/h. Keep his dive as an option, not the default (it reads as comic in a calm suburb,
    owner's call).
  - The player's collider sees pedestrians as moving circles. The character colliders already allow dynamic sources
    (`docs/TRAFFIC.md` "a collider source on the walker's collision world").

### 3.6 Cost targets and budget

**Targets** for 300 people on screen (city, Saint-Job, WebGPU, measured as an A/B like traffic's
`docs/TRAFFIC.md` "Cost"):

| | Target | How |
|---|---|---|
| GPU, whole crowd | **≤ 1.0 ms** | ~24 x 3.4k + 100 x 0.9k + 180 x 0.15k ≈ 200k triangles beauty, near-band shadows only, 3-4 draws + accessories 2-3 draws per band (guess at ~0.4-0.7 ms) |
| CPU main thread | **≤ 0.5 ms** | live rigs ≤ 24 x ~10 µs = 0.24 ms (guess); table people: phase + 2 slots ≈ 0.05 ms for 300; buffer write 300 x 32 B; sim at 10-20 Hz in SoA (the traffic sim does 135 cars in 0.14 ms) |
| Worker per tile | ≤ 50 ms walk graph | raster scan + line extraction + crossings (guess) |
| Memory | ≤ 4 MB | bone table < 1 MB, LOD meshes < 1 MB, buffers |
| Pops | 0 | the traffic standard: spawn and despawn only out of view or beyond the fade, pop counters |
| Foot slide | near ≤ 0.03 m/s, mid ≤ 0.08 m/s p95 | the character audit's measure (`claude/character-audit docs/character/README.md`: planted slide 0.02 m/s) |

### 3.7 Streaming, workers, determinism

- **Per tile in the worker**: the walk graph, spawn points (weighted by place kind), scenario points, and crossing
  edges with phases. They go into the tile's transferable buffers, alongside `buildDriveData`.
- **The simulation on the main thread** at 10-20 Hz fixed steps with interpolation, SoA arrays, a pool of N (N from
  the density at the focus, max ~400), no allocation (the traffic pattern). Moving the sim into a worker is possible
  later. The near rigs must stay on the main thread (they need the pose the same frame).
- **Determinism**: each person's body and route seed comes from hash(tile, spawn point id, time slot), so the same
  place at the same clock shows the same kinds of people. A "Copy link to this view" (`?dev=`) reproduces a scene.
  Respawns use a seeded stream per tile, not `Math.random` (Mr.doob uses `Math.random` in spawns and routes,
  `:97, 148, 154`).
- **Tiles in / out**: people on a tile being unloaded finish their edge if it is in view, or are recycled out of view.
  New tiles get their population filled only out of view (his `protectView`, `:159`).

---

## 4. Pedestrian Lab spec (`labs/pedestrian-lab.html`)

Own UI (`viewer/panelUI.js`, never lil-gui). One Chrome tab during measurements. Four scenes on a **test ground**
(like the Car Lab), then the same four on **real tile data** (I6):

| Scene | Test ground | Real (I6 / others) | What it checks |
|---|---|---|---|
| sidewalk | 120 m street, 2 m and 3.5 m sidewalks, tree pits, posts, a dropped kerb, a 6 % slope | Chaussée de Saint-Job | lines, passing, detours, slopes, kerb steps, foot slide |
| crossing with signal | 4-arm junction, `signals.js` cycle, test traffic cars | the 5-arm Saint-Job junction | queues, WALK reaction, cars yielding, crossing occupancy into the traffic sim |
| zebra | an unsignalled zebra with test cars | a BM-polygon zebra | priority, gap acceptance |
| square | 40 x 60 m square, benches, a café terrace | Place de Saint-Job | free walking, avoidance, scenario points, groups |
| tram stop | a platform + a scripted tram | tram 92 stop at Saint-Job (`tramline.js`) | gathering, boarding / alighting fades |
| park path | a winding 2.5 m path, a bench | Wolvendael path (OSM footway) | path following, dog walker, strollers |

**Panel**:
- **Density** slider (0-3x); **count** (0-600);
- **hour** (city clock), **weather** (dry / rain), **season** (palette);
- **body mix** (age, groups, accessories %);
- **LOD band distances**; **animation mode** per band (live rig / table / off);
- **speed of time**;
- show walk graph / crossings / phases / per-person state (debug draw);
- **player** (walk among them, or drive a car through: reuse the Car Lab's car).

**Readouts**:
- GPU ms (A/B on / off, median of rounds, `docs/PERF_PANEL.md` method);
- CPU ms split: sim, live rigs, table update, buffer upload;
- draw calls; triangles per band; people per band.

**Checks** (each a button, results in `window.lab.results`, as the impostor lab):
- **LOD band check while moving**: scripted camera paths (dolly through the street at walking and driving speed,
  orbit, bird). They count pops (a person appearing / vanishing in view, a mesh-LOD jump without fade, a shadow
  snapping), with the impostor lab's jitter meter (`claude/impostors labs/jitterMeter.js`) restricted to the people
  mask.
- **Foot-sliding meter**: for every drawn person with a planted foot (contact flag from the bake or the live rig), the
  foot bone's world speed. p50 / p95 / max per band, plus a list of the worst offenders (click to fly there). Same
  definition as the character audit's *slide* (`claude/character-audit labs/footProbe.js`).
- **Kerb / ground meter** (near band): the sole's gap and penetration against the measured ground (the audit's *gap*,
  *pen*).
- **Signal compliance**: crossings entered on red (should be ~0 except the configured red runners), cars entering an
  occupied crossing (must be 0).
- **Spawn edge**: spawned / removed in view over a 60 s orbit (target 0 / 0, as traffic's).
- **Frame strips**: 10 fps stepped sequences for review (the owner wants moving evidence, not metrics alone:
  `character2-state` memory note).

---

## 5. Phased plan

| # | Phase | Size | Depends on | Output |
|---|---|---|---|---|
| P0 | **Vendor + baseline**: `vendor/slop-ped/` (LICENSE, ORIGIN at 536a907); Lab with the test sidewalk running his crowd **as is** on flat ground; measure his CPU per rig and GPU per LOD (the numbers this report could only guess) | S | - | baseline table in `docs/peds/` |
| P1 | **Bone table + bands**: `tools/peds/bakeGait.mjs` (his rig on a treadmill, walk / run / turn / idle, contact flags); table playback in TSL (2 slices, bone-group mask); 3 LOD bands with fades; live-rig ↔ table pose blend; foot-slide and pop meters | M | P0 | GPU / CPU at 300 people vs the targets |
| P2 | **Walk graph from data**: worker stage (UrbIS raster lines, OSM footways, roads v2 crossings, platforms), debug draw, Lab real scenes on I6 | M | **roads v2** (`markings.json` on foundation: merge or read from `claude/roads2`), worker bundle rebuild | graph stats per tile, checker for lines off the walkable raster |
| P3 | **Signals + traffic**: `walkState` from `signals.js`, kerb queues, crossing occupancy into `trafficSim.js`, zebras | M | **claude/traffic merged** (and roads v2 phase 3 hold points, `PHASE01.md` "Traffic" items 1-4) | compliance meter = 0 violations |
| P4 | **Bodies v2**: age, children, elderly, silhouettes, season palettes, accessories (umbrella, bags, phone, pram, dog), LOD2 body; mesh-checker pass | M | P1 | contact sheet of 64 random people at 3 distances, grazing-light close-ups |
| P5 | **Overlays + clips**: phone, umbrella, pram push, lead, look-at; sit / stand from UAL1 (CC0) retargeted, or keyframed in code; CREDITS rows | M | P4; **the character chat's retarget tool** (ask first, `claude/character2` is theirs) | clip list with licences |
| P6 | **Behaviour**: density by hour / place / weather, groups, benches, shop windows, doorways, tram stops with `tramline.js`, player avoidance on foot and in drive mode | M | P2, P3 | Lab scenes all green; strips |
| P7 | **City**: `?peds=1`, streaming per tile, determinism, A/B cost in the city, pop counters, dev panel "People" folder; then on by default after the owner's review | S | P1-P6 | `docs/PEDESTRIANS.md`, HANDOFF + TODO entries |
| P8 | Optional: **MPFB2 near-band bodies** A/B (Blender 5.0 headless, CC0 assets, meshoptimizer LODs, retarget to the crowd skeleton); **night lighting** of people (today lamp light maps light only the ground, `viewer/lampLight.js:1-8`; needs the clustered lights from the audit, `docs/SLOP_NEWYORK_AUDIT.md:53`) | L | owner decisions | - |

**The critical path is P0 → P1 → P2 → P3.** P4 / P5 can run in parallel with P2 / P3 (max 2 agents, the owner's
rule).

**External dependencies**:
- the traffic merge (signals, sim obstacles);
- roads v2 (crossings, sidewalks; the "pedestrian-signal nodes 2 → 0" check);
- the character chat (retarget tool; the skeleton stays separate);
- the impostor kit is **not** needed.

---

## 6. Open questions for the owner

1. **Clip licences**:
   - OK to use **Mr.doob's procedural gait (MIT)** as the source of the baked walk / run clips? That is the scripted
     route.
   - OK to add **Quaternius UAL1 (CC0)** for sitting / pushing / emotes?
   - **Mixamo stays out of the crowd** unless you decide the built site may ship Mixamo clips (the question already
     open in `CREDITS.md` on `claude/character2`).
2. **"Scripted" bodies**: is a body from **MPFB2 / MakeHuman** (CC0 assets, driven by a Blender script) acceptable
   for close-up people? Or only bodies built from code tables, like Mr.doob's?
3. **Look**: Mr.doob's people are smooth and stylised (painted faces, no textures). Is that the target, or do you want
   a realism step later (MPFB2 near band, P8)?
4. **Behaviour tone**: dives away from cars (his default) or a calm step back? Red-light runners: none, or a few?
5. **Density**: how busy should Saint-Job be on a weekday morning? A number of people in view, or "like a photo"
   you provide.
6. **Children and dogs**: wanted from the start (more work in P4), or later?
7. **Night**: people at night only once the clustered lights exist (P8)? Without lights they will look flat at night.
8. **Zebras**: always strict pedestrian priority (the Belgian rule as I understand it), or realistic hesitation?

---

## Sources

Mr.doob, slop-newyork at 536a907: https://github.com/mrdoob/slop-newyork (MIT). Files read: `js/pedestrians.js`,
`js/pedestrian-system.js`, `js/pedestrian-routes.js`, `js/traffic.js` (429-438, 485-486, 600-643, 790-860, 1883-1884,
2000), `js/city-config.js:723-727`, `tools/benchmark-pedestrians.mjs`, commit log of the pedestrian files.

- three.js `webgpu_skinning_instancing`: https://github.com/mrdoob/three.js/blob/dev/examples/webgpu_skinning_instancing.html
- @three.ez/instanced-mesh (InstancedMesh2): https://agargaro.github.io/instanced-mesh/getting-started/00-introduction, https://www.npmjs.com/package/@three.ez/instanced-mesh, https://discourse.threejs.org/t/three-ez-instancedmesh2-enhanced-instancedmesh-with-frustum-culling-fast-raycasting-bvh-sorting-visibility-management-lod-skinning-and-more/69344
- Three.js forum, many skinned meshes: https://discourse.threejs.org/t/optimization-of-large-amounts-100-1000-of-skinned-meshes-cpu-bottlenecks/58196
- Unity Animation Instancing: https://blog.unity.com/engine-platform/animation-instancing-for-skinnedmeshrenderer
- Unity GPU instanced animation demo: https://gitee.com/wuwuhb/UnityGpuInstancedAnimation
- GPUSkinning-Unity: https://github.com/tqjxlm/GPUSkinning-Unity
- Render-Crowd-Of-Animated-Characters: https://github.com/chenjd/Render-Crowd-Of-Animated-Characters
- GPU Instancer Pro: https://discussions.unity.com/t/released-gpu-instancer-pro/1488733/314
- Unreal AnimToTexture: https://forums.unrealengine.com/t/community-tutorial-animtotexture-plugin-how-to-use-it-to-make-vertex-animation-textures-for-crowds/746648, https://github.com/kromond/AnimToTextureHelpers
- OpenVAT: https://extensions.blender.org/add-ons/openvat/
- three-vat: https://github.com/manthrax/three-vat
- AC Unity crowd: https://www.gdcvault.com/play/1022141/Massive-Crowd-on-Assassin-s, https://game.watch.impress.co.jp/docs/news/20150307_691715.html
- Hitman: https://gdcvault.com/play/1015315/Crowds-in-Hitman, https://www.intel.com/content/dam/develop/external/us/en/documents/06-create-a-scalable-and-destructible-world-in-hitman2-807276.pdf
- Total War: https://gamedeveloper.com/design/designing-i-total-war-warhammer-ii-i-to-handle-tons-of-units-and-massive-battles, https://www.intel.com/content/dam/develop/external/us/en/documents/instancing-and-oit-in-total-war-three-kingdoms.pdf
- Crowd rendering survey: https://ics-websites.science.uu.nl/docs/vakken/mcrws/papers_new/Ryder_Day%20-%202005%20-%20Survey%20of%20real-time%20rendering%20techniques%20for%20crowds.pdf
- Cities: Skylines II: https://colossalorder.fi/?p=1597, https://pcgamer.com/cities-skyline-2-dev-says-yes-our-characters-have-teeth-no-the-characters-teeth-are-not-affecting-performance, https://gamingshogun.com/?p=129867, https://ps1ke.github.io/Cities-Skylines-2-Modding-Guide/Game/Net/PedestrianLaneFlags
- SUMO pedestrians: https://sumo.dlr.de/docs/Simulation/Pedestrians.html
- GTA V: https://www.gamepressure.com/e.asp?ID=1605, https://gta.fandom.com/wiki/Vehicles_in_GTA_V/Scenarios, https://gta5mod.net/gta-5-mods/scripts/immersive-santos-v1-1/
- Watch Dogs 2 / Legion: https://gdcvault.com/play/1024152/Helping-It-All-Emerge-Managing, https://gamedeveloper.com/design/video-how-i-watch-dogs-2-i-created-a-reactive-crowd-of-npcs, https://gdcvault.com/play/1027239
- Walking speeds: https://staff.najah.edu/media/published_research/2020/04/30/TOTJ-14-44.pdf, https://www.e3s-conferences.org/10.1051/e3sconf/20183401023
- MakeHuman / MPFB2: https://static.makehumancommunity.org/about/license.html, https://static.makehumancommunity.org/assets/assetpacks/index.html, https://www.cgchannel.com/2025/03/check-out-open-source-blender-character-generation-plugin-mpfb-2, https://extensions.blender.org/add-ons/mpfb/versions/
- Quaternius UAL: https://quaternius.com/packs/universalanimationlibrary.html, https://quaternius.itch.io/universal-animation-library, https://quaternius.com/packs/universalanimationlibrary2.html
- Mixamo: https://community.adobe.com/t5/mixamo-discussions/mixamo-faq-licensing-royalties-ownership-eula-and-tos/m-p/13234775 (the helpx FAQ page returned 403)

Our sources:
- `docs/SLOP_NEWYORK_AUDIT.md`, `docs/IMPOSTORS_RESEARCH.md`, `docs/ROADS_V2_RESEARCH.md`, `HANDOFF.md`,
  `docs/TODO.md`, `viewer/surfaces.js`, `viewer/tram.js`, `viewer/tramline.js`, `viewer/furniture.js`,
  `pipeline/build_features.py`, `vendor/slop-trees/ORIGIN.md`;
- branches `claude/traffic` (`docs/TRAFFIC.md`, `viewer/traffic/signals.js`), `claude/roads2`
  (`docs/roads/PHASE01.md`), `claude/character-audit` (`docs/character/README.md`,
  `viewer/character/characterModel.js`), `claude/character2` (log, `CREDITS.md`), `claude/impostors`
  (`docs/IMPOSTOR_KIT_RESUME.md`);
- the owner's engine (read-only): `v3/render/crowdSkinning.js`, `v3/THREE_UPGRADES.md`,
  `games/alg-rts/TODO.md:2215-2219, 3674-3677, 3860-3875`.
