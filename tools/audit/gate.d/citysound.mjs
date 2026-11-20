// gate row `citysound` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "citysound",
  script: "tools/sound/citySoundTest.mjs",
  node: ["--expose-gc"],
  args: ["--quiet"],
  guards: "the city sound (rule 42, docs/SOUND_CITY.md): a scripted 20 s city scene renders non-silent offline (OfflineAudioContext in pure JS), every category heard, voices under the limit, main-thread cost < 0.1 ms a frame, no object per update and no graph leak, sound OFF by default, ONE button runs / suspends every AudioContext the modes make, no second switch left, ?citysound=old",
};
