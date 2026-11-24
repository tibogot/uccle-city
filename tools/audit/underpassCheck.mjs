// GATE ROW `underpass` (claude/underpass1, rule underpass-wells, docs/CALEVOET_UNDERPASS_PLAN.md §8): the Calevoet
// pedestrian underpass U1, offline.
//   1. DATA       U1's OSM ways still exist with their tags (data/raw/osm/area.json) and lines (tile D6 features); each
//                 model stair mouth within 1 m of its OSM street-end node (the node sits on the kiosk's outer step);
//                 the hide lists are full UrbIS URIs matching tile D6's solids (rule hide-ids-full-uri); each kiosk's
//                 footprint covers its UrbIS box (overlap / union >= 0.85): the kiosks REPLACE the boxes
//   2. BUDGETS    triangles per level / the inside / the collision mesh, draws per level, slot names, no light in the
//                 GLBs (rule fixed-light-count), the inside's two bakes on every primitive, the download
//   3. GROUND     the worker's cut (viewer/underground/underpass.js) on tile D6's terrain grid: triangles dropped ONLY
//                 inside the well rings (0 outside), every new vertex within 2 cm of a well's rim, nothing left inside a
//                 well, the cut area = the wells' area; the street surfaces: the west well a hole in its sidewalk, no
//                 partial overlap; the kiosks' LOD0 meets the cut terrain (tools/mesh_audit/contact.js: 0 floating, 0
//                 overhang)
//   4. WALK       an offline walker (viewer/character: CharacterController + CollisionWorld + the field with the json's
//                 voids + LOD0 and the collision mesh as a TriBVH) walks east street -> down -> the corridor -> up -> west
//                 street and back: reaches each end, never > 5 cm inside the model, never above the corridor's soffit
//                 while under it; and a walker crossing ON the ground over the corridor stays on the ground
//   node tools/audit/underpassCheck.mjs [--quiet]
import { readFileSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";

const ROOT = new URL("../../", import.meta.url);
const QUIET = process.argv.includes("--quiet");
const imp = (p) => import(pathToFileURL(new URL(p, ROOT).pathname.replace(/^\/([A-Za-z]:)/, "$1")).href);
const J = (p) => JSON.parse(readFileSync(new URL(p, ROOT), "utf8"));
const fails = [], rows = [];
const check = (ok, what, detail = "") => { rows.push(`${ok ? "PASS" : "FAIL"} ${what}${detail ? ": " + detail : ""}`); if (!ok) fails.push(what); };

// budgets (plan §7; measured 2026-11-24 + headroom; raising one is a reviewed change)
const B = { lod0: 16000, lod1: 3000, lod2: 400, throat: 2000, inside: 35000, collision: 1500, drawsSurface: 6, drawsInside: 8, mb: 6.0 };
const SURF_SLOTS = ["brick_painted_white", "paint_fascia", "painted_metal_grey", "glass_frosted", "concrete"];
const IN_SLOTS = ["concrete_step", "floor_tile_grey", "wall_mural", "ceiling_paint", "painted_metal_grey", "lamp_glow", "glass_frosted"];

const notes = J("models/underpass/calevoet.json");
const F = notes.frame;
const UP = await imp("viewer/underground/underpass.js");
const frameOf = (x, z) => [(x - F.origin_city[0]) * F.u[0] + (z - F.origin_city[1]) * F.u[1], (x - F.origin_city[0]) * F.w[0] + (z - F.origin_city[1]) * F.w[1]];
const city = (u, w) => [F.origin_city[0] + F.u[0] * u + F.w[0] * w, F.origin_city[1] + F.u[1] * u + F.w[1] * w];

// ---- 1. data
const WANT = { 30235696: { highway: "steps", tunnel: "yes", layer: "-1" }, 640826544: { highway: "footway", tunnel: "yes", layer: "-1" }, 640826545: { highway: "steps", tunnel: "yes", layer: "-1" },
  30235699: { highway: "footway" }, 1128428859: { highway: "footway" }, 30235693: { highway: "footway" } };
const osm = J("data/raw/osm/area.json");
const ways = new Map(osm.elements.filter((e) => e.type === "way" && WANT[e.id]).map((e) => [e.id, e.tags]));
const badTags = Object.entries(WANT).filter(([id, w]) => !ways.has(+id) || Object.entries(w).some(([k, v]) => ways.get(+id)[k] !== v)).map(([id]) => id);
check(badTags.length === 0, "the 6 OSM ways of U1 exist with their tags (steps / footway, tunnel=yes, layer -1)", badTags.join(", "));
const feats = J("data/tiles/D6/features.json");
const line = (id) => (feats.lines || []).find((l) => l.id === `osm:w${id}`)?.line;
check(UP.UNDERPASS_WAYS.every((id) => (feats.lines || []).some((l) => l.id === id)), "U1's tunnel ways are lines of tile D6 (the land cover leaves them out)");
const segD = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2)); return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t); };
const eTop = line(30235696)?.[0], wTop = line(640826545)?.at(-1);
const dE = segD(eTop, ...notes.stairs.east.top_line), dW = segD(wTop, ...notes.stairs.west.top_line);
check(dE <= 1.0 && dW <= 1.0, "each stair's mouth within 1 m of its OSM street-end node", `east ${dE.toFixed(2)} m, west ${dW.toFixed(2)} m`);
const bj = J("data/tiles/D6/buildings.json").buildings;
const ids = new Set(bj.map((b) => String(b.id))), bus = new Set(bj.map((b) => String(b.attrs?.BU_ID || "")));
const pl = notes.placement;
check(pl.hides_solids.length === 2 && pl.hides_solids.every((s) => s.startsWith("https://") && ids.has(s)) && pl.hides_bu_ids.every((s) => s.startsWith("https://") && bus.has(s)),
  "hide lists = full UrbIS URIs of tile D6 (the two kiosk solids 525169 + 519275)", JSON.stringify(pl.hides_solids));
