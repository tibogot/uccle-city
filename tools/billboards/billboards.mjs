// BIG ADVERTISING BILLBOARDS: placement + the gate row `billboards` (claude/billboards, rule billboards).
// Each board in data/billboards/billboards.json says WHAT Street View shows (look only, our own words): the building
// (UrbIS solid), the wall it hangs on (its outward facing) or the roof it stands on, its size and kind. This snaps it
// to the wall face / roof the city DRAWS (tools/billboards/walls.mjs: viewer/facadeGeom.js analyseBuildings' faces)
// and writes the result into each board's `at`; the viewer (viewer/billboards.js) draws exactly `at`.
//
//   node tools/billboards/billboards.mjs [--write] [--quiet] [--why ID]
//     default: re-derive every board from the CURRENT city data and CHECK the file against it + every rule below
//     --write: write the derived `at` into the file (then re-check)
//
// The rules (rule billboards):
//   wall    the board's whole outline (poster + border) lies on ONE drawn face of its building: inside its width, over
//           its foot, >= TOP_GAP under its top (the gable's chimney and coping stay free); the face is blind where the
//           board is (no window, door or garage the painted facade draws there: faceOpenings), nothing built in front
//           of it (a neighbour's roof under its foot), its plane within PLANE_TOL of the face's;
//   roof    every leg and brace foot on the SAME building's roof, the roof flat under them (<= FLAT m), the board's
//           foot ROOF.legClear over the highest foot; inside the roof's outline by EDGE m;
//   sizes   the real ranges per kind (SIZES), readable (h >= 1.8 m), the poster's aspect = the board's (12 %);
//   posters invented only: no real brand / company word (BRANDS) in any poster text; every board has its posters
//           (a trivision three); no board on a building a scripted model hides (placement.hides_*).
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { tileWalls, ROOT } from "./walls.mjs";

const argv = process.argv.slice(2);
const flag = (k) => { const i = argv.indexOf(k); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const WRITE = flag("--write"), QUIET = flag("--quiet"), WHY = opt("--why", null);
const FILE = join(ROOT, "data/billboards/billboards.json");

export const TOL = { plane: 0.05, at: 0.05, edge: 0.25, topGap: 0.3, footGap: 0.3, front: 0.8, flat: 0.45, open: 0.1 };   // (front: m out of the wall probed for a roof under the board, with 0.4 and 1.4)
/** the real ranges per kind (m): [w min, w max, h min, h max] */
export const SIZES = {
  panel: [3.0, 12.5, 1.8, 4.5],        // 4 x 3 m (12 m2) up to the 10 x 3.3 m "36 m2" boards
  backlit: [3.0, 9.0, 1.8, 3.5],
  trivision: [2.5, 8.0, 1.8, 3.4],     // prism boards: 3 x 2 m street ones to 8 x 3 m gable ones
  gable: [3.0, 14.0, 3.0, 16.0],       // canvas / painted ads on a blind gable
  roof: [4.0, 14.0, 2.5, 5.0],
};
/** real brands / companies / advertisers that must never appear on a poster (word match, case-insensitive) */
export const BRANDS = ["coca", "cola", "pepsi", "mcdonald", "burger king", "kfc", "quick", "nike", "adidas", "puma", "samsung", "apple", "iphone", "huawei", "sony",
  "proximus", "telenet", "orange", "base", "voo", "scarlet", "mobile vikings", "delhaize", "colruyt", "carrefour", "aldi", "lidl", "intermarche", "cora", "match",
  "jupiler", "stella", "artois", "heineken", "leffe", "duvel", "chimay", "maes", "ikea", "toyota", "bmw", "mercedes", "renault", "peugeot", "citroen", "volkswagen",
  "audi", "tesla", "ford", "opel", "kia", "hyundai", "ing", "bnp", "fortis", "belfius", "kbc", "argenta", "axa", "ethias", "jcdecaux", "clear channel", "netflix",
  "amazon", "google", "facebook", "h&m", "zara", "primark", "mediamarkt", "media markt", "coolblue", "fnac", "spotify", "red bull", "lotto", "loterie nationale",
  "q8", "total", "totalenergies", "shell", "esso", "texaco", "lukoil", "gulf", "dats", "stib", "mivb", "sncb", "nmbs", "uber", "deliveroo", "bpost", "kinepolis",
  "ugc", "forest national", "ancienne belgique", "dh", "le soir", "rtbf", "vrt", "rtl", "nrj", "bel rtl", "lego", "haribo", "cote d'or", "côte d'or", "galler", "neuhaus",
  "leonidas", "godiva", "spa", "chaudfontaine", "evian", "vittel", "nespresso", "starbucks", "exki", "panos", "pizza hut", "domino", "di", "kruidvat", "hema", "action",
  "brico", "gamma", "hubo", "decathlon", "torfs", "c&a", "zalando", "bol.com", "vinted", "immoweb", "2dehands", "bru", "brussels airlines", "ryanair", "tui", "engie", "luminus"];

const J = (p) => JSON.parse(readFileSync(p, "utf8"));
const rows = [];
const row = (ok, msg) => { rows.push({ ok, msg }); if (!QUIET || !ok) console.log(`${ok ? "ok  " : "FAIL"} ${msg}`); };

/** the scripted models' hide lists (models/<name>/*.json placement.hides_bu_ids / hides_solids) -> Set of solid ids */
function hiddenSolids() {
  const out = new Set();
  for (const d of readdirSync(join(ROOT, "models"))) {
    const dir = join(ROOT, "models", d);
    if (!statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".json")) continue;
      let p; try { p = J(join(dir, f)).placement; } catch { continue; }
      for (const id of [...(p?.hides_bu_ids ?? []), ...(p?.hides_solids ?? [])]) out.add(String(id).split("/").pop());
    }
  }
  return out;
}

