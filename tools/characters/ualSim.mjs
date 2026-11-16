// OFFLINE RUN of the third-person character (the real viewer code: viewer/character/index.js ThirdPerson, the
// controller, locomotion.js, the UAL mannequin) on a test course in node, no browser: scripted runs (walk, run, sprint,
// turn on the spot, stairs up / down, kerbs, a steep street, jump, crouch, idle variants), each frame's POSE AUDIT
// (the character2 method: soles through the ground, planted feet floating or sliding, out-of-reach legs), and posed
// meshes for the pose strips (tools/blender/ualStrip.py renders them).
//
//   node --import ./tools/characters/threeHook.mjs tools/characters/ualSim.mjs [--only name,name] [--obj <dir>] [--frames 8]
//
// Writes docs/ual/audit.json (+ a table on stdout); with --obj, per run <dir>/<run>/f<k>.obj (the posed body, world
// space), course.obj and frames.json (the frames' times, roots and modes) for the strips.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three/webgpu";
import { ThirdPerson, CollisionWorld, Heightfield, TriBVH } from "../../viewer/character/index.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ONLY = arg("--only", "") ? new Set(arg("--only").split(",")) : null;
const OBJ = arg("--obj", "");
const NFR = +arg("--frames", 8);
const CHAR = arg("--char", "ual");
const TRACE = arg("--trace", "");          // run:t0:t1 -> per-frame foot / body-fit numbers

// ------------------------------------------------------------------------------------------------ the course
const course = [];
const add = (g, x, y, z, ry = 0) => { const m = new THREE.Mesh(g); m.position.set(x, y, z); m.rotation.y = ry; m.updateMatrixWorld(true); course.push(m); return m; };
const box = (x0, y0, z0, x1, y1, z1) => add(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
function stairsGeo(n, rise, tread, width, base = -0.02) {
  const s = new THREE.Shape();
  s.moveTo(0, base);
  for (let i = 0; i < n; i++) { s.lineTo(i * tread, (i + 1) * rise); s.lineTo((i + 1) * tread, (i + 1) * rise); }
  s.lineTo(n * tread, base); s.lineTo(0, base);
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false, steps: 1 }); g.translate(0, 0, -width / 2);
  return g;
}
function rampGeo(deg, len, width, top = 2) {
  const h = Math.tan(deg * Math.PI / 180) * len, s = new THREE.Shape();
  s.moveTo(0, -0.02); s.lineTo(0, 0.0); s.lineTo(len, h); s.lineTo(len + top, h); s.lineTo(len + top, -0.02); s.lineTo(0, -0.02);
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false }); g.translate(0, 0, -width / 2);
  return g;
}
// lane z = 10: stairs up 10 x 17 / 29 cm from x = 5, a landing, down 8 x 21.25 / 27 cm (the Capsule Lab's B)
add(stairsGeo(10, 0.17, 0.29, 2), 5, 0, 10);
box(7.9, -0.02, 9, 9.6, 1.7, 11);
add(stairsGeo(8, 0.2125, 0.27, 2), 9.6 + 8 * 0.27, 0, 10, Math.PI);
// lane z = 16: city stairs 15 / 31 cm (a gentle outdoor flight) x 8
add(stairsGeo(8, 0.15, 0.31, 2), 5, 0, 16);
box(7.48, -0.02, 15, 12, 1.2, 17);
// lane z = 20: a sidewalk 15 cm (kerb up at x = 5, down at x = 9)
box(5, -0.02, 19, 9, 0.15, 21);
// lane z = 26: a steep street 12 deg (21 %) over 8 m, then a flat top
add(rampGeo(12, 8, 3, 4), 5, 0, 26);
const world = new CollisionWorld();
const pos = [];
for (const m of course) {
  const P = m.geometry.attributes.position, I = m.geometry.index, v = new THREE.Vector3(), cnt = I ? I.count : P.count;
  for (let k = 0; k < cnt; k++) { v.fromBufferAttribute(P, I ? I.getX(k) : k).applyMatrix4(m.matrixWorld); pos.push(v.x, v.y, v.z); }
}
world.add(new TriBVH(new Float32Array(pos)));
world.add(new Heightfield(() => 0));
const ground = (x, z, y = 3) => { const t = world.ray(x, y, z, 0, -1, 0, y + 2); return t === Infinity || t === undefined || t < 0 ? 0 : y - t; };

