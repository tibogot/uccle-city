// CLIPPED HEDGES along polylines (docs/FOLIAGE.md §3). A boxy, clipped thing: procedural in JS (the owner's rule for
// boxy items), no Blender. Per run (placement.js hedgeRuns: { points, species, height, width }):
//   BODY   the polyline smoothed and resampled every 0.4 m, a clipped-hedge cross-section swept along it (slightly
//          battered sides, rounded top corners, 12 points), lumps of a few cm (a clipped hedge is flat, not planar),
//          rounded ends; UV0 in metres (u along, v round the section). One merged mesh per species: one draw call.
//          Shading: a leaf-mass look from the shared noise in UV metres (12 cm clumps, 3 cm leaves), crevices darker,
//          bump normals, the species colour by season (beech keeps its brown leaves all winter: marcescence).
//   CARDS  leaf sprays (viewer/foliage/cards.js, coverage-preserving mips) on the surface, tilted out of it, so the
//          silhouette and the grazing view are leafy instead of a smooth box. Near only: past 14 m they SHRINK into the
//          body (by 24 m they are gone), so there is no alpha far away to crawl and nothing pops.
// Hedges cast shadows (they are big, simple solids: the body only); cards do not.
import * as THREE from "three/webgpu";
import {
  Fn, float, vec2, vec3, vec4, uniform, uv, attribute, mix, smoothstep, clamp, max, normalize, cross, dot, length, cameraPosition,
  texture, sin, cos, positionWorld, normalWorld, fwidth, cameraViewMatrix, varying, instanceIndex, select, abs, saturate,
} from "three/tsl";
import { season } from "./seasons.js";
import { wind, windAt } from "./wind.js";
import { noiseAt } from "./noise.js";
import { leafCard } from "./cards.js";
import { bumpNormal } from "../tslkit.js";

// species colours (sRGB): summer leaf, winter leaf, card size (m), card density (per m²), lumpiness (m)
const SP = {
  privet:   { summer: "#4a6a28", winter: "#45552a", card: 0.2, dens: 30, lump: 0.025, gloss: 0.55 },
  beech:    { summer: "#557a2c", winter: "#94603a", card: 0.26, dens: 24, lump: 0.035, gloss: 0.7, holds: 1 },
  hornbeam: { summer: "#5a7e30", winter: "#86643a", card: 0.25, dens: 24, lump: 0.04, gloss: 0.75, holds: 0.6 },
  laurel:   { summer: "#335722", winter: "#335222", card: 0.34, dens: 14, lump: 0.05, gloss: 0.35 },
  box:      { summer: "#3d5e25", winter: "#425228", card: 0.14, dens: 50, lump: 0.015, gloss: 0.6 },
};
export const HEDGE_SPECIES = Object.keys(SP);
export const hedgeU = { cardNear: uniform(10), cardFar: uniform(18), cards: uniform(1) };

function vnoise1(x, seed) {
  const h = (i) => { let v = Math.imul(i ^ seed, 2654435761); v ^= v >>> 15; return ((Math.imul(v, 2246822519) >>> 0) / 4294967296); };
  const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f);
  return h(i) * (1 - s) + h(i + 1) * s;
}

/** smooth 3D value noise 0..1 (world-anchored bulges: the same hedge always clips the same way) */
function vnoise3(x, y, z, seed) {
  const h = (i, j, k) => { let v = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 2147483647) ^ Math.imul(seed, 1274126177); v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) / 4294967296; };
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(h(i, j, k), h(i + 1, j, k), sx), L(h(i, j + 1, k), h(i + 1, j + 1, k), sx), sy),
           L(L(h(i, j, k + 1), h(i + 1, j, k + 1), sx), L(h(i, j + 1, k + 1), h(i + 1, j + 1, k + 1), sx), sy), sz);
}
/** a clipped hedge's face: big soft bulges (~0.6 m), clumps (~0.2 m), a little leaf-scale roughness */
function bulge(x, y, z, sp, seed) {
  return (vnoise3(x * 1.6, y * 1.6, z * 1.6, seed) - 0.5) * 2 * sp.lump * 1.6
       + (vnoise3(x * 5.5, y * 5.5, z * 5.5, seed + 3) - 0.5) * 2 * sp.lump * 0.9
       + (vnoise3(x * 17, y * 17, z * 17, seed + 9) - 0.5) * 2 * sp.lump * 0.25;
}

