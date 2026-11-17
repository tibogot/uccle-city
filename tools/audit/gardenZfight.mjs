// GARDEN KIT Z-FIGHT AUDIT (holes 2026-11-17, owner: "z-fighting on some garden entrance brick piers"). Per tile of
// data/gardens/<T>.json, the boxy pieces viewer/gardens/gardenKit.js gardenInstances() places (the same matrices: the
// segments' walls and copings with their mitre extensions, the pillars and their caps) as oriented boxes with the faces
// gardenGeom.js really draws (a wall has no top / bottom, a pillar no top / bottom, a coping and a pier cap all six),
// then every pair of faces of DIFFERENT pieces facing the SAME way, in one plane (within PLANE_EPS) and overlapping more
// than MIN_CM2 (at least MIN_W wide): they z-fight. Counted by piece pair, worst listed. (Two faces back to back, opposite normals, do not
// fight: one of them is culled.) The data as written (the DTM heights; the drawn-ground settle only lowers bases).
//   node tools/audit/gardenZfight.mjs [--json FILE] [--max N] [--old] T... | --all        exit 1 when the count > --max (0)
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const ji = argv.indexOf("--json"), JSON_OUT = ji >= 0 ? argv.splice(ji, 2)[1] : null;
const mi = argv.indexOf("--max"), MAX = mi >= 0 ? +argv.splice(mi, 2)[1] : 0;
const TILES = argv.includes("--all") ? readdirSync(join(ROOT, "data/gardens")).filter((f) => /^[A-Z]\d+\.json$/.test(f)).map((f) => f.slice(0, -5))
  : argv.filter((a) => !a.startsWith("--")).map((t) => t.toUpperCase());
const PLANE_EPS = 0.005, MIN_CM2 = 4, MIN_W = 0.002;
const OLD = argv.includes("--old");          // the placement before the fixes (the doubled piers; the gate's own test)
const { dedupePillars, cleanSegs, capJoins } = await import(pathToFileURL(join(ROOT, "viewer/gardens/gardenDedupe.js")).href);
// = viewer/gardens/gardenGeom.js
const WALL_T = 0.25, CAP_W = 0.32, CAP_T = 0.08, PILLAR_W = 0.36, PCAP_W = 0.46, PCAP_T = 0.065;

/** a box from origin o and three edge vectors (a along, b up, c across: c centred), faces: which are drawn */
function boxOf(kind, o, a, b, c, faces) {
  const P = (i, j, k) => [o[0] + a[0] * i + b[0] * j + c[0] * (k - 0.5), o[1] + a[1] * i + b[1] * j + c[1] * (k - 0.5), o[2] + a[2] * i + b[2] * j + c[2] * (k - 0.5)];
  const F = {
    xn: [P(0, 0, 0), P(0, 0, 1), P(0, 1, 1), P(0, 1, 0)], xp: [P(1, 0, 0), P(1, 1, 0), P(1, 1, 1), P(1, 0, 1)],
    yn: [P(0, 0, 0), P(1, 0, 0), P(1, 0, 1), P(0, 0, 1)], yp: [P(0, 1, 0), P(0, 1, 1), P(1, 1, 1), P(1, 1, 0)],
    zn: [P(0, 0, 0), P(0, 1, 0), P(1, 1, 0), P(1, 0, 0)], zp: [P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)],
  };
  const ctr = P(0.5, 0.5, 0.5);
  const out = [];
  for (const f of faces) {
    const q = F[f];
    const u = sub(q[1], q[0]), v = sub(q[3], q[0]);
    let n = norm(cross(u, v));
    const m = q.reduce((s, p) => add(s, p), [0, 0, 0]).map((x) => x / 4);
    if (dot(n, sub(m, ctr)) < 0) n = n.map((x) => -x);                    // outward
    out.push({ kind, q, n, d: dot(n, q[0]) });
  }
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const f of out) for (const p of f.q) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); }
  return { kind, faces: out, x0, x1, z0, z1 };
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };

/** overlap area (m2) of two coplanar convex quads (in the plane of n) */
function overlap(qa, qb, n) {
  const e1 = norm(Math.abs(n[1]) < 0.9 ? cross(n, [0, 1, 0]) : cross(n, [1, 0, 0])), e2 = cross(n, e1);
  const O = qa[0], to2 = (q) => q.map((p) => { const r = sub(p, O); return [dot(r, e1), dot(r, e2)]; });   // (local: no world-sized coordinates)
  let A = to2(qa), B = to2(qb);
  const area = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; s += p[0] * q[1] - q[0] * p[1]; } return s / 2; };
  if (area(A) < 0) A = A.reverse();
  if (area(B) < 0) B = B.reverse();
  let out = A;
  for (let i = 0; i < B.length && out.length; i++) {
    const p = B[i], q = B[(i + 1) % B.length], inn = (r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]) >= -1e-9;
    const src = out; out = [];
    for (let j = 0; j < src.length; j++) {
      const r = src[j], s = src[(j + 1) % src.length], ri = inn(r), si = inn(s);
      if (ri) out.push(r);
      if (ri !== si) {
        const dx = s[0] - r[0], dy = s[1] - r[1], ex = q[0] - p[0], ey = q[1] - p[1];
        const t = ((p[0] - r[0]) * ey - (p[1] - r[1]) * ex) / (dx * ey - dy * ex);
        out.push([r[0] + dx * t, r[1] + dy * t]);
      }
    }
  }
  if (out.length < 3) return 0;
  // (a sliver under MIN_W wide, area / its longest extent, is float noise along a shared edge, not a visible fight)
  let ext = 0;
  for (const p of out) for (const q of out) ext = Math.max(ext, Math.hypot(p[0] - q[0], p[1] - q[1]));
  const ar = Math.abs(area(out));
  return ext > 0 && ar / ext >= MIN_W ? ar : 0;
}