// ------------------------------------------------------------------------------------------------ the runs
// autopilot(inp, t): world-space wish (x, z), run, jump, crouch. start [x, z, yaw]; dur s; frames = the strip's times
const fwd = (inp, run = false) => { inp.x = 1; inp.z = 0; inp.run = run; };
const RUNS = [
  { name: "walk", start: [0, 0, Math.PI / 2], dur: 4, pilot: (i, t) => fwd(i), strip: [1.5, 2.6] },
  { name: "run", start: [-10, 0, Math.PI / 2], dur: 3, pilot: (i) => fwd(i, true), strip: [1.6, 2.5] },
  { name: "sprint", start: [-20, 0, Math.PI / 2], dur: 4, pilot: (i) => fwd(i, true), strip: [3.0, 3.7] },
  { name: "startStop", start: [0, -6, Math.PI / 2], dur: 4, pilot: (i, t) => { if (t > 0.4 && t < 2.2) fwd(i); else { i.x = 0; i.z = 0; } }, strip: [0.3, 3.2] },
  { name: "turn", start: [0, -12, Math.PI / 2], dur: 3, pilot: (i, t) => { if (t > 0.5) { i.x = -1; i.z = 0.15; } else { i.x = 0; i.z = 0; } }, strip: [0.5, 1.5], side: "front" },
  { name: "stairsUp", start: [3.5, 10, Math.PI / 2], dur: 7, pilot: (i, t, s) => { if (s.x < 9.3) fwd(i); else { i.x = 0; i.z = 0; } }, strip: [1.8, 4.2] },
  { name: "stairsDown", start: [8.4, 10, Math.PI / 2], dur: 6, pilot: (i, t, s) => { if (s.x < 13.5) fwd(i); else { i.x = 0; i.z = 0; } }, y: 1.7, strip: [1.2, 3.6] },
  { name: "stairsUpRun", start: [3.5, 10, Math.PI / 2], dur: 4, pilot: (i, t, s) => { if (s.x < 9.3) fwd(i, true); else { i.x = 0; i.z = 0; } }, strip: [1.0, 2.6] },
  { name: "cityStairs", start: [3.5, 16, Math.PI / 2], dur: 6, pilot: (i, t, s) => { if (s.x < 11) fwd(i); else { i.x = 0; i.z = 0; } }, strip: [1.6, 4.0] },
  { name: "kerb", start: [3.0, 20, Math.PI / 2], dur: 6, pilot: (i, t, s) => { if (s.x < 11) fwd(i); else { i.x = 0; i.z = 0; } }, strip: [1.0, 5.5] },
  { name: "steepUp", start: [3.0, 26, Math.PI / 2], dur: 7, pilot: (i, t, s) => { if (s.x < 15) fwd(i); else { i.x = 0; i.z = 0; } }, strip: [3.0, 4.4] },
  { name: "steepDown", start: [15.5, 26, -Math.PI / 2], y: 1.7, dur: 7, pilot: (i, t, s) => { if (s.x > 3) { i.x = -1; i.z = 0; i.run = false; } else { i.x = 0; i.z = 0; } }, strip: [3.0, 4.4] },
  { name: "jump", start: [0, -18, Math.PI / 2], dur: 3, pilot: (i, t) => { fwd(i); if (t > 0.8 && !i._j) { i.jump = true; i._j = 1; } }, strip: [0.75, 2.0] },
  { name: "jumpRun", start: [0, -24, Math.PI / 2], dur: 3, pilot: (i, t) => { fwd(i, true); if (t > 1.0 && !i._j) { i.jump = true; i._j = 1; } }, strip: [0.95, 1.9] },
  { name: "jumpStand", start: [0, -30, Math.PI / 2], dur: 2.5, pilot: (i, t) => { i.x = 0; i.z = 0; if (t > 0.5 && !i._j) { i.jump = true; i._j = 1; } }, strip: [0.45, 1.8] },
  { name: "dropLedge", start: [7.5, 10.4, Math.PI / 2], y: 1.7, dur: 3, pilot: (i, t, s) => { i.x = 0; i.z = 1; i.run = false; }, strip: [0.2, 1.6], side: "front" },
  { name: "crouch", start: [0, -36, Math.PI / 2], dur: 4, pilot: (i, t) => { i.crouch = true; if (t > 1.2) fwd(i); else { i.x = 0; i.z = 0; } }, strip: [0.5, 3.5] },
  { name: "idle", start: [0, -42, Math.PI / 2], dur: 22, pilot: (i) => { i.x = 0; i.z = 0; }, strip: [1, 21] },
];