for (const [name, k] of Object.entries(notes.kiosks)) {
  const urb = bj.find((b) => b.id === k.solid)?.footprint[0];
  let both = 0, either = 0;
  const xs = [...urb, ...k.ring].map((p) => p[0]), zs = [...urb, ...k.ring].map((p) => p[1]);
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += 0.05) for (let z = Math.min(...zs); z <= Math.max(...zs); z += 0.05) {
    const a = UP.inRing(urb, x, z), b = UP.inRing(k.ring, x, z); if (a && b) both++; if (a || b) either++;
  }
  check(both / either >= 0.85, `the ${name} kiosk replaces its UrbIS box (footprint overlap / union >= 0.85)`, (both / either).toFixed(3));
}

// ---- 2. budgets
const { readGlb } = await imp("tools/mesh_audit/glb.mjs");
const surf = await readGlb(new URL("models/underpass/calevoet.glb", ROOT).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ins = await readGlb(new URL("models/underpass/calevoet_in.glb", ROOT).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const tris = (parts, node) => parts.filter((p) => p.node === node).reduce((s, p) => s + p.index.length / 3, 0);
const draws = (parts, node) => parts.filter((p) => p.node === node).length;
const T = { lod0: tris(surf.parts, "Underpass_lod0"), lod1: tris(surf.parts, "Underpass_lod1"), lod2: tris(surf.parts, "Underpass_lod2"), throat: tris(surf.parts, "Underpass_throat"),
  inside: tris(ins.parts, "Inside"), collision: tris(surf.parts, "Underpass_collision") };
check(T.lod0 <= B.lod0 && T.lod1 <= B.lod1 && T.lod2 <= B.lod2 && T.throat <= B.throat && T.inside <= B.inside && T.collision <= B.collision && T.collision > 0,
  `triangles within budget (LOD0 ${B.lod0} / LOD1 ${B.lod1} / LOD2 ${B.lod2}, throat ${B.throat}, inside ${B.inside}, collision ${B.collision})`, JSON.stringify(T));
const D = { lod0: draws(surf.parts, "Underpass_lod0"), lod1: draws(surf.parts, "Underpass_lod1"), lod2: draws(surf.parts, "Underpass_lod2"), inside: draws(ins.parts, "Inside") };
check(D.lod0 <= B.drawsSurface && D.lod1 <= B.drawsSurface && D.lod2 <= B.drawsSurface && D.inside <= B.drawsInside, `draws: <= ${B.drawsSurface} a kiosk level (one per slot, both kiosks merged), <= ${B.drawsInside} inside`, JSON.stringify(D));
const slotsOk = surf.parts.filter((p) => p.node !== "Underpass_collision").every((p) => SURF_SLOTS.includes(p.slot)) && ins.parts.every((p) => IN_SLOTS.includes(p.slot));
check(slotsOk, "every primitive in a named slot of the list (no baked colour)", [...new Set([...surf.parts, ...ins.parts].map((p) => p.slot))].join(", "));
const noLight = [surf.json, ins.json].every((j) => !(j.extensionsUsed || []).includes("KHR_lights_punctual") && !(j.nodes || []).some((n) => n.extensions?.KHR_lights_punctual));
check(noLight, "no light in the GLBs (emissive lenses only: rule fixed-light-count)");
const bakes = ins.json.meshes.every((m) => m.primitives.every((p) => p.attributes._LSKY != null && p.attributes._LNIGHT != null));
check(bakes, "the inside carries its two bakes (_LSKY day, _LNIGHT night) on every primitive");
const mb = ["calevoet.glb", "calevoet_in.glb", "calevoet_ao.png", "mural.ktx2"].reduce((s, f) => s + statSync(new URL(`models/underpass/${f}`, ROOT)).size, 0) / 1048576;
check(mb <= B.mb, `download <= ${B.mb} MB (both GLBs, the AO map, the mural KTX2)`, `${mb.toFixed(2)} MB`);

// ---- 3. ground: the worker's cut on tile D6's terrain
const { Heightmap } = await imp("viewer/heightmap.js");
const hdr = J("data/tiles/D6/terrain.json");
const hm = new Heightmap(hdr, readFileSync(new URL("data/tiles/D6/terrain.u16", ROOT)).buffer.slice(0));
const terrain = (() => {     // the tile's 1 m grid over the site (tileData.js terrainArrays: one vertex per cell corner)
  const P = [], N = [], I = [];
  const x0 = -1240, x1 = -1170, z0 = 830, z1 = 900, n = x1 - x0, m = z1 - z0;
  for (let j = 0; j <= m; j++) for (let i = 0; i <= n; i++) { const x = x0 + i, z = z0 + j; P.push(x, hm.surface(x, z), z); N.push(0, 1, 0); }
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i; I.push(a, a + n + 1, a + 1, a + 1, a + n + 1, a + n + 2); }
  return { pos: Float32Array.from(P), nrm: Float32Array.from(N), idx: Uint32Array.from(I) };
})();
const before = { idx: terrain.idx.slice(), pos: terrain.pos.slice() };
const triArea = (P, I) => { let a = 0; for (let t = 0; t < I.length; t += 3) { const [ax, az, bx, bz, cx, cz] = [P[I[t] * 3], P[I[t] * 3 + 2], P[I[t + 1] * 3], P[I[t + 1] * 3 + 2], P[I[t + 2] * 3], P[I[t + 2] * 3 + 2]]; a += Math.abs((bx - ax) * (cz - az) - (cx - ax) * (bz - az)) / 2; } return a; };
const cut = UP.underpassTerrain(notes, terrain);
const wells = UP.wellRings(notes);
const inWell = (x, z) => wells.some((w) => UP.inRing(w.ring, x, z));
const ringArea = wells.reduce((s, w) => { let a = 0; const r = w.ring; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]); return s + Math.abs(a / 2); }, 0);
const lost = triArea(before.pos, before.idx) - triArea(terrain.pos, terrain.idx);
// the triangles that changed: every one gone was in / across a well (centroids of the old triangles that are not kept)
const kept = new Set(); for (let t = 0; t < terrain.idx.length; t += 3) kept.add(`${terrain.idx[t]},${terrain.idx[t + 1]},${terrain.idx[t + 2]}`);
let changedOutside = 0;
for (let t = 0; t < before.idx.length; t += 3) {
  const k = `${before.idx[t]},${before.idx[t + 1]},${before.idx[t + 2]}`;
  if (kept.has(k)) continue;
  const v = [before.idx[t], before.idx[t + 1], before.idx[t + 2]];
  const touches = v.some((q) => inWell(before.pos[q * 3], before.pos[q * 3 + 2])) || wells.some((w) => { const xs = v.map((q) => before.pos[q * 3]), zs = v.map((q) => before.pos[q * 3 + 2]); return Math.max(...xs) > w.box.x0 && Math.min(...xs) < w.box.x1 && Math.max(...zs) > w.box.z0 && Math.min(...zs) < w.box.z1; });
  if (!touches) changedOutside++;
}
let leftInside = 0, farNew = 0;
for (let t = 0; t < terrain.idx.length; t += 3) {
  const c = [0, 2].map((k) => (terrain.pos[terrain.idx[t] * 3 + k] + terrain.pos[terrain.idx[t + 1] * 3 + k] + terrain.pos[terrain.idx[t + 2] * 3 + k]) / 3);
  if (inWell(c[0], c[1])) leftInside++;
}
const nOld = before.pos.length / 3;
for (let v = nOld; v < terrain.pos.length / 3; v++) {
  const x = terrain.pos[v * 3], z = terrain.pos[v * 3 + 2];
  // (on a rim's LINE: a piece outside one edge may end on the next edge's line beyond the corner)
  const lineD = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); return Math.abs((p[0] - a[0]) * dz - (p[1] - a[1]) * dx) / L; };
  const d = Math.min(...wells.map((w) => Math.min(...w.ring.map((a, i) => lineD([x, z], a, w.ring[(i + 1) % w.ring.length])))));
  if (d > 0.02) farNew++;
}
check(changedOutside === 0 && leftInside === 0 && farNew === 0 && cut && cut.dropped > 0 && cut.clipped > 0,
  "ground: terrain triangles dropped / clipped ONLY at the wells (0 outside), nothing left inside, every new vertex within 2 cm of a well's rim line",
  `dropped ${cut?.dropped}, clipped ${cut?.clipped}, new vertices ${cut?.added}; changed outside ${changedOutside}, left inside ${leftInside}, new vertices off the rim ${farNew}`);
