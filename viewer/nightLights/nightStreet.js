// THE NIGHT TEST STREET (labs/night-lab.html): a Brussels street of the Uccle kind, built in code (boxy things are
// procedural in JS: docs memory "Blender quality bar"), with every kind of night light source placed on it:
//   north side: row houses behind 4 m front gardens (lawn, hedge), lit windows that spill onto the gardens
//   south side: houses with shops on the ground floor (lit shop fronts, lit signs), straight onto the sidewalk
//   the street: 2.5 m sidewalks, kerbs, parking lanes, two traffic lanes, a tram track on setts in the middle
// Everything is a few InstancedMeshes. The SOURCES (lamps, windows, shops, signs) come back as flat typed arrays for
// the light selection (lightSelect.js). Seeded hash: the same street every time.
//
// WET / DRY: wetSurface() darkens porous albedo, drops roughness (a water film: the clustered lights' GGX highlights
// stretch into the long streaks of a wet night street), adds puddles (mirror-smooth, a little metalness so the post
// chain's SSR, viewer/post.js, reflects the lit windows and signs). Driven by `wet.uWet` / `wet.uPuddle`, the same
// meaning as the weather lab's wx.uWet / wx.uPuddle (branch claude/weather viewer/weather/weatherState.js): call
// useWeather(wx) BEFORE buildStreet() and the street follows the weather (or replace wetSurface with its weatherize()).
import * as THREE from "three/webgpu";
import {
  Fn, uniform, float, vec2, vec3, mix, smoothstep, positionWorld, normalWorld, abs, max, min, fract, floor, fwidth, clamp, select,
  instancedBufferAttribute, texture, uv, color,
} from "three/tsl";
import { noise2D, hash2D, filteredPulse } from "../tslkit.js";

export const wet = { uWet: uniform(0), uPuddle: uniform(0) };
/** Take the weather lab's uniforms (wx.uWet, wx.uPuddle) instead of ours: call before buildStreet(). */
export function useWeather(wx) { if (wx?.uWet) wet.uWet = wx.uWet; if (wx?.uPuddle) wet.uPuddle = wx.uPuddle; }

// cross-section (z, m): + = south. Traffic drives on the right: +x on z > 0
export const X = { half: 200, carWrap: 262 };
export const Z = { tram: 1.6, lane: 3.2, park: 5.8, kerb: 6.8, walk: 9.3, garden: 13.3, lampOff: 7.35, rail: 0.7175 };
export const WALK_Y = 0.12;

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** wet film + puddles over a dry material (colorNode / roughness). porosity: how much water darkens it. */
export function wetSurface(m, { porosity = 0.5, puddles = true, floor: isFloor = true } = {}) {
  const P = positionWorld;
  const baseCol = m.colorNode ?? vec3(m.color.r, m.color.g, m.color.b);
  const baseRough = m.roughnessNode ?? float(m.roughness);
  const w = clamp(wet.uWet.mul(isFloor ? 1 : 0.55), 0, 1);
  let col = baseCol.mul(float(1).sub(w.mul(porosity).mul(0.6)));
  let rough = mix(baseRough, baseRough.mul(0.25).add(0.07), w);
  let metal = float(m.metalness ?? 0).max(w.mul(0.1));
  if (puddles) {
    const low = noise2D(P.xz.mul(0.27)).mul(0.6).add(noise2D(P.xz.mul(1.3).add(3.1)).mul(0.28)).add(noise2D(P.xz.mul(4.1).add(7.7)).mul(0.12));
    const e = fwidth(low).add(0.004), level = wet.uPuddle.mul(0.52);
    const pud = smoothstep(level.add(e), level.sub(e), low).mul(wet.uPuddle.greaterThan(0.001).select(1, 0));
    col = mix(col, col.mul(0.45), pud);
    rough = mix(rough, float(0.03), pud);
    metal = mix(metal, float(0.45), pud);
  }
  m.colorNode = col; m.roughnessNode = rough; m.metalnessNode = metal;
  return m;
}