function smoothLine(pts, step = 0.33) {
  // moving average (window 5), then resample by arc length
  const sm = pts.map((p, i) => {
    let x = 0, z = 0, n = 0;
    for (let k = -2; k <= 2; k++) { const q = pts[Math.min(pts.length - 1, Math.max(0, i + k))]; x += q[0]; z += q[1]; n++; }
    return [x / n, z / n];
  });
  sm[0] = pts[0]; sm[sm.length - 1] = pts[pts.length - 1];
  const out = [sm[0]];
  let acc = 0;
  for (let i = 1; i < sm.length; i++) {
    const [ax, az] = sm[i - 1], [bx, bz] = sm[i], d = Math.hypot(bx - ax, bz - az);
    let t = step - acc;
    while (t <= d) { out.push([ax + (bx - ax) * (t / d), az + (bz - az) * (t / d)]); t += step; }
    acc = d - (t - step);
  }
  if (Math.hypot(out[out.length - 1][0] - sm[sm.length - 1][0], out[out.length - 1][1] - sm[sm.length - 1][1]) > 0.1) out.push(sm[sm.length - 1]);
  return out;
}

/** the clipped section: [n, y, nn, ny] (offset across, height, outward normal), for half width w, height H */
function section(w, H, split = 0.16) {
  const r = Math.min(0.14, w * 0.35, H * 0.3), wt = w * 0.9;      // top narrower (battered sides), rounded corners
  const P = [];
  P.push([-w, -0.08, -1, 0], [-w * 0.96, H * 0.4, -1, 0.05]);
  for (let k = 0; k <= 3; k++) { const a = Math.PI - (k / 3) * (Math.PI / 2); P.push([-wt + r + Math.cos(a) * r, H - r + Math.sin(a) * r, Math.cos(a), Math.sin(a)]); }
  P.push([0, H + 0.01, 0, 1]);
  for (let k = 0; k <= 3; k++) { const a = Math.PI / 2 - (k / 3) * (Math.PI / 2); P.push([wt - r + Math.cos(a) * r, H - r + Math.sin(a) * r, Math.cos(a), Math.sin(a)]); }
  P.push([w * 0.96, H * 0.4, 1, 0.05], [w, -0.08, 1, 0]);
  // denser: every segment longer than 12 cm split (the bulges need vertices to live on)
  const out = [P[0]];
  for (let k = 1; k < P.length; k++) {
    const a = P[k - 1], b = P[k], L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(L / split));
    for (let j = 1; j <= m; j++) { const t = j / m; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]); }
  }
  return out;
}

