// ENTERABLE PLACES ARE FINDABLE (claude/villamark, 2026-11-24; rule enterable-places-findable). The villa on Avenue du
// Prince d'Orange had a full interior, but the owner could not find it, and his link ?at=912,2036&view=third put the
// character at Saint-Job. This keeps every place you can walk into findable and reachable:
//
//   node tools/audit/enterableCheck.mjs [--quiet]
//
// D  data/places/enterable.json: every place has id / fr / nl / tile / door / entry / heading / mark / source; ids unique;
//    its tile is the tile under its entry (data/tiles/manifest.json), built
// P  a viewer/places.js entry with enter: <id> (the dev panel's places), its p within 1 m of the entry at street level
//    (h <= 3), its t past the door (the camera looks in)
// M  a map marker: data/map/map.json's landmark named by `landmark` exists (it becomes an 'enter' landmark), else the
//    mark is inside the map's extent; viewer/map/mapData.js merges the file (mergeEnterable) and the map draws the 'enter'
//    glyph (mapStyle.js), at every zoom (mapWorker.js, minimap.js), the search hands it to onEnter (fullMap.js)
// E  the entry spot: outside every building footprint of its tile and the tiles round it by >= 0.75 m (the drawn
//    UrbIS solids, the ones a landmark hides included: the hidden one is replaced by the landmark's own walls), on
//    walkable ground: on a UrbIS street surface (surfaces.json) or <= 6 m off one (a forecourt, a parvis), or a road
//    centreline (roads.json) within 14 m; the
//    terrain slope there under 25 % (terrain.u16)
// F  facing its door: the bearing entry -> door within 20 deg of the heading; the door 2-15 m away, within the prompt's
//    radius (<= 60 m)
// C  the code: ?place resolves the entry (viewer/placeLink.js placeLink), the boot tile is the tile under ?at
//    (bootTile = tileNameAt, checked against every manifest tile), ?at=..&view=third starts AT ?at (main.js thirdPerson(at),
//    not the boot tile's road start: the bug), the Walk in prompt exists (viewer/enterPrompt.js: E / Enter, never in third
//    person) and is started by main.js
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUIET = process.argv.includes("--quiet");
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const text = (p) => readFileSync(join(ROOT, p), "utf8");
let fails = 0;
const fail = (m) => { fails++; console.log("FAIL", m); };
const say = (m) => { if (!QUIET) console.log(m); };

const manifest = json("data/tiles/manifest.json");
const tileOf = (x, z) => manifest.tiles.find((t) => x >= t.bounds.x[0] && x < t.bounds.x[1] && z >= t.bounds.z[0] && z < t.bounds.z[1]);
const inRing = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const ringD = (r, x, z) => { let d = Infinity; for (let i = 0; i < r.length; i++) d = Math.min(d, segD(x, z, r[i], r[(i + 1) % r.length])); return d; };
const bearing = (a, b) => (Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180 / Math.PI + 360) % 360;
const angDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

// ---- D
const file = json("data/places/enterable.json");
const places = file.places || [];
if (!places.length) fail("D data/places/enterable.json: no places");
const ids = new Set();
for (const p of places) {
  for (const k of ["id", "fr", "nl", "tile", "door", "entry", "heading", "mark", "source"]) if (p[k] == null) fail(`D ${p.id ?? "?"}: no ${k}`);
  if (ids.has(p.id)) fail(`D ${p.id}: id twice`); ids.add(p.id);
  const T = p.entry && tileOf(p.entry[0], p.entry[1]);
  if (!T) fail(`D ${p.id}: entry ${p.entry} outside the tiles`);
  else { if (T.name !== p.tile) fail(`D ${p.id}: tile ${p.tile} but the entry is on ${T.name}`); if (T.status === "missing") fail(`D ${p.id}: tile ${T.name} not built`); }
}
say(`ok   D ${places.length} enterable places: ${places.map((p) => p.id).join(", ")}`);

