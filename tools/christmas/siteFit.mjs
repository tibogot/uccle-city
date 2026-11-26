// THE CHRISTMAS SITE FITS THE CURRENT CITY (rule xmas-fit-current-city, claude/xmas1; docs/CHRISTMAS_PLAN_2026.md jobs 0-1).
// models/christmas/site.json is BAKED (tools/christmas/build_site.py) from the tiles and the street life; this re-reads
// the CURRENT data and checks every placed item still fits it:
//   fronts   each decorated front is a current street-life shop face (same id, same face to 1 cm), on its building's
//            DRAWN wall (not hidden by a scripted model), and the set is complete (the build's own selection, re-derived
//            from the current street life: a shop added since = stale)
//   swags    every swag run (viewer/christmas/xmasSwag.js, the shop kit's frontFace / frontWidth) lies inside the front
//            the shop kit DRAWS (viewer/shops/shopLayout.js layoutShop run with a recording env: its front piece's width
//            and centre) and both its ends on the building's own wall; tested on every site front, the Carrefour Market's
//            curated 18 m front (osm:n255033292) and a synthetic curated 18 m front moved 4 m along a long wall
//   wreaths  each on a current address point of its street, >= 3 m from every shop face, on a drawn wall (not hidden,
//            not a retail box: shed)
//   spans    both ends on a drawn wall (not hidden) whose ground + the hook height is the end's height and whose top is
//            >= 0.8 m over it; never across a park fence
//   firs, chalets  >= 1 m from every street lamp (as the city places them, viewer/streets/lampPlace.js), >= 1 m from a
//            park fence line
//   street furniture  (claude/xmasreview) every chalet's footprint (roof + propped shutter, oriented) >= 0.5 m from the
//            drawn street furniture (streetFurniture below: plate posts, sign poles, postboxes, stops, Villo, bins,
//            hoops, benches, bike parkings), each fir's crown (2.95 m x scale) clear of it; the customers' strip
//            (1.5 m) in front of each hatch clear of the fir's crown + 0.3 m
// import { siteFit } from "tools/christmas/siteFit.mjs"; siteFit(site) -> { rows: [{ ok, msg }], counts }
// node tools/christmas/siteFit.mjs [site.json]: the report (exit 1 on a misfit)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const J = (p) => JSON.parse(fs.readFileSync(path.isAbsolute(p) ? p : path.join(ROOT, p), "utf8"));
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const fr = (n) => (n || "").split(" - ")[0].trim();

const pip = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [x0, z0] = r[i], [x1, z1] = r[j]; if ((z0 > z) !== (z1 > z) && x < ((x1 - x0) * (z - z0)) / (z1 - z0) + x0) c = !c; } return c; };
const edist = (x, z, r) => { let d = Infinity; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [ax, az] = r[j], [bx, bz] = r[i], dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1e-9; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)); d = Math.min(d, Math.hypot(ax + t * dx - x, az + t * dz - z)); } return d; };
const segX = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b); };
const ringCross = (a, b, r) => r.some((p, i) => segX(a, b, r[(i + r.length - 1) % r.length], p));

/** the scripted models' hide lists (models/<name>/<name>.json placement.hides_bu_ids / hides_solids: full UrbIS URIs) */
export function hiddenIds() {
  const out = new Map();
  for (const d of fs.readdirSync(path.join(ROOT, "models"))) {
    const dir = path.join(ROOT, "models", d);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".json")) continue;
      let p; try { p = J(path.join(dir, f)).placement; } catch { continue; }
      for (const id of [...(p?.hides_bu_ids ?? []), ...(p?.hides_solids ?? [])]) out.set(id, `models/${d}/${f}`);
    }
  }
  return out;
}

/** (claude/xmasreview) the drawn street furniture of a tile as [x, z, radius] points (build_site.py street_furniture
 *  mirrors this list): the first market put a chalet's roof through the Place de Saint-Job street-name plate post */
