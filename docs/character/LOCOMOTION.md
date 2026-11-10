# Character 2: one skeleton, the animation does the work, the IK only corrects (branch claude/character2)

Started 2026-11-10 from `claude/character-audit`. Lab: `labs/capsule-lab.html` (now the **Character Lab**). City: `?view=third`.

## The diagnosis, checked

| owner's diagnosis | verdict | evidence |
|---|---|---|
| 1. shaking = foot IK fighting the animation (per-frame ground height jumping between treads / edges, no hysteresis) | **right** | the old IK re-ray'd every planted foot every frame; a rolling foot over a nosing flipped between two treads. Now a planted foot's ground is read once, at the touch-down, and held (median of heel / middle / ball). |
| 2. morphing = retargeting between mismatched skeletons | **right, and removed** | the Y Bot and all 14 clips share one skeleton (checked bone by bone in Blender: max rest-pose difference 0.009, a finger tip). Nothing is retargeted. |
| 3. stairs = a flat walk clip forced onto steps by IK | **right** | replaced by stair clips, phase-locked to the nosings and warped to the real riser / tread. |
| (found) Mixamo's "Descending Stairs" is itself broken | new | both feet stay on ONE flat floor while the hips drop 0.49 m per cycle (what the owner saw in Mixamo's preview). Repaired offline: each stance put on its own tread (one riser per touch-down), legs re-solved, hips / timing kept. |

## Pipeline (scripted, no hand work)

```
# 1. FBX -> one GLB pack (checks every clip's rest pose against the Y Bot's) + the model alone
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b --factory-startup -P tools/blender/mixamoPack.py -- data/raw/animations/mixamo data/raw/animations/mixamo/glb/pack.glb models/characters/ybot.glb
# 2. clips in place + metadata (contacts, step times, landing positions, speeds, stair riser / tread, turn angle, air times)
node tools/characters/mixamoClips.mjs            # --report: per-frame contact strings
```
Outputs (all git-ignored: Adobe's terms, see CREDITS.md): `models/characters/ybot.glb` (2.1 MB, 55k triangles,
merged at load to one skinned mesh / one material), `ybot_clips.glb` (0.97 MB, 13 clips). `ybot.json` (metadata) is
committed. Without the GLBs the loader falls back to the Hoodie (Quaternius, the old system, untouched).

