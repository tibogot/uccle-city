// SUN SHADOW STEP GATE (claude/sunstep, rule docs/rules/sun-shadow-step.md).
//   node tools/audit/sunShadowStepCheck.mjs [--quiet]      exit 1 on a failure
// WHY: the sun's static shadow cache (viewer/lighting.js CachedSunShadowNode) was keyed on the live sun direction to 6
// decimals: any sun motion (the dev panel's sun speed, a day cycle) redrew the whole cache every frame and undid its
// ~2 ms. And r187 reads a receiver past the shadow's far plane as shadowed: at a low sun the far plane, sized for a
// high sun, left the foreground of the far-300m view in a dark band.
// RULE: a cached shadow keys on a QUANTISED light state; the quantum is the largest invisible error (<= 1 map texel of
// the current box at the reference caster height), never float precision; the shading stays on the live sun. The
// shadow's depth range reaches the deepest receiver of its box at the sun's elevation; past it, receivers fade to lit.
// Checks:
//   1. viewer/sunStep.js stepAngle: grows with the texel and with the elevation, inside [0.002, 0.5] deg
//   2. a simulated day (day 200, Brussels, 06:00-21:00 solar, 60 fps; boxes 60 / 90 / 400 m): the shadow tip error of a
//      30 m caster <= 1 texel for elevations >= 3 deg; at 1x real time <= 1 step / 5 s above 15 deg; at 60x <= 25 % of
//      frames over the day and above 10 deg; the lead halves the steps (vs no lead); a still sun ends on the live sun
//   3. receiverDepth = the deepest receiver of the box (brute force over points |y| <= box, h >= -down); the old far
//      plane is too short at golden (9.5 deg, the band) and the new one deep enough; FAR_CAP holds
//   4. text: the switches ?sunstep=old / ?sunfar=old and their features rows; the cache key's default branch formats no
//      direction (no toFixed); the "sun" redraw; the shadow camera placed from shadowPos; the light on the live sun; the
//      past-far fade; the bias scaled by the depth range
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as S from "../../viewer/sunStep.js";
import { sunDirection } from "../../vendor/firmament/firmamentCelestial.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else if (!QUIET) console.log("ok  ", m); return c; };
const src = (p) => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const DEG = Math.PI / 180;
const v3 = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; },
  normalize() { const l = Math.hypot(this.x, this.y, this.z) || 1; this.x /= l; this.y /= l; this.z /= l; return this; } });

// ---- 1. stepAngle
const s9 = Math.sin(9.5 * DEG), s58 = Math.sin(58 * DEG);
ok(S.stepAngle(0.044, s9) > S.stepAngle(0.029, s9) && S.stepAngle(0.044, s58) > S.stepAngle(0.044, s9), "the step grows with the box texel and with the sun's elevation");
ok(S.stepAngle(1e-6, 0.5) === S.STEP_MIN && S.stepAngle(10, 1) === S.STEP_MAX && S.stepAngle(0.044, -0.2) === S.STEP_MIN, "the step stays inside [0.002, 0.5] deg");
ok(Math.abs(S.tipTexels(S.stepAngle(0.044, s9), 0.044, s9) - 1) < 1e-9, "a full step moves a 30 m caster's tip exactly 1 map texel");

// ---- 2. a simulated day
function day({ speed, box, lead = true, fps = 60, from = 6, to = 21 }) {
  const texel = (2 * box) / 4096, st = new S.SunStepper({ lead }), d = v3();
  let steps = 0, frames = 0, worst = 0, last = -1, minGap15 = Infinity, hi = { f: 0, s: 0 };
  const dh = speed / 3600 / fps;
  for (let h = from; h <= to; h += dh) {
    sunDirection({ hours: h, dayOfYear: 200, latitude: 50.8 }, d);
    const stepped = st.update(d, texel) && frames > 0;
    const e = Math.asin(d.y) / DEG;
    if (stepped) { steps++; if (e > 15 && last >= 0) minGap15 = Math.min(minGap15, (frames - last) / fps); last = frames; }
    if (e >= 10) { hi.f++; if (stepped) hi.s++; }
    if (e >= 3) worst = Math.max(worst, S.tipTexels(S.angleBetween(d, st.dir), texel, d.y));
    frames++;
  }
  return { steps, frames, share: steps / frames, shareHi: hi.s / Math.max(1, hi.f), worst, minGap15 };
}
for (const box of [60, 90, 400]) {
  const a = day({ speed: 60, box });
  ok(a.worst <= 1.02, `60x, box ${box}: the 30 m caster's tip error <= 1 texel all day (worst ${a.worst.toFixed(3)})`);
  ok(a.share <= 0.25 && a.shareHi <= 0.25, `60x, box ${box}: steps on ${(100 * a.share).toFixed(1)} % of frames over the day, ${(100 * a.shareHi).toFixed(1)} % above 10 deg (<= 25 %)`);
  const n = day({ speed: 60, box, lead: false });
  ok(a.steps < n.steps * 0.6, `60x, box ${box}: the lead cuts the steps (${a.steps} vs ${n.steps} without)`);
}
for (const box of [60, 90]) {
  const r = day({ speed: 1, box, fps: 10 });    // (1x at 10 fps: the same sun path, the step count does not depend on it)
  ok(r.worst <= 1.02 && r.minGap15 >= 5, `1x, box ${box}: tip error ${r.worst.toFixed(3)} texel, the shortest gap between steps above 15 deg ${r.minGap15.toFixed(1)} s (>= 5 s), ${r.steps} steps in 15 h`);
}
{
  const st = new S.SunStepper(), d = v3(), texel = 180 / 4096;
  let h = 17;
  for (let i = 0; i < 300; i++) { sunDirection({ hours: h += 60 / 3600 / 60, dayOfYear: 200, latitude: 50.8 }, d); st.update(d, texel); }
  for (let i = 0; i < S.STILL_FRAMES + 2; i++) st.update(d, texel);
  ok(S.angleBetween(d, st.dir) < 1e-9, "a sun that stops: the shadow sun is put on it after STILL_FRAMES frames");
  const id = st.id; for (let i = 0; i < 200; i++) st.update(d, texel);
  ok(st.id === id, "a still sun never steps (the cache as with a fixed preset)");
}