const FRAME_BORDER = { panel: 0.14, backlit: 0.16, trivision: 0.18, gable: 0.07, roof: 0.14 };   // = viewer/billboards.js FRAME[*].border
const ROOF_LEG = 1.3, ROOF_BRACE = 2.6;                                                              // = viewer/billboards.js ROOF

/** the face of the board's building it hangs on: the face of that solid whose outward normal is closest to `facing` */
function pickFace(W, b) {
  const [fx, fz] = b.facing, L = Math.hypot(fx, fz);
  let best = null;
  for (const f of W.faces) {
    if (f.solid !== String(b.solid)) continue;
    const c = (f.nx * fx + f.nz * fz) / L;
    if (c < 0.94) continue;
    // several faces of one facing (a stepped wall): the one nearest the hint point, else the widest
    const [cx, cz] = f.at(f.width / 2);
    const d = b.near ? Math.hypot(cx - b.near[0], cz - b.near[1]) : -f.width;
    if (!best || d < best.d) best = { f, d };
  }
  return best?.f || null;
}

/** derive one board's `at` from the city data; -> { at, issues: [string] } */
export function derive(b, opt = {}) {
  const issues = [];
  const W = tileWalls(b.tile);
  const bd = FRAME_BORDER[b.kind] ?? 0.14, hw = b.w / 2 + bd;
  if (b.mount === "roof") {
    const bi = W.buildings.findIndex((q) => W.solidId(q) === String(b.solid));
    if (bi < 0) return { at: null, issues: [`solid ${b.solid} not in tile ${b.tile}`] };
    const [nx0, nz0] = b.facing, L = Math.hypot(nx0, nz0), nx = nx0 / L, nz = nz0 / L, tx = nz, tz = -nx;   // t: the viewer's right (= viewer/billboards.js)
    const [px, pz] = b.near;
    const feet = [];
    const nLeg = Math.max(2, Math.round(b.w / 3.2) + 1);
    for (let i = 0; i < nLeg; i++) {
      const a = -b.w / 2 + (b.w * i) / (nLeg - 1);
      feet.push([px + tx * a, pz + tz * a], [px + tx * a - nx * ROOF_BRACE, pz + tz * a - nz * ROOF_BRACE]);
    }
    // the walkway's front edge and the frame's ends must stay over the roof too
    for (const a of [-hw, hw]) for (const c of [0.9, -ROOF_BRACE - 0.1]) feet.push([px + tx * a + nx * c, pz + tz * a + nz * c]);
    const ys = feet.map(([x, z]) => W.roofAt(bi, x, z));
    if (ys.some((y) => !Number.isFinite(y))) issues.push(`a leg / brace / walkway corner off the roof of solid ${b.solid}`);
    const fin = ys.filter(Number.isFinite), hi = Math.max(...fin), lo = Math.min(...fin);
    if (fin.length && hi - lo > TOL.flat) issues.push(`roof not flat under the legs (${(hi - lo).toFixed(2)} m > ${TOL.flat})`);
    // inside the roof outline by EDGE: probe EDGE further out round the frame
    const ring = W.buildings[bi].footprint[0];
    const inRing = (x, z) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
    for (const [x, z] of feet) for (const [ex, ez] of [[TOL.edge, 0], [-TOL.edge, 0], [0, TOL.edge], [0, -TOL.edge]]) if (!inRing(x + ex, z + ez)) { issues.push(`a foot within ${TOL.edge} m of the roof's edge`); break; }
    const y = (fin.length ? hi : 0) + ROOF_LEG;
    // the roof kit's stacks / flat-roof items (their collision tops) clear of the board, its legs, braces and walkway
    const inQuad = (x, z) => { const a = (x - px) * tx + (z - pz) * tz, c = (x - px) * nx + (z - pz) * nz; return Math.abs(a) <= hw + 0.3 && c >= -ROOF_BRACE - 0.3 && c <= 1.2; };
    for (const [x0, z0, x1, z1, top] of W.cols) {
      if (top < hi + 0.05) continue;
      const pts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [(x0 + x1) / 2, (z0 + z1) / 2]];
      if (pts.some(([x, z]) => inQuad(x, z))) { issues.push(`a roof-kit item (stack / vent, top ${top.toFixed(1)}) under the board's footprint`); break; }
    }
    // nothing taller right in front of / behind the board (a neighbour's wall through it)
    for (let a = -hw; a <= hw + 1e-6; a += 0.5) for (const c of [0.3, 1.2]) { const q = W.roofOf(px + tx * a + nx * c, pz + tz * a + nz * c); if (q && q.bi !== bi && q.y > y) { issues.push(`a neighbour's roof (${q.y.toFixed(1)}) over the board's foot in front of it`); a = 1e9; break; } }
    return { at: { p: [+px.toFixed(3), +y.toFixed(3), +pz.toFixed(3)], n: [+nx.toFixed(5), +nz.toFixed(5)], leg: ROOF_LEG, roof: +hi.toFixed(3), mount: "roof" }, issues };
  }
  if (b.mount === "ground") return deriveGround(b, W, bd, hw);
  const f = pickFace(W, b);
  if (!f) return { at: null, issues: [`no face of solid ${b.solid} (tile ${b.tile}) faces ${b.facing}`] };
  // u: the board's centre along the face (m from its left end, seen from outside); `u` in the data, else the middle of
  // the face; y0: its poster's foot (m over the face's base line), else the lowest blind spot
  // (u in the data: from the face's left end SEEN FROM OUTSIDE; the face's own u runs along its t = the viewer's left)
  const u = f.width - (b.u ?? f.width / 2);
  const lo = u - hw, hi2 = u + hw;
  if (lo < TOL.edge || hi2 > f.width - TOL.edge) issues.push(`outside the face's width (${lo.toFixed(2)}..${hi2.toFixed(2)} of ${f.width.toFixed(2)})`);
  // the neighbour's roof in front of the wall (a party wall: blind up to there, built against below it)
  let front = -Infinity, top = Infinity, foot = -Infinity;
  for (let a = Math.max(lo, 0.05); a <= Math.min(hi2, f.width - 0.05) + 1e-6; a += 0.25) {
    // the roofs built in front, 0.4 m out (the party wall's neighbour) and over the frame's / lamp arms' reach
    for (const out of [0.4, TOL.front, 1.4]) { const [x, z] = f.at(a, out), q = W.roofOf(x, z); if (q && q.bi !== f.bi) front = Math.max(front, q.y); }
    top = Math.min(top, f.wallTop(a)); foot = Math.max(foot, f.wallFoot(a));
  }
  const yMin = Math.max(front + TOL.footGap, foot + (b.minH ?? 0));
  const y0 = b.y0 != null ? f.base + b.y0 : yMin + bd;
  const yb = y0 - bd, yt = y0 + b.h + bd;
  if (yb < front + TOL.footGap - 1e-6) issues.push(`its foot (${(yb - f.base).toFixed(2)}) under the roof built in front of it (${(front - f.base).toFixed(2)} + ${TOL.footGap})`);
  if (yb < foot - 1e-6) issues.push(`its foot under the wall's foot`);
  if (yt > top - TOL.topGap + 1e-6) issues.push(`its top (${(yt - f.base).toFixed(2)}) within ${TOL.topGap} m of the wall's top (${(top - f.base).toFixed(2)})`);
  // the openings the painted facade draws on that face (the board covers none, by TOL.open)
  for (const o of W.openings(f)) {
    const ou0 = o.u0 - TOL.open, ou1 = o.u1 + TOL.open, oh0 = f.base + o.h0 - TOL.open, oh1 = f.base + o.h1 + TOL.open;
    if (ou1 > lo && ou0 < hi2 && oh1 > yb && oh0 < yt) { issues.push(`covers a ${o.kind} (floor ${o.floor}, bay ${o.bay})`); break; }
  }
  // the roof kit's chimney stacks: a party-wall stack straddles the wall and runs down it to the lower roof in front
  for (const st of W.stacks) {
    const du = (st.x * f.tx + st.z * f.tz) - (f.u0 + u), dn = st.x * f.nx + st.z * f.nz - f.plane;
    const half = Math.abs(st.tx * f.tx + st.tz * f.tz) * st.w / 2 + Math.abs(st.tx * f.tz - st.tz * f.tx) * st.d / 2;
    if (Math.abs(du) < hw + half + 0.1 && dn > -0.8 && dn < 1.2 && st.y1 > yb && st.y0 < yt) { issues.push(`a chimney stack across it (${du.toFixed(2)} m along, ${st.y0.toFixed(1)}-${st.y1.toFixed(1)})`); break; }
  }
  const [x, z] = f.at(u, 0);
  return { at: { p: [+x.toFixed(3), +y0.toFixed(3), +z.toFixed(3)], n: [+f.nx.toFixed(5), +f.nz.toFixed(5)], face: f.key, u: +u.toFixed(3), base: +f.base.toFixed(3),
    width: +f.width.toFixed(3), party: f.partyH >= 999, mount: "wall" }, issues, face: f };
}

