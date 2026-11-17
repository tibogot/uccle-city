// HEAP GATE (claude/heap, docs/HEAP.md): the CPU copies dropped after the GPU upload must have NO unlisted reader.
//   node tools/audit/heapGate.mjs        exit 1 on a failure
// WHY: round 9 found 1.23 GB of the 1.46 GB police heap in ArrayBuffers: CPU copies nothing read after the upload,
// and a tile's whole worker build result kept alive by its dispose closure (`d.bridgeDecks` in loadTile). The heap drop
// (viewer/heapDrop.js) frees them; a NEW reader of a dropped layer would read empty arrays (silently: NaN positions).
// RULE: a module that reads a full tile's terrain / roads / buildings meshes, or a far tile's meshes, on the CPU after
// the tile is built is listed in docs/HEAP.md "Readers" AND in KNOWN below (with what it reads and how it is handled).
// Checks:
//   1. viewer/heapDrop.js logic (tools/heap/dropCheck.mjs: drop only after upload, keep lists, holds, guards)
//   2. every file that reaches a tile layer by name is a KNOWN reader
//   3. loadTile's dispose closure does not reach the build result `d` (that kept ~25 MB a tile alive)
//   4. the switches have their features.js rows
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const KNOWN = {
  "viewer/main.js": "builds the tiles, registers the drops (loadTile end), groundAB swaps materials only",
  "viewer/character/cityHook.js": "roads group position + index (KEPT: keep list) and tram platforms (features: not dropped)",
  "viewer/heros/herosGround.js": "park tiles' terrain position / normal / index: HELD until the lawn is built (herosCity.js hold/release)",
  "viewer/wolvendaelCity.js": "terrain / trees into the pond reflection: GPU only",
  "viewer/liteShown.js": "a far tile's group by name (is it shown?): no geometry",
  "viewer/contactAudit.js": "dev audit: needCpu() throws on a dropped array (run with ?heapdrop=old)",
  "viewer/drive/collisionTest.js": "dev audit: needCpu() throws on a dropped array (run with ?heapdrop=old)",
};
const rows = [];
let failed = 0;
const check = (name, ok, msg) => { rows.push([name, ok ? "PASS" : "FAIL", msg]); if (!ok) failed++; };

// 1
const r = spawnSync(process.execPath, ["--import", "./tools/heap/register.mjs", "tools/heap/dropCheck.mjs"], { cwd: ROOT, encoding: "utf8" });
check("dropCheck", r.status === 0, r.status === 0 ? "heapDrop.js logic" : (r.stdout + r.stderr).split("\n").filter((l) => /FAIL|Error/.test(l)).slice(0, 3).join(" / "));

// 2
const walk = (d, out = []) => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p, out); else if (p.endsWith(".js") && !p.endsWith("tileWorker.bundle.js")) out.push(p); } return out; };
const PAT = /-(terrain|roads|buildings|lite)`|\.name === "terrain"|layers\.(terrain|roads|buildings)\b|"far-lod"|"far-buildings"/;
const readers = walk("viewer").filter((f) => PAT.test(fs.readFileSync(path.join(ROOT, f), "utf8")));
const unknown = readers.filter((f) => !KNOWN[f]);
check("readers", !unknown.length, unknown.length ? `new reader(s) of a dropped tile layer: ${unknown.join(", ")}: list in docs/HEAP.md + KNOWN here` : `${readers.length} known readers`);

// 3
const main = fs.readFileSync(path.join(ROOT, "viewer/main.js"), "utf8");
const lt = main.slice(main.indexOf("async function loadTile("), main.indexOf("// ------------------------------------------------------------------ main"));
const disp = lt.slice(lt.indexOf("const dispose = () => {"), lt.indexOf("\n  };", lt.indexOf("const dispose = () => {")));
check("dispose", disp.length > 0 && !/\bd\./.test(disp) && /d = null;/.test(lt), /\bd\./.test(disp) ? "loadTile's dispose reads d.*: the whole build result stays alive with the tile" : "dispose keeps no build result; d let go");

// 4
const feats = fs.readFileSync(path.join(ROOT, "viewer/features.js"), "utf8");
const miss = ["heapdrop", "tiledrop", "litedrop", "ktxdrop"].filter((k) => !feats.includes(`old("${k}"`));
check("switches", !miss.length, miss.length ? `no features.js row: ${miss.join(", ")}` : "4 switches listed");

console.log("| heap check | result | detail |\n|---|---|---|");
for (const x of rows) console.log(`| ${x.join(" | ")} |`);
process.exitCode = failed ? 1 : 0;
