// THE KIT THROUGH THE SHARED MESH CHECKER (tools/mesh_audit/audit.js, copied from claude/stalle a3d14ab).
//   node tools/facadekit/auditKit.mjs [--only group,group] [--size ref|small|big|all] [--out models/facadekit/audit] [--set k=v]
// Audits the PACKED kit (models/facadekit/kit.{json,bin}) as the city draws it: per group of pieces that stand together
// (the gallery's assemblies: window + sill + hood, door + steps, cornice runs meeting at corners ...), per LOD (LOD0 is
// seen to 28 m, LOD1 to 115 m: the depth check uses those), at the reference opening AND stretched (the 9-slice of
// viewer/facadeKit/kitMaterials.js sliceDelta re-done here, + the runs' mitred ends), with the wall the city cuts (a
// plane with the opening as a hole, exactly where facades.js wallMaterial({ kit: true }) discards) and the ground.
// Nothing is behind the hole: in the city the building's inside is the back faces of its other walls (culled), so a
// gap anywhere in a piece shows the far side's daylight = the thin bright lines the owner saw. The LEAK check fires on
// those slits. Exit 1 while any group has blocking items (--no-fail: report only).
import fs from "fs";
import path from "path";
import { auditParts, toMarkdown } from "../mesh_audit/audit.js";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg("--out", "models/facadekit/audit");
const ONLY = arg("--only", null)?.split(",");
const SIZES = arg("--size", "all");
const SET = {};
for (let i = 0; i < process.argv.length; i++) if (process.argv[i] === "--set") { const [k, v] = process.argv[i + 1].split("="); SET[k] = JSON.parse(v); }
const NOFAIL = process.argv.includes("--no-fail");
const KITDIR = arg("--kit", "models/facadekit");
const json = JSON.parse(fs.readFileSync(KITDIR + "/kit.json"));
const binB = fs.readFileSync(KITDIR + "/kit.bin");
const bin = binB.buffer.slice(binB.byteOffset, binB.byteOffset + binB.byteLength);
const SL = json.slice;
const LOD_RANGE = [28 + 4, 115 + 4];

/** a piece's LOD mesh (opaque + glass) placed: { name, x, y, z, rotY (rad, the wall's +z), w, h, mL, mR } -> parts */
function placed(name, lod, o) {
  const p = json.pieces[name];
  if (!p) throw new Error(`no piece ${name}`);
  const mode = p.slice || p.kind;
  const refOf = { window: json.ref.window, door: json.ref.door, french: json.ref.french, frenchX: json.ref.french, garage: json.ref.garage };
  const ref = refOf[mode] ?? p.ref;
  const w = o.w ?? ref[0], h = o.h ?? ref[1];
  let I = [1, 0, 1, 0];
  const run = mode === "run";
  if (refOf[mode]) {
    I = [(w / 2 - SL.x) / (ref[0] / 2 - SL.x), (w - ref[0]) / 2, (h - SL.bottom - SL.top) / (ref[1] - SL.bottom - SL.top), h - ref[1]];
    if (mode === "frenchX") { I[2] = 1; I[3] = 0; }
  } else if (run) I = [w / ref[0], (w - ref[0]) / 2, o.mL ?? 0, o.mR ?? 0];
  const parts = [];
  const c = Math.cos(o.rotY || 0), s = Math.sin(o.rotY || 0);    // local x -> (c, 0, -s), local z -> (s, 0, c)
  for (const [kind, sl] of Object.entries(p.lods[lod])) {
    const n = sl.vCount;
    let off = sl.vOff;
    const P = new Float32Array(bin, off, n * 3); off += n * 12;
    const N = new Float32Array(bin, off, n * 3); off += n * 12; off += n * 8;
    const K = new Uint8Array(bin, off, n * 4); off += n * 4;
    const Wb = new Uint8Array(bin, off, n * 4);
    const idx = sl.i32 ? new Uint32Array(bin, sl.iOff, sl.iCount) : new Uint16Array(bin, sl.iOff, sl.iCount);
    const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      const cx = Math.round((K[i * 4] / 255) * 2) - 1, cy = Math.round((K[i * 4 + 1] / 255) * 2) - 1;
      let dx = cx === 0 ? x * (I[0] - 1) : cx * I[1];
      let dy = cy < 0 ? 0 : cy > 0 ? I[3] : (y - SL.bottom) * (I[2] - 1);
      if (run) { dy = 0; if (cx !== 0) dx += cx * z * (cx < 0 ? I[2] : I[3]); }
      const rise = (Wb[i * 4 + 2] / 255) * 0.5;
      if (rise > 0) {        // = kitMaterials.js archBend
        const arch = (hw, xx) => { const R = (hw * hw + rise * rise) / (2 * rise); return Math.sqrt(Math.max(0, R * R - Math.min(Math.abs(xx), hw) ** 2)) - (R - rise); };
        dy += arch(ref[0] / 2 + I[1], x + dx) - arch(ref[0] / 2, x);
      }
      const lx = x + dx, ly = y + dy, lz = z;
      pos[i * 3] = o.x + lx * c + lz * s; pos[i * 3 + 1] = o.y + ly; pos[i * 3 + 2] = o.z - lx * s + lz * c;
      const nx = N[i * 3], nz = N[i * 3 + 2];
      nrm[i * 3] = nx * c + nz * s; nrm[i * 3 + 1] = N[i * 3 + 1]; nrm[i * 3 + 2] = -nx * s + nz * c;
    }
    // per slot: one part each (the report names the slot)
    const bySlot = new Map();
    for (let t = 0; t < idx.length; t += 3) {
      const slot = json.slots[Math.floor(K[idx[t] * 4 + 3] / 4) % 32] ?? "?";
      if (!bySlot.has(slot)) bySlot.set(slot, []);
      bySlot.get(slot).push(idx[t], idx[t + 1], idx[t + 2]);
    }
    for (const [slot, ii] of bySlot) parts.push({ name: `${name}.lod${lod}`, slot, positions: pos, normals: nrm, index: Uint32Array.from(ii), maxDistance: LOD_RANGE[lod] });
  }
  return parts;
}