/** the tile's drawn-ground heightmap (viewer/heightmap.js, the DTM the terrain mesh is built from) */
const hmCache = new Map();
async function heightmap(T) {
  if (hmCache.has(T)) return hmCache.get(T);
  const { Heightmap } = await import(pathToFileURL(join(ROOT, "viewer/heightmap.js")).href);
  const d = join(ROOT, "data/tiles", T), hdr = J(join(d, "terrain.json")), buf = readFileSync(join(d, "terrain.u16"));
  const hm = new Heightmap(hdr, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  hmCache.set(T, hm);
  return hm;
}
const { ROAD_TYPES } = await import(pathToFileURL(join(ROOT, "vendor/roads/roadCrossSection.js")).href);
const roadHalf = (type) => { const R = ROAD_TYPES[type] || ROAD_TYPES.local; return Math.max(...[R.left, R.right].map((s) => s.reduce((a, l) => a + l.width, 0))) + (R.center?.width || 0) / 2; };
/** legs of a free-standing board: along t (m from its centre) */
export const groundLegs = (w) => (w <= 6 ? [-(w / 2 - 0.55), w / 2 - 0.55] : [-(w / 2 - 0.6), 0, w / 2 - 0.6]);
const GROUND = { sink: 0.5, clearMin: 1.6, slope: 1.6, trunk: 1.2, road: 1.5, bridge: 3.0 };
let railBridges = null;

/** a free-standing board on legs (mount "ground"): every foot on open ground (no building, off every road's whole
 *  cross-section by GROUND.road m, GROUND.trunk m from tree trunks), the legs' feet within GROUND.slope m of each other */
function deriveGround(b, W, bd, hw) {
  const issues = [], hm = hmCache.get(b.tile);
  const [nx0, nz0] = b.facing, L = Math.hypot(nx0, nz0), nx = nx0 / L, nz = nz0 / L, tx = nz, tz = -nx;
  const [px, pz] = b.near;
  const legs = groundLegs(b.w).map((a) => { const x = px + tx * a, z = pz + tz * a; return [a, +hm.ground(x, z).toFixed(3), x, z]; });
  const ys = legs.map((q) => q[1]), hi = Math.max(...ys), lo = Math.min(...ys);
  if (hi - lo > GROUND.slope) issues.push(`the legs' feet ${(hi - lo).toFixed(2)} m apart in height (> ${GROUND.slope})`);
  const clear = b.clear ?? 2.0;
  if (clear < GROUND.clearMin) issues.push(`the board's foot ${clear} m over the ground (< ${GROUND.clearMin}: walked into)`);
  const feats = J(join(ROOT, "data/tiles", b.tile, "features.json")), roads = J(join(ROOT, "data/tiles", b.tile, "roads.json")).roads;
  // the rail bridges' footprints (data/rail/rail.json: the hero viaducts' masonry and decks) + GROUND.bridge m
  railBridges ??= J(join(ROOT, "data/rail/rail.json")).bridges.map((q) => q.ring);
  const inRing = (ring, x, z) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const nearRing = (ring, x, z) => inRing(ring, x, z) || ring.some((p, i) => { const q = ring[(i + 1) % ring.length], dx = q[0] - p[0], dz = q[1] - p[1], l2 = dx * dx + dz * dz || 1e-9, k = Math.max(0, Math.min(1, ((x - p[0]) * dx + (z - p[1]) * dz) / l2)); return Math.hypot(p[0] + k * dx - x, p[1] + k * dz - z) < GROUND.bridge; });
  // the whole footprint (the frame's ends, the legs) on open ground
  const pts = [...legs.map((q) => [q[2], q[3]]), [px + tx * -hw, pz + tz * -hw], [px + tx * hw, pz + tz * hw]];
  for (const [x, z] of pts) {
    if (W.roofOf(x, z)) { issues.push(`a foot / end inside a building (${x.toFixed(1)}, ${z.toFixed(1)})`); break; }
    if (railBridges.some((r) => nearRing(r, x, z))) { issues.push(`a foot / end within ${GROUND.bridge} m of a rail bridge`); break; }
    const t = feats.trees.find((q) => Math.hypot(q.x - x, q.z - z) < GROUND.trunk);
    if (t) { issues.push(`a foot / end ${Math.hypot(t.x - x, t.z - z).toFixed(2)} m from a tree trunk`); break; }
    for (const r of roads) {
      if (/footway|path|steps|cycleway/.test(r.meta?.highway || "")) continue;
      const half = roadHalf(r.type) + GROUND.road;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], c = r.pts[i + 1], dx = c.x - a.x, dz = c.z - a.z, l2 = dx * dx + dz * dz || 1e-9;
        const k = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l2)), d = Math.hypot(a.x + k * dx - x, a.z + k * dz - z);
        if (d < half) { issues.push(`a foot / end ${d.toFixed(1)} m from ${r.meta?.name || r.type}'s centre line (its street ${half.toFixed(1)} m)`); break; }
      }
    }
  }
  const y = hi + clear + bd;
  return { at: { p: [+px.toFixed(3), +y.toFixed(3), +pz.toFixed(3)], n: [+nx.toFixed(5), +nz.toFixed(5)], legs: legs.map((q) => [q[0], +(q[1] - GROUND.sink).toFixed(3)]), mount: "ground" }, issues };
}

