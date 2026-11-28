// PARK PIECES CHECK (claude/places3, rule park-pieces-real): the real equipment of a named playground, scripted for it
// (models/parkkit/timberkit: tools/blender/timberPlayKit.py, the Chênaie garden's log frames), drawn by
// viewer/playgroundCity.js from data/overrides.json playgrounds.<id> { kit, pieces }.
//   node --import ./tools/road_audit/register.mjs tools/audit/parkPiecesCheck.mjs [--quiet]
//   1. kit      every piece of a timber playground in its kit, three LODs, one draw each, under the triangle ceilings,
//               the mesh checker's 0 blocking on every level, its slots named (and each slot has a look in parkKit.js PG)
//   2. ground   each piece on the walking surface where it stands: the ground under every one of its feet (the collider
//               boxes that reach the ground) within FLOAT m under the piece's origin (its posts go 0.35-0.4 m in: the
//               skirt) and BURY m over it (a sloping sand ring: logs and stumps not sunk)
//   3. colliders every piece has its boxes (kit json colliders), the playground's soup is not empty, the tower and the
//               frame reach the car's band (0.3-1.3 m) and the tower's deck carries the walker (a top >= 1.0 m)
//   4. view     the whole playground at LOD0 (the eye in it) under VIEW_TRIS
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const QUIET = process.argv.includes("--quiet");
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const rows = [];
const check = (name, ok, info = "") => rows.push([name, ok ? "PASS" : "FAIL", info]);

/** ceilings (set 2026-11-24 on the first build: tower 10408 / 2920 / 836, frame 13748 / 5172 / 354, balance 2148 / 584 / 328) */
const CEIL = { lod: [14500, 5600, 1000], viewTris: 30000, float: 0.3, bury: 0.12 };
const SLOTS = ["wood_robinia", "bark", "end_grain", "rope_hemp"];

const ov = J("data/overrides.json");
const { playgroundsOn, pieceColliderTris } = await imp("viewer/playgroundLayout.js");
const params = new URLSearchParams("");
const timber = playgroundsOn(ov, params, false).filter((g) => g.kit === "timberkit");
check("a named playground draws the timber kit (the Chênaie garden)", timber.some((g) => g.id === "chenaie"), timber.map((g) => g.id).join(", ") || "none");
const old = playgroundsOn(ov, params, true).find((g) => g.id === "chenaie");
check("?parkpieces=old draws the plastic stand-ins (piecesOld, the playground kit)", old?.kit === "playgroundkit" && old.pieces.every((p) => p[0].startsWith("pg_")), old ? `${old.kit}: ${old.pieces.map((p) => p[0]).join(", ")}` : "none");

// ---- 1. the kit
const kit = J("models/parkkit/timberkit.json");
{
  const bad = [], used = new Set(timber.flatMap((g) => g.pieces.map((p) => p[0])));
  for (const p of used) {
    const L = kit.lods?.[p]?.lods;
    if (!L || L.length !== 3) { bad.push(`${p}: ${L?.length ?? 0} LODs`); continue; }
    L.forEach((l, k) => { if (l.triangles > CEIL.lod[k]) bad.push(`${p} LOD${k} ${l.triangles} > ${CEIL.lod[k]}`); if (l.draws !== 1) bad.push(`${p} LOD${k} ${l.draws} draws`); });
  }
  const blk = Object.values(kit.audit || {}).reduce((s, a) => s + (a.blocking ?? 0), 0);
  if (!kit.audit) bad.push("no mesh audit in the kit json"); else if (blk) bad.push(`${blk} blocking (mesh checker)`);
  check("kit: three LODs per piece, one draw each, under the ceilings, the mesh checker clean", !bad.length,
    bad.join("; ") || [...used].map((p) => `${p} ${kit.lods[p].lods.map((l) => l.triangles).join(" / ")}`).join(", "));
  const slots = Object.keys(kit.slots || {}), src = fs.readFileSync(path.join(ROOT, "viewer/parkKit.js"), "utf8");
  const missing = SLOTS.filter((q) => !slots.includes(q)), noLook = slots.filter((q) => !new RegExp(`\\b${q}: \\[\\[`).test(src));
  check("kit: named slots (robinia, bark, end grain, hemp rope), each with its look in parkKit.js", !missing.length && !noLook.length, `slots ${slots.join(", ")}${missing.length ? `; missing ${missing}` : ""}${noLook.length ? `; no look ${noLook}` : ""}`);
}

