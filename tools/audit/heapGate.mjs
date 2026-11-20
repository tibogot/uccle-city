// HEAP GATE (claude/heap, docs/HEAP.md): the CPU copies dropped after the GPU upload must have NO unlisted reader.
//   node tools/audit/heapGate.mjs        exit 1 on a failure
// WHY: round 9 found 1.23 GB of the 1.46 GB police heap in ArrayBuffers: CPU copies nothing read after the upload,
// and a tile's whole worker build result kept alive by its dispose closure (`d.bridgeDecks` in loadTile). The heap drop
// (viewer/heapDrop.js) frees them; a NEW reader of a dropped layer would read empty arrays (silently: NaN positions).
// RULE: a module that reads a full tile's terrain / roads / buildings meshes, or a far tile's meshes, on the CPU after
// the tile is built is listed in docs/HEAP.md "Readers" AND in KNOWN (tools/audit/gate.d/heap.mjs meta) (with what it reads and how it is handled).
// Checks:
//   1. viewer/heapDrop.js logic (tools/heap/dropCheck.mjs: drop only after upload, keep lists, holds, guards); 1b. the
//      precompile queue / compile flush skip a mesh disposed after its job was queued (tools/heap/queueCheck.mjs)
//   2-4. (the meta row: every file that reaches a tile layer by name is a KNOWN reader; loadTile's dispose closure does
//      not reach the build result `d` (that kept ~25 MB a tile alive); the switches have their features.js rows)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// (KNOWN, the readers of a dropped tile layer: tools/audit/gate.d/heap.mjs meta, run by the meta row)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rows = [];
let failed = 0;
const check = (name, ok, msg) => { rows.push([name, ok ? "PASS" : "FAIL", msg]); if (!ok) failed++; };

// 1
const r = spawnSync(process.execPath, ["--import", "./tools/heap/register.mjs", "tools/heap/dropCheck.mjs"], { cwd: ROOT, encoding: "utf8" });
check("dropCheck", r.status === 0, r.status === 0 ? "heapDrop.js logic" : (r.stdout + r.stderr).split("\n").filter((l) => /FAIL|Error/.test(l)).slice(0, 3).join(" / "));

// 1b. heapfix: the precompile queue never draws / compiles a mesh disposed after its job was queued (the far tiles replaced
// under the boot cover were drawn again by the compile flush: "dropped attribute created again", "index buffer size (0)")
const q = spawnSync(process.execPath, ["--import", "./tools/heap/register.mjs", "tools/heap/queueCheck.mjs"], { cwd: ROOT, encoding: "utf8", timeout: 60000 });
check("queueCheck", q.status === 0, q.status === 0 ? "warmup.js queue + flush skip disposed geometries" : (q.stdout + q.stderr).split(String.fromCharCode(10)).filter((l) => /FAIL|Error/.test(l)).slice(0, 3).join(" / "));

// 2-4 (the known readers of a dropped tile layer, loadTile's dispose, the features rows: the meta row,
// tools/audit/gate.d/heap.mjs)

console.log("| heap check | result | detail |\n|---|---|---|");
for (const x of rows) console.log(`| ${x.join(" | ")} |`);
process.exitCode = failed ? 1 : 0;
