// Everything about loading a tile that does not need three.js or the GPU: fetch, heightmap, the road
// engine (network + lane meshes + marking atlas), terrain carving, the terrain grid and its normals,
// the façade analysis and the land-cover raster. Runs in the tile worker (viewer/tileWorker.js,
// bundled to tileWorker.bundle.js) so loading a tile doesn't freeze the frame; main.js falls back to
// running it on the main thread if the worker can't start. The result is plain data (typed arrays).
import { buildRoadNetwork } from "../vendor/roads/roadNetwork.js";
import { buildLaneRoadMesh } from "../vendor/roads/mesh/laneRoadMesh.js";
import { Heightmap } from "./heightmap.js";
import { surfaceAttribute } from "./roadData.js";
import { analyseBuildings, hash01, wallStyle } from "./facadeGeom.js";
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
    // The atlas is RG8 at ~6 cm; the shader only reads R (signed distance). Keep R at half resolution
    // (2x2 average, ~12 cm): 8x less memory (e.g. 25.6 MB -> 3.2 MB per tile), markings unchanged.
    let atlas = null;
    if (at) {
      const W2 = Math.ceil(at.width / 2), H2 = Math.ceil(at.height / 2), src = at.data, d8 = new Uint8Array(W2 * H2);
      for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
        let sum = 0, n = 0;
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          const xx = 2 * x + dx, yy = 2 * y + dy;
          if (xx < at.width && yy < at.height) { sum += src[(yy * at.width + xx) * 2]; n++; }
        }
        d8[y * W2 + x] = Math.round(sum / n);
      }
      atlas = { data: d8, width: W2, height: H2, format: "R8", scale: at.scale, range: at.range, texel: at.texel * 2,
        stats: { regions: at.stats?.regions, bytes: d8.length, bytesBefore: at.data.length } };
    }
    return { parts, atlas, carvedCells, triangles };
  });
  const terrain = await step("terrain grid", () => terrainArrays(hm));
  const buildings = await step("façade analysis", () => analyseBuildings(bDoc, bBuf, roads, feats));
  const cover = await step("land cover", () => landCoverData(feats, bounds));
  return { name: entry.name, bounds, hdr: tHdr, y: hm.y, orig: hm.orig, roads, feats, buildingCount: bDoc.count,
    netInfo, road, terrain, buildings, cover, times };
}

// ---------------------------------------------------------------- far level of detail

const WALL = [[0.29, 0.085, 0.05], [0.17, 0.075, 0.045], [0.4, 0.27, 0.14], [0.62, 0.6, 0.55], [0.56, 0.47, 0.32], [0.3, 0.29, 0.27]];

/** Far LOD of a tile: 4 m terrain grid (uncarved) with uvs for the orthophoto, and the UrbIS solids as
 *  flat-shaded triangles coloured per building (wall style average, real roof colour). No roads,
 *  trees or props: these tiles are only seen from 500 m and more. */
export async function buildLiteData(entry, base) {
  const F = entry.files;
  const get = async (p, bin) => { const r = await fetch(new URL(p, base)); if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return bin ? r.arrayBuffer() : r.json(); };
  const [tHdr, tBuf, bDoc, bBuf] = await Promise.all([get(F.terrainHeader), get(F.terrain, true), get(F.buildings), get(F.buildingsBin, true)]);
  const hm = new Heightmap(tHdr, tBuf);
  const { x0, z0, cols, rows, step } = hm.h, S = 4;
  const c2 = Math.floor((cols - 1) / S) + 1, r2 = Math.floor((rows - 1) / S) + 1;
  const pos = new Float32Array(c2 * r2 * 3), nrm = new Float32Array(c2 * r2 * 3), uv = new Float32Array(c2 * r2 * 2);
  const W = (cols - 1) * step, H = (rows - 1) * step;
  for (let r = 0; r < r2; r++) for (let c = 0; c < c2; c++) {
    const k = r * c2 + c, x = x0 + c * S * step, z = z0 + r * S * step;
    pos[k * 3] = x; pos[k * 3 + 1] = hm.ground(x, z) - 0.3; pos[k * 3 + 2] = z;     // a little low: never pokes through
    const hx = (hm.ground(x + S, z) - hm.ground(x - S, z)) / (2 * S), hz = (hm.ground(x, z + S) - hm.ground(x, z - S)) / (2 * S), L = Math.hypot(hx, 1, hz);
    nrm[k * 3] = -hx / L; nrm[k * 3 + 1] = 1 / L; nrm[k * 3 + 2] = -hz / L;
    uv[k * 2] = (x - x0) / W; uv[k * 2 + 1] = 1 - (z - z0) / H;                      // image row 0 = north = z0
  }
  const idx = new Uint32Array((c2 - 1) * (r2 - 1) * 6);
  let o = 0;
  for (let r = 0; r < r2 - 1; r++) for (let c = 0; c < c2 - 1; c++) {
    const a = r * c2 + c, b = a + c2;
    idx[o++] = a; idx[o++] = b; idx[o++] = a + 1; idx[o++] = a + 1; idx[o++] = b; idx[o++] = b + 1;
  }
  const dv = new DataView(bBuf), V = dv.getUint32(0, true), T = dv.getUint32(4, true);
  const P = new Float32Array(bBuf, 8, V * 3), I = new Uint32Array(bBuf, 8 + V * 12, T * 3);
  let n = 0;
  for (const b of bDoc.buildings) n += b.walls.count + b.roof.count;
  const bp = new Float32Array(n * 9), bn = new Float32Array(n * 9), bc = new Float32Array(n * 9);
  let q = 0;
  const tri = (t, col) => {
    const ia = I[t * 3] * 3, ib = I[t * 3 + 1] * 3, ic = I[t * 3 + 2] * 3;
    const ux = P[ib] - P[ia], uy = P[ib + 1] - P[ia + 1], uz = P[ib + 2] - P[ia + 2];
    const vx = P[ic] - P[ia], vy = P[ic + 1] - P[ia + 1], vz = P[ic + 2] - P[ia + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
    for (const i of [ia, ib, ic]) {
      bp[q] = P[i]; bp[q + 1] = P[i + 1]; bp[q + 2] = P[i + 2];
      bn[q] = nx; bn[q + 1] = ny; bn[q + 2] = nz;
      bc[q] = col[0]; bc[q + 1] = col[1]; bc[q + 2] = col[2];
      q += 3;
    }
  };
  for (const b of bDoc.buildings) {
    const key = String(b.attrs?.BU_ID ?? b.id);
    const wall = b.attrs?._landmark ? [0.42, 0.4, 0.36] : WALL[wallStyle(hash01(key + "s"), b.height)].map((v) => v * 0.85 + 0.02);
    const roof = b.roofColor || [0.12, 0.08, 0.07];
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) tri(t, wall);
    for (let t = b.roof.first; t < b.roof.first + b.roof.count; t++) tri(t, roof);
  }
  return { name: entry.name, terrain: { pos, nrm, uv, idx }, buildings: { position: bp, normal: bn, color: bc }, buildingCount: bDoc.count };
}

/** Every ArrayBuffer inside a result, for a zero-copy postMessage. */
export function transferables(obj, out = new Set()) {
  if (!obj || typeof obj !== "object") return out;
  if (ArrayBuffer.isView(obj)) { out.add(obj.buffer); return out; }
  if (obj instanceof ArrayBuffer) { out.add(obj); return out; }
  for (const v of Array.isArray(obj) ? obj : Object.values(obj)) transferables(v, out);
  return out;
}
