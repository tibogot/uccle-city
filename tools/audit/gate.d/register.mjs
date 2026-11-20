// gate row `register` (docs/WORKFLOW.md): the gap register data/gaps.json itself (rule gap-register)
export default {
  name: "register",
  script: "tools/audit/gapRegister.mjs",
  args: ["--quiet"],
  guards: "the gap register data/gaps.json (rule gap-register, docs/STREET_MODEL_PLAN.md 4): one entry per known exception, a stable id <row>.<check>:<elementId>:<s0-s1>, a cause from tools/audit/gaps.mjs (what removes it), evidence, a decision, a date; no wildcards, no id twice, every entry's row judges the register (--register: there a finding not registered fails, a registered one no longer found is stale and fails); prints the size by row and cause (claude/street1)",
  deps: ["data/gaps.json"],
  timeout: 60,
};
