#!/usr/bin/env node
// MESH AUDIT of the street kit's LOD1 / LOD2 (the meshoptimizer LODs viewer/streetkit/streetKit.js makes at load: weld by
// position + slot, simplify with the piece's absolute error, crease-aware normals). Same steps as weldedSimplify there
// (without the AO, which does not move a vertex). Reports in models/streetkit/audit/<piece>/lod1|lod2.audit.md.
//     node tools/streetkit/audit_lods.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, "../..");
const { readGlb } = await import(pathToFileURL(resolve(root, "tools/mesh_audit/glb.mjs")).href);
const { auditParts, toMarkdown } = await import(pathToFileURL(resolve(root, "tools/mesh_audit/audit.js")).href);
const { MeshoptSimplifier } = await import(pathToFileURL(resolve(root, "tools/worker/node_modules/meshoptimizer/meshopt_simplifier.js")).href);
await MeshoptSimplifier.ready;

// (viewer/streetkit/streetKit.js BANDS: lod bands, errors, crease)
const PL = { lod: [30, 90, 320], err: [0.003, 0.02], crease: 25 };
const BANDS = {
  sign_pole: { lod: [30, 90, 320], err: [0.002, 0.01], crease: 25 }, sign_pole_tall: { lod: [30, 90, 320], err: [0.002, 0.01], crease: 25 },
  plate_post: { lod: [25, 80, 260], err: [0.002, 0.002], crease: 25 },
  ...Object.fromEntries(["circle", "tri_down", "tri_up", "octagon", "diamond", "square", "rect"].map((s) => ["plate_" + s, PL])),
  villo_totem: { lod: [30, 90, 320], err: [0.001, 0.002], crease: 15 }, villo_dock: { lod: [20, 60, 200], err: [0.003, 0.015], crease: 25 },
  villo_bike: { lod: [16, 50, 180], err: [0.0025, 0.008], crease: 25 },
};

// node tools/streetkit/audit_lods.mjs [piece err1 err2]: one piece with other errors (tuning)
if (process.argv[2]) { const b = BANDS[process.argv[2]]; for (const k of Object.keys(BANDS)) if (k !== process.argv[2]) delete BANDS[k]; if (process.argv[3]) b.err = [+process.argv[3], +process.argv[4]]; }
const { parts } = await readGlb(resolve(root, "models/streetkit/streetkit.glb"));
let blocking = 0;
const rows = [];
for (const [piece, b] of Object.entries(BANDS)) {
  const ps = parts.filter((p) => p.node === piece || p.name?.startsWith(piece + "/") || p.name === piece);
  const slots = [...new Set(ps.map((p) => p.slot))];
  // merge, weld by position + slot
  const key = new Map(), wp = [], ws = [], I0 = [];
  for (const p of ps) {
    const s = slots.indexOf(p.slot), P = p.positions, base = [];
    for (let i = 0; i < P.length / 3; i++) {
      const k = `${Math.round(P[3 * i] * 2000)},${Math.round(P[3 * i + 1] * 2000)},${Math.round(P[3 * i + 2] * 2000)},${s}`;
      let j = key.get(k);
      if (j === undefined) { j = ws.length; key.set(k, j); wp.push(P[3 * i], P[3 * i + 1], P[3 * i + 2]); ws.push(s); }
      base.push(j);
    }
    const idx = p.index || Uint32Array.from({ length: P.length / 3 }, (_, i) => i);
    for (const i of idx) I0.push(base[i]);
  }
  const pos = new Float32Array(wp);
  for (const [lod, err] of [["lod1", b.err[0]], ["lod2", b.err[1]]]) {
    const [I] = MeshoptSimplifier.simplify(Uint32Array.from(I0), pos, 3, 0, err, ["ErrorAbsolute", "Prune"]);
    // crease-aware normals, unindexed (as the viewer builds them)
    const T = I.length / 3, fn = new Float32Array(T * 3), fa = new Float32Array(T), around = new Map();
    const pk = (v) => `${pos[3 * v].toFixed(4)},${pos[3 * v + 1].toFixed(4)},${pos[3 * v + 2].toFixed(4)}`;
    for (let t = 0; t < T; t++) {
      const a = I[3 * t] * 3, c1 = I[3 * t + 1] * 3, c2 = I[3 * t + 2] * 3;
      const ux = pos[c1] - pos[a], uy = pos[c1 + 1] - pos[a + 1], uz = pos[c1 + 2] - pos[a + 2], vx = pos[c2] - pos[a], vy = pos[c2 + 1] - pos[a + 1], vz = pos[c2 + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1e-12;
      fn[3 * t] = nx / l; fn[3 * t + 1] = ny / l; fn[3 * t + 2] = nz / l; fa[t] = l / 2;
      for (let k = 0; k < 3; k++) { const q = pk(I[3 * t + k]); if (!around.has(q)) around.set(q, []); around.get(q).push(t); }
    }
    const crease = Math.cos(b.crease * Math.PI / 180);
    const OP = new Float32Array(T * 9), ON = new Float32Array(T * 9);
    for (let t = 0; t < T; t++) for (let k = 0; k < 3; k++) {
      const v = I[3 * t + k], o = 3 * t + k;
      OP[3 * o] = pos[3 * v]; OP[3 * o + 1] = pos[3 * v + 1]; OP[3 * o + 2] = pos[3 * v + 2];
      let nx = 0, ny = 0, nz = 0;
      for (const u of around.get(pk(v))) if (fn[3 * u] * fn[3 * t] + fn[3 * u + 1] * fn[3 * t + 1] + fn[3 * u + 2] * fn[3 * t + 2] >= crease) { nx += fn[3 * u] * fa[u]; ny += fn[3 * u + 1] * fa[u]; nz += fn[3 * u + 2] * fa[u]; }
      const l = Math.hypot(nx, ny, nz) || 1;
      ON[3 * o] = nx / l; ON[3 * o + 1] = ny / l; ON[3 * o + 2] = nz / l;
    }
    const part = { name: `${piece}.${lod}`, slot: "", positions: OP, normals: ON, index: Uint32Array.from({ length: T * 3 }, (_, i) => i), maxDistance: lod === "lod1" ? b.lod[1] : b.lod[2] };
    const grounded = !piece.startsWith("plate_") || piece === "plate_post";
    const rep = auditParts([part], grounded ? { ignoreBelow: -0.001 } : {});
    blocking += rep.summary.blocking;
    rows.push(`${piece.padEnd(16)} ${lod}: ${T} tris, blocking ${rep.summary.blocking}  ${Object.entries(rep.summary.counts).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(", ")}`);
    const dir = resolve(root, "models/streetkit/audit", piece); mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, `${lod}.audit.md`), toMarkdown(rep, { title: `Mesh audit: streetkit ${piece} ${lod}` }));
  }
}
console.log(rows.join("\n"));
console.log(`total blocking: ${blocking}`);
process.exit(blocking ? 1 : 0);
