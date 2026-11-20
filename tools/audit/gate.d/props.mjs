// gate row `props` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "props",
  script: "tools/propsTest.mjs",
  args: ["--quiet"],
  timing: true,       // (its cost row measures wall time)
  deps: ["tools/props/glueSmoke.mjs", "viewer/props/"],
  guards: "physics props (rule physics-props, docs/PROPS.md): bins / cones fly, signs bend then snap, bollards bend hard then snap, parked motos tip + slide, Villo bikes topple, terrace tables take their chairs, a lamp still stops the car, the walker kicks; never in a wall / the ground, no NaN, asleep within 8 s, no allocation in the step, 24 awake < 0.1 ms a frame, instance writes are update ranges (+ the city glue on real three.js); --old (?props=old) fails it",
  meta: {
    features: [{ key: "props", type: "old" }],
    clean: ["viewer/props/"],
    text: [{ file: "viewer/main.js", what: "starts the props and resets a tile's props on unload", test: (s) => /cityProps\.start\(/.test(s) && /cityProps\.removeTile\(/.test(s) }],
  },
};