// ---- P
const { PLACES } = await import(pathToFileURL(join(ROOT, "viewer/places.js")).href);
for (const p of places) {
  const pl = PLACES.find((q) => q.enter === p.id);
  if (!pl) { fail(`P ${p.id}: no viewer/places.js entry with enter: "${p.id}"`); continue; }
  const d = Math.hypot(pl.p[0] - p.entry[0], pl.p[2] - p.entry[1]);
  if (d > 1 || pl.p[1] > 3) fail(`P ${p.id}: places "${pl.id}" p is ${d.toFixed(1)} m from the entry / ${pl.p[1]} m up (want <= 1 m, street level)`);
  if (Math.hypot(pl.t[0] - pl.p[0], pl.t[2] - pl.p[2]) < Math.hypot(p.door[0] - pl.p[0], p.door[1] - pl.p[2]) - 0.5) fail(`P ${p.id}: places "${pl.id}" t is short of the door`);
  if (angDiff(bearing([pl.p[0], pl.p[2]], [pl.t[0], pl.t[2]]), p.heading) > 45) fail(`P ${p.id}: places "${pl.id}" looks ${bearing([pl.p[0], pl.p[2]], [pl.t[0], pl.t[2]]).toFixed(0)} deg, the door is at ${p.heading}`);
  say(`ok   P ${p.id}: places "${pl.id}" (${pl.group}) at the entry`);
}

