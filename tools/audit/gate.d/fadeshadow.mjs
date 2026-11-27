// gate row `fadeshadow` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "fadeshadow",
  script: "tools/audit/fadeShadowCheck.mjs",
  node: ["--import", "./tools/christmas/hook.mjs"],
  args: ["--quiet"],
  guards: "every fading copy's shadow pass warmed once per geometry layout (rule fade-shadow-warm, claude/perf7): a shared copy made under a cover (the plain walls' walls:fade) still gets a casting stand-in, the kit walls' cut + far copies too; main.js warms them in preCompile and on the play loader's tiles; the play loader waits for the SHARED copies' warm-ups only, a tile's own copies warm after play one mesh a batch (option 2, ?fadesharedfirst=old); ?fadeshadowwarm=old (none) still works",
  timeout: 120,
  meta: {
    features: ["fadeshadowwarm", "shadowdrawn", "fadesharedfirst"].map((key) => ({ key, type: "old", group: "perf", sub: "Stutter" })),
  },
};