// ---- 2. ground + 3. colliders + 4. view
const { buildTile } = await imp("tools/audit/census/lib_mesh.mjs");
const { Heightmap } = await imp("viewer/heightmap.js");
const manifest = J("data/tiles/manifest.json");
const tileOf = (x, z) => manifest.tiles.find((t) => x >= t.bounds.x[0] && x < t.bounds.x[1] && z >= t.bounds.z[0] && z < t.bounds.z[1])?.name;
const hms = new Map();
const ground = async (x, z) => {
  const T = tileOf(x, z);
  if (!hms.has(T)) { const realLog = console.log; console.log = () => {}; try { const { d } = await buildTile(T); hms.set(T, Heightmap.from(d.hdr, d.y, d.orig)); } finally { console.log = realLog; } }
  return hms.get(T).surface(x, z);
};
for (const g of timber) {
  const groundBad = [], colBad = [];
  let worstFloat = 0, worstBury = 0, nTris = 0, view = 0, feet = 0;
  for (const [piece, x, z, deg] of g.pieces) {
    const yaw = (deg * Math.PI) / 180, y = await ground(x, z), boxes = kit.colliders?.[piece] || [];
    view += kit.lods?.[piece]?.lods?.[0]?.triangles ?? 0;
    if (boxes.length < 3) { colBad.push(`${piece}: ${boxes.length} boxes`); continue; }
    const tris = pieceColliderTris(boxes, x, y, z, yaw);
    nTris += tris.length / 9;
    // the feet: the boxes whose lowest corner is at or under the ground line (Blender z <= 0.05)
    for (const b of boxes) {
      const zLow = b[2] - Math.abs(b[5]) - Math.abs(b[8]) - Math.abs(b[11]);
      if (zLow > 0.05) continue;
      feet++;
      const [fx, , fz] = pieceColliderTris([[b[0], b[1], 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], x, y, z, yaw);
      const gy = await ground(fx, fz), fl = y - gy, bu = gy - y;
      worstFloat = Math.max(worstFloat, fl); worstBury = Math.max(worstBury, bu);
      if (fl > CEIL.float || bu > CEIL.bury) groundBad.push(`${piece} foot at (${fx.toFixed(1)}, ${fz.toFixed(1)}): ground ${(gy - y).toFixed(2)} m from the origin`);
    }
    // the car's band and the walker's deck
    // (a triangle spanning the band: heroColliders.js samples every triangle every 12 cm in 0.3-1.3 m over the drive surface)
    let inBand = false;
    for (let i = 0; i < tris.length && !inBand; i += 9) { const lo = Math.min(tris[i + 1], tris[i + 4], tris[i + 7]) - y, hi = Math.max(tris[i + 1], tris[i + 4], tris[i + 7]) - y; inBand = lo < 1.3 && hi > 0.3; }
    if (piece !== "tl_beam" && !inBand) colBad.push(`${piece}: nothing in the car's band`);
    if (piece === "tl_tower" && !boxes.some((b) => b[2] + Math.abs(b[11]) >= 1.0 && Math.abs(b[3]) > 0.5 && Math.abs(b[7]) > 0.5)) colBad.push("tl_tower: no deck box over 1.0 m");
  }
  check(`${g.id}: every piece on the ground (feet within ${CEIL.float} m under / ${CEIL.bury} m over the origin)`, !groundBad.length && feet > 0,
    groundBad.slice(0, 4).join("; ") || `${feet} feet: under by <= ${worstFloat.toFixed(2)} m, over by <= ${worstBury.toFixed(2)} m`);
  check(`${g.id}: colliders (every piece's boxes, the car's band, the tower's deck)`, !colBad.length && nTris > 0, colBad.join("; ") || `${nTris} collider triangles (root playground-${g.id})`);
  check(`${g.id}: the whole playground at LOD0 under ${CEIL.viewTris} triangles`, view <= CEIL.viewTris, `${view} triangles, ${g.pieces.length} pieces, 1 draw each`);
}

const fails = rows.filter((r) => r[1] === "FAIL");
for (const r of rows) if (!QUIET || r[1] === "FAIL") console.log(`${r[1]}  ${r[0]}  (${r[2]})`);
console.log(`park pieces: ${rows.length - fails.length}/${rows.length} pass`);
process.exit(fails.length ? 1 : 0);