check(Math.abs(lost - ringArea) < 0.02 * ringArea, "ground: the area cut = the wells' area (within 2 %)", `${lost.toFixed(2)} m2 vs ${ringArea.toFixed(2)} m2`);
const sDoc = J("data/tiles/D6/surfaces.json");
const sres = UP.underpassSurfaces(sDoc, notes);
check(sres.partial.length === 0 && sres.holes.some((h) => h.well === "west"), "street surfaces: the west well a hole in its sidewalk, no partial overlap", JSON.stringify(sres));
// joins: the kiosks' LOD0 (as placed) against the cut terrain
const th = notes.placement.rotation_y_rad, cs = Math.cos(th), sn = Math.sin(th), [px, py, pz] = notes.placement.city_local_position;
const place = (p) => { const P = new Float64Array(p.positions.length); for (let i = 0; i < P.length; i += 3) { const x = p.positions[i], y = p.positions[i + 1], z = p.positions[i + 2]; P[i] = x * cs + z * sn + px; P[i + 1] = y + py; P[i + 2] = -x * sn + z * cs + pz; } return { ...p, positions: P }; };
const model = surf.parts.filter((p) => p.node === "Underpass_lod0" || p.node === "Underpass_throat").map(place);   // (drawn together; the inside replaces the throat)
const terrPart = { name: "terrain", positions: Float64Array.from(terrain.pos), index: Uint32Array.from(terrain.idx) };
const { auditContact } = await imp("tools/mesh_audit/contact.js");
const rc = auditContact(model, [terrPart], {});
const cnt = (k) => (rc.items || []).filter((x) => x.kind === k).length;
const floating = rc.summary?.floating ?? cnt("floating"), overhang = rc.summary?.overhang ?? cnt("overhang");
check(floating === 0 && overhang === 0, "joins: the kiosks' LOD0 + throat meet the cut terrain (contact.js: 0 floating, 0 overhang)",
  `floating ${floating}, overhang ${overhang}${floating + overhang ? " at (u, h, w) " + JSON.stringify((rc.items || []).filter((x) => x.kind !== "opening").slice(0, 12).map((x) => { const [u, w] = frameOf(x.at[0], x.at[2]); return [x.kind[0], +u.toFixed(2), +x.at[1].toFixed(2), +w.toFixed(2)]; })) : ""}`);

