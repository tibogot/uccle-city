// GATE: CLASS T, THE RAIL CORRIDOR'S RULES (claude/rail 2026-11-19, rule 39, docs/RAIL_T.md), the fast unit part. The
// city-wide census is tools/audit/census/railCorridor.mjs (+ streetProps.mjs onRail / inHero).
//   1. the track bed in the drive surface under a ROAD bridge too (railData.js railDriveSurface: only the rail bridges'
//      footprints are left out): a synthetic grid with a track under a hero road bridge's footprint
//   2. the fences: posts every POST_STEP m, seated on the ground; each bay's top rail straight between its posts; no step
//      at a post; the panel's foot in the ground; the car's walls = the drawn panels (base = the drawn foot, top = the
//      drawn top, one per bay) on a synthetic bumpy slope
//   3. the fences break at a LEVEL crossing only: a road crossing over the line (its ground 7 m over the rails both sides)
//      and a street running beside it leave the fence closed; a level crossing opens it for the road's width
//   4. no prop on a track bed (streets/carriageway.js offLane + railData.js railBed): a point on the bed moves off it, a
//      point on a road deck over the line stays, a point inside a hero road bridge is dropped (its model draws it)
//   5. a hero's car colliders exist exactly while it is drawn (heroColliders.js HERO_SHOWN): hidden, the set leaves the
//      driver; shown again, the same set comes back
//   6. a pole (mast, signal, stop pole) collides over its drawn height only (driveMode.js featureColliders)
// --old: every check against ?rail=old (must FAIL: the gate's own test).
//   node --import ./tools/characters/threeHook.mjs --import ./tools/road_audit/register.mjs --import ./tools/heap/register.mjs tools/audit/railTCheck.mjs [--quiet] [--old]
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet"), OLD = process.argv.includes("--old");
globalThis.location ??= { search: OLD ? "?rail=old" : "" };
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const rows = [];
const check = (name, ok, info = "") => rows.push([name, ok ? "PASS" : "FAIL", info]);

const R = await imp("viewer/rail/railData.js");
const { offLane, docOffLanes } = await imp("viewer/streets/carriageway.js");

// ---- a synthetic line: one track along +x at z = 0, rail top 50 m, 200 m long; a hero road bridge over it at x = 100
const track = (y = (x) => 50) => ({ id: "w1", ref: "L0", bridge: false, electrified: false, pts: Array.from({ length: 101 }, (_, i) => [i * 2, y(i * 2), 0]) });
const doc0 = (t) => R.prepRail({ tracks: [t], platforms: [], bridges: [] });
const roadHero = { kind: "road_over_rail", placement: { city_local_position: [100, 50, 0], rotation_y_rad: Math.PI / 2 }, deck: { length: 20, width: 6, x0: -10, x1: 10, road_ends: [57, 57], grade: 0, kerb_ne: 1, kerb_sw: -1, sidewalk_ne: 0.1, strip_sw: [0.1, 0.02], parapet_inner: 2.5, parapet_top: 1, fold: 8, flare: 0.5, apron_se: 0, skirt: 1 }, openings: [] };
const bounds = { x0: 0, x1: 200, z0: -50, z1: 50 };

// 1. the bed under the road bridge
{
  const doc = doc0(track());
  const hdr = { x0: 0, z0: -50, cols: 201, rows: 101, step: 1 };
  const Y = new Float32Array(hdr.cols * hdr.rows).fill(49.4);               // the carved terrain, 0.6 m under the rails
  const hm = { h: hdr, y: Y };
  const ground = { delta: new Uint16Array(Y.length), delta2: new Uint16Array(Y.length).fill(65535) };
  R.railDriveSurface(doc, hm, ground, bounds, [roadHero], { old: OLD });
  const at = (x, z) => Y[(z + 50) * hdr.cols + x] + ground.delta[(z + 50) * hdr.cols + x] / 100;
  const under = at(100, 0), open = at(40, 0);
  check("bed: drive surface at the rail under a road bridge", Math.abs(under - 49.98) < 0.03 && Math.abs(open - 49.98) < 0.03, `under the deck ${under.toFixed(2)}, in the open ${open.toFixed(2)} (rail top 50)`);
}