/** one run -> { pos, nrm, uv, idx } appended to `G`, plus card samples appended to `C` */
function buildRun(run, groundAt, G, C, seed, opts = {}) {
  const pts = smoothLine(run.points, opts.step ?? 0.33);
  if (pts.length < 2) return;
  const w = run.width / 2, H = run.height, sec = section(w, H, opts.split ?? 0.16), S = sec.length, sp = SP[run.species];
  // section arc length (v)
  const vlen = [0]; for (let k = 1; k < S; k++) vlen.push(vlen[k - 1] + Math.hypot(sec[k][0] - sec[k - 1][0], sec[k][1] - sec[k - 1][1]));
  // rings: rounded ends = 3 extra rings each side shrinking
  const rings = [];
  const n = pts.length;
  const tan = (i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
  let s = 0;
  const endR = Math.min(w, 0.35);
  const capRings = (i, dir) => {
    const [tx, tz] = tan(i), out = [];
    for (let k = 3; k >= 1; k--) { const th = (k / 3) * (Math.PI / 2) * 0.92; out.push({ p: [pts[i][0] + tx * dir * Math.sin(th) * endR, pts[i][1] + tz * dir * Math.sin(th) * endR], t: [tx, tz], sc: Math.cos(th), cap: true }); }
    return dir < 0 ? out : out.reverse();
  };
  rings.push(...capRings(0, -1));
  for (let i = 0; i < n; i++) rings.push({ p: pts[i], t: tan(i), sc: 1 });
  rings.push(...capRings(n - 1, 1));
  const base = G.pos.length / 3;
  let prev = null;
  for (const R of rings) {
    if (prev) s += Math.hypot(R.p[0] - prev[0], R.p[1] - prev[1]);
    prev = R.p;
    const [tx, tz] = R.t, nx = -tz, nz = tx;
    // ground: the lower of the two sides, so the hedge never floats on a slope
    const gy = Math.min(groundAt(R.p[0] + nx * w, R.p[1] + nz * w), groundAt(R.p[0] - nx * w, R.p[1] - nz * w), groundAt(R.p[0], R.p[1]));
    for (let k = 0; k < S; k++) {
      const [a, y, an, ay] = sec[k];
      const sc = R.sc;
      const off0 = a * sc, yy0 = (y > 0.2 ? y * (0.85 + 0.15 * sc) : y);
      const wx = R.p[0] + nx * off0, wz = R.p[1] + nz * off0;
      const lump = y < 0.02 ? 0 : bulge(wx, gy + yy0, wz, sp, seed) * Math.min(1, y / 0.25);
      const off = off0 + an * lump, yy = yy0 + ay * lump;
      G.pos.push(R.p[0] + nx * off, gy + yy, R.p[1] + nz * off);
      G.nrm.push(nx * an, ay, nz * an);
      G.uv.push(s, vlen[k]);
    }
  }
  const NR = rings.length;
  for (let r = 0; r < NR - 1; r++) for (let k = 0; k < S - 1; k++) {
    const a = base + r * S + k, b = a + 1, c = a + S, d = c + 1;
    G.idx.push(a, c, b, b, c, d);
  }
  // end caps: fans to the cap centre
  for (const [r, flip] of [[0, true], [NR - 1, false]]) {
    const R = rings[r], gy = groundAt(R.p[0], R.p[1]);
    const ci = G.pos.length / 3;
    G.pos.push(R.p[0], gy + H * 0.45, R.p[1]); G.nrm.push(R.t[0] * (flip ? -1 : 1), 0, R.t[1] * (flip ? -1 : 1)); G.uv.push(s, 0);
    for (let k = 0; k < S - 1; k++) { const a = base + r * S + k; if (flip) G.idx.push(ci, a, a + 1); else G.idx.push(ci, a + 1, a); }
  }
  // cards: on the surface of the main rings (not the caps' tips), density per m²
  const area = s * vlen[S - 1];
  const count = Math.round(area * sp.dens * 0.85 * (opts.cards ?? 1));
  let h = seed * 9973;
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9 | 0; return ((h >>> 0) / 4294967296); };
  for (let c = 0; c < count; c++) {
    const r = Math.floor(rnd() * (NR - 1)), k = Math.floor(rnd() * (S - 1)), fr = rnd(), fk = rnd();
    const a = base + r * S + k, P = (o, i) => G.pos[(a + o) * 3 + i], N = (o, i) => G.nrm[(a + o) * 3 + i];
    const L = (i) => (P(0, i) * (1 - fr) + P(S, i) * fr) * (1 - fk) + (P(1, i) * (1 - fr) + P(S + 1, i) * fr) * fk;
    const M = (i) => (N(0, i) * (1 - fr) + N(S, i) * fr) * (1 - fk) + (N(1, i) * (1 - fr) + N(S + 1, i) * fr) * fk;
    const y = L(1);
    if (sec[k][1] < 0.05) continue;                                 // not into the ground
    // the top corners carry more: that is where a clipped hedge's leaves stick out against the sky
    if (Math.abs(sec[k][2]) > 0.2 && Math.abs(sec[k][3]) > 0.2 ? false : rnd() < 0.25) continue;
    C.pos.push(L(0), y, L(2)); C.nrm.push(M(0), M(1), M(2)); C.rnd.push(rnd(), rnd(), rnd(), rnd());
  }
}