// ---- 4. the walk-through
const { CollisionWorld, Heightfield, Contacts } = await imp("viewer/character/world.js");
const { TriBVH } = await imp("viewer/character/bvh.js");
const { CharacterController } = await imp("viewer/character/controller.js");
const soup = (parts) => { const out = []; for (const p of parts.map(place)) for (let k = 0; k < p.index.length; k++) { const v = p.index[k] * 3; out.push(p.positions[v], p.positions[v + 1], p.positions[v + 2]); } return Float32Array.from(out); };
const modelBVH = new TriBVH(soup(surf.parts.filter((p) => p.node === "Underpass_lod0" || p.node === "Underpass_collision")));
const cw = new CollisionWorld();
const hf = cw.add(new Heightfield((x, z) => hm.surface(x, z)));
hf.voids = UP.underpassVoids(notes);
cw.add(modelBVH);
const lv = notes.levels, corr = notes.voids.find((v) => v.name === "corridor");
const ctl = new CharacterController(cw, {});
const probe = new Contacts(64);
const st = notes.stairs;
const um = { east: (st.east.top_line_uw ? (st.east.top_line_uw[0][0] + st.east.top_line_uw[1][0]) / 2 : st.east.top_uw[0]), west: (st.west.top_line_uw[0][0] + st.west.top_line_uw[1][0]) / 2 };
const wc = (lv.corridor_uw[1][0] + lv.corridor_uw[1][1]) / 2;
const eMouth = st.east.top_uw[1], wMouth = st.west.top_uw[1];
const route = [[um.east, eMouth + 2.2], [um.east, eMouth - 0.4], [um.east, wc + 0.6], [um.east, wc], [um.west, wc], [um.west, wc - 0.6], [um.west, wMouth + 0.4], [um.west, wMouth - 2.2]];
function walk(pts, label) {
  const [sx, sz] = city(...pts[0]);
  ctl.teleport(sx, hm.surface(sx, sz) + 0.3, sz, 0);
  let k = 1, t = 0, maxPen = 0, overSoffit = 0;
  const dt = 1 / 120;
  while (k < pts.length && t < 180) {
    const [tx, tz] = city(...pts[k]);
    const dx = tx - ctl.pos[0], dz = tz - ctl.pos[2], d = Math.hypot(dx, dz);
    if (d < 0.35) { k++; continue; }
    ctl.input.x = dx / d; ctl.input.z = dz / d; ctl.input.run = false;
    ctl.step(dt); t += dt;
    // inside the model? (the capsule against the model's triangles only)
    const r = ctl.p.radius, q = cw.q;
    q[0] = ctl.pos[0]; q[1] = ctl.pos[1] + r; q[2] = ctl.pos[2]; q[3] = ctl.pos[0]; q[4] = ctl.pos[1] + ctl.p.height - r; q[5] = ctl.pos[2]; q[6] = r;
    probe.clear(); modelBVH.capsule(q, probe);
    for (let i = 0; i < probe.n; i++) maxPen = Math.max(maxPen, probe.d[i * 9 + 3]);
    const [u, w] = frameOf(ctl.pos[0], ctl.pos[2]);
    if (UP.inRing(corr.ring, ctl.pos[0], ctl.pos[2]) && ctl.pos[1] < corr.yTop && ctl.pos[1] + ctl.p.height > lv.soffit + 0.02) overSoffit++;
    void u; void w;
  }
  return { reached: k >= pts.length, t: +t.toFixed(1), maxPen: +maxPen.toFixed(3), overSoffit, end: frameOf(ctl.pos[0], ctl.pos[2]).map((v) => +v.toFixed(2)), y: +ctl.pos[1].toFixed(2), label };
}
const ew = walk(route, "east -> west"), we = walk([...route].reverse(), "west -> east");
for (const r of [ew, we]) check(r.reached && r.maxPen <= 0.05 && r.overSoffit === 0, `walk ${r.label}: reaches the far street, never > 5 cm inside the model, never above the corridor's soffit`, JSON.stringify(r));
// on the ground over the corridor (across it, between the tracks): carried by the field, never dropped into the void
const uMid = (lv.corridor_uw[0][0] + lv.corridor_uw[0][1]) / 2;
{
  const [sx, sz] = city(uMid, wc - 5), [tx, tz] = city(uMid, wc + 5);
  ctl.teleport(sx, hm.surface(sx, sz) + 0.05, sz, 0);
  let worst = 0, t = 0;
  while (t < 12) {
    const dx = tx - ctl.pos[0], dz = tz - ctl.pos[2], d = Math.hypot(dx, dz); if (d < 0.3) break;
    ctl.input.x = dx / d; ctl.input.z = dz / d; ctl.step(1 / 120); t += 1 / 120;
    worst = Math.max(worst, Math.abs(ctl.pos[1] - hm.surface(ctl.pos[0], ctl.pos[2])));
  }
  check(worst < 0.2, "a walker on the ground over the corridor stays on the ground (the void stops under it)", `worst ${worst.toFixed(3)} m off the ground`);
}

if (!QUIET || fails.length) console.log(rows.join("\n"));
console.log(fails.length ? `underpass: ${fails.length} check(s) FAILED` : `underpass: all ${rows.length} checks pass`);
process.exit(fails.length ? 1 : 0);
