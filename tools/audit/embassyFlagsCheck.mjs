// GATE: THE EMBASSY FLAGS (TODO 4b, rule docs/rules/embassy-flags.md)
//   1. data/places/embassy_flags.json: every OSM diplomatic place of the commune (data/raw/osm/diplomatic.json, when the
//      raw pull is there) has a record; every record's check is yes / no / unseen; a "yes" has where, count, designs,
//      seen and its mounts (count = mounts); a residence ("residence" in its name / kind) is "yes" only with a note
//      saying what was seen;
//   2. one pole per mount of a "yes" place and no other: no pole on a place recorded "no" or "unseen" (nor on a place
//      gone from the file); every pole's design is a place's design;
//   3. every design flown is a viewer/flags/flagDesigns.js key with a source (FLAG_SOURCES: a public-domain origin and
//      the construction it follows); every FLAG_DESIGNS key has one;
//   4. no pole floating or in a wall: viewer/embassyFlags.js poleGeometry on a tilted, bumpy test ground: the footing's
//      top over the highest ground under it, its foot under the lowest, the pole's foot on the footing's top; a free
//      pole outside every footprint and >= 0.5 m from walls; nearer than the cloth's reach (1.7 m) only with that
//      wall's half-space (p.wall: its cloth kept clear); a bracket's wall point <= 0.35 m from its building's wall line;
//   5. the cost: LIVE_MAX <= 6, LIVE_RADIUS <= 45 m, HIDE_DIST <= 700 m, the live pool built once at start (no LiveFlag
//      made in the per-frame updater), one baked set for all the free poles (+ one per bracket), no light, no
//      DynamicDrawUsage; the switch ?embassyflags=0 is a features.js row and main.js reads it.
//   6. against the drawn city (each pole's tile built as the city builds it, tools/embassy/clearance.mjs): the pole's
//      axis meets no drawn triangle; the flag's swing (16 directions at 3 heights, as long as its fly; a wall's
//      half-space excluded) meets nothing;
//   node --import ./tools/christmas/hook.mjs --import ./tools/road_audit/register.mjs tools/audit/embassyFlagsCheck.mjs
//        [--quiet] [--no-build (skip 6)]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const quiet = process.argv.includes("--quiet");
const rows = [];
const check = (name, ok, info = "") => { rows.push([name, ok ? "PASS" : "FAIL", info]); return ok; };
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[\s;,){}])\/\/[^\n]*/g, "$1");

const doc = JSON.parse(read("data/places/embassy_flags.json"));
const places = doc.places ?? [], poles = doc.poles ?? [];
const byOsm = new Map(places.map((p) => [p.osm, p]));

// ---- 1. the records
const { communePlaces, tileBuildings, pip, streetSurfaceAt } = await import("../embassy/geo.mjs");
if (fs.existsSync(path.join(ROOT, "data/raw/osm/diplomatic.json"))) {
  const osm = communePlaces().places, missing = osm.filter((q) => !byOsm.has(q.osm));
  check("1. every OSM diplomatic place of the commune has a record", !missing.length, `${osm.length} in OSM, ${places.length} records${missing.length ? `; missing ${missing.map((q) => q.osm).join(", ")}` : ""}`);
} else check("1. (data/raw/osm/diplomatic.json not here: the record count only)", places.length > 0, `${places.length} records`);
const badRec = [];
for (const p of places) {
  const c = p.check ?? {};
  if (!["yes", "no", "unseen"].includes(c.flag)) { badRec.push(`${p.osm}: flag ${c.flag}`); continue; }
  if (c.flag === "yes") {
    if (!c.where || !Number.isInteger(c.count) || c.count < 1 || !c.designs?.length || !c.seen) badRec.push(`${p.osm}: a yes needs where / count / designs / seen`);
    if ((c.mounts ?? []).length !== c.count) badRec.push(`${p.osm}: count ${c.count} but ${(c.mounts ?? []).length} mounts`);
    if (/residen/i.test(`${p.name} ${p.kind}`) && !(c.note ?? "").length) badRec.push(`${p.osm}: a residence flying a flag needs the note of what was seen`);
  }
  if (c.flag === "no" && !c.seen) badRec.push(`${p.osm}: a no needs seen (when / what was looked at)`);
}
check("1. every record: yes / no / unseen; a yes has where, count = mounts, designs, seen", !badRec.length, badRec.slice(0, 6).join("; ") || `${places.filter((p) => p.check?.flag === "yes").length} yes, ${places.filter((p) => p.check?.flag === "no").length} no, ${places.filter((p) => p.check?.flag === "unseen").length} unseen`);