// 2. the fences on a bumpy slope (rail rising 1:40, ground bumps of 8 cm on a 1.3 m wavelength)
{
  const t = track((x) => 50 + x / 40), doc = doc0(t);
  const surface = (x, z) => 49.5 + x / 40 + 0.08 * Math.sin(x * 4.8) + 0.05 * Math.cos(z * 3.1);
  const orig = (x, z) => surface(x, z);
  const f = OLD ? R.railFences(doc, bounds, [], { nodes: [], roads: [] }, orig) : R.railFences2(doc, bounds, [], { nodes: [], roads: [] }, orig, { surface });
  const runs = f.lines.length;
  let bays = 0, kink = 0, step = 0, postsOff = 0, buried = 0, wallsBad = 0, nWalls = 0;
  if (OLD) {
    // the old strip: a vertex every 2 m, the top following the ground at each, posts every 2.5 m of the shader
    const m = R.fenceMesh(f.lines, surface), P = m.position, S = m.aS;
    for (let q = 0; q < P.length / 18; q++) { const a = q * 18, sA = S[q * 6], sB = S[q * 6 + 1]; const k0 = Math.ceil(sA / R.POST_STEP), k1 = Math.floor(sB / R.POST_STEP); for (let k = k0; k <= k1; k++) { bays++; } }
    // a bay's top rail vs the line between its posts: the strip's top follows every 2 m vertex
    const tops = []; for (let q = 0; q < P.length / 18; q++) tops.push([S[q * 6], P[q * 18 + 16]]);     // (a-top y of each quad)
    for (let i = 0; i + 2 < tops.length; i++) { const [s0, y0] = tops[i], [s1, y1] = tops[i + 1], [s2, y2] = tops[i + 2]; const mid = y0 + (y2 - y0) * (s1 - s0) / ((s2 - s0) || 1); if (Math.abs(y1 - mid) > 0.03) kink++; }
    nWalls = f.rings.length; wallsBad = nWalls;                                // (one ring per run, no foot: base -10 km)
  } else {
    const B = R.fenceBays(f.lines, surface);
    for (const { pts } of B) {
      const posts = pts.filter((p) => p.post >= 0);
      bays += posts.length - 1;
      for (const p of posts) if (Math.abs(p.foot - (surface(p.x, p.z) - R.FENCE_FOOT)) > 1e-6) postsOff++;
      for (let i = 1; i < posts.length; i++) {
        const a = posts[i - 1], b = posts[i];
        for (const p of pts) if (p.s > a.s && p.s < b.s) { const y = a.L + (b.L - a.L) * (p.s - a.s) / (b.s - a.s); if (Math.abs(p.L - y) > 1e-6) kink++; if (p.foot > surface(p.x, p.z) - R.FENCE_FOOT + 1e-6) buried++; }
      }
    }
    // the drawn mesh: the top rail continuous at every quad seam (no step)
    const m = R.fenceMesh2(B), P = m.position;
    for (let q = 1; q < P.length / 18; q++) { const prevTopB = P[(q - 1) * 18 + 7], topA = P[q * 18 + 16], same = Math.hypot(P[(q - 1) * 18 + 3] - P[q * 18], P[(q - 1) * 18 + 5] - P[q * 18 + 2]) < 1e-4; if (same && Math.abs(prevTopB - topA) > 1e-4) step++; }
    const W = R.fenceWalls(B); nWalls = W.length;
    for (const w of W) { let lo = Infinity, hi = -Infinity; for (const p of B.flatMap((q) => q.pts)) if (w.ring.some(([x, z]) => Math.hypot(x - p.x, z - p.z) < 0.07)) { lo = Math.min(lo, p.foot); hi = Math.max(hi, p.L + R.FENCE_H); } if (!(Math.abs(w.base - lo) < 1e-6 && Math.abs(w.top - hi) < 1e-6)) wallsBad++; }
  }
  check("fences: each bay's top rail straight post to post, no step", runs === 2 && bays > 100 && kink === 0 && step === 0, `${runs} runs, ${bays} bays, ${kink} kinked, ${step} steps`);
  check("fences: posts seated, panel foot under the ground", postsOff === 0 && buried === 0, `${postsOff} posts off the ground, ${buried} feet over it`);
  check("fences: the car's walls are the drawn panels (foot to top, per bay)", nWalls > 100 && wallsBad === 0, `${nWalls} walls, ${wallsBad} not the drawn extent`);
}

// 3. the fence breaks at a level crossing only
{
  const t = track(), doc = doc0(t);
  const nodes = [{ id: 1, x: 60, z: -40 }, { id: 2, x: 60, z: 40 }, { id: 3, x: 140, z: -40 }, { id: 4, x: 140, z: 40 }, { id: 5, x: 0, z: 7 }, { id: 6, x: 200, z: 7 }];
  const roads = { nodes, roads: [
    { id: "level", a: 1, b: 2, meta: { highway: "residential", name: "level" }, lanes: { left: [{ type: "driving", width: 3 }], right: [{ type: "driving", width: 3 }] } },
    { id: "over", a: 3, b: 4, meta: { highway: "residential", name: "over" }, lanes: { left: [{ type: "driving", width: 3 }], right: [{ type: "driving", width: 3 }] } },
    { id: "beside", a: 5, b: 6, meta: { highway: "residential", name: "beside" }, lanes: { left: [{ type: "driving", width: 3 }], right: [{ type: "driving", width: 3 }] } },
  ] };
  // the ground: the line at 50, the "over" road on an embankment 7 m up (DTM under its deck = the cutting), a street at
  // 50 m beside the line, its centre 7 m off (its carriageway 0.5 m from the fence)
  const orig = (x, z) => (Math.abs(x - 140) < 30 && Math.abs(z) > 10 ? 57 : 50);
  const f = OLD ? R.railFences(doc, bounds, [], roads, orig) : R.railFences2(doc, bounds, [], roads, orig);
  const fenceAt = (x, sd) => f.lines.some((run) => run.some(([fx, fz]) => Math.abs(fx - x) < 0.6 && Math.sign(fz) === sd));
  const atLevel = !fenceAt(60, 1) && !fenceAt(60, -1), atOver = fenceAt(140, 1) && fenceAt(140, -1), beside = fenceAt(30, 1) && fenceAt(170, 1);
  check("fences: open at the level crossing, closed under the overbridge and beside a street", atLevel && atOver && beside, `level crossing open ${atLevel}, closed at the road over the line ${atOver}, closed beside the street 7 m off ${beside}`);
}

