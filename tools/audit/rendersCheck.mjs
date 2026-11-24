// RENDERS PER FRAME GATE (claude/renders, perf job D, rule docs/rules/renders-per-frame.md).
//   node --import ./tools/christmas/hook.mjs tools/audit/rendersCheck.mjs [--quiet]      exit 1 on a failure
// WHY: the police drive makes ~32 renders a frame, but 30 of them are one-quad post / sky passes; the per-object CPU is
// in the main pass (~290 objects) and in the sun shadow cache's FULL REDRAWS (~106-115 casters, on ~1 frame in 10:
// the heaviest render of the frames they hit). Half of those redraws were for changes the map could not show: tile
// fades / swaps of far-LOD tiles (no casters), terrain and road groups (no casters), tiles outside the light's box, and
// the light's 25 m depth step along the sun (a constant depth offset under an orthographic projection).
// RULE: a full redraw of a cached pass only for a change the cached image can show; a change that is a pure transform
// of the cached image (a whole-texel shift, a constant depth offset) is applied in the lay-back, not redrawn.
// Checks:
//   1. casterInfo / castsInto: a group with no castShadow mesh casts nothing; a casting mesh outside the light's
//      frustum casts nothing into it, inside it does; a frustumCulled = false caster counts anywhere; a Box3 (a tile's
//      area) is tested as is; the result is measured once (a disposed group keeps its answer)
//   2. markSunShadowDirty(objs): queues them (no redraw flag); with no objs: the redraw flag as before; bounded queue
//   3. the depth step: for the light's orthographic camera (normal and reversed depth), moving it d m along its own z
//      moves every point's NDC depth by exactly -P[10] x d (what the lay-back adds); lighting.js uses that expression
//   4. text: the switches (?sunfadecast=old, ?sundepthstep=old) and their features rows; main.js passes the tile's area /
//      groups at every tile land / retire mark; the far plane carries the extra SUN_QZ with DEPTH_STEP; the lay-back
//      keeps empty texels
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else if (!QUIET) console.log("ok  ", m); return c; };
const src = (p) => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
globalThis.window = globalThis;
globalThis.location = { search: "", href: "http://localhost/viewer/" };
const THREE = await import("three/webgpu");
const L = await import("../../viewer/lighting.js");

// ---- 1. casterInfo / castsInto
const cam = new THREE.OrthographicCamera(-90, 90, 90, -90, 0.5, 1200);
cam.position.set(-900 * 0.92, 900 * 0.16 + 80, -900 * 0.35); cam.lookAt(0, 80, 0); cam.updateMatrixWorld();
const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse), cam.coordinateSystem);
const box = (x, z, cast = true, nocull = false) => { const m = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10)); m.position.set(x, 80, z); m.castShadow = cast; m.frustumCulled = !nocull; const g = new THREE.Group(); g.add(m); return g; };
ok(!L.castsInto(box(0, 0, false), fr), "a group with no shadow caster casts nothing (a far-LOD tile, terrain, roads)");
ok(L.castsInto(box(0, 0), fr), "a caster inside the light's box casts into it");
ok(!L.castsInto(box(2000, 2000), fr), "a caster 2.8 km away casts nothing into it");
ok(L.castsInto(box(2000, 2000, true, true), fr), "a frustumCulled = false caster counts anywhere (GPU-placed instances)");
const g = box(0, 0); L.castsInto(g, fr); g.children[0].removeFromParent();
ok(L.castsInto(g, fr), "measured once: a group emptied / disposed after its first mark keeps its answer");
ok(L.castsInto(new THREE.Box3(new THREE.Vector3(-50, 0, -50), new THREE.Vector3(50, 250, 50)), fr), "a tile area meeting the box casts");
ok(!L.castsInto(new THREE.Box3(new THREE.Vector3(3000, 0, 3000), new THREE.Vector3(3500, 250, 3500)), fr), "a tile area far away does not");
const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), 2); im.castShadow = true;
im.setMatrixAt(0, new THREE.Matrix4().makeTranslation(3000, 0, 3000)); im.setMatrixAt(1, new THREE.Matrix4().makeTranslation(0, 80, 0));
const gi = new THREE.Group(); gi.add(im);
ok(L.castsInto(gi, fr), "an instanced caster is measured over its instances (one inside the box)");