const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);

/** -> { group, sources: { lamps, windows, shops, signs }, parkSlots, trees } */
export function buildStreet(lampModel, { seed = 7 } = {}) {
  const R = rng(seed);
  const group = new THREE.Group(); group.name = "night-street";
  const L = X.half * 2 + 160;

  // ---------------------------------------------------------------- ground: asphalt, setts, kerbs, sidewalks, gardens
  const asphalt = new THREE.MeshStandardNodeMaterial({ roughness: 0.86, metalness: 0 });
  asphalt.colorNode = vec3(0.075, 0.075, 0.08).mul(noise2D(positionWorld.xz.mul(1.7)).mul(0.25).add(0.88)).mul(noise2D(positionWorld.xz.mul(0.13)).mul(0.2).add(0.9));
  wetSurface(asphalt, { porosity: 0.55 });
  const setts = new THREE.MeshStandardNodeMaterial({ roughness: 0.78 });
  {
    const p = positionWorld.xz.div(vec2(0.14, 0.11)), w = fwidth(p.x).add(fwidth(p.y));
    const row = floor(p.y), jx = p.x.add(hash2D(vec2(row, 3)).mul(0.5));
    const joint = filteredPulse(jx, 0.06, 0.94, w).mul(filteredPulse(p.y, 0.08, 0.92, w));
    const tone = hash2D(vec2(floor(jx), row)).mul(0.25).add(0.75);
    setts.colorNode = mix(vec3(0.05, 0.048, 0.045), vec3(0.2, 0.19, 0.175).mul(tone), joint);
  }
  wetSurface(setts, { porosity: 0.35 });
  const slabs = new THREE.MeshStandardNodeMaterial({ roughness: 0.8 });
  {
    const p = positionWorld.xz.div(0.3), w = fwidth(p.x).add(fwidth(p.y));
    const j = filteredPulse(p.x, 0.03, 0.97, w).mul(filteredPulse(p.y, 0.03, 0.97, w));
    slabs.colorNode = vec3(0.34, 0.33, 0.31).mul(mix(float(0.7), hash2D(floor(p)).mul(0.12).add(0.94), j));
  }
  wetSurface(slabs, { porosity: 0.5 });
  const kerbM = new THREE.MeshStandardNodeMaterial({ color: 0x6d6b66, roughness: 0.6 });
  wetSurface(kerbM, { porosity: 0.3, puddles: false });
  const grass = new THREE.MeshStandardNodeMaterial({ roughness: 0.95 });
  grass.colorNode = vec3(0.05, 0.09, 0.03).mul(noise2D(positionWorld.xz.mul(2.3)).mul(0.5).add(0.75));
  wetSurface(grass, { porosity: 0.25, puddles: false });
  const steel = new THREE.MeshStandardNodeMaterial({ color: 0x8c8a86, roughness: 0.28, metalness: 0.9 });
  const add = (geo, mat, shadow = true) => { const o = new THREE.Mesh(geo, mat); o.receiveShadow = true; o.castShadow = false; group.add(o); return o; };
  const plane = (x0, x1, z0, z1, y, mat) => add(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2), mat);
  plane(-L / 2, L / 2, -Z.kerb, -Z.tram, 0, asphalt);
  plane(-L / 2, L / 2, Z.tram, Z.kerb, 0, asphalt);
  plane(-L / 2, L / 2, -Z.tram, Z.tram, 0.005, setts);
  for (const s of [-1, 1]) {
    add(box(L, 0.13, 0.22, 0, 0, s * (Z.kerb + 0.11)), kerbM);
    plane(-L / 2, L / 2, s > 0 ? Z.kerb + 0.22 : -Z.walk, s > 0 ? Z.walk : -Z.kerb - 0.22, WALK_Y, slabs);
    for (const r of [Z.rail + 0.035, -Z.rail - 0.035]) plane(-L / 2, L / 2, r - 0.035, r + 0.035, 0.012, steel);
  }
  plane(-L / 2, L / 2, -Z.garden - 30, -Z.walk, WALK_Y - 0.01, grass);           // gardens (and behind the houses)
  plane(-L / 2, L / 2, Z.walk, Z.walk + 40, WALK_Y - 0.01, slabs);                 // behind the south houses (unseen)

  // ---------------------------------------------------------------- houses
  const houses = [];      // { x0, x1, h, side, shop }
  for (const side of [-1, 1]) {
    let x = -X.half;
    while (x < X.half) {
      const w = 5.4 + R() * 2.6, h = 8.2 + Math.floor(R() * 3) * 2.9 + R() * 0.8;
      houses.push({ x0: x, x1: x + w, h, side, shop: side > 0 && R() < 0.42, tone: R(), kind: R() });
      x += w;
    }
  }
  const hn = houses.length;
  const brick = new THREE.MeshStandardNodeMaterial({ roughness: 0.85 });
  const aTone = new THREE.InstancedBufferAttribute(new Float32Array(hn * 3), 3);
  {
    // brick courses (facades and gables): 22 x 6.5 cm, or a smooth render, per house tone
    const n = normalWorld, u = select(abs(n.z).greaterThan(0.5), positionWorld.x, positionWorld.z);
    const p = vec2(u.div(0.22), positionWorld.y.div(0.065)), w = fwidth(p.x).add(fwidth(p.y));
    const off = fract(floor(p.y).mul(0.5)).mul(1.0);
    const mortar = filteredPulse(p.x.add(off), 0.05, 0.95, w).mul(filteredPulse(p.y, 0.12, 0.88, w));
    const tone = instancedBufferAttribute(aTone);
    const bk = mix(vec3(0.62, 0.6, 0.55), tone.mul(hash2D(floor(vec2(p.x.add(off), p.y))).mul(0.25).add(0.82)), mortar);
    brick.colorNode = bk;
  }
  wetSurface(brick, { porosity: 0.4, puddles: false, floor: false });
  const roofM = new THREE.MeshStandardNodeMaterial({ color: 0x2b2a2e, roughness: 0.6 });
  const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), brick, hn);
  const roofGeo = (() => {                       // a pitched roof prism, ridge along x, unit size
    const g = new THREE.BufferGeometry();
    const v = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 1, 0, -0.5, 1, 0, -0.5, 0, 0.5, 0.5, 0, 0.5];
    const idx = [0, 3, 2, 0, 2, 1, 4, 5, 2, 4, 2, 3, 0, 4, 3, 1, 2, 5];
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx);
    const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng;
  })();
  const roofs = new THREE.InstancedMesh(roofGeo, roofM, hn);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), V = new THREE.Vector3(), Sc = new THREE.Vector3();
  const TONES = [[0.42, 0.17, 0.11], [0.5, 0.24, 0.15], [0.36, 0.15, 0.1], [0.62, 0.5, 0.38], [0.72, 0.68, 0.6], [0.55, 0.3, 0.2], [0.3, 0.13, 0.09]];
  houses.forEach((hs, i) => {
    const w = hs.x1 - hs.x0, depth = 10, zf = hs.side < 0 ? -Z.garden : Z.walk;
    const zc = zf + hs.side * depth / 2;
    M.compose(V.set((hs.x0 + hs.x1) / 2, 0, zc), q.identity(), Sc.set(w - 0.02, hs.h, depth));
    bodies.setMatrixAt(i, M);
    M.compose(V.set((hs.x0 + hs.x1) / 2, hs.h, zc), q.identity(), Sc.set(w - 0.02, 2.2 + hs.kind * 1.6, depth + 0.6));
    roofs.setMatrixAt(i, M);
    const t = TONES[Math.floor(hs.tone * TONES.length)];
    aTone.setXYZ(i, t[0], t[1], t[2]);
  });
  bodies.geometry.setAttribute("aTone", aTone);
  for (const m of [bodies, roofs]) { m.castShadow = m.receiveShadow = true; group.add(m); }

  // ---------------------------------------------------------------- windows, doors, shop fronts (one instanced quad)
  // aLit: emissive colour (0 = dark); aKind: 0 window, 1 door, 2 shop front; aSize: (w, h) for the frame width in metres
  const openings = [];
  const windows = [], shops = [], signs = [];
  const WARM = [[1.0, 0.72, 0.42], [1.0, 0.62, 0.32], [1.0, 0.8, 0.55], [0.95, 0.85, 0.7]], COOL = [0.55, 0.65, 1.0];
  for (const hs of houses) {
    const w = hs.x1 - hs.x0, zf = (hs.side < 0 ? -Z.garden : Z.walk) - hs.side * 0.03, floors = Math.floor((hs.h - 0.6) / 2.9);
    const nWin = w > 7 ? 3 : 2;
    for (let f = 0; f < floors; f++) {
      const y0 = 0.9 + f * 2.9;
      if (f === 0 && hs.shop) {
        const sw = w - 2.4, sx = (hs.x0 + hs.x1) / 2 - 0.4;
        const col = R() < 0.25 ? [0.85, 0.93, 1.0] : [1.0, 0.86, 0.66];
        openings.push({ x: sx, y: 0.35, z: zf, w: sw, h: 2.6, kind: 2, lit: col.map((c) => c * 1.6), side: hs.side });
        openings.push({ x: hs.x1 - 1.0, y: 0.15, z: zf, w: 0.95, h: 2.2, kind: 1, lit: [0, 0, 0], side: hs.side });
        shops.push({ x: sx, y: 1.65, z: zf, hw: sw / 2, hh: 1.3, side: hs.side, col });
        signs.push({ x: sx, y: 3.25, z: zf - hs.side * 0.12, w: Math.min(sw, 4.2), side: hs.side, label: Math.floor(R() * 6) });
        continue;
      }
      for (let k = 0; k < nWin; k++) {
        let x = hs.x0 + (k + 0.5) * (w / nWin);
        if (f === 0 && k === nWin - 1) { openings.push({ x, y: 0.15, z: zf, w: 1.0, h: 2.3, kind: 1, lit: [0, 0, 0], side: hs.side }); continue; }
        const lit = R() < (f === 0 ? 0.55 : 0.35);
        const tv = lit && R() < 0.12;
        const c = tv ? COOL : WARM[Math.floor(R() * WARM.length)], b = lit ? 0.6 + R() * 0.7 : 0;
        const o = { x, y: y0, z: zf, w: 1.1, h: 1.55, kind: 0, lit: c.map((v) => v * b), side: hs.side };
        openings.push(o);
        // the ground floor's lit windows light the garden / sidewalk (upper ones: mostly the facade below and the far side)
        if (lit && f === 0) windows.push({ x, y: y0 + 0.78, z: zf, hw: 0.55, hh: 0.78, side: hs.side, col: c, b });
      }
    }
  }
  const on = openings.length;
  const aLit = new THREE.InstancedBufferAttribute(new Float32Array(on * 3), 3);
  const aKind = new THREE.InstancedBufferAttribute(new Float32Array(on * 3), 3);
  const quad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  quad.setAttribute("aLit", aLit); quad.setAttribute("aKind", aKind);
  const glassM = new THREE.MeshStandardNodeMaterial({ roughness: 0.08, metalness: 0.0 });
  {
    const lit = instancedBufferAttribute(aLit), kd = instancedBufferAttribute(aKind);
    const kind = kd.x, sz = vec2(kd.y, kd.z), U = uv().mul(sz);                      // metres across the opening
    const e = min(min(U.x, sz.x.sub(U.x)), min(U.y, sz.y.sub(U.y)));                 // distance to the edge (m)
    const frame = smoothstep(0.075, 0.06, e).max(kind.lessThan(0.5).select(float(1).sub(smoothstep(0.02, 0.035, abs(U.x.sub(sz.x.mul(0.5))))).max(float(1).sub(smoothstep(0.02, 0.035, abs(U.y.sub(sz.y.mul(0.68)))))), float(0)));
    const isDoor = kind.greaterThan(0.5).and(kind.lessThan(1.5));
    // inside a lit room: curtains (a soft vertical fold pattern), brighter at the top (a ceiling lamp); the shop: shelves
    const fold = noise2D(vec2(U.x.mul(9), 0.5)).mul(0.35).add(0.75);
    const shelves = kind.greaterThan(1.5).select(filteredPulse(U.y.div(0.45), 0.0, 0.8, fwidth(U.y.div(0.45))).mul(0.35).add(0.65), fold);
    const glow = lit.mul(shelves).mul(mix(float(0.75), float(1.15), uv().y));
    const glass = vec3(0.02, 0.025, 0.03);
    glassM.colorNode = select(isDoor, vec3(0.12, 0.07, 0.04), mix(glass, vec3(0.78, 0.76, 0.72), frame));
    glassM.roughnessNode = select(isDoor, float(0.6), mix(float(0.06), float(0.5), frame));
    glassM.metalnessNode = select(isDoor, float(0), mix(float(0.9), float(0), frame));       // dark glass: SSR mirror
    glassM.emissiveNode = glow.mul(float(1).sub(frame)).mul(select(isDoor, float(0), float(1)));
  }
  const ops = new THREE.InstancedMesh(quad, glassM, on);
  openings.forEach((o, i) => {
    q.setFromAxisAngle(V.set(0, 1, 0), o.side < 0 ? 0 : Math.PI);                     // facing the street
    M.compose(V.set(o.x, o.y, o.z), q, Sc.set(o.w, o.h, 1));
    ops.setMatrixAt(i, M);
    aLit.setXYZ(i, o.lit[0], o.lit[1], o.lit[2]); aKind.setXYZ(i, o.kind, o.w, o.h);
  });
  ops.receiveShadow = true; group.add(ops);

  // ---------------------------------------------------------------- shop signs: lit fascia boxes, generic trade labels
  const LABELS = [["BOULANGERIE", "#ffd9a0", "#3a1e0c"], ["PHARMACIE", "#7dff9a", "#062b12"], ["LIBRAIRIE", "#fff1d6", "#14263f"],
    ["FRITERIE", "#ffe14d", "#5a0d0d"], ["NIGHT SHOP", "#9fe6ff", "#101018"], ["CAFÉ", "#ffb36b", "#1d1410"]];
  const SIGN_COL = [[1.0, 0.75, 0.45], [0.35, 1.0, 0.5], [1.0, 0.92, 0.8], [1.0, 0.85, 0.3], [0.55, 0.85, 1.0], [1.0, 0.65, 0.35]];
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 64 * LABELS.length;
  const g2 = cv.getContext("2d");
  LABELS.forEach(([t, fg, bg], i) => {
    g2.fillStyle = bg; g2.fillRect(0, i * 64, 512, 64);
    g2.fillStyle = fg; g2.font = "bold 40px system-ui, sans-serif"; g2.textAlign = "center"; g2.textBaseline = "middle";
    g2.fillText(t, 256, i * 64 + 34);
    if (t === "PHARMACIE") { g2.fillRect(18, i * 64 + 24, 36, 16); g2.fillRect(28, i * 64 + 14, 16, 36); g2.fillRect(458, i * 64 + 24, 36, 16); g2.fillRect(468, i * 64 + 14, 16, 36); }
  });
  const atlas = new THREE.CanvasTexture(cv); atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 8;
  const aRow = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, signs.length)), 1);
  const signGeo = new THREE.BoxGeometry(1, 1, 1); signGeo.setAttribute("aRow", aRow);
  const signM = new THREE.MeshStandardNodeMaterial({ roughness: 0.4 });
  {
    const row = instancedBufferAttribute(aRow);
    const n = normalWorld, front = abs(n.z).greaterThan(0.5);
    const u = uv();
    const tx = texture(atlas, vec2(u.x, float(1).sub(row.add(float(1).sub(u.y)).div(LABELS.length))));
    signM.colorNode = select(front, tx.rgb.mul(0.3), vec3(0.04));
    signM.emissiveNode = select(front, tx.rgb.mul(2.2), vec3(0));
  }
  const signMesh = new THREE.InstancedMesh(signGeo, signM, Math.max(1, signs.length));
  signs.forEach((s, i) => {
    q.setFromAxisAngle(V.set(0, 1, 0), s.side < 0 ? 0 : Math.PI);
    M.compose(V.set(s.x, s.y, s.z), q, Sc.set(s.w, 0.6, 0.18));
    signMesh.setMatrixAt(i, M); aRow.setX(i, s.label);
    s.col = SIGN_COL[s.label];
  });
  signMesh.count = signs.length; signMesh.castShadow = true; group.add(signMesh);

  // ---------------------------------------------------------------- hedges, trees
  const hedgeM = new THREE.MeshStandardNodeMaterial({ roughness: 0.9 });
  hedgeM.colorNode = vec3(0.03, 0.06, 0.025).mul(noise2D(positionWorld.xy.mul(5).add(positionWorld.zz)).mul(0.6).add(0.7));
  const hedges = [];
  for (const hs of houses) if (hs.side < 0) { const gate = (hs.x0 + hs.x1) / 2 + 1.2; hedges.push([hs.x0 + 0.1, gate - 0.6], [gate + 0.6, hs.x1 - 0.1]); }
  const hedgeMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), hedgeM, hedges.length);
  hedges.forEach(([a, b], i) => { M.compose(V.set((a + b) / 2, WALK_Y, -Z.walk - 0.35), q.identity(), Sc.set(Math.max(0.1, b - a), 0.95, 0.55)); hedgeMesh.setMatrixAt(i, M); });
  hedgeMesh.castShadow = hedgeMesh.receiveShadow = true; group.add(hedgeMesh);

  const trees = [];
  for (let x = -X.half + 9; x < X.half; x += 17 + R() * 6) trees.push({ x, z: -Z.walk + 0.9, y: WALK_Y, s: 0.85 + R() * 0.35 });  // street trees, north sidewalk
  for (const hs of houses) if (hs.side < 0 && R() < 0.35) trees.push({ x: hs.x0 + 1.5 + R() * 3, z: -Z.walk - 2.4, y: WALK_Y, s: 0.6 + R() * 0.3 });
  const trunkM = new THREE.MeshStandardNodeMaterial({ color: 0x3a2f26, roughness: 0.9 });
  const crownM = new THREE.MeshStandardNodeMaterial({ roughness: 0.85 });
  crownM.colorNode = vec3(0.07, 0.11, 0.035).mul(noise2D(positionWorld.xy.mul(2.1).add(positionWorld.z)).mul(0.7).add(0.55));
  const crownGeo = (() => {
    const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position, r2 = rng(3);
    const bumps = Array.from({ length: 14 }, () => new THREE.Vector3(r2() - 0.5, r2() - 0.5, r2() - 0.5).normalize());
    for (let i = 0; i < p.count; i++) {
      V.fromBufferAttribute(p, i); const d = V.clone().normalize();
      let k = 0.82; for (const b of bumps) k += Math.max(0, d.dot(b) - 0.7) * 0.9;
      V.multiplyScalar(k); V.y *= 0.85; p.setXYZ(i, V.x, V.y, V.z);
    }
    g.computeVertexNormals(); return g;
  })();
  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.2, 1, 8).translate(0, 0.5, 0), trunkM, trees.length);
  const crownMesh = new THREE.InstancedMesh(crownGeo, crownM, trees.length);
  trees.forEach((t, i) => {
    M.compose(V.set(t.x, t.y, t.z), q.identity(), Sc.set(t.s, 4.2 * t.s, t.s)); trunkMesh.setMatrixAt(i, M);
    q.setFromAxisAngle(V.set(0, 1, 0), t.x);
    M.compose(V.set(t.x, t.y + 6.2 * t.s, t.z), q, Sc.set(3.1 * t.s, 3.0 * t.s, 3.1 * t.s)); crownMesh.setMatrixAt(i, M);
  });
  for (const m of [trunkMesh, crownMesh]) { m.castShadow = m.receiveShadow = true; group.add(m); }

  // ---------------------------------------------------------------- street lamps (the city's Blender model)
  const lamps = [];
  let side = -1;
  for (let x = -X.half + 6; x < X.half; x += 15) {   // 30 m between lamps on each side, staggered
    const z = side * Z.lampOff, yaw = side < 0 ? Math.PI : 0;
    // keep clear of the street trees
    if (side < 0 && trees.some((t) => Math.abs(t.x - x) < 2.5 && Math.abs(t.z - z) < 2)) x += 3;
    lamps.push({ x, z, yaw, side });
    side = -side;
  }
  if (lampModel) {
    const l1 = lampModel.lods[1];                 // LOD1 (1.2 cm error): every lamp of the lab street, one draw per part
    for (const [geo, mat] of [[l1.iron, lampModel.iron], [l1.glass, lampModel.glass]]) {
      const im = new THREE.InstancedMesh(geo, mat, lamps.length);
      lamps.forEach((l, i) => { q.setFromAxisAngle(V.set(0, 1, 0), l.yaw); M.compose(V.set(l.x, WALK_Y, l.z), q, Sc.set(1, 1, 1)); im.setMatrixAt(i, M); });
      im.castShadow = true; im.receiveShadow = true; group.add(im);
    }
  }
  const REACH = 1.05, HEADY = 5.95;
  for (const l of lamps) { l.hx = l.x - Math.sin(l.yaw) * REACH; l.hz = l.z - Math.cos(l.yaw) * REACH; l.hy = WALK_Y + HEADY - 0.15; }

  // ---------------------------------------------------------------- parking slots
  const parkSlots = [];
  for (const s of [-1, 1]) for (let x = -X.half + 4; x < X.half - 4; x += 5.9) {
    if (lamps.some((l) => l.side === s && Math.abs(l.x - x) < 1.5) && R() < 0.5) continue;
    if (R() < 0.72) parkSlots.push({ x: x + (R() - 0.5) * 0.5, z: s * Z.park, heading: s > 0 ? 0 : Math.PI, pv: R(), side: s });
  }

  const arr = (list, f) => Float32Array.from(list, f);
  return {
    group, houses, trees, parkSlots,
    sources: {
      lamps: { list: lamps, x: arr(lamps, (l) => l.hx), y: arr(lamps, (l) => l.hy), z: arr(lamps, (l) => l.hz) },
      windows: { list: windows, x: arr(windows, (w) => w.x), y: arr(windows, (w) => w.y), z: arr(windows, (w) => w.z) },
      shops: { list: shops, x: arr(shops, (w) => w.x), y: arr(shops, (w) => w.y), z: arr(shops, (w) => w.z) },
      signs: { list: signs, x: arr(signs, (w) => w.x), y: arr(signs, (w) => w.y), z: arr(signs, (w) => w.z) },
    },
    counts: { houses: hn, openings: on, windows: windows.length, shops: shops.length, lamps: lamps.length, trees: trees.length, parked: parkSlots.length },
  };
}