function speciesMaterials(name) {
  const sp = SP[name];
  const cS = uniform(new THREE.Color(sp.summer)), cW = uniform(new THREE.Color(sp.winter));
  const holds = sp.holds ?? 0;
  // the season: evergreen species barely change; beech / hornbeam: copper in autumn, brown (held) in winter
  const S = season.u;
  const winterAmt = holds ? S.beechHold.mul(holds).add(S.autumn.mul(0.6).mul(holds)).clamp(0, 1) : float(1).sub(S.leaf).mul(0.5);
  const leafC = mix(vec3(cS), vec3(cW), winterAmt);
  // BODY
  const body = new THREE.MeshStandardNodeMaterial({ roughness: sp.gloss, metalness: 0 });
  const u = uv();                                                  // metres
  const n1 = noiseAt(u, 1 / 2.2).b, n2 = noiseAt(u, 1 / 0.55).a, n3 = noiseAt(u.mul(1.3).add(5.1), 1 / 0.16).a;
  const clumps = smoothstep(0.25, 0.75, n1);
  const leaves = n2.mul(0.5).add(n3.mul(0.5));
  const crev = smoothstep(0.15, 0.55, leaves);                      // dark gaps between leaf clumps
  const snowTop = smoothstep(0.55, 0.9, normalWorld.y).mul(season.uSnow);
  // holes into the hedge's dark interior (twigs, shadow): the body reads as a mass of leaves with depth, not a
  // painted box. Polish 2026-11-11: the holes were the 1-3 cm leaf noise dipping (dotty up close); now FEWER, BIGGER,
  // SOFTER gaps from a 40 cm / 12 cm noise, a dark core with a soft rim, the edge widened by the noise's own
  // footprint (no crisp sub-pixel specks), and the share converging to its mean (~7 %) as the texel footprint grows:
  // the coverage the noise's mips would otherwise shift (the procedural form of coverage-preserving mips).
  const hN = noiseAt(u.add(vec2(3.7, 1.3)), 1 / 1.6).b.mul(0.62).add(noiseAt(u.add(vec2(0.9, 5.2)), 1 / 0.75).g.mul(0.38));
  const hE = max(fwidth(hN).mul(1.5), float(0.06));
  const hRaw = smoothstep(float(0.27).add(hE), float(0.27).sub(hE), hN);
  const hCore = smoothstep(0.24, 0.16, hN);
  const hFar = smoothstep(0.015, 0.07, length(fwidth(u)));
  const holes = mix(hRaw.mul(0.55).add(hCore.mul(0.45)), float(0.07), hFar);
  const lit = leafC.mul(mix(0.62, 1.12, crev)).mul(clumps.mul(0.3).add(0.82));
  body.colorNode = mix(mix(lit, leafC.mul(0.12), holes.mul(0.92)), vec3(0.88, 0.9, 0.94), snowTop);
  // the bump takes a smooth hole depth (no fwidth inside a height that is differentiated again: that flickered)
  body.normalNode = bumpNormal(leaves.mul(0.05).add(n1.mul(0.04)).sub(smoothstep(0.34, 0.16, hN).mul(0.05)));
  body.roughnessNode = mix(float(sp.gloss), float(0.95), float(1).sub(crev).mul(0.5));
  // CARDS
  const tex = leafCard(name);
  const card = new THREE.MeshStandardNodeMaterial({ roughness: sp.gloss, metalness: 0, side: THREE.DoubleSide });
  card.alphaToCoverage = true;
  const cpos = attribute("cpos", "vec3"), cn = normalize(attribute("cnrm", "vec3")), cr = attribute("crnd", "vec4");
  const dist = length(cpos.sub(cameraPosition));
  const grow = float(1).sub(smoothstep(hedgeU.cardNear, hedgeU.cardFar, dist)).mul(hedgeU.cards);
  // card basis: tilted out of the surface by 25-65 degrees around a random axis in the surface plane
  const up = select(abs(cn.y).greaterThan(0.9), vec3(1, 0, 0), vec3(0, 1, 0));
  const t1 = normalize(cross(up, cn)), t2 = cross(cn, t1);
  const ang = cr.x.mul(6.2832), ca = cos(ang), sa = sin(ang);
  const ax = t1.mul(ca).add(t2.mul(sa)), ay = t2.mul(ca).sub(t1.mul(sa));
  const tilt = cr.y.mul(0.7).add(0.45);
  const cardN = normalize(cn.mul(cos(tilt)).add(ay.mul(sin(tilt))));
  const cardY = normalize(cross(cardN, ax));
  const size = float(sp.card).mul(cr.z.mul(0.5).add(0.75)).mul(grow);
  const p = attribute("position", "vec3");                        // quad -0.5..0.5 in x, y
  const w = windAt(cpos.xz);
  const flick = sin(wind.uTime.mul(5.0).add(cr.w.mul(40))).mul(w.z.mul(0.02).add(0.004));
  card.positionNode = cpos.add(cn.mul(size.mul(0.42))).add(ax.mul(p.x.mul(size))).add(cardY.mul(p.y.add(0.35).mul(size))).add(vec3(flick, 0, flick));
  const a = texture(tex, uv());
  // alpha to coverage, sharpened around 0.5 by its own screen derivative (Golus) on a coverage-preserving chain
  card.opacityNode = saturate(a.a.sub(0.5).div(max(fwidth(a.a), 1e-4)).add(0.5));
  const vShade = varying(cr.w.mul(0.3).add(0.8), "v_hS");
  card.colorNode = mix(leafC.mul(a.r).mul(vShade).mul(1.08), vec3(0.88, 0.9, 0.94), season.uSnow.mul(smoothstep(0.3, 0.9, cn.y)));
  // lighting normal: mostly the hedge's surface normal (a coherent mass), a little of the card's own
  const nW = normalize(mix(cn, cardN, 0.35));
  card.normalNode = normalize(cameraViewMatrix.mul(vec4(varying(nW, "v_hN"), 0)).xyz);
  return { body, card };
}

