// THE EMBASSY FLAG POLES (TODO 4b, rule docs/rules/embassy-flags.md): data/places/embassy_flags.json
//   places[]: one per OSM diplomatic place in the commune (pipeline/fetch_diplomatic.py -> data/raw/osm/diplomatic.json),
//     kept in sync here (a new OSM place comes in "unseen"; a place gone from OSM is kept with osm_gone: true);
//     `check` is written by hand from a look at street-level imagery (look only: never stored / traced):
//       { flag: "yes" | "no" | "unseen", where, count, designs: [flagDesigns.js key], seen, note,
//         mounts: [{ type: "pole" | "bracket", design, along, out?, y?, h?, colour? }] }
//     a mount is placed from the building's drawn street face (tools/gardens/faces.mjs: the face the city's façade
//     code draws, the door face first): `along` m along it from the door (+ = to the right seen from the street),
//     a pole `out` m in front of the wall, a bracket on the wall `y` m above the ground; `at: [x, z]` overrides;
//   poles[]: written here, one per mount of a "yes" place: { id, place, tile, type, design, x, z, n?, y?, h?, colour? }.
//   node tools/embassy/places.mjs [--check]   (--check: report only, write nothing)
import fs from "node:fs";
import path from "node:path";
import { ROOT, communePlaces, tileBuildings, pip, tileOf } from "./geo.mjs";
import { tileFaces } from "../gardens/faces.mjs";

const FILE = path.join(ROOT, "data/places/embassy_flags.json");
const onlyCheck = process.argv.includes("--check");
const doc = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : { places: [], poles: [] };
const byOsm = new Map(doc.places.map((p) => [p.osm, p]));

// ---- 1. the places, in sync with OSM (when the raw pull is there)
let osmBase = doc.osm_base ?? null;
if (fs.existsSync(path.join(ROOT, "data/raw/osm/diplomatic.json"))) {
  const { places, osmBase: ob } = communePlaces();
  osmBase = ob;
  const seen = new Set();
  for (const q of places) {
    seen.add(q.osm);
    const p = byOsm.get(q.osm) ?? { osm: q.osm, check: { flag: "unseen" } };
    Object.assign(p, { country: q.country, kind: q.kind, name: q.name, x: +q.x.toFixed(2), z: +q.z.toFixed(2), tile: q.tile });
    delete p.osm_gone;
    byOsm.set(q.osm, p);
  }
  for (const [k, p] of byOsm) if (!seen.has(k)) p.osm_gone = true;
}
const order = ["check", "osm", "country", "kind", "name", "tile", "x", "z"];
const places = [...byOsm.values()].sort((a, b) => a.tile.localeCompare(b.tile) || a.osm.localeCompare(b.osm))
  .map((p) => Object.fromEntries([...order.slice(1), "osm_gone", "check"].filter((k) => p[k] !== undefined).map((k) => [k, p[k]])));