/** the wall the city draws: a plane (z = 0, x0..x1, y0..y1) with holes [{ x, y, w, h, rise, nseg }] (their outlines
 *  sampled like the reveal, so the edges weld) as quads; optional rotation */
function wall(x0, x1, y0, y1, holes = [], { rotY = 0, ox = 0, oz = 0, name = "wall" } = {}) {
  // cut the plane into vertical strips at every hole's sample x; each strip is split around the hole it crosses
  const xs = new Set([x0, x1]);
  for (const H of holes) { const n = H.rise ? H.nseg || 12 : 1; for (let k = 0; k <= n; k++) xs.add(H.x - H.w / 2 + (H.w * k) / n); }
  const X = [...xs].filter((v) => v >= x0 && v <= x1).sort((a, b) => a - b);
  const quads = [];
  const top = (H, x) => { if (!H.rise) return H.y + H.h; const hw = H.w / 2, R = (hw * hw + H.rise * H.rise) / (2 * H.rise); return H.y + H.h + H.rise - R + Math.sqrt(Math.max(0, R * R - (x - H.x) ** 2)); };
  for (let i = 0; i + 1 < X.length; i++) {
    const a = X[i], b = X[i + 1], m = (a + b) / 2;
    const H = holes.find((q) => m > q.x - q.w / 2 && m < q.x + q.w / 2);
    if (!H) { quads.push([[a, y0], [b, y0], [b, y1], [a, y1]]); continue; }
    if (H.y > y0) quads.push([[a, y0], [b, y0], [b, H.y], [a, H.y]]);
    quads.push([[a, top(H, a)], [b, top(H, b)], [b, y1], [a, y1]]);
  }
  const c = Math.cos(rotY), s = Math.sin(rotY);
  const pos = [], nrm = [];
  for (const q of quads) for (const t of [[0, 1, 2], [0, 2, 3]]) for (const k of t) {
    const [x, y] = q[k];
    pos.push(ox + x * c, y, oz - x * s); nrm.push(s, 0, c);
  }
  return { name, slot: "wall", positions: new Float32Array(pos), normals: new Float32Array(nrm), maxDistance: 115 };
}
function ground(y, x0, x1, z0, z1) {
  const P = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], pos = [], nrm = [];
  for (const k of [0, 3, 2, 0, 2, 1]) { pos.push(P[k][0], y, P[k][1]); nrm.push(0, 1, 0); }
  return { name: "ground", slot: "ground", positions: new Float32Array(pos), normals: new Float32Array(nrm), maxDistance: 115 };
}