/** the poster texts' brand words */
export function brandHits(p) {
  const txt = ` ${[p.brand, ...(p.lines || []), p.small].filter(Boolean).join(" ").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")} `;
  return BRANDS.filter((w) => new RegExp(`(^|[^a-z0-9])${w.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[.*+?^${}()|[\]\\&]/g, "\\$&")}([^a-z0-9]|$)`).test(txt));
}

export function check(doc, { quietRows = false } = {}) {
  const out = [];
  const r = (ok, msg) => out.push({ ok, msg });
  const hidden = hiddenSolids(), posters = new Map(doc.posters.map((p) => [p.id, p]));
  for (const p of doc.posters) { const h = brandHits(p); r(!h.length, `poster ${p.id}: ${h.length ? `real brand word(s) ${h.join(", ")}` : "invented"}`); }
  for (const b of doc.boards) {
    const tag = `board ${b.id} (${b.kind}, ${b.place})`;
    const S = SIZES[b.kind];
    r(!!S && b.w >= S[0] && b.w <= S[1] && b.h >= S[2] && b.h <= S[3], `${tag}: size ${b.w} x ${b.h} m in the ${b.kind} range ${S}`);
    r(!!b.source && b.source.length > 12, `${tag}: has a source note`);
    const ps = (b.posters || []).map((id) => posters.get(id));
    r(ps.length > 0 && ps.every(Boolean) && (b.kind !== "trivision" || ps.length === 3), `${tag}: posters ${b.posters} exist${b.kind === "trivision" ? " (three faces)" : ""}`);
    for (const p of ps.filter(Boolean)) { const [a, c] = p.aspect.split(":").map(Number); const k = (a / c) / (b.w / b.h); r(k > 0.88 && k < 1.12, `${tag}: poster ${p.id} aspect ${p.aspect} fits ${b.w} x ${b.h}`); }
    r(!hidden.has(String(b.solid)), `${tag}: solid ${b.solid} drawn by the city (no scripted model hides it)`);
    const d = derive(b);
    r(!!d.at && !d.issues.length, `${tag}: on its ${b.mount === "roof" ? "roof" : "wall"}${d.issues.length ? ": " + d.issues.join("; ") : ""}`);
    if (d.at && b.at) {
      const e = Math.hypot(d.at.p[0] - b.at.p[0], d.at.p[1] - b.at.p[1], d.at.p[2] - b.at.p[2]), en = Math.hypot(d.at.n[0] - b.at.n[0], d.at.n[1] - b.at.n[1]);
      r(e <= TOL.at && en < 0.01, `${tag}: the file's position = the current city's (${e.toFixed(3)} m)`);
    } else r(false, `${tag}: the file has its derived position (run --write)`);
  }
  return out;
}

