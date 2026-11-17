// THIN LINES ON THE PLAYER CAR'S REAR (claude/policerear, TODO 8c, docs/POLICEREAR.md): what the default chase camera
// sees of a cars2 car (LOD 0, the model the player's car draws) and which of it is THINNER than the TAAU can hold. Under
// the TAAU a feature narrower than ~1-2 internal pixels is hit by some jitter phases and missed by others; the resolve
// clips the history to the current frame's 3 x 3 neighbourhood, so in a phase whose 9 samples all miss it, it is clipped
// OUT of the history and comes back later: it blinks / crawls, worst while the car moves on screen by sub-pixel amounts
// (suspension, the camera's eased swing) ("bad lines while moving"). An ordinary edge always has both colours in its
// neighbourhood: it does not. Offline, from the GLB, no render:
//   - the car's albedo (sRGB of the vertex colour; the unmarked dark paint or the marked white) rasterised x8 per pixel
//     axis with a depth buffer (the player's glass is solid: interior hidden), from the chase camera;
//   - per output pixel, the 16 Halton jitter phases' point samples: their std (all edges) and the CLAMP MISS: per class
//     truly covering >= 5 % of the pixel, the share of phases whose whole 3 x 3 neighbourhood misses it x its coverage x
//     its contrast (the thin-line flicker);
//   - SPECULAR LINES: smooth-shaded triangles < `--px` px wide whose vertex normals turn > 20 deg across them (a bevel or
//     crease: under a 0.05 clear coat it reflects the sky as a sub-pixel bright line).
// --plate-texture: the plate as the player's car draws it (viewer/police/plateDecal.js): a pre-filtered texture, so the
// modelled characters / border / band are not thin features any more.
//   node tools/cars/rearThin.mjs [models/cars/cars2.glb] [--car estate,police] [--H 864] [--fov 61] [--px 1.25] [--plate-texture] [--json]
import fs from "fs";
import { fileURLToPath } from "node:url";
import { parseCarGlb } from "../../viewer/drive/carLod.js";

// the chase camera (viewer/drive/chaseCamera.js CAR_CAM.chase): 6.0 m behind the car's root, 2.0 m up, aiming 5.5 m
// ahead at 1.15 m. The car's frame: +z forward, y up from the ground.
const CAM = [0, 2.0, -6.0], AIM = [0, 1.15, 5.5];
const PAINTS = { estate: [0x1c, 0x23, 0x2c], police: null };     // the unmarked police paint (policeCar.js POLICE_CAR); marked keeps its own
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };

export function analyse({ file = "models/cars/cars2.glb", cars: CARS = ["estate", "police"], H = 864, fovDeg = 61, thin: THIN = 1.25, ss: SS = 8, plateTexture = false } = {}) {
const FOV = fovDeg * Math.PI / 180, W = Math.round(H * 16 / 9);
const b = fs.readFileSync(file);
const cars = parseCarGlb(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));

// camera basis
const sub = (a, c) => [a[0] - c[0], a[1] - c[1], a[2] - c[2]], dot = (a, c) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2];
const cross = (a, c) => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const fw = norm(sub(AIM, CAM)), rt = norm(cross(fw, [0, 1, 0])), up = cross(rt, fw);
const f = 1 / Math.tan(FOV / 2);
/** world point -> [px x, px y, depth] (depth <= 0: behind) */
const proj = (p) => { const d = sub(p, CAM), z = dot(d, fw); return [(dot(d, rt) * f / z * (H / W) * 0.5 + 0.5) * W, (0.5 - dot(d, up) * f / z * 0.5) * H, z]; };

/** the albedo class of a vertex (kind + colour), and its luminance on the car */
function classOf(k, c, paint) {
  const K = Math.round(k), [r, g, bl] = c, Y = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  if (K === 1) return Y < 0.2 ? ["seam", Y * paint] : ["paint", Y * paint];
  if (K === 3) return ["tail lens", Y];
  if (K === 2) return ["head lamp", Y];
  if (K === 4) return ["glass", Y];
  if (K === 5) return ["chrome", Y];
  if (K === 6) return ["rubber", Y];
  if (K === 7) return ["plate", Y];
  if (K === 8) return ["interior", Y];
  if (r > 0.3 && g < 0.06 && bl < 0.06) return ["plate red", Y];
  if (bl > 0.15 && r < 0.05) return ["blue (plate band / livery)", Y];
  if (r > 0.6 && g > 0.6) return ["white / reversing", Y];
  if (r > 0.6 && g > 0.25 && bl < 0.1) return ["amber / yellow", Y];
  return ["black trim / gloss", Y];
}

