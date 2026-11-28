// gate row `fadeshadow` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "fadeshadow",
  script: "tools/audit/fadeShadowCheck.mjs",
  node: ["--import", "./tools/christmas/hook.mjs"],
  args: ["--quiet"],
  guards: "every fading copy's shadow pass warmed once per geometry layout (rule fade-shadow-warm, claude/perf7): a shared copy made under a cover (the plain walls' walls:fade) still gets a casting stand-in, the kit walls' cut + far copies too; main.js warms them in preCompile and on the play loader's tiles; the play loader waits for every copy's warm-up (option 2, the shared copies only + a late queue, is the opt-in ?fadesharedfirst=1); ?fadeshadowwarm=old (none) still works",
  timeout: 120,
  meta: {
    features: [...["fadeshadowwarm", "shadowdrawn"].map((key) => ({ key, type: "old", group: "perf", sub: "Stutter" })), { key: "fadesharedfirst", type: "opt", group: "perf", sub: "Stutter" }],
  },
};
