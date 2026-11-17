// GATE: THE LYCÉE FRANÇAIS FRONT + THE CHEMIN PRIVÉ 'T CORTENBOSCH'S OLD LANE (claude/lycee; QUALITY_RULES row 25,
// provisional number; docs/LYCEE.md).
// Rule 25: a fixed, high-contrast detail seen from the street (a railing's bars, a gate's) is never thinner than the TAAU
// can hold (~1.5-2 internal px) at the distances it is seen from unless it is pre-filtered (its coverage over the pixel:
// a filtered card / texture); the modelled detail only where it is >= 2 px; and no two of its faces share a plane over the
// same area (rule 2), nor with a building wall or a garden piece.
//   1. the Lycée front as viewer/lyceeFront.js buildFront() builds it on tile F7's DTM: default mode
//      a. no two faces of different boxes within 1 mm of each other over the same area (the old mode's count is reported:
//         the gate's bar tops in its top rail, 120 face pairs; the gate's test that the audit sees them; the old corner
//         wedges overlap in volume but part by > 1 mm off the corner line);
//      b. no face in the plane of a building wall (the gatehouse) over the same area;
//      c. a coverage card on every panel + the gate, every modelled bar inside its card's stripe (the card's stripe width
//         = the bar's), the modelled bars only where >= 2 internal px (fov 55, 1080 x 0.6), the cards' material
//         coverage (alpha-to-coverage or blended), no light / DynamicDrawUsage, the switch a features.js row;
//      d. no garden piece, hedge or generated plant left on the railing strip or the gate line (main.js clear rings);
//      e. ?quick=1 keeps the Lycée's flags when the school is in the radius (the bare poles of 2026-11-17).
// A guard, not a new rule (the lane was found built: docs/LYCEE.md; rule 9, joins): the lane stays built and joined.
//   2. OSM way 1235727248 (the lane's old part, down to Rue Geleytsbeek, one-way): measured surface under its centre line
//      every metre, >= 2.5 m wide, joined at both ends; a one-way type in the OSM direction, driven (not NOT_DRIVEN); no
//      garden piece / hedge / generated plant / tree trunk on it after the city's own clear (viewer/gardens/
//      gardenClear.js + streets/carriageway.js); its setts (data/overrides.json streetSurfaces).
//   node --import ./tools/christmas/hook.mjs tools/audit/lyceeCheck.mjs [--quiet]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const quiet = process.argv.includes("--quiet");
const rows = [];
const check = (name, ok, info = "") => { rows.push([name, ok ? "PASS" : "FAIL", info]); };
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
globalThis.location ??= { search: "" };
const inR = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };

/** a tile's DTM (terrain.u16, cm) as ground(x, z), bilinear */
function dtm(T) {
  const h = J(`data/tiles/${T}/terrain.json`), b = fs.readFileSync(path.join(ROOT, `data/tiles/${T}/terrain.u16`));
  const v = new Uint16Array(b.buffer, b.byteOffset, b.byteLength / 2);
  const at = (c, r) => v[Math.max(0, Math.min(h.rows - 1, r)) * h.cols + Math.max(0, Math.min(h.cols - 1, c))] / 100;
  return (x, z) => { const fx = (x - h.x0) / h.step, fz = (z - h.z0) / h.step, c = Math.floor(fx), r = Math.floor(fz), u = fx - c, w = fz - r;
    return (at(c, r) * (1 - u) + at(c + 1, r) * u) * (1 - w) + (at(c, r + 1) * (1 - u) + at(c + 1, r + 1) * u) * w; };
}

// ---- geometry helpers (as tools/audit/gardenZfight.mjs, on triangles)
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };
// (1 mm, not the gardens' 5: the bars stand 2.5 mm inside the rails' faces by design, hidden behind them; the depth
// buffer resolves ~0.5 mm at 50 m)
const PLANE_EPS = 0.001, MIN_M2 = 1e-4, MIN_W = 0.002;
/** overlap of two near-coplanar convex polygons, qb projected on qa's plane (normal n): { area (m2), pts (3D, on qa's
 *  plane) } or null */
