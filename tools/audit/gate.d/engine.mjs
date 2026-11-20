// gate row `engine` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "engine",
  script: "tools/sound/engineTest.mjs",
  node: ["--expose-gc"],
  args: ["--quiet"],
  guards: "the player car's engine sound (rule 47, docs/ENGINE_SOUND.md): the 18 gen6 loops present (1 s mono 48 kHz), no click at any loop seam nor at the RPM brackets' crossfades (sweeps at load 1 / 0.5 / 0 through an emitter), the RPM follows a scripted 0-120 km/h drive (shifts with the 0.13 s cut, lift-off, stop to idle), the drive renders through the city emitter chain, cost < 0.05 ms a frame, nothing made by a frame, muted by default (nothing fetched), ?engine=old",
  meta: {
    features: [{ key: "engine", type: "old", group: "ab" }],
  },
};
