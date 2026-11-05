# The Saint-Job falcons (branch claude/falcons)

A peregrine family at the Saint-Job church: the eyrie in the belfry, three downy eyases, the female and the tiercel
living by small behaviour state machines, and fly mode starting at the nest (the player is the young falcon leaving
it). **On by default in the city** (cheap, see the numbers); `?falcons=0` = none. Lab: `labs/falcon-lab.html`.

## What is where

| piece | file | what |
|---|---|---|
| the family | `viewer/falcons.js` | assets, poses, birds, behaviours, LOD / culling / update rates, `createFalcons({ church, heightAt })`, `fam.update(camera)`, `fam.force("food" \| "stoop" \| "circle" \| "perch" \| "feed")`, `fam.stats` |
| the eyrie | `tools/blender/falconNest.py` -> `models/falcons/nest.glb` (+ nest.json) | a weathered wooden tray (three bevelled boards a side) of pea gravel on the belfry floor behind the arch: a displaced 9 mm Voronoi gravel bed + 150 loose pebbles, the scrape (a hollow with a rim), plucked pigeon feathers (some with the wing bars), white down tufts, one barred falcon feather, a pigeon wing, a breastbone, leg bones, dried scraps, chalky splashes on the gravel / tray lip / reveal floor and drips over the sill; per-vertex colours x Cycles AO baked into them; empties for the eyases, the feeding adult, the scrape, the hop. Also `prey_carry`, the pigeon carried in the talons. 28.9k tris, 1 draw. |
| the church | `tools/blender/stjob.py`, `models/stjob/` | the falcons' arch (outer NW face, right-hand belfry arch): its three lowest louvre boards out (0.93 m clear, as nest sites behind louvres are made), the chamber's inner wall open behind it, the boards there two-sided; perch empties `perch_ledge` (the arch's reveal floor), `perch_louvre` (the middle arch), `perch_gable` (top of the NW clock gable's stone cross), `perch_cross` (the arm of the spire's iron cross), each with the way the bird faces; `stjob.json` "perches" |
| whitewash | `viewer/stjobModel.js` masonry shader, `stjobLook.whitewash` | droppings below the eyrie: chalky on the sill and the string course, uneven streaks down the brick that thin out, on faces looking out or up only |
| plumages | `tools/blender/peregrine.py --variant eyas \| juvenile` -> `models/bird/eyas.jpg`, `juvenile.jpg` | the same painter on peregrine.glb's own UVs: the eyas (creamy down in clumps, dark eyes in bluish skin, slate beak, pale cere, yellow feet) and the juvenile (brown upperparts with buff edges, buff underparts with vertical streaks, bluish cere and eye ring) |
| fly mode | `viewer/flight.js startFromNest`, `viewer/main.js fly()` | the nest start (below); `?flystart=spire` = the old start at the spire tip; `?birdskin=adult` = the old adult plumage on the player |

## One rig for everyone

Every bird is a clone of `models/bird/peregrine.glb` (SkeletonUtils: geometry, texture and clips shared, a skeleton
each). The rig has no perched pose (its Idle and Walk hold the wings half open on the ground), so two static poses are
**baked at load** by aiming bones in the model's frame: **Perch** (body ~40 deg up, wings folded along the back with
the hand crossing over the tail, trailing feathers down the flanks, legs under the body, head level) and **Sit** (the
eyas sitting back on its tarsi, wings held down). The clips are trimmed at load to the tracks that move (165 -> 46-56
per clip; scale tracks dropped, so bone scales stay): the body is 1.3x for all birds (the rig's body is short for its
wings), the eyases get a big head, a small beak, a round body (uniform scales, each grown bone's child compensated),
stubby wings and no tail. Clip weights (Perch/Sit, Flap, Glide) are eased, never snapped, and the procedural layers of
`viewer/birdRig.js` ride on top (wings folded in the stoop, bank, braking, plus new ones: head down / turn, neck up,
beak open, wings spread).

Sizes: female wingspan 1.10 m, tiercel 0.94 m (about a third lighter, ~15 % smaller), eyases ~3 weeks.

## Behaviours

- **Perched**: on the cross, the gable cross, the louvre ledge, the eyrie's ledge; quick head turns then stillness;
  after landing (facing the wall) the bird turns round on the spot to face out.
- **Takeoff**: a drop forward off the perch with the wings opening (a Hermite path), then free flight.
- **Thermals**: wide climbing circles over the Place NW of the tower, a few wingbeats now and then.
- **Hunting stoop** (mostly the tiercel): from 60-125 m up, a 40-60 deg dive at a pigeon above the rooftops, wings
  folded (fold layer), up to ~60 m/s; a strike (caught 70 % / 55 %) or a miss, then the pull-out.
- **Prey home**: the tiercel calls near the tower; if the female is perched she flies out, comes up under him, rolls
  over (2.3 rad) and takes the prey from his feet (the aerial **food pass**), then lands on the ledge, hops in and
  feeds the young (head down, tearing, offering); else he lands and delivers it himself. The female waits on her
  perch while he is out with prey.
- **Landing**: an approach point 22 m out from the perch (from behind the tower: round it above the spire first), then a
  Hermite final with braking flaps, tail down, onto the perch facing the wall.
- **Eyases**: settled, breathing bob, head turns, now and then wing exercise (flapping on the spot); **begging** when
  an adult is in the scrape or on the ledge: head up toward it, beak open and working, wings drooped and quivering.
- Flight floor: the city's ground + roofs (`world.heightAt`) and a proxy of the church (tower, spire, dome, wings).

## Fly mode starts at the nest

The young falcon (juvenile plumage) in the scrape with its siblings, the camera low behind it in the dark chamber
looking out through the arch; a hop up onto the ledge with a flap; a look out over Place de Saint-Job; the launch (a
drop with hard wingbeats) and the hand-over to the controls at the launch's speed and heading. Life size in the
belfry (1.0 m span), growing to the fly-mode size (2.7 m, the owner's readable size) over 3.5 s with the chase
distance; the roof collision waits 6 s (the roof grid holds the tower). Space skips to the launch. The adults are
moved off the ledge first. Screens: `docs/falcons/fly_start_1_scrape.jpg` .. `fly_start_4_free.jpg`.

## Cost

- Birds: 1,898 tris (LOD0) / 664 (LOD1, meshopt on a position-welded index, beyond 70 m, dithered cross-fade over
  +-8 m via `lodFade.js` objectFade), faded out at 600-680 m (a bird is ~1 px there). Animation only on screen and in
  range, every frame < 40 m, 1/2 < 120 m, 1/3 < 300 m, 1/6 beyond (the clips' time accumulates, so a bird resumes in
  step). Shadows only from adults within 45 m. The behaviours (cheap maths) run always.
- The eyrie: drawn within 150 m (the chamber hides it from the street anyway), full within 30 m, meshopt LOD
  (14.3k tris, Prune) beyond, cross-faded.
- Measured in the city (Chrome, WebGPU, `debug/gpuAB.js alternate`: falcons off / on alternated 5 rounds in one page,
  GPU p50 per round; the falcons' own CPU from `fam.stats.cpuMs`):

| view | GPU off | GPU on | diff (min..max) | falcons CPU |
|---|---|---|---|---|
| at the eyrie, 3 m from the ledge (female feeding, 3 eyases, full nest, 4 birds animated) | 5.99 ms | 6.08 ms | +0.09 (-0.19..+0.52) | 0.15-0.17 ms |
| over the Place, 110 m up, both adults circling on screen (LOD1) | 5.83 | 5.82 | -0.01 (-0.26..+0.13) | 0.13 ms |
| the city overview (nothing on screen, nothing animated) | 7.22 | 7.18 | -0.04 (-0.33..+0.20) | 0.08-0.09 ms |

  The GPU difference is within the run-to-run noise everywhere; other agents' tabs on the same GPU add noise.

## Realism checks (docs/falcons/compare_*.jpg)

Each image: our render left, a Wikimedia Commons photo right (credited in the image and in CREDITS.md; originals in
`data/raw/refs/falcons/`, git-ignored, SOURCES.json). Commons has **no free photo of the Brussels cathedral
peregrines themselves** (searched EN/FR/NL, "Faucons pour tous", the cathedral's categories), so the Brussels check is
the St Michael and St Gudula belfry (the nest site: louvred openings), and the birds are compared with Derby,
Allenberg, Bath, Leeds and Reims photos.

- `compare_eyrie_chicks`, `compare_eyrie_box`: the gravel tray, feathers, droppings and begging eyases vs Derby
  Cathedral's platform and a tower nest box. Ours: the right substrate and litter; the eyases are smaller-headed and
  less fluffy than real ones (a low-poly adult rig reshaped).
- `compare_perch_cross`: the tiercel on the gable cross vs a peregrine on a Gothic finial (Bath).
- `compare_whitewash`, `compare_belfry_brussels`: the eyrie seen from the Place with binoculars: whitewash under the
  arch, the birds on the sills, the gap in the louvres.
- `compare_flight_below`: the soaring female from below (barred underwing, dark tips, fanned tail).
- `compare_juvenile`: the player's fledgling on the ledge vs the Reims cathedral fledgling.

## What still looks weak

- The bird mesh is the old low-poly rig (1.9k tris): folded wings are a reshaped membrane (a slight cape at the
  shoulders up close), no real feathers; the eyases are the adult rig reshaped, angular rather than a ball of down.
  A proper peregrine model with fold / takeoff / landing clips is still the owner's open decision (TODO).
- Whitewash is one family of streaks under the arch; real eyries also have spatter all round (sills, lower ledges).
- The prey in a stoop is implied (no pigeon flock to chase); the strike happens at a point in the air.
- The belfry chamber's light is a constant factor (`falconLook.nestLight`), not real occlusion of the sky light.
- No calls (sound), no rousing / preening idles, no brooding at night.
