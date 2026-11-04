// Dump the road engine's drivable surfaces (each road's carriage polygon, kerb to kerb, and each junction's
// outline) for every built tile, for tools/audit_overlap.py (buildings standing on the road).
//
//   node tools/dump_road_surfaces.mjs [OUT_DIR]       # default data/raw/audit (git-ignored)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildRoadNetwork } from "../vendor/roads/roadNetwork.js";

// same as tools/check_roads.mjs (which runs its checks on import)
function loadGround(dir) {
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] || join(ROOT, "data", "raw", "audit");
mkdirSync(out, { recursive: true });
const man = JSON.parse(readFileSync(join(ROOT, "data", "tiles", "manifest.json"), "utf8"));
const r2 = (p) => p.map(([x, z]) => [Math.round(x * 100) / 100, Math.round(z * 100) / 100]);
for (const t of man.tiles) {
  const d = join(ROOT, "data", "tiles", t.name);
  if (!existsSync(join(d, "roads.json"))) continue;
  const net = buildRoadNetwork(JSON.parse(readFileSync(join(d, "roads.json"), "utf8")), { ground: loadGround(d) });
  const roads = net.roads.filter((r) => r.carriage?.length > 2).map((r) => ({ id: r.id, type: r.type?.label, name: r.src?.meta?.name, poly: r2(r.carriage) }));
  const nodes = net.nodes.filter((n) => n.outline?.length > 2).map((n) => ({ id: n.id, kind: n.kind, poly: r2(n.outline) }));
  writeFileSync(join(out, `${t.name}.roads.json`), JSON.stringify({ tile: t.name, bounds: t.bounds, roads, nodes }));
  console.log(t.name, roads.length, "roads", nodes.length, "nodes");
}
