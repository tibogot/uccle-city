---
status: provisional
added: 2026-11-25
check: `falcongym` (tools/falconGymTest.mjs: the gym controller headless in the gym's greybox: cruise, chase and stoop speeds, the pull-out, the alley take-off, the passage hop-out, the 15 deg wall graze, the landing flare and the edge launch, the ceiling, the bank into the turn for both controllers and every input path; the lab's files; the v2 model's triangles and clips once built, and its poses, holes, pads, plumage and far LOD, the folded tail's set, the strike and the walk's foot slide: tools/falconV2pose.mjs) + browser row `falcongym` (the lab loads with no console error)
---
**Rule.** The falcon flies at a real peregrine's speeds and takes off like one, and small mistakes never stun it. Measured headless in the Falcon Gym (`labs/falcon-gym.html`, `viewer/falconGym/gymFlight.js`):

- **Speeds.** Hands-off level cruise is 65-90 km/h. Space held level (the chase) is ~110 km/h. A stoop from 300 m reaches >= 300 km/h and pulls out with no ground contact. A stoop from 1000 m stays <= 389 km/h (the record is the ceiling).
- **Height.** Space held climbs to several hundred metres, with a ceiling near 1200 m.
- **Take-off.**
  - With room above the wings (even the 4 m alley), it is a jump and hard wingbeats, nearly vertical (<= 2.5 m/s horizontal below the roofs), out over the roofs.
  - With a free drop ahead (a ledge), it launches off the edge.
  - With no room (the covered passage), it walks or hops to the nearest launch spot, then launches.
- **Walls.** A 15 deg graze at 30 m/s slides along the wall: no tumble, with or without the look-ahead. A tumble needs a head-on hit over 13 m/s into a big solid. Thin things (sills, railings, low walls) only deflect.
- **Landing.** E with a ledge ahead gives a flare onto it.

**Why.** Owner, 2026-11-25, about the falcon game:

> confusing; controls sometimes fine, sometimes hard; stuck between buildings looks buggy

He asked for it to be realistic:

- enough space: take off from the ground (a jump and hard wingbeats, nearly vertical, slow)
- not enough: walk or hop to a ledge, then launch
- real falcon speeds: level ~65-90, chase ~110, stoop 300+ km/h from height, the record 389
- able to fly high (hundreds of metres)

The city game's controller has grown by layers:

- a physical flight model
- an assist that flies from the player's intent
- an arcade stoop
- a fun layer with an auto-dive
- a collision response with tumbles

Nothing checked the whole against the owner's numbers. The take-off was a drop forward from the perch's own height: from the ground between buildings it touched down again at once.

**Scope.** The gym controller is a proposal next to the city's (the panel switches them). The rule binds the gym now and the city once it adopts the controller.

## The v2 model (V2 POLISH, 2026-11-25)

(The first base, the 25k download: shelved the same day, see "The v2 base" below. Its pose rules (upright perch, short legs, wing tips by the tail, toes) still bind the v2; its rigid-card rules and checks are retired with it.)

**Rule.** The falcon v2 (`models/bird/v2/falcon_v2.glb`, built by `tools/blender/falconV2.py`) poses like a real peregrine, checked on the shipped glb by `tools/falconV2pose.mjs` (the skin evaluated in Node):

- **Perched (the Perch clip).** The body upright, 35-65 deg (built at 45). The feet on the ground under the hip joints (< 7 cm off), nothing below the ground. Short legs: the hip joints < 16 cm up and < 6 cm of leg showing below the belly. The folded wings' tips on the tail (< 6 cm from its feathers), behind the hips.
- **Folded wings slide, they never crumple.** Every wing feather card (a loose part of the download) is rigid on ONE bone, weight 1. No card edge stretches in Perch or Stoop (< 2 %). The covert sheets carry no feather-bone weight.
- **Toes.** Closed in flight (Glide) and on the perch: the claw >= 45 deg toward the sole. Open in Talons: <= 25 deg, never bent back past -35.
- **Plumage.** The player is a juvenile. `falcon_v2_juvenile.ktx2` sits beside the glb and is named in its `asset.extras.variants`. The adult texture stays in the glb, for the church family.

**Why.** The coordinator's review of v2's first build (screenshots `uccle-falcon-gym/2-*`, `6-*`): it stood with its wings spread flat on long stick legs, and its folded poses crumpled the wing feathers. Its talons hung open, and it wore the adult plumage. The causes, found on the way:

- **The fit stretched the Mesh2Motion wing along X.** Mesh2Motion's arm is shorter than the download's, so its elbow and wrist landed mid-forearm and mid-hand, and the fold bent cards in the middle.
- **The weights came from a nearest-surface transfer.** One card's vertices got different bones (a fold tore it), and the covert sheets got feather-bone weights.
- **The download's bind is an attack pose.** Its legs hang, its head is ~15 cm higher than the rig's (the skull took the neck's weights), its beak is open and its toes splay. Its legs were made rigid on the thighs, so they could only swing as sticks.
- **Mesh2Motion's own fold fans this mesh's feathers out.** Its feather bones turn the sheets about the wrong pivots.

The fixes (all in the script):

- the wing, leg, neck and head bones moved onto the download's own joints (its bones, or where its weights blend)
- the legs on the download's own leg weights
- per-card rigid binding by the download's feather groups
- our own folded-wing frames
- the Perch clip by IK from the feet up, with the root's translation
- the beak closed, the toes squared to the tarsus and half curled in the bind
- the juvenile painted on v2's own UVs from the adult's lightness, with the bars swapped for vertical streaks

**Check.** Gate row `falcongym` (`tools/falconGymTest.mjs` runs `tools/falconV2pose.mjs`). The first build fails 6 of these checks.

## The v2 fixes (V2 FIX, 2026-11-25)

### The tail closes when folded

**Rule.** The tail is a closed stack of feathers when the falcon is folded: perched, walking, hopping and in the stoop: < 12 cm across its outer 40 % and under half the glide's (base B; the first base: < 10 cm). Spread in the glide and the flare. The gym's flare / brake layer opens it toward the Flare clip's fan (`gymBird.js` `fanOpen`). Base B: the fan bones are the download's own tail-feather bones (TF2 / TF3, renamed `tail_fan_*`). The first base: Built by `tools/blender/falconV2.py` ("the tail closes"): each fanned feather position has its own bone (`tail_fan_<i>_<L|R>`, children of `tail_2`, heads at the cards' roots), and every clip keys their fold (`TAILFOLD`). The outer feathers fold under the central pair.

**Why.** Coordinator's review of the V2 POLISH: "the tail stays fanned in folded poses". The download's bind spreads the tail as a full fan (96 deg, 35 cm). The Mesh2Motion rig has one tail chain (`tail_1..tail_tip`), so all 22 tail cards were rigid on `tail_2` and no clip could close them. Nothing measured the tail's width.

**Check.** Gate row `falcongym` (`tools/falconV2pose.mjs` `tailTipWidth`): the folded width and the glide / flare spread. The first build failed them (folded 25.6 cm everywhere).

### The walk and the hop are crouched

**Rule.** On the ground the falcon is crouched like a peregrine, its legs mostly under the belly feathers. Through the Walk cycle (sampled at 8 times): the hip joints < 12.5 cm up, < 4.5 cm of leg below the belly, and a foot on the ground (its lowest point within 1.2 cm). Through the Hop: the hips < 15 cm up, < 6 cm of leg below the belly. Both are ours (`falconV2.py` `ground_pose`, as the Perch): the body at 30 deg, the legs by IK from foot targets. The Walk is a 10-frame cycle of 12 cm steps (60 % stance, a slight waddle, the feet planted at 0.48 m/s; base B round C: 12 frames, 10 cm, 0.33 m/s, below). The Hop is a crouch, a push, the feet tucked up, a landing. The gym plays the v2 Walk at the ground speed's rate (`gymBird.js` `V2_WALK_MPS`, capped at 2.5x).

**Why.** Coordinator's review: "walk shows long legs". The Walk and the Hop were Mesh2Motion's, retargeted. The legs took the clip's own long, near-straight leg directions on the download's legs, and the root was only moved down until a foot touched. So the body rode at 21 cm on bare stick legs (8-11 cm of leg showing). Only the Perch had been checked.

**Check.** Gate row `falcongym` (`tools/falconV2pose.mjs`, poses sampled through the clip). The first build fails both.

### The folded wing shows its upper side

**Rule.** A folded wing shows its dark upper side. The wing's covert sheets that face outward in Perch, Walk and Stoop are < 1 % buff in the shipped juvenile plumage. Measured on the wing proper, beyond 6 cm from the midline (the mantle's buff fringes are the back's): luminance > 130 / 255, the upper side's brown is ~65. The underwing stays buff and barred for flight. `falconV2.py` step 8: the wing's sheets take no "breast" term, and their faces that face outward in a folded pose keep the upperparts' colour.

**Why.** Coordinator's review: "the underwing shows buff at the folded wrists". The juvenile paint picked the buff underparts by the bind normal: down, or toward the nose for the breast. The wing's covert sheets matched too: their underside and their leading edge, which faces the nose in the spread bind. Folded, the leading edge and the elbow / wrist crease face outward, so buff strips showed down the front of the folded wing. The adult texture has them dark. Rolling the forearm or the hand does not help: the crease exposes ~6 cm2 a wing in any roll (measured from -30 to +30 deg). The fault was in the paint, not the pose.

**Check.** Gate row `falcongym` (`tools/falconV2pose.mjs`). It decodes the shipped KTX2 with three's own Basis transcoder (`tools/ktx2Decode.mjs`). Base B: the UNDERWING (the faces whose normal points down in the glide) that faces outward when folded: < 1 cm² of it buff (0.5). A juvenile's upper side has pale fringes of its own. The first build failed it (10-13 % buff).

## The v2 base (V2 BASE B, 2026-11-25): Bonada's model, no holes, the feet on their pads

**Rule.** The falcon v2 is built from Hector Bonada's "Falcon_ Merged Animations" (Sketchfab, CC BY 4.0) by `tools/blender/falconV2b.py`.

- **Its own skin and motion.** It keeps its own continuous wing and tail surfaces, its own skin weights bone for bone, and its own idle, take-off, glide, flap beat and landing, baked exactly. Its bones are renamed to our bird rig's names (the 55, plus 45 of its own: the tail fans, the digits, the clavicles), so `viewer/birdRig.js`'s layers, the gym and the checks work.
- **No rigid-card step, no weight transfer.** Our clips (Stoop, Talons, Flare, Walk, Hop) are made from its poses.
- **No holes.** From six directions, in Perch, Walk, Hop, Stoop, Idle and Glide, with the cut-out alpha honoured, no see-through hole in the body over 0.5 cm² (a gap bordered by a leg is the leg's). Folded, from above and behind, the narrow gaps a 6 mm closing of the silhouette fills (the "fingers") stay under 1.5 % of it.
- **On the ground the toe PADS touch the floor.** In Perch, through the Walk cycle and in the Hop's crouch, the lowest toe-pad point is 0-5 mm over the floor, nothing of the foot below -3 mm, and the toes are spread (tips >= 3.5 cm apart). The closed grip only in flight (Glide, Stoop: the spread < 0.7 x the perched) or with prey. Nothing of the perched bird under the floor.
- **The tail.** Closed when folded (< 12 cm and under half the glide's, across its tip half); fanned in the glide and the flare.
- **The far LOD** (`falcon_v2_far.glb`, `tools/falconV2far.mjs`) is 2-3k triangles with the same joints, clips and materials, no textures of its own, posed within 1.5 cm of the near bird. The lab switches to it by the drawn span (56 px out, 68 px back in: no flicker).

**Why.** Owner, 2026-11-25, looking at the first v2 in the gym:

> plenty of holes in its body, something looks wrong

and from behind:

> the model looks good on Sketchfab, please check well

The investigation (screenshots `uccle-falcon-gym/v2fix_src_*`):

- **The first base was the cause, not our pipeline.** The 25k "Peregrine Falcon" download is built of separate tube-like feather cards on a spread-wing bind, with a binary alpha (so the BLEND -> MASK change was not the cause). Its own animation never folds the wings. Half folded, in its own clip, its hand already splays into fingers.
- **Our fold made it worse.** It turned each 5-card sheet whole, so the gaps opened wider. The card shapes themselves could not be fixed in that mesh.
- **Bonada's model already perches correctly** in its own idle: continuous wings lying on the back, a closed tail, the toes flat on the floor.

The owner also found the feet floating:

> the toes curl like a grip in mid-air, the shadow apart from the feet

**Root cause:** the first v2's Perch / Walk / Hop curled the claws into a grip (72 deg) and put the lowest CLAW TIP on the floor, so the pads floated 1.5-3 cm (measured 39 mm in the served Perch). The gate's check measured "the lowest foot vertex", which a claw tip satisfies: it passed while the feet floated. The check now measures the pads.

Found on the way:

- The download's own idle dips its primaries and tail up to 2 cm through its (invisible) floor: lifted per frame, smoothed.
- Its eyes are a glowing blue iris, emissive and mirror-like: darkened to a peregrine's dark brown, roughness 0.28.
- Its rest pose does not match its skin's bind (the importer's rest wing tips coincide), so the bind is the idle's frame 48.
- `birdRig.js` calibrates its layers on the rest pose. On this folded bind, and on top of a Stoop clip that already folds, the fold / tuck layers stood the wing up. The gym calibrates the rig in the Glide and fades the fold layers out with the Stoop clip's weight.

**Check.** Gate row `falcongym` (`tools/falconV2pose.mjs`, the shipped glb's skin evaluated in Node, the KTX2 textures decoded with three's Basis transcoder):

- the rig names; the perched body; the pads; the toes' spread in flight and on the ground
- the crouched Walk / Hop with the pads down
- the tail; the holes and the slits; the folded wing's underwing
- the juvenile per material; the far LOD

The served 25k v2 fails 7 of them: pads 39 mm up, toe tips not measurable, holes 15 cm², slits 3.8 %.

## The v2 round C (V2 ROUND C, 2026-11-25): the folded tail as perched, the strike, the walk planted

### The folded tail lies as perched

**Rule.** In every folded clip (Walk, Hop, Stoop) the closed tail has the Perch's shape and set: its width / length within the Perch's range (+-0.05), the folded wing tips within the Perch's + 1.5 cm of its line, and its tip reaching past them by the Perch's 5.6-6.6 cm (+-2 cm). The Stoop is a teardrop: the idle's folded wings and tail kept as they lie on the body, the body pitched so beak to tail tip is level. In the gym the legs and talon layers (`birdRig.js`) fade out with the v2's Stoop and Talons clips, which set the legs themselves.

**Why.** Coordinator's review of base B (`uccle-falcon-gym/v2b_new_stoop_side.png`): "the closed tail shows as a thin dark spike sticking out behind, like a needle". The cause: `falconV2b.py` `p_stoop` re-aimed `tail_1` alone onto the hips -> spine line. The idle holds its tail ~25 deg off that line, under the folded wings, so the tail swung out from under them (the wing tips 10.4 cm off its line, perched 4.6) and its flat sheet showed edge-on as a needle 9 cm past the wing tips. Not a weight, scale or double-fold fault: the clip's tail had the Perch's length and width. Found on the way: the gym's legs layer (0.5 in flight) also swung the Stoop clip's tucked feet out behind. The needle in the Talons shot was the glide's fanned tail edge-on (the old Talons was the glide). Nothing measured where the tail lies against the wings: only its width.

**Check.** Gate row `falcongym` (`tools/falconV2pose.mjs` `tailSet`). The served base B fails it (the Stoop).

### The Talons is the strike

**Rule.** The Talons clip is the peregrine's strike: the legs thrown forward (both feet >= 4 cm ahead of the chest, `spine_1`, and below it), the toes open and spread wide (the front claws >= 1.3 x the perched apart), the wings raised and back to brake (the tips >= 12 cm over the shoulders and >= 5 cm behind them, the undersides turned forward), the tail down and fanned (>= 0.9 x the glide's), the head looking at the feet (the beak < 35 deg off them). In flight the gym blends it in with the talons (`gymBird.js`: the Talons clip's weight follows the talons layer).

**Why.** Coordinator's review: "the Talons pose is weak: small and hunched". It was the glide with the legs aimed a little forward: the feet 3.5 cm BEHIND the chest, the claws 1.05 x the perched, the wings level, the head looking ahead (113 deg off the feet). In flight the gym never played it (the glide plus a leg layer). Real strikes (slow-motion studies): the toes open and spread, the legs reach out at the prey, the wings up and back as a brake.

**Check.** Gate row `falcongym` (`tools/falconV2pose.mjs`). The served base B fails all four.

### The Walk's feet stay planted at the gym's walk

**Rule.** The gym walks at the speed the v2 Walk plants its feet at (`gymFlight.js` `V2_WALK_MPS` = `GYM.walk` = 0.33 m/s: a peregrine's slow waddle; it hops to cover ground). Played as the gym plays it, the foot slides < 1 cm per planted phase. The Walk: 12 frames at 24 fps, 10 cm stance sweeps, 60 % stance, a 2 deg waddle.

**Why.** Coordinator's review: "the Walk keeps its feet planted only up to 0.48 m/s but the gym walks at 1 m/s". Measured: at 1 m/s (played 2.1x, five steps a second, a scurry) the feet slid 13 mm a step. Not only the speed: the 12 cm sweep was out of the short legs' reach at its ends (the IK fell 7 mm short), so at any rate the stance foot ran slower than the body: 11 mm a step at the clip's own speed. A peregrine walks slowly, so the gym's walk came down to the clip's (10 cm steps, in reach: 1.4 mm). The waddle's 3 deg roll lifted the folded right wing's trailing edge off the tail at its peaks: a 0.4 cm2 see-through gap between their cut-out feather tips from above and below (under the 0.5 limit, sampled once): 2 deg closes it, and the hole check now samples the Walk 6 times through its cycle.

**Check.** Gate row `falcongym` (`tools/falconV2pose.mjs` `walkSlide`, with `GYM` and `V2_WALK_MPS` imported from the gym). The served base B with the old constants: 13 mm.

## Bank into the turn (2026-11-25)

**Rule.** One bank convention everywhere: `phi > 0` = the RIGHT wing down, a right turn (`flightModel.js`'s). Every controller writes it that way. The bird reads it through `birdRoll` / `rigBank` (`gymFlight.js`, used by `gymBird.js`), and the camera reads it as `falconCamera.js` does. A right turn (D, the right arrow, or the mouse moved right) drops the right wingtip below the left in world space. The heading turns clockwise seen from above, and the chase camera rolls the same way. A left turn is the mirror. The lab's input mapping is `fillGymControls`, one function shared by the lab and the test.

**Why.** Owner, 2026-11-25: "when I go right or left it's tilting the wrong side". The cause was the gym controller's bank. It was computed as `atan2(aLat, aUp)`, with `aLat` positive to the LEFT (heading + = left), so its `phi` was positive in a LEFT turn. The bird (`root.rotation.z = -phi`, the rig's bank `-phi`) and the chase camera (`rotateZ(-roll)`) were written for `flightModel.js`'s convention (+ = right wing down). So in the gym controller the bird and the camera rolled against the turn, for every input: keys, arrows and mouse all go through the same `phi`. The city's ("current") controller was right all along. Nothing checked the sign: the speed and stoop checks only read the path.

**Check.** Gate row `falcongym` (`tools/falconGymTest.mjs` 8b). Both controllers, with D / A, the arrows and the mouse aim, are fed through the real `FalconInput` key and mouse handlers. For each, the right turn and the left turn check:

- the wingtips in world space (three's Euler YXZ with `birdRoll`)
- the rig's bank layer
- the heading's sense from above (the ground track's cross product)
- the chase camera's roll

The old sign fails 12 of these checks.

## The orbit view (2026-11-25)

**Rule.** The gym has an inspect mode (O, or the panel's "Orbit / inspect"). It pauses the flight without stepping it, so leaving it returns the exact flight state; the camera and the bird's clip weights and layers are saved and put back. It uses three's `OrbitControls` round the hips bone: drag rotates, the wheel zooms 0.3-40 m (out to the far LOD), right-drag or Shift-drag pans. It has a clip picker that plays in place, a time scale, a pause (P), a turntable (T) and preset views. Its studio fill makes no light: it turns up the intensity of the city Lighting's own hemisphere light (made at startup, kept at 0 under the firmament sky) and puts it back, so the light count never changes. Our own panel, no lil-gui.

**Why.** Owner, 2026-11-25: "I need an orbit camera to see the look of the falcon in the lab".