function overlap(qa, qb, n) {
  const e1 = norm(Math.abs(n[1]) < 0.9 ? cross(n, [0, 1, 0]) : cross(n, [1, 0, 0])), e2 = cross(n, e1);
  const O = qa[0], to2 = (q) => q.map((p) => { const r = sub(p, O); return [dot(r, e1), dot(r, e2)]; });
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
      if (ri !== si) { const dx = s[0] - r[0], dy = s[1] - r[1], ex = q[0] - p[0], ey = q[1] - p[1]; const t = ((p[0] - r[0]) * ey - (p[1] - r[1]) * ex) / (dx * ey - dy * ex); out.push([r[0] + dx * t, r[1] + dy * t]); }
    }
  }
  if (out.length < 3) return null;
  let ext = 0; for (const p of out) for (const q of out) ext = Math.max(ext, Math.hypot(p[0] - q[0], p[1] - q[1]));
  const ar = Math.abs(area(out));
  return ext > 0 && ar / ext >= MIN_W ? { area: ar, pts: out.map(([u, v]) => [O[0] + e1[0] * u + e2[0] * v, O[1] + e1[1] * u + e2[1] * v, O[2] + e1[2] * u + e2[2] * v]) } : null;
}
/** the triangles of buffers A (pos / idx / tags), each with its box id and kind */
function trianglesOf(A, idOffset = 0) {
  const starts = A.tags.map((t) => t[0]), kinds = A.tags.map((t) => t[1]);
  const boxOf = (v) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= v) lo = m; else hi = m - 1; } return lo; };
  const P = (i) => [A.pos[i * 3], A.pos[i * 3 + 1], A.pos[i * 3 + 2]], out = [];
  for (let t = 0; t < A.idx.length; t += 3) {
    const a = P(A.idx[t]), b = P(A.idx[t + 1]), c = P(A.idx[t + 2]), box = boxOf(A.idx[t]);
    if (kinds[box] === "pole") continue;
    const cr = cross(sub(b, a), sub(c, a)); if (Math.hypot(...cr) < 1e-10) continue;
    const n = norm(cr);
    out.push({ q: [a, b, c], n, d: dot(n, a), box: box + idOffset, kind: kinds[box] });
  }
  return out;
}
/** faces of different owners facing the same way (within 2.5 deg) that overlap where they lie within PLANE_EPS of each
 *  other (measured over the overlap itself: a sheared plinth top meeting another at a corner fights near the corner
 *  only): [{ a, b, area }] */
function coplanar(tris, others = null) {
  const grid = new Map(), key = (i, j) => `${i},${j}`, C = 1.0;
  const cells = (t) => { const xs = t.q.map((p) => p[0]), zs = t.q.map((p) => p[2]); const out = []; for (let i = Math.floor(Math.min(...xs) / C); i <= Math.floor(Math.max(...xs) / C); i++) for (let j = Math.floor(Math.min(...zs) / C); j <= Math.floor(Math.max(...zs) / C); j++) out.push(key(i, j)); return out; };
  const B = others || tris;
  B.forEach((t, k) => { for (const c of cells(t)) { if (!grid.has(c)) grid.set(c, []); grid.get(c).push(k); } });
  const hits = [], seen = new Set();
  tris.forEach((t, k) => {
    for (const c of cells(t)) for (const m of grid.get(c) || []) {
      const u = B[m];
      if (!others && m <= k) continue;
      if (u.box === t.box) continue;
      const pk = others ? `${k}/${m}` : `${k}/${m}`; if (seen.has(pk)) continue; seen.add(pk);
      const c = dot(t.n, u.n);
      if (c < 0.999) continue;
      if (Math.min(...t.q.map((p) => Math.abs(dot(u.n, p) - u.d))) > 0.05 && Math.abs(t.d - u.d) > 0.05) continue;     // (far apart: skip)
      const o = overlap(t.q, u.q, t.n);
      if (!o || o.area <= MIN_M2) continue;
      const sep = Math.max(...o.pts.map((p) => Math.abs(dot(u.n, p) - u.d) / c));
      if (sep <= PLANE_EPS) hits.push({ a: t.kind, b: u.kind, area: o.area, at: o.pts[0].map((v) => +v.toFixed(2)) });
    }
  });
  return hits;
}