/** a 45 deg roof plane rising from the eaves line (y = 0, z = 0) back over the building */
function roof45() {
  const P = [[-3, 0, 0], [3, 0, 0], [3, 3, -3], [-3, 3, -3]], pos = [], nrm = [], n = Math.SQRT1_2;
  for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(...P[k]); nrm.push(0, n, n); }
  return { name: "roof", slot: "roof", positions: new Float32Array(pos), normals: new Float32Array(nrm), maxDistance: 115 };
}
const R = json.ref;
const WIN = (w, h) => ({ w, h, y: 0.918 });
// the groups (what stands together), per size: [w, h] of the opening or null = the piece's own
const SIZE = { ref: 1, small: 0.78, big: 1.25 };
const sizes = SIZES === "all" ? ["ref", "small", "big"] : [SIZES];
function groups(sz) {
  const k = SIZE[sz];
  const ww = Math.min(1.2, 1.2 * k), wh = 1.6 * (0.9 + 0.1 * k);
  const out = [];
  const G = (name, pieces, holes, extra = []) => out.push({ name: `${name}.${sz}`, pieces, holes, extra });
  const has = (n) => !!json.pieces[n];
  G("winA", [["winA", { w: ww, h: wh }], ["sill", { w: ww, h: wh }], ["hood", { w: ww, h: wh }]], [{ x: 0, y: 0, w: ww, h: wh }]);
  if (has("shutter")) G("winA_shutters", [["winA", { w: ww, h: wh }], ["sill", { w: ww, h: wh }], ["shutter", { w: ww, h: wh }]], [{ x: 0, y: 0, w: ww, h: wh }]);
  if (has("winC")) G("winC", [["winC", { w: ww, h: wh }], ["sill", { w: ww, h: wh }]], [{ x: 0, y: 0, w: ww, h: wh }]);
  G("winB", [["winB", { w: ww, h: wh }], ["sill", { w: ww, h: wh }]], [{ x: 0, y: 0, w: ww, h: wh, rise: json.pieces.winB.rise, nseg: 12 }]);
  const dh = 2.448 * (0.95 + 0.05 * k);
  for (const d of ["doorA", "doorB", "doorNouveau", "doorDeco", "doorModern"]) if (has(d)) G(d, [[d, { w: 1.1, h: dh }]], [{ x: 0, y: 0, w: 1.1, h: dh, rise: json.pieces[d].rise || 0, nseg: 16 }], [ground(-0.06, -3, 3, -0.5, 3)]);
  if (has("garage")) G("garage", [["garage", { w: 2.4 * k, h: 2.1 }]], [{ x: 0, y: 0, w: 2.4 * k, h: 2.1 }], [ground(-0.0, -4, 4, -0.5, 3)]);
  const fh = 2.3 * (0.95 + 0.05 * k);
  const P = ww < 1.1 && has("balconyP") ? "P" : "";
  G("frenchBalcony", [["frenchWin", { w: ww, h: fh }], ["balcony" + P, { w: ww, h: fh }]], [{ x: 0, y: 0, w: ww, h: fh }]);
  G("frenchBalconnet", [["frenchWin", { w: ww, h: fh }], ["balconnet" + P, { w: ww, h: fh }]], [{ x: 0, y: 0, w: ww, h: fh }]);
  if (has("bay")) G("bay", [["bay", { w: ww, h: fh }]], [{ x: 0, y: 0, w: ww, h: fh }]);
  // the dormer stands over the eaves (wall top y = 0) on a 45 deg roof rising from it
  if (has("dormer")) out.push({ name: `dormer.${sz}`, pieces: [["dormer", {}]], holes: [], extra: [roof45()], wallY: [-2, 0] });
  if (has("numPlate")) G("numPlate", [["numPlate", { y: 1.75 }]], []);
  G("soupPlinth", [["soup", { x: 0 }], ["plinth", { x: -1.2, w: 1.5 }], ["plinth", { x: 1.2, w: 1.5 }]], [], [ground(0, -3, 3, -0.5, 2)]);
  return out;
}
// the runs meeting at corners: an outside corner (walls A: z = 0, x <= 0; B: x = 0, z <= 0) and an inside corner
function runGroups() {
  const out = [];
  for (const run of ["cornice", "plinth", "band"].filter((n) => json.pieces[n])) {
    const y = run === "cornice" ? 4 : run === "band" ? 3.26 : 0;
    // OUTSIDE: A along +x ending at the corner (0, 0), B going -z from it (its +x local axis = -z world, normal +x)
    out.push({ name: `${run}.outside`, list: [[run, { x: -1.5, y, z: 0, w: 3, mR: 1 }], [run, { x: 0, y, z: -1.5, rotY: Math.PI / 2, w: 3, mL: 1 }]],
      walls: [wall(-3, 0, y - 2, y + 0.8), wall(0, 3, y - 2, y + 0.8, [], { rotY: Math.PI / 2 })],
      modillions: run === "cornice" });
    // INSIDE: A along +x ending at the corner, B going +z (out of A's wall), normal -x
    out.push({ name: `${run}.inside`, list: [[run, { x: -1.5, y, z: 0, w: 3, mR: -1 }], [run, { x: 0, y, z: 1.5, rotY: -Math.PI / 2, w: 3, mL: -1 }]],
      walls: [wall(-3, 0, y - 2, y + 0.8), wall(0, 3, y - 2, y + 0.8, [], { rotY: -Math.PI / 2 })] });
    // STRAIGHT: two runs end to end, then a free end (retracted 2 mm from the wall corner it would touch)
    out.push({ name: `${run}.straight`, list: [[run, { x: -1.5, y, z: 0, w: 3 }], [run, { x: 1.5, y, z: 0, w: 3 }]], walls: [wall(-3.2, 3.2, y - 2, y + 0.8)] });
  }
  return out;
}
fs.mkdirSync(OUT, { recursive: true });
const rows = [];
let blockingAll = 0;
const run1 = (gname, lod, parts) => {
  const r = auditParts(parts, { ignoreBelow: -0.07, ...SET });
  const s = r.summary;
  blockingAll += s.blocking;
  const c = s.counts;
  rows.push(`| ${gname} | ${lod} | ${s.triangles} | **${s.blocking}** | ${["coplanar", "depth", "crossing", "leak", "flipped", "streak", "bentflat"].map((k) => c[k] || 0).join(" / ")} | ${s.warnings} | ${c.opening || 0} |`);
  fs.writeFileSync(path.join(OUT, `${gname}.lod${lod}.audit.md`), toMarkdown(r, { title: `Kit audit: ${gname} LOD${lod}` }));
  if (s.blocking) fs.writeFileSync(path.join(OUT, `${gname}.lod${lod}.audit.json`), JSON.stringify(Object.fromEntries(["coplanar", "depth", "crossing", "leak", "flipped", "streak", "bentflat"].map((k) => [k, (r.items[k] || []).slice(0, 60)])), null, 0));
  else try { fs.unlinkSync(path.join(OUT, `${gname}.lod${lod}.audit.json`)); } catch {}
  console.log(`${gname} lod${lod}: ${s.triangles} tris, blocking ${s.blocking}`, JSON.stringify(c));
};
for (const sz of sizes) for (const g of groups(sz)) {
  if (ONLY && !ONLY.some((o) => g.name.startsWith(o))) continue;
  for (const lod of [0, 1]) {
    const parts = [];
    for (const [n, o] of g.pieces) parts.push(...placed(n, lod, { x: 0, y: 0, z: 0, ...o }));
    parts.push(wall(-3, 3, g.wallY?.[0] ?? -1.2, g.wallY?.[1] ?? 4, g.holes), ...g.extra);
    run1(g.name, lod, parts);
  }
}
if (sizes.includes("ref")) for (const g of runGroups()) {
  if (ONLY && !ONLY.some((o) => g.name.startsWith(o))) continue;
  for (const lod of [0, 1]) {
    const parts = [];
    for (const [n, o] of g.list) parts.push(...placed(n, lod, o));
    if (g.modillions) for (let i = 0; i < 4; i++) parts.push(...placed("modillion", lod, { x: -2.6 + i * 0.6, y: 4, z: 0 }));
    parts.push(...g.walls);
    run1(g.name, lod, parts);
  }
}
const md = `# Façade kit through the mesh checker\n\n\`node tools/facadekit/auditKit.mjs\` (tools/mesh_audit from claude/stalle a3d14ab). Groups as they stand on a wall,\n` +
  `the wall the city cuts (no room behind the hole: the leak check sees the void), LOD0 (to 28 m) and LOD1 (to 115 m), three\nopening sizes (9-slice stretched).\n\n` +
  `| group | LOD | triangles | blocking | coplanar / depth / crossing / leak / flipped / streak / bentflat | warnings | openings (info) |\n|---|---|---|---|---|---|---|\n${rows.join("\n")}\n`;
fs.writeFileSync(path.join(OUT, "README.md"), md);
console.log(`blocking total ${blockingAll}`);
if (blockingAll && !NOFAIL) process.exit(1);