const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
const dom = { addEventListener() {}, removeEventListener() {} };
const tp = new ThirdPerson({ scene, camera, dom, world });
const info = await tp.useCharacter(CHAR);
console.log(`character: ${info.label}, ${info.tris} tris, gaits ${JSON.stringify(info.gaits)}`);
const lo = tp.body.loco, legs = tp.body.legIK?.legs || tp.body.loco?.ik?.legs;
let mesh = null; tp.body.model.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
function objOf(m) {
  m.updateMatrixWorld(true);
  const P = m.geometry.attributes.position, I = m.geometry.index, out = [], p = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { m.getVertexPosition(i, p); p.applyMatrix4(m.matrixWorld); out.push(`v ${p.x.toFixed(4)} ${p.y.toFixed(4)} ${p.z.toFixed(4)}`); }
  for (let k = 0; k < I.count; k += 3) out.push(`f ${I.getX(k) + 1} ${I.getX(k + 1) + 1} ${I.getX(k + 2) + 1}`);
  return out.join("\n");
}
if (OBJ) {
  fs.mkdirSync(OBJ, { recursive: true });
  const out = []; let base = 1;
  for (const m of course) {
    const P = m.geometry.attributes.position, I = m.geometry.index, p = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) { p.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); out.push(`v ${p.x.toFixed(4)} ${p.y.toFixed(4)} ${p.z.toFixed(4)}`); }
    if (I) for (let k = 0; k < I.count; k += 3) out.push(`f ${I.getX(k) + base} ${I.getX(k + 1) + base} ${I.getX(k + 2) + base}`);
    else for (let k = 0; k < P.count; k += 3) out.push(`f ${k + base} ${k + 1 + base} ${k + 2 + base}`);
    base += P.count;
  }
  fs.writeFileSync(path.join(OBJ, "course.obj"), out.join("\n"));
}