// ---- 1. the Lycée front
{
  const { buildFront, lyceeFront } = await imp("viewer/lyceeFront.js");
  const ground = dtm("F7");
  const NEW = buildFront(ground, { mode: "new", tags: true }), OLD = buildFront(ground, { mode: "old", tags: true });
  const triNew = [...trianglesOf(NEW.B), ...trianglesOf(NEW.BARS, 1e6)], triOld = trianglesOf(OLD.B);
  const hn = coplanar(triNew), ho = coplanar(triOld);
  const sum = (h) => `${h.length} face pairs, ${(h.reduce((s, x) => s + x.area, 0) * 1e4).toFixed(0)} cm2${h.length ? ": " + [...new Set(h.map((x) => `${x.a}/${x.b}`))].join(", ") : ""}`;
  check("1a. lycée front: no coplanar overlapping faces (default)", hn.length === 0, `default ${sum(hn)}; ?lyceerail=old ${sum(ho)}`);
  check("1a. the audit sees the old front's doubles (the gate's bar tops in its top rail)", ho.length > 0, `${ho.length}`);
  // b. building walls (the gatehouse UrbIS 533140 and anything within 4 m)
  const blds = J("data/tiles/F7/buildings.json").buildings;
  const xs = NEW.B.pos.filter((_, i) => i % 3 === 0), zs = NEW.B.pos.filter((_, i) => i % 3 === 2);
  const bx0 = Math.min(...xs) - 4, bx1 = Math.max(...xs) + 4, bz0 = Math.min(...zs) - 4, bz1 = Math.max(...zs) + 4;
  const walls = [];
  let wid = 2e6;
  for (const b of blds) for (const r of b.footprint) {
    if (!r.some(([x, z]) => x > bx0 && x < bx1 && z > bz0 && z < bz1)) continue;
    let s = 0; for (let i = 0; i < r.length; i++) { const [x0, z0] = r[i], [x1, z1] = r[(i + 1) % r.length]; s += x0 * z1 - x1 * z0; }
    for (let i = 0; i < r.length; i++) {
      const [x0, z0] = r[i], [x1, z1] = r[(i + 1) % r.length], L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.05) continue;
      let n = [(z1 - z0) / L, 0, -(x1 - x0) / L]; if (s < 0) n = n.map((v) => -v);       // outward (x east, z south)
      const q = [[x0, b.base - 1, z0], [x1, b.base - 1, z1], [x1, b.eaves, z1], [x0, b.eaves, z0]];
      walls.push({ q: [q[0], q[1], q[2]], n, d: dot(n, q[0]), box: wid, kind: `wall ${b.id.split("/").pop()}` }, { q: [q[0], q[2], q[3]], n, d: dot(n, q[0]), box: wid++, kind: `wall ${b.id.split("/").pop()}` });
    }
  }
  const hw = coplanar(triNew, walls);
  check("1b. no front face in a building wall's plane", hw.length === 0, `${walls.length / 2} wall faces within 4 m; ${sum(hw)}`);
  // c. the pre-filter
  const C = NEW.C, cards = C ? C.idx.length / 6 : 0;
  check("1c. a coverage card on every railing panel + the gate", cards === NEW.panels + 1, `${cards} cards, ${NEW.panels} panels + 1 gate`);
  let outside = 0, wBad = 0, barN = 0;
  if (C) {
    const cardList = [];
    for (let k = 0; k < cards; k++) { const v = C.idx[k * 6]; const p0 = [C.pos[v * 3], C.pos[v * 3 + 2]], p1 = [C.pos[(v + 2) * 3], C.pos[(v + 2) * 3 + 2]], n = C.s[v + 2]; cardList.push({ p0, p1, n, w: C.w[v], yb: C.pos[v * 3 + 1], yt: C.pos[(v + 1) * 3 + 1] }); }
    for (const c of cardList) { const L = Math.hypot(c.p1[0] - c.p0[0], c.p1[1] - c.p0[1]); if (Math.abs(c.w * (L / c.n) - 0.0125) > 1e-4) wBad++; }
    // every modelled bar's centre on a card's plane (< 1 mm) at an integer bar unit (< 2 mm)
    const T = NEW.BARS.tags;
    for (let i = 0; i < T.length; i++) {
      if (T[i][1] !== "bar") continue;
      barN++;
      const v0 = T[i][0], v1 = i + 1 < T.length ? T[i + 1][0] : NEW.BARS.pos.length / 3;
      let cx = 0, cz = 0; for (let v = v0; v < v1; v++) { cx += NEW.BARS.pos[v * 3]; cz += NEW.BARS.pos[v * 3 + 2]; } cx /= v1 - v0; cz /= v1 - v0;
      const ok = cardList.some((c) => { const dx = c.p1[0] - c.p0[0], dz = c.p1[1] - c.p0[1], L = Math.hypot(dx, dz), t = ((cx - c.p0[0]) * dx + (cz - c.p0[1]) * dz) / L, off = Math.abs((cx - c.p0[0]) * -dz + (cz - c.p0[1]) * dx) / L; const u = t / (L / c.n); return off < 0.001 && t > 0 && t < L && Math.abs(u - Math.round(u)) * (L / c.n) < 0.002; });
      if (!ok) outside++;
    }
  }
  check("1c. every modelled bar lies in its card's stripe; stripe width = the bar's", barN > 0 && outside === 0 && wBad === 0, `${barN} bars, ${outside} off their card, ${wBad} cards with another width`);
  const src = fs.readFileSync(path.join(ROOT, "viewer/lyceeFront.js"), "utf8");
  const near = +(/BAR_NEAR = ([\d.]+)/.exec(src)?.[1] ?? NaN), band = +(/BAR_BAND = ([\d.]+)/.exec(src)?.[1] ?? NaN);
  const px = (w, d, H = 1080 * 0.6, fov = 55) => (w * H) / (2 * d * Math.tan((fov * Math.PI) / 360));
  check("1c. modelled bars only where >= 2 internal px (1080 x 0.6, fov 55)", px(0.025, near + band) >= 2, `a bar at ${near + band} m = ${px(0.025, near + band).toFixed(2)} px (old: at 20 m ${px(0.025, 20).toFixed(2)} px, at 30 m ${px(0.025, 30).toFixed(2)} px)`);
  check("1c. the cards' material: coverage (A2C + TAAU stochastic) or blended, analytic filter", /alphaToCoverage = true/.test(src) && /seeThrough = true/.test(src) && /filteredPulse\(/.test(src) && /fwidth\(s\)/.test(src) && /maskShadowNode/.test(src));
  const feat = fs.readFileSync(path.join(ROOT, "viewer/features.js"), "utf8");
  check("1c. switch ?lyceerail=old|blend is a features.js row", /sel\("lyceerail"/.test(feat) && /"blend"/.test(feat.slice(feat.indexOf('sel("lyceerail"'), feat.indexOf('sel("lyceerail"') + 2000)));
  const bad = [];
  for (const f of ["viewer/lyceeFront.js", "debug/lyceeCheck.js", "viewer/gardens/gardenClear.js"]) {
    const t = fs.readFileSync(path.join(ROOT, f), "utf8");
    if (/DynamicDrawUsage/.test(t)) bad.push(`${f}: DynamicDrawUsage`);
    if (/new THREE\.\w*Light\(/.test(t)) bad.push(`${f}: a light`);
  }
  check("1c. no light, no DynamicDrawUsage", !bad.length, bad.join(", "));
  // d. nothing generated on the railing strip / gate line after main.js's clear (plantsClear rings + the railing's)
  const { clearRoads, restyleHedges } = await imp("viewer/gardens/gardenClear.js");
  const ov = J("data/overrides.json");
  const rings = Object.entries(ov.plantsClear || {}).filter(([k]) => !k.startsWith("_")).map(([, v]) => v.ring).concat(lyceeFront.clearRings());
  const blocked = (x, z) => rings.some((r) => inR(r, x, z));
  let doc = J("data/gardens/F7.json");
  const rs = restyleHedges(doc, ov.gardenRestyle, blocked); if (rs) doc = rs.doc;
  const cr = clearRoads(doc, blocked); if (cr) doc = cr.doc;
  const lines = [];
  { const T = NEW.C; for (let k = 0; k < T.idx.length / 6; k++) { const v = T.idx[k * 6]; lines.push([T.pos[v * 3], T.pos[v * 3 + 2], T.pos[(v + 2) * 3], T.pos[(v + 2) * 3 + 2]]); } }
  const dl = (x, z) => Math.min(...lines.map(([ax, az, bx, bz]) => { const dx = bx - ax, dz = bz - az; let t = ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz); t = Math.max(0, Math.min(1, t)); return Math.hypot(x - ax - t * dx, z - az - t * dz); }));
  const R = 0.6, left = [];
  for (const g of doc.segs) for (let f = 0; f <= 1; f += 0.25) if (dl(g[0] + (g[3] - g[0]) * f, g[2] + (g[5] - g[2]) * f) < R) { left.push("wall"); break; }
  for (const p of doc.pillars) if (dl(p[0], p[2]) < R) left.push("pillar");
  for (const p of doc.gates) if (dl(p[0], p[2]) < R) left.push("gate");
  for (const h of doc.hedges) for (const q of h.points) if (dl(q[0], q[1]) < R + (h.width || 0.6) / 2) { left.push("hedge"); break; }
  const pl = J("data/plants/F7.json"); for (let o = 0; o < pl.plants.length; o += 6) if (dl(pl.plants[o], pl.plants[o + 1]) < R && !rings.some((r) => inR(r, pl.plants[o], pl.plants[o + 1]))) left.push("plant");
  check("1d. no garden piece / hedge / plant on the railing or the gate line", left.length === 0, left.length ? left.join(", ") : `cleared ${cr ? cr.segs + " walls, " + cr.hedgePts + " hedge points" : "nothing"} on F7`);
  // e. quick mode keeps the Lycée's flags
  const q = fs.readFileSync(path.join(ROOT, "viewer/quick.js"), "utf8");
  check("1e. ?quick=1 keeps the Lycée's flags in its radius", /LYCEE_FLAGS/.test(q) && /set\("flags", "0"\)/.test(q));
}

// ---- 2. the Chemin privé 't Cortenbosch's old lane (OSM 1235727248)
{
  const WAY = 1235727248, LANE = ["be/id/streetsurface/149914", "be/id/streetsurface/30121", "be/id/streetsurface/27386"];
  const osm = (() => { try { const d = J("data/raw/osm/area.json"); return (d.elements || d).find((e) => e.type === "way" && e.id === WAY) || null; } catch { return null; } })();
  const { carriageway } = await imp("viewer/streets/carriageway.js");
  const { clearRoads, restyleHedges } = await imp("viewer/gardens/gardenClear.js");
  const ov = J("data/overrides.json");
  // the centre line (F6 holds the whole way; F7 its buffer copy)
  const r6 = J("data/tiles/F6/roads.json"), N6 = new Map(r6.nodes.map((n) => [n.id, n]));
  const segs = r6.roads.filter((w) => w.meta?.osm == WAY).sort((a, b) => a.id.localeCompare(b.id));
  const line = []; for (const w of segs) { const P = [N6.get(w.a), ...(w.pts || []), N6.get(w.b)]; for (const p of P) if (!line.length || Math.hypot(line[line.length - 1][0] - p.x, line[line.length - 1][1] - p.z) > 0.01) line.push([p.x, p.z]); }
  const contiguous = segs.every((w, i) => i === 0 || w.a === segs[i - 1].b);
  check("2. way 1235727248: in the roads (F6), one-way, driven, segments in order", segs.length >= 1 && contiguous && segs.every((w) => w.type === "oneWay" && w.meta?.oneway === "yes" && !/^(footway|path|service|track)$/.test(w.meta?.highway)), `${segs.length} segments, ${segs.map((w) => w.type).join("/")}`);
  if (osm) {
    const first = `n${osm.nodes[0]}`, last = `n${osm.nodes[osm.nodes.length - 1]}`;
    check("2. in its OSM direction (Rue Geleytsbeek -> Avenue du Lycée Français)", segs[0]?.a === first && segs[segs.length - 1]?.b === last, `${segs[0]?.a} .. ${segs[segs.length - 1]?.b} vs OSM ${first} .. ${last}`);
  }
  // measured surfaces of both tiles, by class (viewer/surfaces.js SURF_CLASS: 0 roadway)
  const polys = [];
  for (const T of ["F6", "F7"]) for (const s of J(`data/tiles/${T}/surfaces.json`).surfaces) { const b = J(`data/tiles/${T}/roads.json`).meta && null; for (const r of s.rings.slice(0, 1)) polys.push({ id: s.id, c: s.c, r, T }); }
  const bnd = { F6: [-500, 0, 500, 1000], F7: [-500, 0, 1000, 1500] };
  const own = (p, x, z) => { const [x0, x1, z0, z1] = bnd[p.T]; return x >= x0 && x < x1 && z >= z0 && z < z1; };
  const surfAt = (x, z) => polys.find((p) => own(p, x, z) && inR(p.r, x, z)) || null;
  let L = 0, gaps = 0, narrow = 0, n = 0; const gapAt = [], core = [];
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1], Ls = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / Ls, nz = (bx - ax) / Ls;
    for (let s = 0; s < Ls; s += 1) {
      const x = ax + (bx - ax) * s / Ls, z = az + (bz - az) * s / Ls; n++;
      core.push([x, z], [x + nx, z + nz], [x - nx, z - nz]);
      if (!surfAt(x, z)) { gaps++; gapAt.push(`${(L + s).toFixed(0)} m`); continue; }
      let w = 0; for (let o = -3; o <= 3.001; o += 0.25) if (surfAt(x + nx * o, z + nz * o)) w += 0.25;
      if (w < 2.5) narrow++;
    }
    L += Ls;
  }
  check("2. a measured surface under the centre line every metre, joined at both ends", gaps === 0, `${n} stations over ${L.toFixed(0)} m, ${gaps} without a surface${gapAt.length ? ": " + gapAt.slice(0, 8).join(", ") : ""}`);
  check("2. >= 2.5 m wide everywhere", narrow === 0, `${narrow} of ${n} stations narrower`);
  const endsOn = [line[0], line[line.length - 1]].map(([x, z]) => surfAt(x, z)?.id.split("/").pop() || "none");
  check("2. both ends on the next street's surface (no floating edge)", endsOn.every((e) => e !== "none"), `Geleytsbeek end on ${endsOn[0]}, avenue end on ${endsOn[1]}`);
  // nothing standing on the lane after the city's clear (main.js: restyle, then clearRoads with the carriageway test)
  const laneP = polys.filter((p) => LANE.includes(p.id));
  const onLane = (x, z) => laneP.some((p) => inR(p.r, x, z));
  const stand = [];
  for (const T of ["F6", "F7"]) {
    const roads = J(`data/tiles/${T}/roads.json`), tp = polys.filter((p) => p.T === T);
    const classAt = (x, z) => { const p = tp.find((p) => inR(p.r, x, z)); return p ? p.c : -1; };
    const driven = carriageway(roads, { classAt });
    const clear = Object.entries(ov.plantsClear || {}).filter(([k]) => !k.startsWith("_")).map(([, v]) => v.ring);
    const blocked = (x, z) => driven.inside(x, z, 0.3) || clear.some((r) => inR(r, x, z));
    let doc = J(`data/gardens/${T}.json`);
    const rs = restyleHedges(doc, ov.gardenRestyle, blocked); if (rs) doc = rs.doc;
    const cr = clearRoads(doc, blocked); if (cr) doc = cr.doc;
    for (const g of doc.segs) for (let f = 0; f <= 1; f += 0.25) if (onLane(g[0] + (g[3] - g[0]) * f, g[2] + (g[5] - g[2]) * f)) { stand.push(`${T} wall`); break; }
    for (const p of doc.pillars) if (onLane(p[0], p[2])) stand.push(`${T} pillar`);
    for (const p of doc.gates) if (onLane(p[0], p[2])) stand.push(`${T} gate`);
    for (const h of doc.hedges) for (const q of h.points) if (onLane(q[0], q[1])) { stand.push(`${T} hedge`); break; }
    const pl = J(`data/plants/${T}.json`);
    for (let o = 0; o < pl.plants.length; o += 6) if (onLane(pl.plants[o], pl.plants[o + 1])) stand.push(`${T} plant`);
    for (let o = 0; o < pl.beds.length; o += 6) if (onLane(pl.beds[o], pl.beds[o + 1])) stand.push(`${T} bed`);
    for (const t of J(`data/tiles/${T}/features.json`).trees) if (onLane(t.x, t.z)) stand.push(`${T} tree ${t.id}`);
    // (a house front ON the lane's edge is UrbIS's street line: a building blocks when it covers the lane's middle 2 m)
    for (const b of J(`data/tiles/${T}/buildings.json`).buildings) if (b.footprint.some((r) => core.some(([x, z]) => inR(r, x, z)))) stand.push(`${T} building ${b.id.split("/").pop()}`);
  }
  check("2. nothing standing on the lane (garden pieces, hedges, plants, tree trunks, buildings)", stand.length === 0, stand.length ? stand.slice(0, 10).join(", ") : `${laneP.length} lane polygons clear`);
  const ss = ov.streetSurfaces || {};
  check("2. the lane's setts (streetSurfaces 149914 / 30121 / 27386)", LANE.every((id) => ss[id]?.surface === "sett"));
}

const failed = rows.filter((r) => r[1] !== "PASS");
if (!quiet || failed.length) for (const r of rows) console.log(`${r[1]}  ${r[0]}${r[2] ? `  (${r[2]})` : ""}`);
console.log(failed.length ? `lyceeCheck: ${failed.length} FAIL` : `lyceeCheck: all ${rows.length} pass`);
process.exitCode = failed.length ? 1 : 0;
