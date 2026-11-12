# fixes1: the owner's visual defects (branch claude/fixes1)

Two jobs: the tram on ramps (job 1) and the clean-buildings pass (job 2). Resume notes: `docs/fixes1/RESUME.md`.
GPU numbers in this file were taken with 2-3 other agents rendering on the same GPU (the city showed 10 fps / 78 ms
GPU frames at times): they are noise-limited and said so where given.

## Job 1: the tram on ramps (owner: "the tram wagon is doing a weird thing on ramps")

### Cause

Measured along line 92 (all 14 tiles it crosses, the rail-top height the tram stood on every metre, `debug/tramStrip.js`):

1. **The tram bridge over the L26 cutting next to Saint-Job station** (OSM w1411905486 / w1411905488, `bridge=yes`,
   `layer=1`, H6 x 872-932): the trams and rails stood on the carved terrain (`hm.surface + CARVE`), and the DTM is bare
   earth: the deck is not in it. The tram DIVED 8 m into the railway cutting and crossed the SNCB tracks at rail level:
   grade breaks of up to 63 % per metre, a vertical radius of ~9 m, sections kinked against each other
   (`img/tram_bridge_cutting_before.jpg`, frame 8). This is the "weird thing on ramps".
2. **Every section pitched on its own**: `tram2Model.js` gave each piece (cab, suspended section, centre, bellows,
   bogie) its own height and pitch from the ground under its own two ends (`HALF`), so neighbouring sections did not
   share their articulation point in 3D (up to 16 cm vertical mismatch at a joint on the ramp) and the bogies followed
   every 1 m bump of the road (grade breaks of 2-6 % per metre at kerb edges of the measured surfaces, rms 2nd
   difference 0.65 cm/m2 along the line).

### Fix

- **One smooth vertical profile for every tram track** (`tools/build_tram_profile.mjs` ->
  `data/transit/tram_profile.json`, 244 KB, 119 strands, 36 km): the OSM tram ways of all tiles, chained into strands
  across tile seams, sampled every metre on the DTM; bridge spans (+ 4 m abutment pad) interpolated between their ends; a
  3 m Gaussian against DTM noise; then VERTICAL CURVES by projection on the whole network: the 2nd derivative clamped to
  the real tram limits (crest radius >= 500 m, sag >= 300 m), through the 207 switches too (a branch's end is tied to the
  point it leaves, the straight-on triplets through the junction constrained). Deviation from the DTM p50 2 mm, p99 2 cm;
  clamped at 8 cm where the limits cannot be met (only the steep A5/B5 depot fan: 335 points).
- `viewer/trackProfile.js`: lookup (nearest centreline, Catmull-Rom through the 4 m samples: continuous grade) and
  `railTop` = profile + the road's own lift over the DTM (the road surfaces sit 0-10 cm above it: crown, tiers; median
  3.4 cm on line 92), that lift averaged along the track over +-8 m and cached per sample once every tap's tile is loaded.
- Rails (`main.js featureObjects`): drawn at `max(road, railTop)`; the contact wire (`tram.js`) hangs over the profile;
  no poles on the bridge deck.
- **The bridge deck** (`tram.js buildDecks`): a closed concrete slab per track (top, soffit, sides, end caps, 0.95 m
  deep), reaching the midline to the other track, solid parapets (1.05 m) on the free sides, flat normals, uv in metres.
- **The vehicle hinged like the real one** (`tramModel.js tramPose(..., yAt)`, used by `tram2Model.js` and v1): each
  bogie stands on the rails (height and grade under it); each section with a bogie (cabs, centre) lies along the grade
  at its bogie; each suspended section hangs between its neighbours' articulation points; bellows on the hinge (mean
  pitch); pantograph on its section's roof, vertical. The tram samples the rail top along its shape averaged over +-3 m
  (`tramline.js yAlong`: < 5 mm on the profile, softens the 321 m where line 92 leaves the OSM tracks at the commune's
  north edge). `?trackprofile=0` = the old behaviour (no deck) for A/B.
- SNCB trains: checked, no change needed: their tracks are already smoothed in the pipeline (30 m robust smoothing;
  minimum vertical radius 330 m on a 10 m chord) and every car stands on its two bogies (`trainModel.js trainPose`).

### Numbers (`debug/tramStrip.js jointCheck`: a tram posed every 0.5 m, old way vs new way, same page)

| stretch | joint mismatch max (old -> new) | bogie off the drawn rail p99 (old -> new) | worst pitch change per 0.5 m (old -> new) |
|---|---|---|---|
| H6 bridge approach + bridge (s 11180-11360) | 16.4 cm -> 0 | 22 cm (43 max) -> 1.8 cm | 9.07 deg -> 0.15 deg |
| H5/G5 streets (s 10300-11150) | 0.1 cm -> 0.1 cm | 0.7 cm -> 2.2 cm | 0.27 deg -> 0.07 deg |
| H6 east (s 11360-12000) | 0.1 cm -> 0 | 0.6 cm -> 1.6 cm | 0.08 deg -> 0.03 deg |
| G1 (trip ...887, s 4500-4900) | 0 -> 0 | 1.6 cm -> 5.2 cm | 0.57 deg -> 0.38 deg |
| G1/F1 (s 7400-8300, incl. the 321 m without OSM tracks) | 0.1 cm -> 0 | 1.6 cm -> 5.6 cm | 0.80 deg -> 0.64 deg |

(the old "bogie off rail" is against the old rails, which followed every bump: 0 by construction; the new rails are
drawn at max(road, railTop), so where the road has a hump the rails follow it and the tram glides over it: up to 5-7 cm
in G1/F1 at raised plateaus. The proper fix is the road laid on the track profile: roads2's domain, the profile API is
there for it.) CPU: `tramLine.update` 0.06-0.1 ms for 19 running trams.

### Images (before = `?trackprofile=0` or the code before this branch)

- `img/tram_bridge_cutting_before.jpg` / `img/tram_bridge_cutting_after.jpg`: from the railway cutting, the tram crossing
  (before: down in the cutting at rail level; after: on the deck over it)
- `img/tram_bridge_chase_after.jpg`: chase camera up the ramp onto the bridge (smooth, no dive)
- `img/tram_g1_side_before.jpg` / `_after.jpg`, `img/tram_g1_chase_before.jpg` / `_after.jpg`: G1 (x 4, z -1918), the
  sharpest sag on 3 m in the streets (R 53 m): no visible change at this scale, the numbers above are the proof.

### Left

- Road humps (raised junction plateaus) under the rails: the rails follow the road, the tram does not (<= 7 cm, behind
  the bogie skirts); fix in the road build (roads2) by laying the carriageway on `trackProfile` near the tracks.
- 321 m of line 92 along the commune's north edge (G1/F1, z -2000..-1704) has no OSM track in our data (outside the
  study polygon): no rails drawn there, the tram follows the smoothed road.
- The deck is generic concrete (no Blender hero); the terrain under its two ends was not re-shaped (the DTM abutments).