const srgb = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
// Halton (2, 3), 16 phases, as the TAAU's jitter (viewer/upscale.js)
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
const JIT = Array.from({ length: 16 }, (_, i) => [halton(i + 1, 2) - 0.5, halton(i + 1, 3) - 0.5]);

const report = {};
for (const id of CARS) {
  const car = cars.find((c) => c.id === id);
  if (!car) { console.log(`no car ${id}`); continue; }
  const pr = PAINTS[id] ? PAINTS[id].map(lin) : (car.extras.paint || [0.8, 0.8, 0.79]);
  const paintY = 0.2126 * pr[0] + 0.7152 * pr[1] + 0.0722 * pr[2];
  const part = car.parts.find((p) => p.name === "Body");
  const { P, N, C, K, I } = part.mesh;
  const cs = C.length / (P.length / 3);
  const pos = (v) => [P[v * 3] + part.pos[0], P[v * 3 + 1] + part.pos[1], P[v * 3 + 2] + part.pos[2]];
  const col = (v) => [C[v * cs], C[v * cs + 1], C[v * cs + 2]];
  const nt = I.length / 3;
  let zMin = Infinity; for (let i = 2; i < P.length; i += 3) zMin = Math.min(zMin, P[i] + part.pos[2]);
  // screen triangles
  const tri = [];
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let t = 0; t < nt; t++) {
    const v = [I[t * 3], I[t * 3 + 1], I[t * 3 + 2]], p = v.map(pos);
    const n = norm(cross(sub(p[1], p[0]), sub(p[2], p[0])));
    const cen = [(p[0][0] + p[1][0] + p[2][0]) / 3, (p[0][1] + p[1][1] + p[2][1]) / 3, (p[0][2] + p[1][2] + p[2][2]) / 3];
    if (dot(n, sub(CAM, cen)) <= 0) continue;
    const s = p.map(proj);
    if (s.some((q) => q[2] < 0.3)) continue;
    const [cl, Y] = classOf(K[v[0]], col(v[0]), paintY);
    // the player's car glass is solid tinted under the TAAU (carPacks.js playerSeeThrough): the interior is hidden
    if (cl === "interior") continue;
    // the plate as a texture: its modelled detail (characters, border, band) is under the quad, the quad pre-filtered
    if (plateTexture && cen[2] < zMin + 0.6 && Math.abs(cen[0]) < 0.3 && ["plate", "plate red", "blue (plate band / livery)"].includes(cl)) {
      if (cl !== "plate") continue;
      tri.push({ t, s, cl: "plate (texture)", Y: srgb(0.62), v });
      for (const q of s) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
      continue;
    }
    tri.push({ t, s, cl, Y: srgb(Y), v });
    for (const q of s) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
  }
  // the rear: the screen rows below the roof's rear edge; keep the whole car box, crop to the frame
  x0 = Math.max(0, Math.floor(x0) - 1); y0 = Math.max(0, Math.floor(y0) - 1); x1 = Math.min(W, Math.ceil(x1) + 1); y1 = Math.min(H, Math.ceil(y1) + 1);
  const bw = (x1 - x0) * SS, bh = (y1 - y0) * SS;
  const zb = new Float32Array(bw * bh).fill(Infinity), lum = new Float32Array(bw * bh).fill(-1), cid = new Int16Array(bw * bh).fill(-1);
  const classes = [];
  const cidOf = (c) => { let i = classes.indexOf(c); if (i < 0) { classes.push(c); i = classes.length - 1; } return i; };
  for (const T of tri) {
    const q = T.s.map(([x, y, z]) => [(x - x0) * SS, (y - y0) * SS, z]);
    const minx = Math.max(0, Math.floor(Math.min(q[0][0], q[1][0], q[2][0]))), maxx = Math.min(bw - 1, Math.ceil(Math.max(q[0][0], q[1][0], q[2][0])));
    const miny = Math.max(0, Math.floor(Math.min(q[0][1], q[1][1], q[2][1]))), maxy = Math.min(bh - 1, Math.ceil(Math.max(q[0][1], q[1][1], q[2][1])));
    const A = (q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[2][0] - q[0][0]) * (q[1][1] - q[0][1]);
    if (Math.abs(A) < 1e-9) continue;
    const c = cidOf(T.cl);
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((q[1][0] - px) * (q[2][1] - py) - (q[2][0] - px) * (q[1][1] - py)) / A;
      const w1 = ((q[2][0] - px) * (q[0][1] - py) - (q[0][0] - px) * (q[2][1] - py)) / A;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = w0 * q[0][2] + w1 * q[1][2] + w2 * q[2][2], i = y * bw + x;
      if (z < zb[i] - 1e-5) { zb[i] = z; lum[i] = T.Y; cid[i] = c; }
    }
  }
  // per output pixel: the 16 jitter phases' point samples (the TAAU's input) -> their std = the flicker the history
  // must average away; attributed to the pair of classes it alternates between
  const out = { car: id, paintY: +paintY.toFixed(3), visibleTris: tri.length, box: [x0, y0, x1 - x0, y1 - y0], jitterStd: {}, total: 0, spec: {} };
  const ow = x1 - x0, oh = y1 - y0;
  for (let oy = 0; oy < oh; oy++) for (let ox = 0; ox < ow; ox++) {
    let s = 0, s2 = 0, n = 0; const seen = new Set();
    for (const [jx, jy] of JIT) {
      const sx = Math.min(bw - 1, Math.floor((ox + 0.5 + jx) * SS)), sy = Math.min(bh - 1, Math.floor((oy + 0.5 + jy) * SS)), i = sy * bw + sx;
      if (cid[i] < 0) continue;                   // the background: not the car's
      s += lum[i]; s2 += lum[i] * lum[i]; n++; seen.add(cid[i]);
    }
    if (n < 16 || seen.size < 2) continue;
    const sd = Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2));
    const k = [...seen].map((c) => classes[c]).sort().join(" | ");
    out.jitterStd[k] = (out.jitterStd[k] || 0) + sd; out.total += sd;
  }
  // THE CLAMP MISS (what makes a thin line flicker under the TAAU, unlike an ordinary edge): the resolve clips the
  // history to the current frame's 3 x 3 neighbourhood; when a class that truly covers part of a pixel is absent from all
  // 9 point samples of a jitter phase, its colour is clipped out of the history that frame and comes back later. Per
  // class: sum over pixels of coverage x the share of phases that miss it x its contrast to the pixel's other colour.
  const ph = JIT.map(([jx, jy]) => {
    const im = new Int16Array(ow * oh), ly = new Float32Array(ow * oh);
    for (let oy = 0; oy < oh; oy++) for (let ox = 0; ox < ow; ox++) {
      const sx = Math.min(bw - 1, Math.floor((ox + 0.5 + jx) * SS)), sy = Math.min(bh - 1, Math.floor((oy + 0.5 + jy) * SS)), i = sy * bw + sx;
      im[oy * ow + ox] = cid[i]; ly[oy * ow + ox] = lum[i];
    }
    return im;
  });
  out.clampMiss = {}; out.missTotal = 0;
  const cov = new Float32Array(classes.length + 1), cy = new Float32Array(classes.length + 1);
  for (let oy = 1; oy < oh - 1; oy++) for (let ox = 1; ox < ow - 1; ox++) {
    cov.fill(0); cy.fill(0);
    let tot = 0, ysum = 0;
    for (let sy = oy * SS; sy < (oy + 1) * SS; sy++) for (let sx = ox * SS; sx < (ox + 1) * SS; sx++) {
      const i = sy * bw + sx; if (cid[i] < 0) continue;
      cov[cid[i]]++; cy[cid[i]] += lum[i]; tot++; ysum += lum[i];
    }
    if (tot < SS * SS) continue;                  // car pixels only
    for (let c = 0; c < classes.length; c++) {
      if (!cov[c] || cov[c] === tot) continue;
      const share = cov[c] / tot, yc = cy[c] / cov[c], yo = (ysum - cy[c]) / (tot - cov[c]);
      if (share < 0.05 || Math.abs(yc - yo) < 0.02) continue;
      let miss = 0;
      for (const im of ph) {
        let hit = false;
        for (let dy = -1; dy <= 1 && !hit; dy++) for (let dx = -1; dx <= 1; dx++) if (im[(oy + dy) * ow + ox + dx] === c) { hit = true; break; }
        if (!hit) miss++;
      }
      if (!miss) continue;
      const v = share * (miss / ph.length) * Math.abs(yc - yo);
      out.clampMiss[classes[c]] = (out.clampMiss[classes[c]] || 0) + v; out.missTotal += v;
    }
  }
  for (const k of Object.keys(out.clampMiss)) out.clampMiss[k] = +out.clampMiss[k].toFixed(2);
  out.missTotal = +out.missTotal.toFixed(2);
  // specular lines: smooth-shaded sub-pixel strips of a glossy class whose normals turn > 20 deg across them
  for (const T of tri) {
    if (!["paint", "seam", "glass", "chrome", "black trim / gloss"].includes(T.cl)) continue;
    const s = T.s, L = [0, 1, 2].map((e) => Math.hypot(s[(e + 1) % 3][0] - s[e][0], s[(e + 1) % 3][1] - s[e][1]));
    const area = Math.abs((s[1][0] - s[0][0]) * (s[2][1] - s[0][1]) - (s[2][0] - s[0][0]) * (s[1][1] - s[0][1])) / 2;
    const Lmax = Math.max(...L), width = (2 * area) / Lmax;
    if (width >= THIN || Lmax < 1) continue;
    const vn = T.v.map((q) => norm([N[q * 3], N[q * 3 + 1], N[q * 3 + 2]]));
    const turn = Math.acos(Math.min(1, Math.min(dot(vn[0], vn[1]), dot(vn[1], vn[2]), dot(vn[0], vn[2])))) * 180 / Math.PI;
    if (turn > 20) { const r = (out.spec[T.cl] ||= { tris: 0, px: 0 }); r.tris++; r.px += Lmax; }
  }
  for (const r of Object.values(out.spec)) r.px = Math.round(r.px);
  for (const k of Object.keys(out.jitterStd)) out.jitterStd[k] = +(out.jitterStd[k]).toFixed(1);
  out.total = +out.total.toFixed(1);
  const rear = [0, 0.8, -2.4], d = Math.hypot(...sub(rear, CAM));
  out.rear_m = +d.toFixed(2); out.mmPerPx = +(2 * d * Math.tan(FOV / 2) / H * 1000).toFixed(1);
  report[id] = out;
}
return { report, H, fovDeg };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const { report, H, fovDeg } = analyse({ file: argv[0] && !argv[0].startsWith("--") ? argv[0] : "models/cars/cars2.glb", cars: arg("--car", "estate,police").split(","),
  H: +arg("--H", 864), fovDeg: +arg("--fov", 61), thin: +arg("--px", 1.25), ss: +arg("--ss", 8), plateTexture: argv.includes("--plate-texture") });