/** mutation tests: a board 1 m off its wall, a board over a window, a brand word: each must fail */
function mutations(doc) {
  const out = [];
  const wall = doc.boards.find((b) => b.mount !== "roof");
  if (wall) {
    const m = { ...wall, at: { ...wall.at, p: [wall.at.p[0] + wall.at.n[0], wall.at.p[1], wall.at.p[2] + wall.at.n[1]] } };
    const c = check({ posters: doc.posters, boards: [m] });
    out.push({ ok: c.some((q) => !q.ok && /position/.test(q.msg)), msg: "mutation: a board 1 m off its wall fails" });
    const low = { ...wall, y0: -0.5, at: null };
    out.push({ ok: !!derive(low).issues.length, msg: "mutation: a board pushed down to the street (through the roof in front / the openings) fails" });
  }
  out.push({ ok: brandHits({ brand: "Jupiler", lines: ["x"] }).length > 0 && brandHits({ brand: "Café Moka", lines: ["le petit noir"] }).length === 0, msg: "mutation: a brand word is found, an invented one is not" });
  const tall = doc.boards.find((b) => b.kind === "panel");
  if (tall) out.push({ ok: check({ posters: doc.posters, boards: [{ ...tall, w: 30 }] }).some((q) => !q.ok && /size/.test(q.msg)), msg: "mutation: a 30 m panel fails the size range" });
  return out;
}

