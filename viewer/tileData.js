// Everything about loading a tile that does not need three.js or the GPU: fetch, heightmap, the road
// engine (network + lane meshes + marking atlas), terrain carving, the terrain grid and its normals,
// the façade analysis and the land-cover raster. Runs in the tile worker (viewer/tileWorker.js,
// bundled to tileWorker.bundle.js) so loading a tile doesn't freeze the frame; main.js falls back to
// running it on the main thread if the worker can't start. The result is plain data (typed arrays).
import { buildRoadNetwork } from "../vendor/roads/roadNetwork.js";
import { buildLaneRoadMesh } from "../vendor/roads/mesh/laneRoadMesh.js";
import { Heightmap } from "./heightmap.js";
import { surfaceAttribute } from "./roadData.js";
import { analyseBuildings } from "./facadeGeom.js";
import { landCoverData } from "./landcover.js";

export const CARVE = 0.12;         // terrain is pushed this far under any road surface

/** Keep only triangles whose centroid is inside the tile (the 150 m buffer is for complete junctions only). */
function clipToTile(part, b) {
  const p = part.position, src = part.index, keep = [];
  for (let t = 0; t < src.length; t += 3) {
    const a = src[t] * 3, bb = src[t + 1] * 3, c = src[t + 2] * 3;
    const x = (p[a] + p[bb] + p[c]) / 3, z = (p[a + 2] + p[bb + 2] + p[c + 2]) / 3;
    if (x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1) keep.push(src[t], src[t + 1], src[t + 2]);
  }
  return Uint32Array.from(keep);
}

function terrainArrays(hm) {
  const { x0, z0, cols, rows, step } = hm.h, Y = hm.y;
  const pos = new Float32Array(cols * rows * 3), nrm = new Float32Array(cols * rows * 3);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = r * cols + c;
    pos[k * 3] = x0 + c * step; pos[k * 3 + 1] = Y[k]; pos[k * 3 + 2] = z0 + r * step;
    const hx = (Y[r * cols + Math.min(c + 1, cols - 1)] - Y[r * cols + Math.max(c - 1, 0)]) / ((Math.min(c + 1, cols - 1) - Math.max(c - 1, 0)) * step);
    const hz = (Y[Math.min(r + 1, rows - 1) * cols + c] - Y[Math.max(r - 1, 0) * cols + c]) / ((Math.min(r + 1, rows - 1) - Math.max(r - 1, 0)) * step);
    const L = Math.hypot(hx, 1, hz);
    nrm[k * 3] = -hx / L; nrm[k * 3 + 1] = 1 / L; nrm[k * 3 + 2] = -hz / L;
  }
  const idx = new Uint32Array((cols - 1) * (rows - 1) * 6);
  let o = 0;
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
    const a = r * cols + c, b = a + cols, cc = a + 1, d = b + 1;   // (a, b, c) faces +y with +z = south
    idx[o++] = a; idx[o++] = b; idx[o++] = cc;
    idx[o++] = cc; idx[o++] = b; idx[o++] = d;
  }
  return { pos, nrm, idx };
}

/** Build all CPU-side data for one manifest entry. `base` = URL of data/tiles/. */
export async function buildTileData(entry, base) {
  const times = {};
  const step = async (k, f) => { const t0 = performance.now(); const r = await f(); times[k] = Math.round(performance.now() - t0); return r; };
  const F = entry.files;
  const [x0, x1] = entry.bounds.x, [z0, z1] = entry.bounds.z;
  const bounds = { x0, x1, z0, z1 };
  const get = async (p, bin) => { const r = await fetch(new URL(p, base)); if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return bin ? r.arrayBuffer() : r.json(); };
  const [tHdr, tBuf, bDoc, bBuf, roads, feats] = await step("fetch", () => Promise.all([
    get(F.terrainHeader), get(F.terrain, true), get(F.buildings), get(F.buildingsBin, true), get(F.roads), get(F.features),
  ]));
  const hm = new Heightmap(tHdr, tBuf);
  const net = await step("buildRoadNetwork", () => buildRoadNetwork(roads, { ground: hm.ground }));
  const errors = net.issues.filter((i) => i.level === "error");
  const byCode = {};
  for (const i of errors) byCode[i.code] = (byCode[i.code] || 0) + 1;
  const netInfo = { roads: net.roads.length, nodes: net.nodes.length, errors: errors.length, byCode, warnings: net.issues.length - errors.length };
  const road = await step("road meshes + carve", () => {
    const built = buildLaneRoadMesh(net, { markings: true });
    const parts = {};
    let carvedCells = 0, triangles = 0;
    for (const name of ["asphalt", "concrete", "grass"]) {
      const part = built[name];
      if (!part.vertexCount) continue;
      const index = clipToTile(part, bounds);
      carvedCells += hm.carve(part.position, index, CARVE);
      const attributes = {};
      for (const [k, a] of Object.entries(part.attributes)) attributes[k] = { array: a.array, itemSize: a.itemSize };
      parts[name] = { position: part.position, normal: part.normal, uv: part.uv, attributes, index,
        aSurf: name === "asphalt" ? surfaceAttribute(net, part) : null };
      triangles += index.length / 3;
    }
    const at = built.atlas;
    const atlas = at ? { data: at.data, width: at.width, height: at.height, scale: at.scale, range: at.range, texel: at.texel, stats: { regions: at.stats?.regions } } : null;
    return { parts, atlas, carvedCells, triangles };
  });
  const terrain = await step("terrain grid", () => terrainArrays(hm));
  const buildings = await step("façade analysis", () => analyseBuildings(bDoc, bBuf, roads, feats));
  const cover = await step("land cover", () => landCoverData(feats, bounds));
  return { name: entry.name, bounds, hdr: tHdr, y: hm.y, orig: hm.orig, roads, feats, buildingCount: bDoc.count,
    netInfo, road, terrain, buildings, cover, times };
}

/** Every ArrayBuffer inside a result, for a zero-copy postMessage. */
export function transferables(obj, out = new Set()) {
  if (!obj || typeof obj !== "object") return out;
  if (ArrayBuffer.isView(obj)) { out.add(obj.buffer); return out; }
  if (obj instanceof ArrayBuffer) { out.add(obj); return out; }
  for (const v of Array.isArray(obj) ? obj : Object.values(obj)) transferables(v, out);
  return out;
}