const THIN = +arg("--px", 1.25), FOV = fovDeg * Math.PI / 180;
if (argv.includes("--json")) console.log(JSON.stringify(report, null, 1));
else for (const r of Object.values(report)) {
  console.log(`
${r.car}: paint luminance ${r.paintY}, ${r.visibleTris} visible triangles, car box ${r.box[2]} x ${r.box[3]} px, rear at ${r.rear_m} m = ${r.mmPerPx} mm / px (H ${H}, fov ${(FOV * 180 / Math.PI).toFixed(0)})`);
  console.log(`  albedo flicker under the 16 jitter phases (sum over pixels of the std of sRGB albedo; total ${r.total}), by the classes it alternates between:`);
  for (const [k, v] of Object.entries(r.jitterStd).sort((a, c) => c[1] - a[1]).slice(0, 14)) console.log(`    ${k.padEnd(44)} ${String(v).padStart(7)}  ${(100 * v / r.total).toFixed(0).padStart(3)} %`);
  console.log(`  CLAMP MISS (thin features absent from a jitter phase's whole 3 x 3 neighbourhood: clipped out of the history; total ${r.missTotal}):`);
  for (const [k, v] of Object.entries(r.clampMiss).sort((a, c) => c[1] - a[1]).slice(0, 10)) console.log(`    ${k.padEnd(44)} ${String(v).padStart(7)}  ${(100 * v / r.missTotal).toFixed(0).padStart(3)} %`);
  console.log(`  specular lines < ${THIN} px wide, normals turning > 20 deg across (class: triangles, screen length px):`);
  for (const [k, v] of Object.entries(r.spec).sort((a, c) => c[1].px - a[1].px)) console.log(`    ${k.padEnd(28)} ${String(v.tris).padStart(5)}  ${String(v.px).padStart(6)} px`);
}
}
