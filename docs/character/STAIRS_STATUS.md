# Stairs: status at shutdown (branch claude/character-audit, WIP commit "WIP stairs:")

## Diagnosis (v2, commit 87dbb17, what the owner saw)
The legs looked broken on the stairs (`labs/capsule-lab.html?play=stairs%20up%2017%20walk&cam=feet%20side`). Sheet:
`stairs_up-v2-as-shipped.jpg` / `stairs_down-v2-as-shipped.jpg`.
1. **Heel kicked up behind the body.** The swing foot's look-ahead (0.07 m + 0.08 s x speed ahead of the toe)
   raised the foot to the higher ground ahead. It did this even while the foot was still BEHIND the hip, and it added
   that lift ON TOP of the clip's own swing lift. Result: IK offsets of ~45 cm (HUD "L 44 / R 45"), the shin horizontal
   behind, the heel at hip height.
2. **Trailing leg stretched dead straight.** The foot lock held the trailing foot on the lower step while the body
   moved up and forward. The pelvis then dropped to make the leg reach it, instead of letting the foot go.
3. **The metrics missed it.** They only checked foot-to-ground contact, not whether the pose was plausible.
4. **Root cause underneath.** A flat-walk clip's stride (0.7 m, ~0.4 m even after the stride warp) spans 1.5 to 2.5
   treads, so the IK has to stretch or fold the legs a lot.

## Changed so far (all in this WIP commit)
- `viewer/character/footIK.js`
  - **Swing look-ahead removed.** A swinging foot now keeps the clip's own swing over the ground under it. Only while
    it swings FORWARD relative to the body (`L.vloc > 0.1`) is a floor raised: up to 3 samples ahead of the toe, at 1/3,
    2/3 and 1 foot length. The floor counts the clip's own lift (`ground + clearance - rootY - clipSoleHeight`), so no
    lift is added on top of a lift that already clears. Its rise is capped at `maxStep`, and the foot never goes more
    than `maxStep + 0.3 x foot` above the clip's foot over the ground under it. Result: no lift while the foot is
    behind the body.
  - **Early release of the trailing foot.** When the hip-to-target distance passes max(0.95, min(0.985, clip's
    stretch + 0.02)) of the leg length, its contact (lock + pelvis "need") fades out (`L.stretch`). The foot lets go
    instead of the leg being stretched straight, and the pelvis does not drop for it.
  - **Lengths now in body proportions** (clip and rig agnostic: see below). This edit was made right before shutdown
    and is **NOT yet tested**. Run the test suite first.
- `labs/footProbe.js`: POSE PLAUSIBILITY metrics, measured against the clip's own pose each frame (taken before the
  IK, `body.preIK`):
  - `foldMax`: knee folded more than the clip's knee, degrees
  - `extMax`: leg extension minus the clip's; `extOverPct`: planted frames with the leg > max(0.97, clip + 0.01)
  - `pitchDev`: foot pitch vs the clip's, degrees
  - `extraLiftCm`: a swinging heel above the ground under it, beyond the clip's heel lift
  - `heelToHipCm`: heel closer to the hip than in the clip, net of the ground under the heel
  - `offYCm`: vertical heel offset vs the clip
  - These are shown in the lab's "measure all" table.
- `labs/capsule-lab.js`
  - The pose columns are added to the audit table.
  - **Bug fixed:** the "house stairs up" scenario used to start on the upper floor (the ray started above the slab),
    so every earlier "house stairs up" number is invalid.
- `tools/footAuditCompare.py`: compares two audit runs by key (`python tools/footAuditCompare.py a.json b.json "slideMean:slide:2:max,..."`).
  The raw runs are in `docs/character/audit/`:
  - `v1.json`: original code
  - `v2.json`: as shipped
  - `v8.json`: this WIP before the proportions edit

## Verified (v8, before the proportions edit; worst of 30 / 60 / 144 fps)

| surface | swing+lift cm, v2 → v8 | heel>hip cm (v8) | planted slide m/s, v2 → v8 |
|---|---|---|---|
| stairs up 17 walk | 28.9 → 19.4 | 20 | 0.03 → 0.09 |
| stairs up 17 run | 32.8 → 20.6 | 18 | 0.16 → 0.34 |
| ramp 30 up | 20.1 → 11.5 | 13 | 0.06 → 0.13 |
| ramp 45 up | 31.8 → 19.2 | 20 | 0.07 → 0.13 |
| slope 55 | 36.9 → 21.1 | 21 | 0.09 → 0.10 |