// ---- 2. one pole per real mount
const want = new Map();
for (const p of places) if (p.check?.flag === "yes") (p.check.mounts ?? []).forEach((m, k) => want.set(`${p.osm}#${k}`, m));
const stray = poles.filter((q) => !want.has(q.id) || byOsm.get(q.place)?.check?.flag !== "yes");
const missingPole = [...want.keys()].filter((id) => !poles.some((q) => q.id === id));
const ids = poles.map((q) => q.id), dup = ids.filter((x, i) => ids.indexOf(x) !== i);
check("2. one pole per mount of a 'yes' place, none on a 'no' / 'unseen' place", !stray.length && !missingPole.length && !dup.length,
  `${poles.length} pole(s) for ${want.size} mount(s)${stray.length ? `; stray ${stray.map((q) => q.id).join(", ")}` : ""}${missingPole.length ? `; missing ${missingPole.join(", ")}` : ""}${dup.length ? `; twice ${dup.join(", ")}` : ""}`);
const badDesign = poles.filter((q) => !byOsm.get(q.place)?.check?.designs?.includes(q.design) || want.get(q.id)?.design !== q.design);
check("2. every pole flies its place's recorded design", !badDesign.length, badDesign.map((q) => `${q.id} ${q.design}`).join(", "));

// ---- 3. the designs and their sources
const { FLAG_DESIGNS, FLAG_SOURCES } = await import("../../viewer/flags/flagDesigns.js");
const flown = [...new Set(poles.map((q) => q.design))];
const noKey = flown.filter((k) => !FLAG_DESIGNS[k]);
check("3. every design flown is a flagDesigns.js key", !noKey.length, noKey.join(", ") || flown.join(", "));
const noSrc = Object.keys(FLAG_DESIGNS).filter((k) => k !== "test" && !(FLAG_SOURCES?.[k]?.source && FLAG_SOURCES[k].licence));
check("3. every design has a source + licence (FLAG_SOURCES)", !noSrc.length, noSrc.join(", ") || `${Object.keys(FLAG_SOURCES ?? {}).length} sources`);

// ---- 4. no pole floating, none in a wall
const { poleGeometry } = await import("../../viewer/embassyFlags.js");
const ground = (x, z) => 60 + 0.08 * x - 0.05 * z + 0.15 * Math.sin(x * 3.1) * Math.cos(z * 2.3);
const float = [];
for (const q of poles) {
  const B = { pos: [], nrm: [], col: [], idx: [] }, g = poleGeometry(B, { ...q, x: 0.37, z: -0.21 }, ground);
  if (q.type === "bracket") { if (!(g.tip[1] > g.base[1] + 0.5)) float.push(`${q.id}: bracket not rising`); continue; }
  const r = 0.2, gs = [];
  for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) gs.push(ground(0.37 - r + (2 * r * i) / 8, -0.21 - r + (2 * r * j) / 8));
  const hi = Math.max(...gs), lo = Math.min(...gs);
  if (!(g.footTop >= hi - 0.01 && g.footTop - hi < 0.12)) float.push(`${q.id}: footing top ${(g.footTop - hi).toFixed(3)} m over the highest ground`);
  if (!(g.footLow <= lo - 0.2)) float.push(`${q.id}: footing foot only ${(lo - g.footLow).toFixed(3)} m under the lowest ground`);
  if (Math.abs(g.base[1] - g.footTop) > 1e-6) float.push(`${q.id}: pole foot off the footing`);
}
check("4. every pole on a buried footing, its foot on the footing (joins rule; a bumpy test ground)", !float.length, float.join("; ") || `${poles.length} pole(s)`);
const wall = [];
for (const q of poles) {
  const B = tileBuildings(q.tile);
  let d = Infinity, inside = false, owner = null;
  for (const b of B) {
    if (pip(q.x, q.z, b.ring)) inside = true;
    const r = b.ring;
    for (let i = 0; i < r.length; i++) {
      const [ax, az] = r[i], [bx, bz] = r[(i + 1) % r.length], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((q.x - ax) * dx + (q.z - az) * dz) / L2)), e = Math.hypot(q.x - ax - dx * t, q.z - az - dz * t);
      if (e < d) { d = e; owner = b; }
    }
  }
  const st = q.type === "bracket" ? null : streetSurfaceAt(q.tile, q.x, q.z);
  if (st) wall.push(`${q.id}: free pole on the public street (UrbIS ${st.type === "SW" ? "sidewalk" : st.type === "S" ? "carriageway" : "island"} ${st.name ?? st.id})`);
  if (q.type === "bracket") { if (d > 0.35) wall.push(`${q.id}: bracket ${d.toFixed(2)} m off the wall`); }
  else if (inside || d < 0.5) wall.push(`${q.id}: free pole ${inside ? "inside a footprint" : `${d.toFixed(2)} m from a wall`}`);
  else if (d < 1.7 && !(q.wall && q.wall.d <= d + 0.05)) wall.push(`${q.id}: free pole ${d.toFixed(2)} m from a wall with no wall half-space for its cloth`);
  else if (q.wall && !(q.wall.d >= 0.3 && q.wall.d <= d + 0.05)) wall.push(`${q.id}: its wall half-space ${q.wall.d} m off (the wall is ${d.toFixed(2)} m away)`);
}
check("4. free poles off the public street (UrbIS carriageway / sidewalk / island), outside every footprint, >= 0.5 m from walls, within the cloth's reach (1.7 m) only with the wall's half-space; brackets on their wall (<= 0.35 m)", !wall.length, wall.join("; ") || `${poles.filter((q) => q.wall).length} pole(s) near a wall flown clear of it`);

