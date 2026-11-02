// Build a tile's roads.json with the vendored road engine and print its checks.
//
//   node tools/check_roads.mjs [G4] [--flat] [--json]
//   node tools/check_roads.mjs --all          # every built tile + data/roads/network.json (flat), one line each
//
// ground(x, z) = bilinear lookup in the tile's terrain.u16 (CONTRACT §5.3). Points in the
// 150 m road buffer outside the tile are clamped to the nearest edge sample (neighbour tiles
// are not loaded here). --flat skips the terrain. Exit code 1 if the engine reports errors.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildRoadNetwork } from "../vendor/roads/roadNetwork.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const tile = (args.find((a) => !a.startsWith("--")) || "G4").toUpperCase();
const flat = args.includes("--flat");
const tdir = join(ROOT, "data", "tiles", tile);

export function loadGround(dir) {
  const h = JSON.parse(readFileSync(join(dir, "terrain.json"), "utf8"));
  const b = readFileSync(join(dir, "terrain.u16"));
  const g = new Uint16Array(b.buffer, b.byteOffset, b.byteLength / 2);
  const at = (c, r) => g[r * h.cols + c];
  return (x, z) => {
    let c = Math.min(Math.max((x - h.x0) / h.step, 0), h.cols - 1);
    let r = Math.min(Math.max((z - h.z0) / h.step, 0), h.rows - 1);
    const c0 = Math.min(Math.floor(c), h.cols - 2), r0 = Math.min(Math.floor(r), h.rows - 2);
    const fc = c - c0, fr = r - r0;
    const q = [at(c0, r0), at(c0 + 1, r0), at(c0, r0 + 1), at(c0 + 1, r0 + 1)];
    if (q.includes(h.nodata)) return undefined;
    return ((q[0] * (1 - fc) + q[1] * fc) * (1 - fr) + (q[2] * (1 - fc) + q[3] * fc) * fr) / 100;
  };
}

if (args.includes("--all")) {
  const { existsSync } = await import("node:fs");
  const errs = (issues) => { const c = {}; for (const i of issues) if (i.level === "error") c[i.code] = (c[i.code] || 0) + 1; return c; };
  // b = tile bounds: only errors located inside the tile count (the 150 m buffer has cut stubs by design)
  const line = (name, d, opts, b) => {
    const n = buildRoadNetwork(d, opts);
    const inside = (i) => !b || (i.x >= b.x[0] && i.x < b.x[1] && i.z >= b.z[0] && i.z < b.z[1]);
    const e = errs(n.issues.filter(inside)), ne = Object.values(e).reduce((a, c) => a + c, 0);
    const buf = errs(n.issues.filter((i) => !inside(i)));
    console.log(`${name.padEnd(8)} ${String(d.roads.length).padStart(5)} roads ${String(ne).padStart(4)} errors${b ? " in tile" : ""}  ${JSON.stringify(e)}` +
      (b ? `   (buffer: ${Object.values(buf).reduce((a, c) => a + c, 0)})` : ""));
    return ne;
  };
  let total = 0;
  const man = JSON.parse(readFileSync(join(ROOT, "data", "tiles", "manifest.json"), "utf8"));
  for (const t of man.tiles) {
    const d = join(ROOT, "data", "tiles", t.name);
    if (!existsSync(join(d, "roads.json"))) continue;
    const data = JSON.parse(readFileSync(join(d, "roads.json"), "utf8"));
    total += line(t.name, data, existsSync(join(d, "terrain.u16")) ? { ground: loadGround(d) } : {}, t.bounds);
  }
  const nf = join(ROOT, "data", "roads", "network.json");
  if (existsSync(nf)) line("network", JSON.parse(readFileSync(nf, "utf8")), {});
  console.log(`tiles total: ${total} errors inside tiles`);
  process.exit(0);
}

const data = JSON.parse(readFileSync(join(tdir, "roads.json"), "utf8"));
const opts = flat ? {} : { ground: loadGround(tdir) };
const t0 = performance.now();
const net = buildRoadNetwork(data, opts);
const ms = performance.now() - t0;

const byCode = {};
for (const i of net.issues) {
  const k = `${i.level}:${i.code}`;
  (byCode[k] ||= []).push(i);
}
const kinds = {};
for (const n of net.nodes) kinds[n.kind] = (kinds[n.kind] || 0) + 1;
const errors = net.issues.filter((i) => i.level === "error").length;
const warns = net.issues.length - errors;

if (args.includes("--json")) {
  console.log(JSON.stringify({ tile, ms, nodes: net.nodes.length, roads: net.roads.length, kinds, errors, warns,
    issues: net.issues.map(({ level, code, msg, x, z, roadId, nodeId }) => ({ level, code, msg, x, z, roadId, nodeId })) }, null, 1));
} else {
  console.log(`tile ${tile}: input ${data.nodes.length} nodes / ${data.roads.length} roads, built in ${ms.toFixed(0)} ms, ground ${flat ? "flat" : "terrain.u16"}`);
  console.log(`engine: ${net.nodes.length} nodes ${JSON.stringify(kinds)}, ${net.roads.length} roads, lane graph ${net.graph.paths.length} paths, ${net.blocks?.length ?? 0} blocks`);
  console.log(`issues: ${errors} errors, ${warns} warnings`);
  for (const [k, list] of Object.entries(byCode).sort()) {
    console.log(`  ${k.padEnd(28)} ${String(list.length).padStart(4)}   e.g. ${list.slice(0, 3).map((i) => `${i.roadId || i.nodeId || ""}@(${i.x?.toFixed?.(0)},${i.z?.toFixed?.(0)})`).join(" ")}`);
  }
}
process.exitCode = errors ? 1 : 0;