// 4. no prop on a track bed
{
  const t = track(), doc = R.prepRail({ tracks: [t], platforms: [], bridges: [{ type: "ROB", lines: ["L0"], ring: [[20, -6], [30, -6], [30, 6], [20, 6], [20, -6]], centre: [25, 0] }] });
  const bed = R.railBed(doc, bounds, [roadHero]);
  const lanes = { inside: () => false, nearest: () => null };
  const opt = OLD ? { osm: true } : { osm: true, rail: bed };
  const a = offLane(60, 0.8, lanes, null, { ...opt, y: 50.2 }), deck = offLane(25, 0.5, lanes, null, { ...opt, y: 57 }), far = offLane(60, 12, lanes, null, { ...opt, y: 50 });
  const moved = a.moved && Math.abs(a.z) >= R.BED_CLEAR - 1e-6;
  const doc2 = { benches: [{ x: 100, z: 1, y: 50.3 }, { x: 60, z: 30, y: 50 }] };
  const r = docOffLanes(doc2, [["benches"]], lanes, null, OLD ? { osm: true } : { osm: true, rail: bed, drop: (p) => bed.inHero(p.x, p.z) });
  check("props: off the track bed, not off a road deck, dropped inside a hero road bridge", moved && !deck.moved && !far.moved && r.doc.benches.length === 1, `bed point moved ${a.moved} to z ${a.z.toFixed(2)}, deck point kept ${!deck.moved}, hero bridge bench dropped ${r.doc.benches.length === 1}`);
}

// 5. hero colliders only while drawn
{
  const THREE = await import("three/webgpu");
  const H = await imp("viewer/heroColliders.js");
  const scene = new THREE.Scene(), root = new THREE.Group(); root.name = "bridge-ruestalle";
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 1).translate(0, 0.8, 0)); root.add(mesh); scene.add(root);
  const extra = [];
  const driver = { extra, ground: () => 0, groundLayers: () => ({ top: 0, low: NaN, deck: false }), addStatic(p) { const s = { p }; extra.push(s); return s; }, removeStatic(s) { const i = extra.indexOf(s); if (i >= 0) extra.splice(i, 1); } };
  const manifest = { tiles: [{ name: "T", bounds: { x: [-50, 50], z: [-50, 50] } }] }, world = { tiles: [{ name: "T" }] };
  const realSI = globalThis.setInterval; globalThis.setInterval = () => 0;
  const api = H.createHeroColliders({ scene, world, manifest, driver });
  globalThis.setInterval = realSI;
  await api.poll();
  const built = extra.length, set0 = extra[0];
  root.visible = false; await api.poll();
  const hidden = extra.length;
  root.visible = true; await api.poll();
  const back = extra.length === 1 && extra[0] === set0;
  check("hero colliders: only while the hero is drawn", built === 1 && hidden === 0 && back, `built ${built}, while hidden ${hidden}, back (same set) ${back}`);
}

// 6. a pole is a post of its DRAWN height (driveMode.js featureColliders): a catenary mast on a viaduct's deck 17 m over a
//    street is no post in the street (the Stalle viaduct's mast stopped the car in Rue de Stalle: owner shot 105)
{
  const THREE = await import("three/webgpu");
  const { featureColliders } = await imp("viewer/drive/driveMode.js");
  const { buildColliders, heightClear } = await imp("viewer/drive/colliders.js");
  const g = new THREE.Group(), mast = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 8, 0.2).translate(0, 4, 0), new THREE.MeshBasicNodeMaterial(), 1);
  mast.name = "rail-masts"; mast.setMatrixAt(0, new THREE.Matrix4().makeTranslation(5, 49, 5)); g.add(mast);
  const f = featureColliders(g, { x0: 0, x1: 10, z0: 0, z1: 10 });
  const col = buildColliders(f.polys, f.circles, { x0: 0, x1: 10, z0: 0, z1: 10 });
  const n = col.P + col.C, under = n === 1 && col.P === 1 && heightClear(col, 0, 31.8), onDeck = n === 1 && col.P === 1 && !heightClear(col, 0, 49.1);
  check("poles: a post of its drawn height", under && onDeck, `${col.P} polys / ${col.C} circles; a car on the street 17 m under it passes ${under}, a car beside it on the deck stops ${onDeck}`);
}

const bad = rows.filter((r) => r[1] === "FAIL");
if (!QUIET || bad.length) for (const r of rows) console.log(`${r[1]}  ${r[0]}: ${r[2]}`);
console.log(`railTCheck${OLD ? " (--old, ?rail=old)" : ""}: ${rows.length - bad.length}/${rows.length} pass`);
process.exit(bad.length ? 1 : 0);