/** preload what derive() needs asynchronously (the heightmaps of the ground boards' tiles) */
export async function prepare(doc) { for (const b of doc.boards) if (b.mount === "ground") await heightmap(b.tile); }

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  const doc = J(FILE);
  await prepare(doc);
  if (WHY) { const b = doc.boards.find((q) => q.id === WHY); const d = derive(b); console.log(JSON.stringify({ at: d.at, issues: d.issues, face: d.face && { width: d.face.width, base: d.face.base, top: d.face.top, partyH: d.face.partyH, street: d.face.street } }, null, 1)); process.exit(0); }
  if (WRITE) {
    for (const b of doc.boards) { const d = derive(b); b.at = d.at; if (d.issues.length) console.log(`WARN ${b.id}: ${d.issues.join("; ")}`); }
    // one poster / board per line (diffs stay readable)
    const { posters, boards, ...head } = doc, lines = (a) => a.map((q) => "  " + JSON.stringify(q)).join(",\n");
    writeFileSync(FILE, JSON.stringify(head, null, 1).replace(/\n}$/, `,\n "posters": [\n${lines(posters)}\n ],\n "boards": [\n${lines(boards)}\n ]\n}\n`));
    console.log(`wrote ${FILE}`);
  }
  for (const q of [...check(doc), ...mutations(doc)]) row(q.ok, q.msg);
  const bad = rows.filter((q) => !q.ok).length;
  console.log(`billboards: ${doc.boards.length} boards, ${doc.posters.length} posters, ${rows.length} checks, ${bad} failed`);
  process.exit(bad ? 1 : 0);
}
