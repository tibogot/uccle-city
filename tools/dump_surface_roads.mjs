// Build a tile's roads the way the viewer does with ?roads=surface (viewer/surfaces.js on the road engine's
// meshes, as viewer/tileData.js does in the tile worker) and dump what would be DRAWN as road (the asphalt
// part's triangles, 2D) for tools/audit_surfaces.py, plus the adapter's stats.
//
//   node tools/dump_surface_roads.mjs I6 [OUT_DIR]      # default data/raw/audit -> <T>.surface-drawn.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildRoadNetwork } from "../vendor/roads/roadNetwork.js";
import { buildLaneRoadMesh } from "../vendor/roads/mesh/laneRoadMesh.js";
import { Heightmap } from "../viewer/heightmap.js";
import { surfaceAttribute } from "../viewer/roadData.js";
import { prepareSurfaces, fitRoadWidths, buildSurfaceRoads } from "../viewer/surfaces.js";
import { roofGrid, onRoof } from "../viewer/tileData.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const tile = (process.argv[2] || "I6").toUpperCase();
const out = process.argv[3] || join(ROOT, "data", "raw", "audit");
mkdirSync(out, { recursive: true });
const d = join(ROOT, "data", "tiles", tile);
const J = (f) => JSON.parse(readFileSync(join(d, f), "utf8"));
const hdr = J("terrain.json"), buf = readFileSync(join(d, "terrain.u16"));
const hm = new Heightmap(hdr, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const roads = J("roads.json"), surf = J("surfaces.json");
const ov = JSON.parse(readFileSync(join(ROOT, "data", "overrides.json"), "utf8"));
for (const r of roads.roads) { const s = ov.roadSurface?.[r.id]; if (s) (r.meta ??= {}).surface = s; }
const t0 = performance.now();
const bounds = { x0: hdr.x0, z0: hdr.z0, x1: hdr.x0 + hdr.size, z1: hdr.z0 + hdr.size };
const prep = prepareSurfaces(surf, hm.ground, bounds);
const widthFit = process.argv.includes("--no-fit") ? null : fitRoadWidths(roads, prep);
const net = buildRoadNetwork(roads, { ground: hm.ground });
const built = buildLaneRoadMesh(net, { markings: true });
const t1 = performance.now();
const roofs = roofGrid(J("buildings.json"), bounds);
const S = buildSurfaceRoads(prep, built, surfaceAttribute(net, built.asphalt), roads, (x, z) => onRoof(roofs, x, z));
S.stats.widthFit = widthFit;
const t2 = performance.now();
const tris = (p) => {
  const P = p.position, I = p.index, o = [];
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = P[b] - P[a], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vz = P[c + 2] - P[a + 2];
    if (Math.abs(ux * vz - uz * vx) < 1e-6) continue;          // vertical faces (kerbs, skirts)
    o.push([P[a], P[a + 2], P[b], P[b + 2], P[c], P[c + 2]].map((v) => Math.round(v * 100) / 100));
  }
  return o;
};
const count = (p) => (p ? p.index.length / 3 : 0);
const engineTris = ["asphalt", "concrete", "grass"].reduce((n, k) => n + built[k].index.length / 3, 0);
const doc = { tile, stats: S.stats, engineMs: Math.round(t1 - t0), adapterMs: Math.round(t2 - t1),
  triangles: { asphalt: count(S.parts.asphalt), concrete: count(S.parts.concrete), grass: count(S.parts.grass), engineAllWithBuffer: engineTris },
  vertices: { asphalt: S.parts.asphalt?.vertexCount, concrete: S.parts.concrete?.vertexCount, engineAsphaltWithBuffer: built.asphalt.vertexCount },
  asphalt: tris(S.parts.asphalt) };
writeFileSync(join(out, `${tile}.surface-drawn.json`), JSON.stringify(doc));
console.log(tile, JSON.stringify({ stats: doc.stats, engineMs: doc.engineMs, adapterMs: doc.adapterMs, triangles: doc.triangles, vertices: doc.vertices }));