// ---- M
const map = json("data/map/map.json");
const [mx0, mz0, mx1, mz1] = map.extent;
for (const p of places) {
  if (p.landmark) { const lm = map.landmarks.find((l) => l.id === p.landmark); if (!lm) fail(`M ${p.id}: map landmark ${p.landmark} not in data/map/map.json`); else if (Math.hypot(lm.x - p.door[0], lm.z - p.door[1]) > 40) fail(`M ${p.id}: map landmark ${p.landmark} is ${Math.hypot(lm.x - p.door[0], lm.z - p.door[1]).toFixed(0)} m from the door`); }
  if (!(p.mark[0] >= mx0 && p.mark[0] <= mx1 && p.mark[1] >= mz0 && p.mark[1] <= mz1)) fail(`M ${p.id}: mark outside the map's extent`);
  if (Math.hypot(p.mark[0] - p.door[0], p.mark[1] - p.door[1]) > 40) fail(`M ${p.id}: mark ${Math.hypot(p.mark[0] - p.door[0], p.mark[1] - p.door[1]).toFixed(0)} m from the door (want <= 40)`);
}
const { mergeEnterable } = await import(pathToFileURL(join(ROOT, "viewer/map/mapData.js")).href);
const merged = mergeEnterable({ landmarks: map.landmarks.map((l) => ({ ...l })) }, places).landmarks;
for (const p of places) if (!merged.some((l) => l.enter === p.id && l.kind === "enter")) fail(`M ${p.id}: mergeEnterable gives it no 'enter' landmark`);
const MAPTEXT = [
  ["viewer/map/mapData.js", "loadMap fetches ../places/enterable.json and merges it", (s) => /\.\.\/places\/enterable\.json/.test(s) && /mergeEnterable\(doc/.test(s)],
  ["viewer/map/mapStyle.js", "an 'enter' glyph (a door) and colour", (s) => /kind === 'enter'/.test(s) && /enter: '#/.test(s)],
  ["viewer/map/mapWorker.js", "the full map draws 'enter' at every zoom, labelled", (s) => (s.match(/lm\.kind !== 'enter'|kind === 'enter'/g) || []).length >= 2],
  ["viewer/map/minimap.js", "the minimap draws 'enter' at every zoom", (s) => /lm\.kind !== 'enter'/.test(s)],
  ["viewer/map/fullMap.js", "a search result you can walk into goes inside (onEnter)", (s) => /it\.enter && this\.opts\.onEnter/.test(s)],
  ["viewer/map/cityMap.js", "the city map passes onEnter on", (s) => /onEnter: enter/.test(s)],
];
for (const [f, what, test] of MAPTEXT) if (!test(text(f))) fail(`M ${f}: ${what}`);
say(`ok   M ${merged.filter((l) => l.kind === "enter").length} 'enter' map markers`);

// ---- E
const tileJSON = new Map();
const tj = (T, f) => { const k = `${T}/${f}`; if (!tileJSON.has(k)) tileJSON.set(k, existsSync(join(ROOT, `data/tiles/${T}/${f}`)) ? json(`data/tiles/${T}/${f}`) : null); return tileJSON.get(k); };
const around = (x, z, r) => manifest.tiles.filter((t) => t.status !== "missing" && t.bounds.x[0] - r <= x && x <= t.bounds.x[1] + r && t.bounds.z[0] - r <= z && z <= t.bounds.z[1] + r).map((t) => t.name);
for (const p of places) {
  const [x, z] = p.entry;
  const near = around(x, z, 30);
  let inside = null, dMin = Infinity;
  for (const T of near) for (const b of tj(T, "buildings.json")?.buildings ?? []) {
    const ring = b.footprint[0];
    if (inRing(ring, x, z)) inside = b.id;
    dMin = Math.min(dMin, ringD(ring, x, z));
  }
  if (!tj(p.tile, "buildings.json")) fail(`E ${p.id}: data/tiles/${p.tile}/buildings.json missing (build the tile)`);
  if (inside) fail(`E ${p.id}: the entry is inside building ${inside}`);
  else if (dMin < 0.75) fail(`E ${p.id}: the entry is ${dMin.toFixed(2)} m from a building wall (want >= 0.75)`);
  let road = Infinity;
  for (const T of near) {
    const R = tj(T, "roads.json"); if (!R) continue;
    const nodes = new Map(R.nodes.map((n) => [n.id, n]));
    for (const r of R.roads) {
      const pts = [nodes.get(r.a), ...r.pts, nodes.get(r.b)].filter(Boolean).map((q) => [q.x, q.z]);
      for (let k = 1; k < pts.length; k++) road = Math.min(road, segD(x, z, pts[k - 1], pts[k]));
    }
  }
  // (the UrbIS street surfaces: carriageway, sidewalk, island, crossing ...: data/tiles/<T>/surfaces.json)
  // on one, or a forecourt / parvis / front path off one (<= 6 m from its edge)
  let surf = null, surfD = Infinity;
  for (const T of near) for (const f of tj(T, "surfaces.json")?.surfaces ?? []) {
    if (!f.rings?.[0]) continue;
    const d = inRing(f.rings[0], x, z) && !f.rings.slice(1).some((h) => inRing(h, x, z)) ? 0 : ringD(f.rings[0], x, z);
    if (d < surfD) { surfD = d; surf = `${f.type}${f.name ? ` (${f.name})` : ""}`; }
  }
  if (surfD > 6 && road > 14) fail(`E ${p.id}: ${surfD.toFixed(1)} m from the nearest street surface and ${road.toFixed(1)} m from a road centreline (want on / <= 6 m off a surface, or <= 14 m from a road)`);
  const ter = tj(p.tile, "terrain.json");
  let slope = null;
  if (ter?.cols && ter.step && existsSync(join(ROOT, `data/tiles/${p.tile}/terrain.u16`))) {
    const buf = readFileSync(join(ROOT, `data/tiles/${p.tile}/terrain.u16`));
    const H = new Uint16Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    const h = (i, j) => H[Math.max(0, Math.min(ter.rows - 1, j)) * ter.cols + Math.max(0, Math.min(ter.cols - 1, i))] / 100;   // (u16le-cm)
    const i = Math.round((x - ter.x0) / ter.step), j = Math.round((z - ter.z0) / ter.step);
    slope = Math.hypot(h(i + 1, j) - h(i - 1, j), h(i, j + 1) - h(i, j - 1)) / (2 * ter.step);
    if (slope > 0.25) fail(`E ${p.id}: the terrain slope at the entry is ${(slope * 100).toFixed(0)} %`);
  } else fail(`E ${p.id}: no terrain for tile ${p.tile}`);
  say(`ok   E ${p.id}: entry ${x}, ${z}: ${dMin.toFixed(1)} m from the nearest wall, ${surfD === 0 ? "on" : `${surfD.toFixed(1)} m off`} ${surf ?? "no street surface"}, road centreline ${road.toFixed(1)} m${slope != null ? `, slope ${(slope * 100).toFixed(0)} %` : ""}`);
}

// ---- F
for (const p of places) {
  const d = Math.hypot(p.door[0] - p.entry[0], p.door[1] - p.entry[1]), b = bearing(p.entry, p.door);
  if (angDiff(b, p.heading) > 20) fail(`F ${p.id}: heading ${p.heading} deg, the door is at ${b.toFixed(1)} deg from the entry`);
  if (d < 2 || d > 15) fail(`F ${p.id}: the door is ${d.toFixed(1)} m from the entry (want 2-15)`);
  if ((p.radius ?? 40) > 60 || (p.radius ?? 40) < d + 5) fail(`F ${p.id}: radius ${p.radius} (want entry distance + 5 .. 60)`);
  say(`ok   F ${p.id}: faces the door (${b.toFixed(1)} vs ${p.heading} deg), ${d.toFixed(1)} m`);
}

// ---- C
const PL = await import(pathToFileURL(join(ROOT, "viewer/placeLink.js")).href);
let bad = 0;
for (const t of manifest.tiles) if (PL.tileNameAt((t.bounds.x[0] + t.bounds.x[1]) / 2, (t.bounds.z[0] + t.bounds.z[1]) / 2) !== t.name) bad++;
if (bad) fail(`C placeLink.js tileNameAt: ${bad} manifest tiles named wrong`);
const P = (q) => new URLSearchParams(q);
if (PL.bootTile(P("at=912,2036&view=third")).name !== "H9") fail("C bootTile(?at=912,2036) is not H9 (the owner's link booted Saint-Job)");
if (PL.bootTile(P("at=912,2036&attile=old")).name !== "I6") fail("C bootTile ?attile=old is not I6");
if (PL.bootTile(P("tile=D5&at=912,2036")).name !== "D5") fail("C bootTile: an explicit ?tile must win");
const b0 = PL.atBearing(P("heading=90"), 0, 0), b1 = PL.atBearing(P("look=10,0"), 0, 0);
if (Math.abs(b0 - Math.PI / 2) > 1e-9 || Math.abs(b1 - Math.PI / 2) > 1e-9) fail(`C atBearing: heading=90 / look east must be pi/2 (${b0}, ${b1})`);
globalThis.fetch = async (u) => ({ ok: true, json: async () => file, url: String(u) });
for (const p of places) {
  const q = P(`place=${p.id}`);
  await PL.placeLink(q);
  const at = q.get("at")?.split(",").map(Number);
  if (!at || Math.hypot(at[0] - p.entry[0], at[1] - p.entry[1]) > 0.01 || q.get("view") !== "third" || +q.get("heading") !== p.heading) fail(`C ?place=${p.id}: resolves to at=${q.get("at")} view=${q.get("view")} heading=${q.get("heading")}`);
  if (PL.bootTile(q).name !== p.tile) fail(`C ?place=${p.id}: boots tile ${PL.bootTile(q).name}, not ${p.tile}`);
}
const main = text("viewer/main.js"), prompt = text("viewer/enterPrompt.js");
const CODE = [
  ["viewer/main.js", "?place resolved first (placeLink) and the boot tile from bootTile", main, (s) => /const PLACE = await placeLink\(params\)/.test(s) && /const BOOT_TILE = bootTile\(params\)/.test(s)],
  ["viewer/main.js", "?at=..&view=third starts third person AT ?at (thirdPerson(at)), not at the boot tile's road start", main, (s) => /if \(v0 === "third"\) thirdPerson\(AT0 && params\.get\("atthird"\) !== "old" \? \{ x: AT0\[0\], z: AT0\[1\]/.test(s) && /const thirdPerson = async \(at = null\)/.test(s) && /start: st, setView/.test(s)],
  ["viewer/main.js", "an ?at outside the loaded tiles streams it in (teleport mode third)", main, (s) => /pendingThirdAt = o/.test(s) && /teleportFn = teleport/.test(s)],
  ["viewer/main.js", "the teleport into third person works before it was ever started", main, (s) => /if \(!third\) await thirdPerson\(\{ x, z, bearing: b \}\)/.test(s)],
  ["viewer/main.js", "the Walk in prompt started (startEnterPrompt) and the map's onEnter", main, (s) => /startEnterPrompt\(\{/.test(s) && /enter: \(id\) => window\.__enterPlace\(id\)/.test(s)],
  ["viewer/enterPrompt.js", "the prompt: never in third person, E on foot / vehicles, Enter in orbit / falcon, checked 4x a second", prompt, (s) => /P\.mode !== "third"/.test(s) && /orbit \|\| P\.mode === "fly" \? "Enter" : "KeyE"/.test(s) && /setInterval\(check, 250\)/.test(s)],
];
for (const [f, what, s, test] of CODE) if (!test(s)) fail(`C ${f}: ${what}`);
say(`ok   C boot tile under ?at, ?place links, third person at ?at, the prompt`);

console.log(fails ? `enterable: ${fails} FAIL` : `enterable: OK (${places.length} places)`);
process.exit(fails ? 1 : 0);