// ---- 2. the poles of the "yes" places
const faceCache = new Map(), bldCache = new Map();
const faces = (t) => { if (!faceCache.has(t)) faceCache.set(t, tileFaces(t)); return faceCache.get(t); };
const blds = (t) => { if (!bldCache.has(t)) bldCache.set(t, tileBuildings(t)); return bldCache.get(t); };
/** the building of a place: the footprint holding its point, else the nearest (OSM nodes sit on the address) */
function buildingOf(p) {
  const B = blds(p.tile);
  let b = B.find((q) => pip(p.x, p.z, q.ring)), dist = 0;
  if (!b) { let bd = Infinity; for (const q of B) for (const [x, z] of q.ring) { const d = Math.hypot(x - p.x, z - p.z); if (d < bd) { bd = d; b = q; } } dist = bd; }
  return { b, dist };
}
/** the distance from (x, z) to the nearest building wall of the tile (and its neighbours' when near an edge) */
export function wallDistance(tile, x, z) {
  let best = Infinity, inside = false, n = [0, 0];
  for (const b of blds(tile)) {
    if (pip(x, z, b.ring)) inside = true;
    const r = b.ring;
    for (let i = 0; i < r.length; i++) {
      const [ax, az] = r[i], [bx, bz] = r[(i + 1) % r.length], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      const ex = x - ax - dx * t, ez = z - az - dz * t, e = Math.hypot(ex, ez);
      if (e < best) { best = e; n = [ex / (e || 1), ez / (e || 1)]; }          // from the wall towards the point
    }
  }
  return { d: best, inside, n };
}
const poles = [], problems = [];
for (const p of places) {
  const c = p.check ?? {};
  if (c.flag !== "yes") continue;
  const mounts = c.mounts ?? [];
  if (!mounts.length) { problems.push(`${p.osm}: flag yes but no mount`); continue; }
  const { b } = buildingOf(p);
  const F = faces(p.tile).filter((f) => f.bu === b.bu && f.street);
  // the face: the door face (or the widest street face); c.face_n [nx, nz]: the building's face (street or not) whose
  // normal is nearest that direction (a corner house whose flag stands on its other street)
  const all = faces(p.tile).filter((f) => f.bu === b.bu && f.width >= 2);
  const dotN = (f, fn) => f.nx * fn[0] + f.nz * fn[1];
  const out = (f, fn) => ((f.a[0] + f.b[0]) / 2) * fn[0] + ((f.a[1] + f.b[1]) / 2) * fn[1];      // the outermost wall that way
  const byN = (fn) => all.filter((f) => dotN(f, fn) >= 0.9 && f.width >= 4).sort((u, v) => out(v, fn) - out(u, fn) || v.width - u.width)[0] ?? all.slice().sort((u, v) => dotN(v, fn) - dotN(u, fn))[0];
  const face0 = c.face_n ? byN(c.face_n) : F.find((f) => f.doorFace) ?? F.sort((u, v) => v.width - u.width)[0];
  mounts.forEach((m, k) => {
    const face = m.face_n ? byN(m.face_n) : face0;
    const id = `${p.osm}#${k}`;
    let x, z, n = null;
    if (face) {
      const tx = (face.b[0] - face.a[0]) / face.width, tz = (face.b[1] - face.a[1]) / face.width;
      // the door (or the face's middle); "right seen from the street" = the face's own tangent turned to face the viewer
      const rx = face.nz, rz = -face.nx;                           // right as seen from outside: (-n) x up = (n.z, -n.x)
      const sgn = rx * tx + rz * tz >= 0 ? 1 : -1;
      // from the door (or the face's middle), or from the face's left / right end as seen from the street (m.end)
      const left = sgn > 0 ? face.a : face.b, right = sgn > 0 ? face.b : face.a;
      const d0 = m.end === "left" ? left : m.end === "right" ? right : face.door && !m.mid ? [face.door.x, face.door.z] : [(face.a[0] + face.b[0]) / 2, (face.a[1] + face.b[1]) / 2];
      const out = m.type === "bracket" ? 0 : (m.out ?? 3);
      x = d0[0] + tx * sgn * (m.along ?? 0) + face.nx * out; z = d0[1] + tz * sgn * (m.along ?? 0) + face.nz * out;
      n = [face.nx, face.nz];
    }
    if (m.at) [x, z] = m.at;
    if (m.n) n = m.n;
    if (x == null) { problems.push(`${id}: no street face and no at`); return; }
    const pole = { id, place: p.osm, tile: tileOf(x, z), type: m.type ?? "pole", design: m.design, x: +x.toFixed(2), z: +z.toFixed(2) };
    if (pole.type === "bracket") {
      Object.assign(pole, { n: n.map((v) => +v.toFixed(4)), y: m.y ?? 3.2 });
      if (m.tilt) pole.tilt = m.tilt;
      if (m.splay) pole.splay = m.splay;                              // degrees, + = to the right seen from the street
      if (m.splay) pole.t = [n[1], -n[0]].map((v) => +v.toFixed(4));  // (the right as seen from outside)
    } else if (m.h) pole.h = m.h;
    if (m.colour) pole.colour = m.colour;
    const w = wallDistance(p.tile, x, z);
    pole.wall_m = +w.d.toFixed(2);
    // a free pole within the cloth's reach of a wall flies its flag clear of that wall (a half-space, its own loop)
    if (pole.type !== "bracket" && !w.inside && w.d < 1.7) pole.wall = { n: w.n.map((v) => +v.toFixed(4)), d: +w.d.toFixed(2) };
    if (pole.type !== "bracket" && (w.inside || w.d < 0.5)) problems.push(`${id}: free pole ${w.inside ? "INSIDE a building" : `${w.d.toFixed(2)} m from a wall (< 0.5)`}`);
    poles.push(pole);
  });
}

const out = { _doc: "Embassy flags (TODO 4b, rule docs/rules/embassy-flags.md). places: the OSM diplomatic places of the commune (pipeline/fetch_diplomatic.py), check = a look at street-level imagery (look only, never stored or traced); poles: written by tools/embassy/places.mjs from the 'yes' places' mounts. Only a real flag gets one.",
  osm_base: osmBase, places, poles };
const yes = places.filter((p) => p.check?.flag === "yes").length, no = places.filter((p) => p.check?.flag === "no").length;
console.log(`${places.length} place(s): ${yes} fly a flag, ${no} no, ${places.length - yes - no} unseen; ${poles.length} pole(s)`);
for (const q of problems) console.log("  PROBLEM " + q);
if (!onlyCheck) { fs.writeFileSync(FILE, JSON.stringify(out, null, 1) + "\n"); console.log(`-> ${path.relative(ROOT, FILE)}`); }
process.exit(problems.length ? 1 : 0);
