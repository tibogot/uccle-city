// gate row `carctl` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "carctl",
  script: "tools/carctlTest.mjs",
  args: [],
  guards: "car handling targets (radius, response, slip, kerb, hill, braking), camera jitter, trams / trains solid (docs/CARCTL.md)",
};
