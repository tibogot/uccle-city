// THE STREET SURFACES AS THE CITY DRAWS THEM (gardens round 2, the lawn strip): data/tiles/<T>/surfaces.json after the
// same in-place steps viewer/surfaces.js prepareSurfaces runs before it triangulates (taperSteps: kerb steps made
// tapers; smoothCurves: curved kerbs and outer edges refined on splines; rampKerbPoints). The garden runs are placed on
// THESE rings (tools/gardens/build_gardens.py), so a wall stands exactly on the drawn paving's back edge (JOINS rule:
// the round-1 runs stood on the raw UrbIS edge, up to 1.3 m behind a splined edge, with lawn in between).
//   node tools/gardens/drawnSurfaces.mjs <tile> [<tile> ...]  -> JSON on stdout: { <tile>: [{ c, rings }] }
// viewer/surfaces.js imports three's earcut: it is bundled in memory with the worker build's esbuild
// (tools/worker: npm ci there once, as for node tools/build_worker.mjs).
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tiles = process.argv.slice(2);
if (!tiles.length) throw new Error("usage: node tools/gardens/drawnSurfaces.mjs <tile> [...]");
const { build } = await import(pathToFileURL(path.join(ROOT, "tools/worker/node_modules/esbuild/lib/main.js")).href);
const r = await build({
  stdin: { contents: 'export { taperSteps, smoothCurves, rampKerbPoints } from "./viewer/surfaces.js";', resolveDir: ROOT, loader: "js" },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "error", nodePaths: [path.join(ROOT, "tools/worker/node_modules")],
});
const { taperSteps, smoothCurves, rampKerbPoints } = await import(`data:text/javascript;base64,${Buffer.from(r.outputFiles[0].text).toString("base64")}`);
const out = {};
for (const t of tiles) {
  const f = path.join(ROOT, "data/tiles", t, "surfaces.json");
  if (!fs.existsSync(f)) continue;
  const surf = JSON.parse(fs.readFileSync(f, "utf8"));
  taperSteps(surf); smoothCurves(surf); rampKerbPoints(surf);
  out[t] = surf.surfaces.map((s) => ({ c: s.c, rings: s.rings.map((ring) => ring.map(([x, z]) => [+x.toFixed(3), +z.toFixed(3)])) }));
}
process.stdout.write(JSON.stringify(out));