/** the pieces of one tile, as gardenInstances() places them */
export function gardenBoxes(doc) {
  const segs = OLD ? doc.segs || [] : cleanSegs(doc.segs || []), boxes = [];
  const { ext, extW, lift } = capJoins(segs, CAP_W, !OLD);
  segs.forEach((g, i) => {
    const h = g[7];
    const [x0, y0, z0, x1, y1, z1] = g, dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, lh = Math.hypot(dx, dz);
    if (lh < 0.05 || !(h > 0.01)) return;
    const ux = dx / lh, uy = dy / lh, uz = dz / lh, side = [-dz / lh, 0, dx / lh];
    const at = (E) => { const e0 = E[i * 2], e1 = E[i * 2 + 1], k = (lh + e0 + e1) / lh; return [[x0 - ux * e0, y0 - uy * e0, z0 - uz * e0], [dx * k, dy * k, dz * k]]; };
    const [ow, aw] = at(extW), [oc, ac] = at(ext);
    boxes.push({ ...boxOf("wall", ow, aw, [0, h, 0], side.map((v) => v * WALL_T), ["xn", "xp", "zn", "zp"]), id: `seg${i}` });
    boxes.push({ ...boxOf("cap", [oc[0], oc[1] + h + lift[i], oc[2]], ac, [0, CAP_T, 0], side.map((v) => v * CAP_W), ["xn", "xp", "yn", "yp", "zn", "zp"]), id: `seg${i}` });
  });
  (OLD ? doc.pillars || [] : dedupePillars(doc.pillars || [])).forEach((p, i) => {
    const [x, y, z, yaw, h] = p, c = Math.cos(yaw), s = Math.sin(yaw);
    const along = [c, 0, -s], across = [s, 0, c];                          // = gardenKit rot(): local x, local z
    const at = (w) => [x - along[0] * w / 2, y, z - along[2] * w / 2];
    boxes.push({ ...boxOf("pillar", at(PILLAR_W), along.map((v) => v * PILLAR_W), [0, h, 0], across.map((v) => v * PILLAR_W), ["xn", "xp", "zn", "zp"]), id: `pil${i}` });
    const o = at(PCAP_W); o[1] = y + h;
    boxes.push({ ...boxOf("pcap", o, along.map((v) => v * PCAP_W), [0, PCAP_T, 0], across.map((v) => v * PCAP_W), ["xn", "xp", "yn", "yp", "zn", "zp"]), id: `pil${i}` });
  });
  return boxes;
}

export function zfights(doc) {
  const boxes = gardenBoxes(doc), grid = new Map(), C = 4, hits = [];
  boxes.forEach((b, bi) => {
    for (let i = Math.floor(b.x0 / C); i <= Math.floor(b.x1 / C); i++) for (let j = Math.floor(b.z0 / C); j <= Math.floor(b.z1 / C); j++) {
      const k = `${i},${j}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(bi);
    }
  });
  const seen = new Set();
  for (const list of grid.values()) for (let p = 0; p < list.length; p++) for (let q = p + 1; q < list.length; q++) {
    const ia = Math.min(list[p], list[q]), ib = Math.max(list[p], list[q]), A = boxes[ia], B = boxes[ib], key = ia * 1e6 + ib;
    if (A.id === B.id || seen.has(key)) continue;                        // (a piece's own wall + coping: one segment)
    seen.add(key);
    if (A.x1 < B.x0 - 0.01 || B.x1 < A.x0 - 0.01 || A.z1 < B.z0 - 0.01 || B.z1 < A.z0 - 0.01) continue;
    let best = 0, where = null;
    for (const fa of A.faces) for (const fb of B.faces) {
      if (dot(fa.n, fb.n) < 0.9995 || fb.q.some((p) => Math.abs(dot(fa.n, sub(p, fa.q[0]))) > PLANE_EPS)) continue;   // (B's corners on A's plane: no n . p with world-sized p)
      const ar = overlap(fa.q, fb.q, fa.n);
      if (ar > best) { best = ar; where = fa.q[0]; }
    }
    if (best * 1e4 >= MIN_CM2) hits.push({ pair: [A.kind, B.kind].sort().join("+"), a: A.id, b: B.id, cm2: Math.round(best * 1e4), at: where.map((v) => +v.toFixed(2)) });
  }
  return hits;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const tot = { tiles: 0, fights: 0, byPair: {}, worst: [] }, per = {};
  for (const T of TILES) {
    const f = join(ROOT, "data/gardens", `${T}.json`);
    if (!existsSync(f)) continue;
    const hits = zfights(JSON.parse(readFileSync(f, "utf8")));
    tot.tiles++; tot.fights += hits.length; per[T] = hits.length;
    for (const h of hits) { tot.byPair[h.pair] = (tot.byPair[h.pair] || 0) + 1; tot.worst.push({ tile: T, ...h }); }
    tot.worst.sort((a, b) => b.cm2 - a.cm2); tot.worst.length = Math.min(tot.worst.length, 20);
  }
  console.log(`garden z-fight: ${tot.tiles} tiles, ${tot.fights} coplanar overlaps (limit ${MAX})`, JSON.stringify(tot.byPair));
  for (const w of tot.worst.slice(0, 10)) console.log("  ", JSON.stringify(w));
  if (JSON_OUT) writeFileSync(join(ROOT, JSON_OUT), JSON.stringify({ summary: tot, tiles: per }, null, 1));
  process.exitCode = tot.fights > MAX ? 1 : 0;
}
