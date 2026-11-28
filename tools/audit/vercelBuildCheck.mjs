// Gate row `vercelbuild` (rule vercel-deploy-branches): only the live branch (and the owner's own branches) build on
// Vercel; job agents' claude/* branches never make a preview deployment (each one stored a full ~400 MB copy:
// Deployment Storage hit 42 GB of the free 10 GB on 2026-11-24). Runs vercel.json's ignoreCommand exactly as Vercel
// would (exit 1 = build, exit 0 = skip) for each branch and checks the answer.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const ok = (c, m) => { if (!c) fails++; if (!c || !QUIET) console.log(`${c ? "PASS" : "FAIL"} ${m}`); };
const vj = JSON.parse(readFileSync(path.join(HERE, "vercel.json"), "utf8"));
ok(typeof vj.ignoreCommand === "string" && vj.ignoreCommand.length > 0, "vercel.json has an ignoreCommand");
const want = { "claude/foundation": "BUILD", "claude/kid": "BUILD", "claude/character2": "BUILD", "": "BUILD (CLI deploy, no branch)",
  "claude/villa2": "SKIP", "claude/renders": "SKIP", "claude/xmas1": "SKIP", "claude/anything-new": "SKIP", "main": "SKIP" };
for (const [b, w] of Object.entries(want)) {
  const r = spawnSync(vj.ignoreCommand, { shell: true, env: { ...process.env, VERCEL_GIT_COMMIT_REF: b }, encoding: "utf8" });
  const got = r.status === 1 ? "BUILD" : r.status === 0 ? "SKIP" : `exit ${r.status}`;
  ok(w.startsWith(got), `branch '${b}': ${got} (want ${w})`);
}
ok(vj.buildCommand === "node tools/asset_hashes.mjs" && vj.outputDirectory === ".", "the build command and output directory are unchanged");
console.log(fails ? `vercelbuild: ${fails} FAIL` : "vercelbuild: all pass");
process.exit(fails ? 1 : 0);