Root motion is taken out offline (`mixamoClips.mjs`): loops as a straight line (incl. the stair clips' rise), start /
stop as a smoothed path kept as a distance curve, turns as a heading curve taken off the hips, the air clips' rise and
their 43 deg body turn. Clip facts: walk 1.73 m/s, run 4.51 m/s, stairs up riser 23.9 / tread 24.5 cm, up-run 23 / 24,
down 24.6 / 22.3, turns +-106 deg, jump take-off 0.57 s / touch-down 1.10 s.

## How it works (`viewer/character/locomotion.js`, `legIK.js`)

What each engine taught (the method, not their code):
- **Sync markers** (UE sync groups): one foot phase (0 = left down, 0.5 = right down) drives walk, run and stairs, so
  they blend and hand over in step.
- **Distance matching / root motion** (UE, Paragon GDC talk): start, stop and turn clips drive the controller with their
  own travel / turn (`body.loco.drive`); the stop starts at the frame whose feet match the walk's. Stairs: the stair
  clip's phase comes from where the body is between the nosings (`_scanStairs` grid, circular mean of all risers), so a
  touch-down lands on a tread whatever the speed; a feedback term learns the per-direction landing error.
- **Stride / slope warping** (UE5 Animation Warping): the stair clip's feet scaled to the real tread (forward) and riser
  (vertical); on slopes every foot raised by grade x its distance ahead (capped at 24 deg).
- **Foot placement** (UE5 Foot Placement node, Unity Animation Rigging two-bone IK + OnAnimatorIK pattern): plant from
  the CLIP's contact curves with hysteresis (0.6 / 0.3), planted ground latched at touch-down, swing eased (70 ms) to
  the predicted landing point (the clip's next touch-down, look-ahead), clearance floor, pelvis = the lower foot's
  offset through a critically damped spring (up to +18 / -30 cm), foot lock only while planted, an anti-pop rate limit
  (1.5 m/s), knee in the clip's knee plane + forward bias (no flip). A foot that would stand inside a higher step is
  slid off the edge at plant time; heel / toe may overhang a drop (toes to the riser going up, heel back going down,
  as people do: the Y Bot's sole, 29.7 cm, is longer than most treads).
- **Controller** (pmndrs ecctrl / BVHEcctrl): kept ours (kinematic capsule, fixed 120 Hz); the clip speeds set the
  walk / run speeds, accel 12 m/s2, root-motion hook `input.drive`.
- Not used: motion matching (Clavet 2016; Holden et al. learned MM) needs a large mocap set; 13 Mixamo clips are a
  graph's job. Worth it later if a mocap library comes.

## Verification tools (Character Lab)

- **Frame strips**: every frame (or every Nth) of a scripted walk at 60 fps or slow motion (120 / 240), up to two
  cameras per cell, captioned (mode, each foot planted / swinging + IK offset + knee angle, pelvis, speed, height),
  red border + reason when a pose check fails. Images are real screenshots of each presented frame (a WebGPU canvas
  can't be copied reliably from the page): driver `tools/characters/strip.mjs` (playwright-core over CDP on a dedicated
  Chrome), page side `labs/frameStrip.js stripSession`. Panel "Frame strip" has a best-effort in-page version.
- **Pose checks** (`PoseCheck`, every frame): knee backwards (against the body's facing), knee locked > 179 deg,
  planted foot > 3 cm off the ground (lowest of heel / toe tip), ankle / pelvis pops (second difference > 2.5 / 1.2 cm
  at 60 fps). `lab.poseRun()` = all scripted walks, whole run, nothing rendered.
- **Foot traces** (panel "Foot audit"): heel and toe paths, green planted, orange swinging.
- Course additions: stair flights of 12 / 15 / 19 cm risers, each up, a 2 m landing, down (station "stair flights").

Strips in `docs/character/strips/` (walk start, 15 cm up, 19 cm down, turn, stop, running jump); full audits
`docs/character/audit/loco-round1.txt` (first full run) and `loco-round2.txt` (state at this commit).

## State at this commit (round 2 audit, 60 fps, frames flagged per run)

| | knee back | gap > 3 cm | ankle pop | notes |
|---|---|---|---|---|
| stand, flat walk, flat run | 0 | 0 | 0-29 | run pops are the run clip's own fast swing (2nd diff 5.5 cm) |
| start / stop walk, turns, walls | 0 | 0-3 | 1-17 | looked at: natural |
| stairs 12 / 15 / 19 walk up+down | 0 | 25-49 of 744 | ~50 | up: lands mid-tread (0.48-0.52) on all three; down converges after 2-3 steps |
| stairs runs (up+down) | 0-1 | 80-95 of 337 | ~65-70 | no run-down clip (the walk-down clip plays faster) |
| ramp 15 | 0 | 4-12 | 11 | |
| ramps 30 / 45 | 16-35 | 21-68 | 12-17 | steep test ramps: the ramp/flat creases |
| kerb up 15 | 0 | 34 | 11 | toe tip vs the kerb edge |
| house stairs (37 deg) | 0-33 | 33-85 | 12-54 | |
| jump in place / fall 1.5 m | 0 | 18-25 | 8-11 | landing clip crouch |
| running jump | 0 | 6 | 46 | lands straight into the run |

CPU (synchronous, 60 fps simulated, lab): **~0.09 ms per frame for the whole character** (physics + stair scan +
graph + mixer + IK), of which the IK ~0.04 ms; the old character was 0.24 ms. In the city the HUD shows 0.25-0.30 ms
(a much larger collision world, camera included). Not measured yet: the GPU cost of the 55k-triangle skinned mesh.

This is NOT finished: see docs/TODO.md "Character 2".