- Flat, kerbs and ramps are unchanged within a few cm.
- "heel>hip" only has a v8 value: v2 was measured before the metric was redefined net of the ground under the heel.
- Visually (`stairs_up-v3-wip.jpg`): no heel kick behind the body any more. But the trailing foot still sometimes
  hangs toe-down behind, and a forward-swinging foot can rise high toward a step two treads up.
- **Stairs DOWN is still poor:**
  - planted leg over-extended (`extOverPct` ~33 %)
  - swing heel up to ~34 cm above the lower tread beyond the clip's lift
  - stepping down with the clip's long stride
- A procedural stair gait was tried: the landing snapped to one tread, an arc over the riser, the foot kept level.
  It measured worse (more slide; the lock handover at landing was not clean), so it was **removed**.

## Next steps (in order)
1. Reload the lab. Press T for the test suite, then "measure all". Check the proportions edit changed nothing (the
   default values were converted 1:1 for a 0.86 m leg and a 0.155 m foot). Commit.
2. **Make the plausibility metrics into tests** (in `runTests`, foot group):
   - swing+lift ≤ riser + 5 cm
   - heel>hip ≤ 25 cm
   - extOverPct ≤ 5 % on flat / kerbs / ramps
   - pitchDev ≤ 35°
   - knee > 179° frames ≤ 1 %
   - fold > clip ≤ 50° on flat / kerbs
   - Record a v1 / v2 / v3 table with `tools/footAuditCompare.py`.
3. **Stairs down:** release the planted leg on extension as well when going down. Then let the swing foot descend to
   the lower tread sooner (ease faster when the ground under it is lower and the foot is past the nosing).
4. **Watch it move** (feet side + feet 3/4, 1x and 0.25x) and grab dense frame sequences at the worst moments:
   - lab: stairs up / down at walk and run, kerbs, ramps, house stairs
   - interior lab `?view=walk`: the stair runs along local +z from local (0.75, 1.0); see the earlier report for the
     probe snippet
5. **A natural stair climb can't be reached by IK on a flat-walk clip.** The stride and the knee lift are wrong. The
   proper fix is one of:
   - (a) a stair-climb / descend clip for this rig family (Quaternius modular men; UAL is a UE-style rig and would
     need retargeting)
   - (b) a procedural stair gait: stride = one tread per step, landings snapped to tread centres, the clip's foot
     curve rescaled to the riser, the clip's timing kept. Hand it over to the foot lock at touch-down by adding the
     override to the lock's correction in the same frame. That handover is what failed in the first attempt; also
     learn the swing time from the clip.

   With (a), the IK only corrects the residual: the swing floor and the release only act when the clip falls short.

## Clip-agnostic requirement (owner)
More clips will come (stairs, jump, turn, maybe another rig). So:
- **Phases come from the playing clip, not from tuning.**
  - planted = the sole's height above the clip's flat ground is below `plantLow x foot`, AND the sole is not moving
    forward relative to the body
  - swing = the rest
  - The sole points (heel, toe) are found from the skinned mesh's foot vertices (`FootIK._soles`).
- **All limits are in body proportions:** leg = hip-to-ankle length measured each frame; foot = heel-to-toe length
  from the mesh (`FOOT_IK` comments: "x leg" / "x foot").
- A dedicated stair clip will simply reduce what the IK corrects. The swing floor uses `max(clip lift, needed)`, and
  the release uses the clip's own leg stretch.

### How to plug a new clip in (to be moved into README.md)
1. Convert the clip onto the same rig (`tools/characters/convertCharacters.mjs`), or bring a rig that has:
   - a leg chain upper → lower → end (ankle)
   - foot bones the IK can place: an IK-style foot under the root, or under the shin (then attach is skipped)
2. In `viewer/character/characterModel.js`:
   - add the clip name to `CLIPS` (roles: idle / walk / run / jump / fall, or a held pose `{ clip, at }`)
   - give the rig's leg bone names in `LEG()`
   - set the authored ground speed (`stride`), or let `strideSpeed()` measure it from the planted foot
3. A stair clip: add a role, e.g. `stairsUp` / `stairsDown`. Pick it in `body.js` when `st.grade` (the ground grade
   under and ahead of the body, from `index.js`) is above ~0.4. Then turn off the stride warp and the stair
   cadence / slowdown (`footIK.p.strideCut = 0`, `body` steep factor, `tp.stairSlow = 0`), since the clip already
   steps tread by tread.
4. Check it in the lab: Foot audit → "measure all" and the plausibility columns, plus T.