export function streetFurniture(T) {
  const L = (p) => (fs.existsSync(path.join(ROOT, p)) ? J(p) : {});
  const out = [];
  const sl = L(`data/streetlife/${T}.json`), sk = L(`data/streetkit/${T}.json`), fu = L(`data/furniture/${T}.json`), fe = L(`data/tiles/${T}/features.json`);
  for (const q of sl.plates ?? []) if (q.mount === "post") out.push([q.x, q.z, 0.1, "plate post"]);
  for (const q of sl.postboxes ?? []) out.push([q.x, q.z, 0.35, "postbox"]);
  for (const q of sl.stops ?? []) out.push([q.x, q.z, q.shelter ? 1.6 : 0.3, "stop"]);
  for (const q of [...(sk.signs ?? []), ...(sk.posts ?? [])]) out.push([q.x, q.z, 0.1, "sign pole"]);
  for (const v of Array.isArray(sk.villo) ? sk.villo : []) {
    for (const q of [...(v.bikes ?? []), ...(v.docks ?? [])]) out.push([q.x, q.z, 0.5, "Villo"]);
    if (v.totem) out.push([v.totem.x, v.totem.z, 0.4, "Villo totem"]);
  }
  for (const k of ["bins", "boxes", "hoops", "benches", "banks"]) for (const q of fu[k] ?? []) if (q.x != null) out.push([q.x, q.z, 0.6, k]);
  for (const q of fe.points ?? []) if (q.kind === "bicycle_parking") out.push([q.x, q.z, 0.8, "bike parking"]);
  return out;
}
/** a chalet's oriented rectangles (build_site.py chalets_on_square: half width 1.8, front reach 1.45 with the shutter,
 *  back 1.35): the distance from (px, pz) to its footprint, and to the customers' strip (1.5 m) in front of the hatch */
export const FIR_VIEWS = [[1102, 542]];       // (build_site.py FIR_VIEWS: viewer/places.js stjob-street)
export function chaletDist(c, px, pz) {
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), ux = fz, uz = -fx;
  const lx = (px - c.x) * ux + (pz - c.z) * uz, ly = (px - c.x) * fx + (pz - c.z) * fz, ax = Math.max(Math.abs(lx) - 1.8, 0);
  return { foot: Math.hypot(ax, Math.max(ly - 1.45, -1.35 - ly, 0)), front: Math.hypot(ax, Math.max(ly - 2.95, 1.45 - ly, 0)) };
}