// ---- 2. markSunShadowDirty
L.sunCache.dirty = false; L.sunCache.pend.length = 0;
L.markSunShadowDirty([box(0, 0, false), box(5000, 5000)]);
ok(L.FADE_CAST && L.sunCache.dirty === false && L.sunCache.pend.length === 2, "a mark with objects queues them for the next shadow frame (no redraw flag)");
L.markSunShadowDirty();
ok(L.sunCache.dirty === true, "a mark without objects sets the redraw flag, as before");
L.sunCache.dirty = false; L.sunCache.pend.length = 0;
for (let i = 0; i < 70; i++) L.markSunShadowDirty(box(0, 0, false));
ok(L.sunCache.dirty === true && L.sunCache.pend.length < 65, "the queue is bounded (no shadow pass for a while: one redraw)");
L.sunCache.pend.length = 0;

// ---- 3. the depth step
for (const rev of [false, true]) {
  const c = new THREE.OrthographicCamera(-90, 90, 90, -90, 0.5, 1260);
  c._reversedDepth = rev; c.coordinateSystem = THREE.WebGPUCoordinateSystem; c.updateProjectionMatrix();
  const z = new THREE.Vector3(-0.92, 0.16, -0.35).normalize();
  c.position.copy(z).multiplyScalar(910); c.lookAt(0, 0, 0); c.updateMatrixWorld();
  const pz0 = c.position.dot(z);
  const pts = [[0, 0, 0], [40, -20, 30], [-80, 60, 10], [300, 100, 200]].map(([x, y, q]) => new THREE.Vector3(x, y, q));
  const d0 = pts.map((p) => p.clone().project(c).z);
  let worst = 0;
  for (const step of [25, -25]) {
    c.position.addScaledVector(z, step); c.updateMatrixWorld();
    const dpz = c.position.dot(z) - pz0, off = -c.projectionMatrix.elements[10] * dpz;
    pts.forEach((p, i) => { worst = Math.max(worst, Math.abs(p.clone().project(c).z - (d0[i] + off))); });
    c.position.addScaledVector(z, -step); c.updateMatrixWorld();
  }
  ok(worst < 1e-6, `the light's depth step = a constant NDC depth offset -P[10] x d (${rev ? "reversed" : "normal"} depth; worst ${worst.toExponential(1)})`);
}

// ---- 4. text
const lit = src("viewer/lighting.js"), main = src("viewer/main.js"), feats = src("viewer/features.js");
ok(/FADE_CAST = SUN_CACHE && QS\.get\("sunfadecast"\) !== "old"/.test(lit) && /DEPTH_STEP = SUN_CACHE && QS\.get\("sundepthstep"\) !== "old"/.test(lit), "lighting.js: ?sunfadecast=old / ?sundepthstep=old switches");
ok(/B\.dz\.value = -cam\.projectionMatrix\.elements\[10\] \* dpz/.test(lit), "lighting.js: the lay-back adds -P[10] x the depth step");
ok(/select\(d\.equal\(0\)\.or\(d\.equal\(1\)\), d, d\.add\(dz\)/.test(lit), "lighting.js: the lay-back keeps empty texels (the clear value) as they are");
ok(/Math\.abs\(dpz\) > SUN_QZ \* 1\.01 \? "step"/.test(lit), "lighting.js: a second depth step redraws");
ok(/SUN_QZ \* \(DEPTH_STEP \? 2 : 1\)/.test(lit), "lighting.js: the far plane carries one more SUN_QZ with the depth step");
ok(/this\.age >= 3 && \(!FADE_CAST \|\| this\.fadeCasts\(\)\)/.test(lit), "lighting.js: a fade redraws only when a fading object casts into the box");
ok(!/markSunShadowDirty\(\)/.test(main), "main.js: every tile mark names its area / groups (no bare markSunShadowDirty())");
ok((main.match(/markSunShadowDirty\(tileArea\(/g) || []).length >= 2 && /retire\(t\.groups, t\.dispose, tileArea\(t\.bounds\)\)/.test(main), "main.js: a full tile's landing and retiring mark its area (what it adds to the pools too)");
for (const k of ["sunfadecast", "sundepthstep"]) ok(new RegExp(`old\\("${k}", "perf"`).test(feats), `features.js row ${k}`);
ok(fs.existsSync(path.join(ROOT, "debug/renderCount.js")) && fs.existsSync(path.join(ROOT, "debug/sunDepthStep.js")), "debug/renderCount.js + debug/sunDepthStep.js (the browser row)");

console.log(fails ? `renders: ${fails} FAILED` : "renders: all checks pass");
process.exit(fails ? 1 : 0);