// ---- 3. the depth range
const depthOf = (P, z) => -(P.x * z.x + P.y * z.y + P.z * z.z);          // past the focus (at 0) along the light
function bruteDepth(box, e, down) {
  const z = { x: 0, y: Math.sin(e), z: Math.cos(e) }, yv = { x: 0, y: Math.cos(e), z: -Math.sin(e) };   // the light's axes
  let worst = 0;
  for (let i = 0; i <= 200; i++) for (const h of [-down, -down / 2, 0, 40]) {
    const y = -box + (2 * box * i) / 200;
    // the ground point at height h whose light-space y is `y`: P = (0, h, r) with P . yv = y
    const r = (y - h * yv.y) / yv.z, P = { x: 0, y: h, z: r };
    worst = Math.max(worst, depthOf(P, z));
  }
  return worst;
}
let derr = 0;
for (const e of [5, 9.5, 20, 45, 80]) for (const box of [60, 400]) derr = Math.max(derr, Math.abs(bruteDepth(box, e * DEG, 110) - S.receiverDepth(box, Math.sin(e * DEG), 110)));
ok(derr < 1e-6, `receiverDepth = the deepest receiver of the box (brute force, worst ${derr.toExponential(1)} m)`);
const oldFar = (box) => 900 + box * 1.42 + 110 + 50;
ok(900 + 50 + S.receiverDepth(400, s9, 110) > oldFar(400) + 500, `at golden (9.5 deg) the 400 m box's receivers lie past the old far plane (${(950 + S.receiverDepth(400, s9, 110)).toFixed(0)} vs ${oldFar(400).toFixed(0)} m: the dark band)`);
ok(S.farPlane(950, 400, s9, 110) >= 950 + S.receiverDepth(400, s9, 110) && S.farPlane(950, 400, s9, 110) % S.FAR_QUANT === 0, "the new far plane reaches them, in FAR_QUANT steps");
ok(S.farPlane(950, 400, s58, 110) <= oldFar(400), `at a high sun (58 deg) the 400 m box's far plane is no deeper than before (${S.farPlane(950, 400, s58, 110)} vs ${oldFar(400)} m)`);
ok(S.farPlane(950, 400, 0.01, 110) === S.FAR_CAP, "a sun on the horizon: the far plane capped (receivers past it fade to lit)");

// ---- 4. text
const lit = src("viewer/lighting.js"), feats = src("viewer/features.js");
ok(/SUN_STEP = SMOOTH_SHADOWS && QS\.get\("sunstep"\) !== "old"/.test(lit) && /SUN_FAR = SMOOTH_SHADOWS && QS\.get\("sunfar"\) !== "old"/.test(lit), "lighting.js: ?sunstep=old / ?sunfar=old switches");
for (const k of ["sunstep", "sunfar"]) ok(new RegExp(`old\\("${k}", "perf"`).test(feats), `features.js row ${k}`);
const keyM = lit.match(/const key = SUN_STEP \? \(([^\n]*)\)\n/);
ok(keyM && !/toFixed|e\[(8|9|10)\]|sunDir/.test(keyM[1]), "lighting.js: the cache key's default branch formats no light direction (the stepped sun's id decides instead)");
ok(/SUN_STEP && this\.sunId !== shadowSun\.id \? "sun"/.test(lit) && /this\.sunId = shadowSun\.id/.test(lit), "lighting.js: a shadow-sun step redraws the cache (\"sun\") and the redraw records it");
ok(/if \(S\.update\(z, \(2 \* box\) \/ this\.sun\.shadow\.mapSize\.x\)\) shadowSun\.id = S\.id/.test(lit), "lighting.js: the step is taken with the current box's texel");
ok(/cam\.position\.copy\(lighting\.shadowPos\)/.test(lit) && /stepShadowCamera\(this\)/.test(lit), "lighting.js: the shadow camera is placed from shadowPos (the stepped sun)");
ok(/this\.sun\.position\.copy\(f\)\.addScaledVector\(this\.sunDir, 900\)/.test(lit), "lighting.js: the light itself (the shading) stays on the live sun");
ok(/if \(SUN_FAR\) f = max\(f, builder\.renderer\.reversedDepthBuffer \?/.test(lit), "lighting.js: receivers past the far plane fade to lit (reversed and normal depth)");
ok(/farWant = farPlane\(/.test(lit) && /this\.sun\.shadow\.bias = -0\.0002 \* \(farOld - sc\.near\) \/ \(farWant - sc\.near\)/.test(lit), "lighting.js: the far plane from farPlane, the bias kept in metres");
ok(fs.existsSync(path.join(ROOT, "debug/sunStepProbe.js")), "debug/sunStepProbe.js (the browser row)");

console.log(fails ? `sunshadowstep: ${fails} FAILED` : "sunshadowstep: all checks pass");
process.exit(fails ? 1 : 0);