const results = [];
const DT = 1 / 60;
for (const R of RUNS) {
  if (ONLY && !ONLY.has(R.name)) continue;
  const [x0, z0, yaw0] = R.start;
  tp.start(x0, (R.y ?? ground(x0, z0)) + 0.05, z0, yaw0);
  const inp = tp.ctl.input; inp._j = 0; inp.crouch = false; inp.run = false; inp.jump = false;
  const st = { x: x0 };
  tp.autopilot = (i, dt) => { i.run = false; R.pilot(i, st.t, st); };
  const A = { pen: 0, penAt: 0, float: 0, floatAt: 0, slide: 0, slideT: 0, slideMax: 0, reach: 0, frames: 0, modes: {}, maxFootDy: 0 };
  const prevBall = [null, null];
  const frames = [], want = R.strip ? Array.from({ length: NFR }, (_, k) => R.strip[0] + (R.strip[1] - R.strip[0]) * k / (NFR - 1)) : [];
  let wi = 0;
  const n = Math.round(R.dur / DT);
  for (let f = 0; f <= n; f++) {
    st.t = f * DT; st.x = tp.ctl.pos[0]; st.z = tp.ctl.pos[2];
    tp.update(DT);
    tp.body.root.updateMatrixWorld(true);
    if (lo) A.modes[lo.mode] = (A.modes[lo.mode] || 0) + 1;
    // POSE AUDIT (grounded frames): each sole against the ground under it; a planted foot's ball sliding over the ground
    if (tp.ctl.grounded && legs && st.t > 0.3) {
      A.frames++;
      for (let s = 0; s < 2; s++) {
        const L = legs[s];
        L.foot.getWorldPosition(v1); L.toe.getWorldPosition(v2);
        const gA = ground(v1.x, v1.z, v1.y + 0.5), gB = ground(v2.x, v2.z, v2.y + 0.5);
        const sole = Math.min(v1.y - L.ankleH - gA, v2.y - L.ballH - gB);
        if (-sole > A.pen) { A.pen = -sole; A.penAt = st.t; }
        // (floating: above the HIGHER ground under heel / ball: a sole half over a kerb's edge is not floating)
        const over = Math.min(v1.y - L.ankleH, v2.y - L.ballH) - Math.max(gA, gB);
        if (L.planted && L.contact > 0.6 && over > A.float) { A.float = over; A.floatAt = st.t; }
        if (TRACE) { const [tr, t0, t1] = TRACE.split(":"); if (tr === R.name && st.t >= +t0 && st.t <= +t1) console.log(`  t ${st.t.toFixed(3)} ${s ? "R" : "L"} ${L.planted ? "P" : "-"} c ${L.contact?.toFixed(2)} over ${(over * 100).toFixed(1)} need ${L.need === null ? "-" : (L.need * 100).toFixed(1)} fit ${(lo.fit * 100).toFixed(1)} lift ${((L.lift || 0) * 100).toFixed(1)} g ${gA.toFixed(2)}/${gB.toFixed(2)} gPlant ${L.gPlant?.toFixed(2)} y ${tp.body.root.position.y.toFixed(3)} mode ${lo.mode} k ${tp._stairs.k.toFixed(2)} x ${tp.ctl.pos[0].toFixed(2)}`); }
        if (L.planted && prevBall[s]) {
          const d = Math.hypot(v2.x - prevBall[s][0], v2.z - prevBall[s][1]) / DT;
          A.slide += d * DT; A.slideT += DT; A.slideMax = Math.max(A.slideMax, d);
        }
        prevBall[s] = L.planted ? [v2.x, v2.z] : null;
        // (out of reach: hip to ankle longer than the leg)
        L.upper.getWorldPosition(v3);
        const reach = v3.distanceTo(v1) - (L.l1 + L.l2);
        if (reach > A.reach) A.reach = reach;
      }
    }
    if (OBJ && wi < want.length && st.t >= want[wi] - 1e-9) {
      const dir = path.join(OBJ, R.name); fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `f${wi}.obj`), objOf(mesh));
      frames.push({ k: wi, t: +st.t.toFixed(3), x: tp.x, y: tp.y, z: tp.z, yaw: tp.S[3], mode: lo?.mode || "", speed: +tp.bodyState.speed.toFixed(2),
        stairs: +(tp._stairs?.k || 0).toFixed(2), top: Object.entries(lo?.C || {}).filter(([, c]) => c.w > 0.15).map(([k, c]) => `${k} ${c.w.toFixed(2)}`).join(", ") });
      wi++;
    }
  }
  const r = { run: R.name, pos: [+tp.x.toFixed(2), +tp.y.toFixed(2), +tp.z.toFixed(2)], penCm: +(A.pen * 100).toFixed(1), penAt: +A.penAt.toFixed(2), floatCm: +(A.float * 100).toFixed(1), floatAt: +A.floatAt.toFixed(2),
    slideMs: +(A.slideT ? A.slide / A.slideT : 0).toFixed(3), slideMaxMs: +A.slideMax.toFixed(2), reachCm: +(A.reach * 100).toFixed(1), modes: Object.fromEntries(Object.entries(A.modes).map(([k, c]) => [k, +(c * DT).toFixed(2)])),
    animMs: +lo?.ms.toFixed(3) };
  results.push(r);
  if (OBJ && frames.length) fs.writeFileSync(path.join(OBJ, R.name, "frames.json"), JSON.stringify({ run: R.name, side: R.side || "side", frames }, null, 1));
  console.log(`${R.name.padEnd(12)} end ${r.pos.join(",").padEnd(18)} sole through ${String(r.penCm).padStart(5)} cm @${r.penAt}  planted float ${String(r.floatCm).padStart(5)} cm @${r.floatAt}  slide ${r.slideMs.toFixed(2)} m/s (max ${r.slideMaxMs})  reach +${r.reachCm} cm  ${JSON.stringify(r.modes)}`);
}
fs.mkdirSync(path.join(ROOT, "docs/ual"), { recursive: true });
if (!ONLY) fs.writeFileSync(path.join(ROOT, "docs/ual/audit.json"), JSON.stringify({ character: CHAR, date: new Date().toISOString().slice(0, 10), runs: results }, null, 1));
