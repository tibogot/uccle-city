// gate row `meta` (docs/WORKFLOW.md): every row's features.js / main.js text checks + no light / no DynamicDrawUsage
// (each row's own `meta` field), features.js one row a line, every viewer/ debug/ tools/ module parses and links
export default {
  name: "meta",
  script: "tools/audit/metaGate.mjs",
  args: ["--quiet"],
  guards: "the text checks the rows declare in `meta` (a features.js row per switch, main.js wiring, no light made, no DynamicDrawUsage: rules 7, 8), viewer/features.js one row a line and no key twice (merge=union), every viewer/ debug/ tools/ .js / .mjs module parses and its imports link (esbuild; claude/speed1)",
  timeout: 120,
};