export async function siteFit(site, { lamps = true } = {}) {
  const rows = [], counts = {};
  const row = (ok, msg) => rows.push({ ok, msg });
  const map = J("data/map/map.json");
  const tileOf = (x, z) => map.tiles.find((t) => x >= t.x0 && x < t.x0 + 500 && z >= t.z0 && z < t.z0 + 500)?.name;
  const cache = {};
  const tile = (n) => (cache[n] ??= {
    buildings: fs.existsSync(path.join(ROOT, `data/tiles/${n}/buildings.json`)) ? J(`data/tiles/${n}/buildings.json`).buildings : [],
    sl: fs.existsSync(path.join(ROOT, `data/streetlife/${n}.json`)) ? J(`data/streetlife/${n}.json`) : { pois: [], numbers: [] },
  });
  const near = (x, z, key) => { const s = new Set(); for (const dx of [-30, 0, 30]) for (const dz of [-30, 0, 30]) { const n = tileOf(x + dx, z + dz); if (n) s.add(n); } return [...s].flatMap((n) => tile(n)[key]); };
  const hidden = hiddenIds();
  const looks = J("data/overrides.json").buildingLooks ?? {};
  const isHidden = (b) => hidden.has(b.id) || hidden.has(b.attrs?.BU_ID);
  const isShed = (b) => { const n = (b.attrs?.BU_ID ?? "").split("/").pop(); return !!looks[n]?.shed; };
  const label = (b) => `${(b.attrs?.BU_ID ?? b.id).split("/").pop()}${isHidden(b) ? ` (hidden by ${hidden.get(b.id) ?? hidden.get(b.attrs?.BU_ID)})` : ""}`;
  /** the buildings whose wall is within d of (x, z) */
  const wallsAt = (x, z, d) => near(x, z, "buildings").filter((b) => b.footprint.some((r) => edist(x, z, r) <= d));
  const curated = J("data/shops/terraces.json").terraces ?? {};
  const parks = Object.entries(J("data/parkfence/parkfence.json").parks ?? {});

  // the current street life (the tiles the build reads: every tile within 400 m of an area)
  const sel = site.select;
  row(!!sel, `site.json carries its selection rules (select: areas, shop kinds, tree radius; tools/christmas/build_site.py)`);
  const areas = sel?.areas ?? [];
  const tilesIn = map.tiles.filter((t) => areas.some((a) => Math.abs(t.x0 + 250 - a.centre[0]) < a.radius + 400 && Math.abs(t.z0 + 250 - a.centre[1]) < a.radius + 400)).map((t) => t.name);
  const pois = tilesIn.flatMap((n) => tile(n).sl.pois ?? []).filter((p) => p.face);
  const numbers = tilesIn.flatMap((n) => tile(n).sl.numbers ?? []);
  const poiById = new Map(pois.map((p) => [p.id, p]));

  // ---- fronts
  {
    const deco = new Set(areas.flatMap((a) => a.streets)), kinds = new Set(sel?.shopKinds ?? []);
    const nearArea = (x, z) => areas.some((a) => Math.hypot(x - a.centre[0], z - a.centre[1]) <= a.radius);
    const want = new Set(pois.filter((p) => kinds.has(p.kind) && ((deco.has(fr(p.face.street)) && nearArea(p.face.x, p.face.z)) || site.trees.some((t) => Math.hypot(p.face.x - t.x, p.face.z - t.z) < (sel?.treeRadius ?? 160)))).map((p) => p.id));
    const have = new Set((site.fronts ?? []).map((f) => f.id));
    const added = [...want].filter((id) => !have.has(id)), gone = [...have].filter((id) => !want.has(id));
    const moved = [], offWall = [];
    for (const f of site.fronts ?? []) {
      const p = poiById.get(f.id);
      if (!p) continue;
      const q = p.face;
      if (["x", "y", "z", "nx", "nz", "w", "eaves"].some((k) => Math.abs((q[k] ?? 0) - (f[k] ?? 0)) > 0.011)) { moved.push(f.id); continue; }
      const own = near(q.x, q.z, "buildings").filter((b) => b.attrs?.BU_ID === q.bu || b.id === q.bu);   // (face.bu: a BU_ID or a solid id)
      const drawn = own.filter((b) => !isHidden(b));
      const d = Math.min(...drawn.flatMap((b) => b.footprint.map((r) => edist(q.x, q.z, r))), Infinity);
      if (!(d <= 0.6)) offWall.push(`${f.id} ${f.name ?? ""} ${own.length && !drawn.length ? `on a hidden building ${label(own[0])}` : `${d.toFixed(2)} m off its building's drawn wall`}`);
    }
    counts.fronts = { site: have.size, current: want.size, added: added.length, gone: gone.length, moved: moved.length, offWall: offWall.length };
    row(!added.length && !gone.length && !moved.length,
      `fronts: site.json ${have.size} vs ${want.size} from the current street life (${added.length} added since${added.length ? ": " + added.map((id) => `${id} ${poiById.get(id)?.name ?? ""}`).join(", ") : ""}; ${gone.length} gone${gone.length ? ": " + gone.join(", ") : ""}; ${moved.length} moved${moved.length ? ": " + moved.join(", ") : ""})${added.length + gone.length + moved.length ? " :: site.json is stale: python tools/christmas/build_site.py" : ""}`);
    row(!offWall.length, `fronts: ${(site.fronts ?? []).length - offWall.length} of ${(site.fronts ?? []).length} on their building's drawn wall (<= 0.6 m, not hidden)${offWall.length ? " :: " + offWall.join("; ") : ""}`);
  }

  // ---- swags (job 1): the run inside the drawn front, both ends on the building's own wall
  {
    const { swagRun } = await imp("viewer/christmas/xmasSwag.js");
    const { layoutShop, frontFace } = await imp("viewer/shops/shopLayout.js");
    const { W0 } = await imp("viewer/shops/shopPieces.js");
    const { hash01 } = await imp("viewer/streetlife/layout.js");
    /** the front piece the shop kit draws for (poi, face, curated): { W, x, z } */
    const drawnFront = (p, cur) => {
      const f = frontFace(p.face, cur?.front);
      let got = null;
      const add = (o, X, a, Y, b, Z, c) => [o[0] + X[0] * a + Y[0] * b + Z[0] * c, o[1] + X[1] * a + Y[1] * b + Z[1] * c, o[2] + X[2] * a + Y[2] * b + Z[2] * c];
      const env = {
        box() {}, label: () => null, prop() {}, windows: [], night: { shops: [], spots: [], signs: [], lights: [] }, used: { names: [] }, hash01,
        pick: (arr, id, k) => arr[Math.floor(hash01(id + k) * arr.length) % arr.length], add, twoLines: (s) => [s], yawTo: (nx, nz) => Math.atan2(nx, nz), WIN_STRIDE: 24, cur,
        shop(kind, x, y, z, yaw, dW) { if (/^front_/.test(kind) && !got) got = { W: W0 + dW, x, z }; },
      };
      const UP = [0, 1, 0];
      try { layoutShop(p, f, { X: [f.nz, 0, -f.nx], Y: UP, Z: [f.nx, 0, f.nz] }, 0, env); } catch (e) { return { err: e.message }; }
      return got;
    };
    const test = (label, p, cur) => {
      const f = { id: p.id, kind: p.kind, cat: p.cat, ...p.face };
      const run = swagRun(f, cur, hash01), D = drawnFront(p, cur);
      if (!D || D.err) return `${label}: the shop kit drew no front (${D?.err ?? "none"})`;
      const bad = [];
      // the run's ends along the front's own axis, against the drawn front's half width (1 cm)
      const ax = [-f.nz, f.nx];
      const uOf = (x, z) => (x - D.x) * ax[0] + (z - D.z) * ax[1];
      for (const [x, z] of run.ends) if (Math.abs(uOf(x, z)) > D.W / 2 + 0.01) bad.push(`an end ${Math.abs(uOf(x, z)).toFixed(2)} m from the drawn front's centre (half width ${(D.W / 2).toFixed(2)})`);
      if (Math.abs(run.W - D.W) > 0.01) bad.push(`run ${run.W.toFixed(2)} m vs the drawn front ${D.W.toFixed(2)} m`);
      for (const m of run.modules) if (Math.abs(uOf(m.x - f.nx * run.out, m.z - f.nz * run.out)) > D.W / 2) bad.push(`a module off the front`);
      const own = p.face.bu ? near(f.x, f.z, "buildings").filter((b) => (b.attrs?.BU_ID === p.face.bu || b.id === p.face.bu) && !isHidden(b)) : [];
      if (!own.length) bad.push(`its building ${p.face.bu ?? "(none)"} is not drawn`);
      else for (const [x, z] of run.ends) { const d = Math.min(...own.flatMap((b) => b.footprint.map((r) => edist(x, z, r)))); if (d > 0.6) bad.push(`an end (${x.toFixed(1)}, ${z.toFixed(1)}) ${d.toFixed(2)} m off its wall`); }
      return bad.length ? `${label}: ${bad.join("; ")}` : null;
    };
    const bad = [];
    for (const f of site.fronts ?? []) {
      const p = poiById.get(f.id) ?? { id: f.id, kind: f.kind, cat: f.cat, name: f.name, face: f };
      const b = test(`swag ${f.id}`, p, curated[f.id]); if (b) bad.push(b);
    }
    // the curated wide front (Carrefour Market Marlow): its POI wherever it is
    let carre = null;
    for (const t of map.tiles) { const p = (tile(t.name).sl.pois ?? []).find((q) => q.id === "osm:n255033292" && q.face); if (p) { carre = p; break; } }
    const cb = carre ? test("swag osm:n255033292 (Carrefour, curated 18 m)", carre, curated["osm:n255033292"]) : "the Carrefour's POI (osm:n255033292) not found";
    if (cb) bad.push(cb);
    const cw = carre ? swagRun({ id: carre.id, kind: carre.kind, cat: carre.cat, ...carre.face }, curated["osm:n255033292"], hash01) : null;
    // a synthetic curated front: 18 m, moved along its wall, WITHOUT a canopy (the fascia path), classic and modern, on
    // the Carrefour's 40 m wall (the decorated streets' walls are shorter than 18 m + a margin)
    for (const family of ["classic", "modern"]) {
      const sb = carre ? test(`swag synthetic 18 m ${family} front (du 11.8, no canopy)`, { ...carre, id: "synthetic:wide" }, { front: { w: 18, du: 11.8, family } }) : null;
      if (sb) bad.push(sb);
    }
    counts.swags = { fronts: (site.fronts ?? []).length, bad: bad.length, carrefourW: cw?.W, carrefourModules: cw?.n };
    row(!bad.length && !!carre && cw?.W === 18, `swags: every run inside its DRAWN front (the shop kit's width and centre) and its ends on its wall: ${(site.fronts ?? []).length} site fronts + the Carrefour (${cw?.W} m, ${cw?.n} modules, along its canopy) + a synthetic 18 m front (classic, modern) on its wall${bad.length ? " :: " + bad.join("; ") : ""}`);
  }

  // ---- wreaths
  {
    const shopPts = pois.map((p) => [p.face.x, p.face.z]);
    const numAt = new Map(numbers.map((n) => [`${n.x.toFixed(2)},${n.z.toFixed(2)}`, n]));
    const bad = [];
    for (const w of site.wreaths ?? []) {
      const tag = `wreath ${w.street} ${w.n} (${w.x}, ${w.z})`;
      const n = numAt.get(`${w.x.toFixed(2)},${w.z.toFixed(2)}`);
      if (!n || n.fr !== w.street) { bad.push(`${tag}: no current address point there`); continue; }
      const dShop = Math.min(...shopPts.map(([x, z]) => Math.hypot(x - w.x, z - w.z)));
      if (dShop < 3.0) { const p = pois.find((q) => Math.hypot(q.face.x - w.x, q.face.z - w.z) === dShop); bad.push(`${tag}: ${dShop.toFixed(1)} m from a shop front (${p?.id} ${p?.name ?? ""}; < 3)`); continue; }
      const walls = wallsAt(w.x, w.z, 0.6);
      if (!walls.length) { bad.push(`${tag}: no wall within 0.6 m`); continue; }
      if (walls.every((b) => isHidden(b) || isShed(b))) bad.push(`${tag}: on ${walls.map(label).join(", ")} (${walls.some(isShed) ? "a retail box" : "hidden"})`);
    }
    counts.wreaths = { site: (site.wreaths ?? []).length, bad: bad.length };
    row(!bad.length, `wreaths: ${(site.wreaths ?? []).length - bad.length} of ${(site.wreaths ?? []).length} on a current address point, >= 3 m from every shop front, on a drawn house wall${bad.length ? " :: " + bad.join("; ") : ""}`);
  }

  // ---- spans
  {
    const bad = [];
    for (const s of site.spans ?? []) {
      const H = s.tram ? 7.3 : 6.8, tag = `span ${s.street} (${s.a[0].toFixed(1)}, ${s.a[2].toFixed(1)})-(${s.b[0].toFixed(1)}, ${s.b[2].toFixed(1)})`;
      for (const e of [s.a, s.b]) {
        const walls = wallsAt(e[0], e[2], 0.3);
        const ok = walls.filter((b) => !isHidden(b) && Math.abs(b.base + H - e[1]) <= 0.05 && b.top >= e[1] + 0.8 - 0.01);
        if (!ok.length) bad.push(`${tag}: the end (${e[0].toFixed(1)}, ${e[2].toFixed(1)}) ${walls.length ? `on ${walls.map(label).join(", ")}, none drawn at that height` : "on no wall (<= 0.3 m)"}`);
      }
      for (const [name, P] of parks) if (ringCross([s.a[0], s.a[2]], [s.b[0], s.b[2]], P.ring)) bad.push(`${tag}: across the ${name} park fence`);
    }
    counts.spans = { site: (site.spans ?? []).length, bad: bad.length };
    row(!bad.length, `spans: ${(site.spans ?? []).length} garlands with both ends on a drawn wall at the hook height (ground + 6.8 / 7.3 m, the top >= 0.8 m over it), none across a park fence${bad.length ? " :: " + bad.join("; ") : ""}`);
  }

  // ---- firs and chalets: street lamps and park fences
  {
    const items = [...site.trees.map((t) => ({ tag: `fir ${t.id}`, x: t.x, z: t.z, r: 1.4 * t.scale })), ...(site.chalets ?? []).map((c, i) => ({ tag: `chalet ${i}`, x: c.x, z: c.z, r: Math.hypot(1.8, 1.45) }))];
    const bad = [];
    let nLamps = 0;
    if (lamps) {
      const { loadTile } = await imp("tools/road_audit/tile.mjs");
      const { streetFit } = await imp("viewer/streets/fitCore.js");
      const { placedLampSites } = await imp("viewer/streets/lampPlace.js");
      const L = [];
      for (const T of [...new Set(items.map((q) => tileOf(q.x, q.z)))]) {
        const realLog = console.log; console.log = () => {};
        let t; try { t = loadTile(T); } finally { console.log = realLog; }
        const fit = t.rd.surfaceData ? streetFit(t.rd.surfaceData) : null;
        L.push(...placedLampSites(t.roads, t.bounds, fit?.placeLamp));
      }
      nLamps = L.length;
      for (const q of items) { const d = Math.min(...L.map((l) => Math.hypot(l.x - q.x, l.z - q.z))) - q.r; if (d < 1.0) bad.push(`${q.tag}: ${d.toFixed(2)} m from a street lamp (< 1)`); }
    }
    for (const q of items) for (const [name, P] of parks) { const d = (pip(q.x, q.z, P.ring) ? -1 : 1) * edist(q.x, q.z, P.ring) - q.r; if (Math.abs(d) < 1.0) bad.push(`${q.tag}: ${d.toFixed(2)} m from the ${name} park fence`); }
    counts.standing = { items: items.length, lamps: nLamps, bad: bad.length };
    row(!bad.length, `firs and chalets: ${items.length} clear of the ${nLamps} street lamps of their tiles (>= 1 m past the footprint) and of the park fences${bad.length ? " :: " + bad.join("; ") : ""}`);
  }
  // ---- (claude/xmasreview) firs and chalets: the street furniture; the customers' strip in front of each hatch
  {
    const bad = [];
    const tiles = [...new Set([...site.trees, ...(site.chalets ?? [])].flatMap((q) => [-6, 6].flatMap((d) => [tileOf(q.x + d, q.z + d), tileOf(q.x - d, q.z + d)])).filter(Boolean))];
    const F = tiles.flatMap((T) => streetFurniture(T));
    for (const [i, c] of (site.chalets ?? []).entries()) {
      for (const [x, z, r, k] of F) { const d = chaletDist(c, x, z).foot - r; if (d < 0.5) bad.push(`chalet ${i}: ${d.toFixed(2)} m from a ${k} at (${x.toFixed(1)}, ${z.toFixed(1)}) (< 0.5)`); }
      for (const t of site.trees) { const d = chaletDist(c, t.x, t.z).front - 2.95 * t.scale; if (d < 0.3) bad.push(`chalet ${i}: the customers' strip ${d.toFixed(2)} m from the ${t.id} fir's crown (< 0.3)`); }
      // the fir seen whole from the square's main approach (viewer/places.js stjob-street: the default boot / tour spot)
      const t0 = site.trees.find((t) => t.id === "stjob");
      for (const [vx, vz] of FIR_VIEWS) if (t0) { let d = Infinity; for (let k = 0; k <= 60; k++) d = Math.min(d, chaletDist(c, vx + ((t0.x - vx) * k) / 60, vz + ((t0.z - vz) * k) / 60).foot); if (d < 0.5) bad.push(`chalet ${i}: ${d.toFixed(2)} m from the sightline (${vx}, ${vz}) -> the Saint-Job fir (< 0.5)`); }
    }
    for (const t of site.trees) for (const [x, z, r, k] of F) { const d = Math.hypot(x - t.x, z - t.z) - r - 2.95 * t.scale; if (d < 0) bad.push(`fir ${t.id}: a ${k} at (${x.toFixed(1)}, ${z.toFixed(1)}) inside its crown`); }
    counts.furniture = { tiles, items: F.length, bad: bad.length };
    row(!bad.length, `street furniture: ${(site.chalets ?? []).length} chalets >= 0.5 m from the ${F.length} furniture pieces of tiles ${tiles.join(" ")} (plate posts, sign poles, postboxes, stops, Villo, bins, hoops, bike parkings), the firs' crowns clear of them, every hatch's customers' strip clear of the fir's crown, no chalet in the sightline from the square's main approach to the fir${bad.length ? " :: " + bad.join("; ") : ""}`);
  }
  return { rows, counts };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = process.argv[2] ?? "models/christmas/site.json";
  const site = J(file);
  // (an old site.json without its selection rules: the current build's, to audit it against the current city)
  if (!site.select) { site.select = J("models/christmas/site.json").select; console.log(`(${file}: no select; the current build's rules)`); }
  const { rows, counts } = await siteFit(site);
  for (const r of rows) console.log(`${r.ok ? "PASS" : "FAIL"} ${r.msg}`);
  console.log(JSON.stringify(counts));
  process.exit(rows.every((r) => r.ok) ? 0 : 1);
}