/** Build every hedge run: { group, stats }. `groundAt(x, z)` = the ground height the hedges stand on. */
/** opts (the front gardens' city hedges, viewer/gardens/cityGardens.js): { step: ring spacing (m, 0.33), split: section
 *  point spacing (m, 0.16), cards: card density factor (1) } */
export function buildHedges(runs, groundAt, opts = {}) {
  const group = new THREE.Group(); group.name = "hedges";
  const stats = { runs: runs.length, metres: 0, tris: 0, cards: 0, draws: 0, bySpecies: {} };
  const quad = new THREE.PlaneGeometry(1, 1);
  for (const name of HEDGE_SPECIES) {
    const mine = runs.filter((r) => r.species === name);
    if (!mine.length) continue;
    const G = { pos: [], nrm: [], uv: [], idx: [] }, C = { pos: [], nrm: [], rnd: [] };
    mine.forEach((r, i) => { buildRun(r, groundAt, G, C, Math.floor((r.points[0][0] * 31 + r.points[0][1] * 17) * 10) + i, opts); stats.metres += r.points.length * 0.5; });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(G.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(G.nrm, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(G.uv, 2));
    g.setIndex(G.idx);
    g.computeVertexNormals();                                      // lumps included
    const M = speciesMaterials(name);
    const body = new THREE.Mesh(g, M.body); body.castShadow = body.receiveShadow = true; body.name = "hedge_" + name;
    const ig = new THREE.InstancedBufferGeometry();
    ig.index = quad.index; ig.setAttribute("position", quad.attributes.position); ig.setAttribute("uv", quad.attributes.uv);
    ig.setAttribute("cpos", new THREE.InstancedBufferAttribute(new Float32Array(C.pos), 3));
    ig.setAttribute("cnrm", new THREE.InstancedBufferAttribute(new Float32Array(C.nrm), 3));
    ig.setAttribute("crnd", new THREE.InstancedBufferAttribute(new Float32Array(C.rnd), 4));
    ig.instanceCount = C.pos.length / 3;
    const cards = new THREE.Mesh(ig, M.card); cards.frustumCulled = false; cards.receiveShadow = true; cards.castShadow = false; cards.name = "hedge_cards_" + name;
    group.add(body, cards);
    stats.tris += G.idx.length / 3; stats.cards += ig.instanceCount; stats.draws += 2;
    stats.bySpecies[name] = { runs: mine.length, cards: ig.instanceCount, tris: G.idx.length / 3 };
  }
  return { group, stats };
}
