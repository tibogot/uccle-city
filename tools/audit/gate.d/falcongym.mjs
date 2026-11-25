// gate row `falcongym` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "falcongym",
  script: "tools/falconGymTest.mjs",
  args: ["--quiet"],
  guards: "the Falcon Gym (rule falcon-gym, claude/falconlab): headless, the gym controller (viewer/falconGym/gymFlight.js) in the gym's greybox at 60 Hz: level cruise hands-off 65-90 km/h holding its height, Space level ~110 km/h, a stoop from 300 m >= 300 km/h pulled out with no ground contact and from 1000 m <= 389 km/h, a ground take-off in the 4 m alley nearly vertical (<= 2.5 m/s) over the 22 m roofs, under the covered passage a hop / walk out then a launch, a 15 deg wall graze at 30 m/s with no tumble (look-ahead off and on), the landing flare on the tower and the launch off its ledge, the ceiling ~1200 m; the lab's files, our own UI (no lil-gui); models/bird/v2/falcon_v2.glb (when built): 8k-30k triangles and its clips, and its poses (tools/falconV2pose.mjs, the skin evaluated in Node): Perch upright 35-65 deg with the feet on the ground under the hips, short legs under the belly, the folded wings' tips on the tail; the wing feather cards rigid (one bone each) and unstretched in Perch / Stoop; the toes closed in Glide / Perch, open in Talons; the juvenile plumage KTX2 beside it",
  meta: {
    clean: ["tools/falconV2pose.mjs", "viewer/falconGym/gymFlight.js", "viewer/falconGym/gymLayout.js", "viewer/falconGym/gymBird.js", "viewer/falconGym/gymScene.js", "labs/falcon-gym.js"],
  },
};
