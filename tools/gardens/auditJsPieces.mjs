// MESH AUDIT of the front-garden kit's JS pieces (gardens round 2): the boxy pieces (viewer/gardens/gardenGeom.js:
// wall, copings, pillar, pier cap) and the hedge modules (viewer/gardens/gardenHedge.js: body LOD0-2), each LOD alone,
// through tools/mesh_audit/audit.js (the Blender ironwork: node tools/mesh_audit/cli.mjs models/gardens/gardens.glb
// --nodes <piece>_lod<k>). The viewer modules import three/webgpu: bundled in memory with the worker build's esbuild
// (tools/worker: npm ci there once).   node tools/gardens/auditJsPieces.mjs   -> one line per piece, exit 1 on blocking
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { build } = await import(pathToFileURL(path.join(ROOT, "tools/worker/node_modules/esbuild/lib/main.js")).href);
const r = await build({
  stdin: { contents: `export { boxyPieces } from "./viewer/gardens/gardenGeom.js"; export { hedgeGeometries } from "./viewer/gardens/gardenHedge.js"; export { auditParts, partFromBufferGeometry } from "./tools/mesh_audit/audit.js";`, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "esm", platform: "neutral", write: false, logLevel: "error", nodePaths: [path.join(ROOT, "tools/worker/node_modules")],
  alias: { "three/webgpu": "three/webgpu", "three/tsl": "three/tsl" }, mainFields: ["module", "main"],
  external: [],
});
globalThis.self ??= globalThis; globalThis.window ??= globalThis; globalThis.location ??= { search: "", href: "file:///" };
const os = await import("os"), fs = await import("fs");
const tmp = path.join(os.tmpdir(), `gardens-audit-${process.pid}.mjs`);
fs.writeFileSync(tmp, r.outputFiles[0].text);
const M = await import(pathToFileURL(tmp).href);
fs.unlinkSync(tmp);
const boxy = M.boxyPieces(), hedge = M.hedgeGeometries();
const sets = { wall: boxy.wall, cap_slab: boxy.cap_slab, cap_saddle: boxy.cap_saddle, pillar: boxy.pillar, pcap: boxy.pcap, hedge: hedge.body };
let blocking = 0;
for (const [name, lods] of Object.entries(sets)) lods.forEach((g, k) => {
  const rep = M.auditParts([M.partFromBufferGeometry(g, { name: `${name}_lod${k}`, maxDistance: 220 })]);
  const counts = Object.entries(rep.summary.counts || {}).filter(([, n]) => n).map(([c, n]) => `${c} ${n}`).join(" · ");
  blocking += rep.summary.blocking;
  console.log(`${name}_lod${k}: ${g.index.count / 3} tris, ${rep.summary.blocking} BLOCKING, ${counts}`);
});
process.exit(blocking ? 1 : 0);