// ---- 6. against the drawn city (tools/embassy/clearance.mjs: each pole's tile built as the city builds it)
if (!process.argv.includes("--no-build")) {
  const { clearance } = await import("../embassy/clearance.mjs");
  const r = await clearance(), badP = Object.entries(r).filter(([, v]) => v.pole), badC = Object.entries(r).filter(([, v]) => v.cloth);
  check("6. every pole's axis clear of the drawn walls / details / roofs", !badP.length, badP.map(([id, v]) => `${id}: ${v.pole}`).join("; ") || `${Object.keys(r).length} pole(s) on ${new Set(Object.values(r).map((v) => v.tile)).size} tile(s)`);
  check("6. every flag's swing (16 directions x 3 heights, the fly + 10 cm; not into its wall's half-space) clear of the drawn city", !badC.length, badC.map(([id, v]) => `${id}: ${v.cloth}`).join("; ") || "clear");
}

// ---- 5. the cost
const src = read("viewer/embassyFlags.js"), code = strip(src);
const num = (k) => +(new RegExp(`\\b${k} = (\\d+(?:\\.\\d+)?)`).exec(code)?.[1] ?? NaN);
check("5. LIVE_MAX <= 6, LIVE_RADIUS <= 45 m, HIDE_DIST <= 700 m", num("LIVE_MAX") <= 6 && num("LIVE_RADIUS") <= 45 && num("HIDE_DIST") <= 700, `LIVE_MAX ${num("LIVE_MAX")}, LIVE_RADIUS ${num("LIVE_RADIUS")}, HIDE_DIST ${num("HIDE_DIST")}`);
const upd = code.slice(code.indexOf("updaters.push("), code.indexOf("const r = { flags, sets"));
check("5. the live pool is built at start: no LiveFlag / BakedFlags / material made per frame", upd.length > 100 && !/new (LiveFlag|BakedFlags|THREE\.)|clothMaterial\(|liveOf\(/.test(upd), `updater ${upd.length} chars`);
check("5. the live flags are only the nearest LIVE_MAX (r < LIVE_MAX in the pick)", /r < LIVE_MAX/.test(upd) && /Math\.min\(LIVE_MAX, free\.length\)/.test(code));
check("5. one baked set for every free pole (one draw), one per bracket", (code.match(/BakedFlags\.create\(/g) ?? []).length === 2 && /capacity: free\.length/.test(code) && /capacity: 1/.test(code));
check("5. no light, no DynamicDrawUsage (embassyFlags.js, flagAtlas.js, flagField.js)", ["viewer/embassyFlags.js", "viewer/flags/flagAtlas.js", "viewer/flags/flagField.js"].every((f) => !/DynamicDrawUsage|new THREE\.\w*Light\(/.test(strip(read(f)))));
check("5. ?embassyflags=0 is a features.js row, main.js reads it", /on\("embassyflags"/.test(read("viewer/features.js")) && /params\.get\("embassyflags"\) !== "0"/.test(read("viewer/main.js")));

const fails = rows.filter((r) => r[1] === "FAIL");
if (!quiet || fails.length) for (const [n, r, i] of rows) console.log(`${r}  ${n}${i ? `  (${i})` : ""}`);
console.log(`embassyflags: ${rows.length - fails.length}/${rows.length} PASS`);
process.exit(fails.length ? 1 : 0);
