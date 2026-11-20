// TYRE MARKS (docs/TYREMARKS.md, rule 48; ?tyremarks=old = none): the rubber the player's car and the two-wheelers
// lay on the road. After the owner's engine (game-engine-v1, read only): games/thunderline/proto/kit/tyreMarks.js (the
// ring buffer, the slide measured in the wheel's own frame, the fronts marking only past the countersteer lock, touch-
// down scuffs, the skid PNG read soft as an alpha mask) and modular-road-v3/modularRoadTireMarks.js MARK_LOOK (the wet
// "cleared line": on a wet road a sliding tyre squeegees the water film off, a lighter line, not a black one). Ours:
//   - ONE mesh, ONE draw call: a ring of MAX_SEG quads (6 vertices each, non-indexed), the oldest overwritten first.
//   - UPLOADS BY RANGE ONLY: the buffers are static (never DynamicDrawUsage: r187 re-uploads such a buffer whole on
//     every pass, docs/perf); the segments written since the last render are one span of the ring (two ranges when it
//     wraps), set on the attributes in the mesh's onBeforeRender (just before the renderer checks the versions: a frame
//     that is not rendered keeps its span, the next one adds to it; the WebGPU backend never clears the ranges itself).
//   - SEATED ON THE DRAWN ROAD: every vertex of a mark stands on the drive surface at its own x / z (the driver's
//     ground(): the road grid, the decks) + `lift`, with a polygon offset: never in the road's plane (rule 34); a mark
//     straddling a step (kerb) takes the wheel's own height for both sides instead of climbing it.
//   - FADE BY AGE in the shader: each vertex carries its birth time, the material reads a time uniform updated per
//     frame by the renderer (onFrameUpdate): a mark holds ~50 s, gone at `life` (2.5 min); on a wet road the cleared
//     lines refill with water in seconds (lifeWet). Snow cover hides them (the snow trails, snowTrails.js, stamp the
//     tracks in the snow: not drawn twice).
//   - No allocation per frame (preallocated states, ranges, arrays); a few µs per frame (gate `tyremarks`).
import * as THREE from "three/webgpu";
import { Fn, attribute, texture, uniform, float, mix, smoothstep, mrt, vec4, normalView } from "three/tsl";
import { HANDLING, BODY } from "./carPhysics.js";

const NO_MRT = typeof location !== "undefined" && /[?&]fx=0(&|$)/.test(location.search);   // (no post chain: no MRT)
export const TYREMARKS_OLD = typeof location !== "undefined" && /[?&]tyremarks=old(&|$)/.test(location.search);

export const MARKS = {
  rubber: 0x050506,        // dry: rubber on asphalt (Thunderline)
  cleared: 0x414852,       // wet: asphalt with the film pushed off it (MARK_LOOK.cleared)
  clearedAlpha: 0.55,      // a squeegeed strip is a subtle tonal break, not a black stripe
  clearedNight: 0.12,      // the cleared colour at full night (an unlit material: it must not glow on a dark road)
  lift: 0.03,              // m over the drive surface (+ the polygon offset)
  step: 0.12,              // m: a side point this far off the wheel's height = a step (kerb): both sides at the wheel's
  tile: 6,                 // m of mark per (mirrored) repeat of the mask
  minSeg: 0.15,            // m: shortest segment written
  restart: 2.5,            // m in one frame (a respawn, a teleport): the mark starts again there, no bridge across
  entrySpeed: 8,           // m/s before a slide marks the road
  slipMin: 0.18, slipFull: 0.7,   // |v lateral| / max(|v long|, 3.5) at the wheel: from here it marks, fully dark here
  slipFloor: 3.5,
  brakeMark: 0.75,         // a tyre past its lengthwise grip (brake lock, wheelspin) marks, a little lighter
  hbMark: 0.85, hbEntry: 4, // the rear wheels under the handbrake (locked: dark), from hbEntry m/s (full at 2.5x)
  touchSpeed: 3.5, touchFull: 11, touchTime: 0.14,   // m/s into the road at touch-down: scuff from / darkest at; s
  touchSpeedBike: 2.5,
  frontLockCar: 0.56,      // rad (CTL.maxSteer): a slide wider than the fronts can countersteer = they mark too (a spin)
  frontLockBike: 0.3,
  life: 150, hold: 0.35, lifeWet: 8,   // s: gone at life, full until hold x life; on a wet road
  snowHide: [0.15, 0.5],   // wx.uSnowCover: marks gone under this cover (the snow trails take over)
};
/** tyre widths (m) and the darkness by vehicle */
export const TYRES = {
  car: { front: 0.19, rear: 0.19, alpha: 1 },
  moto: { front: 0.12, rear: 0.17, alpha: 1 },
  scooter: { front: 0.1, rear: 0.12, alpha: 0.85 },
  villo: { front: 0.04, rear: 0.045, alpha: 0.6 },
};
export const MASK_URL = typeof location !== "undefined" ? new URL("../../textures/tyremarks/skid_mark01.png", import.meta.url).href : null;

export const MAX_SEG = 4096;
const VERTS = 6, POS_F = VERTS * 3, UV_F = VERTS * 2, MK_F = VERTS * 2;
const PREV = [1, 1, 0, 1, 0, 0];           // (pL, pR, cL, pR, cR, cL): 1 = a vertex of the previous edge
const SIDE = [0, 1, 0, 1, 1, 0];           // 0 = left, 1 = right (v across the mark)
const WX = [1, -1, 1, -1], WZ = [1, 1, -1, -1];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** The shader's fade, mirrored on the CPU (tests): 1 = full, 0 = gone */
export function markFade(age, wet = 0, M = MARKS) {
  const life = M.life + (M.lifeWet - M.life) * wet;
  return 1 - smooth(life * M.hold, life, age);
}

const T0 = typeof performance !== "undefined" ? performance.now() : 0;
const clockNow = () => (performance.now() - T0) / 1000;

/**
 * opts: { scene, ground(x, z) -> y (the drawn drive surface), surface(x, z) -> 0 paved / 1 bare terrain (no rubber
 *         on grass or soil: driveMode's this.surface), wet, snow, night (TSL uniforms, 0..1), maskUrl (null: a plain soft
 *         ribbon), now() (s; tests) }
 */
export function createTyreMarks({ scene = null, ground, surface = null, wet = uniform(0), snow = uniform(0), night = uniform(0), maskUrl = MASK_URL, now = clockNow } = {}) {
  const M = MARKS;
  const geometry = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX_SEG * POS_F), uvs = new Float32Array(MAX_SEG * UV_F), mk = new Float32Array(MAX_SEG * MK_F);
  // aMark = (alpha, birth s); static usage (the default): only the written spans are uploaded
  const aPos = new THREE.BufferAttribute(pos, 3), aUv = new THREE.BufferAttribute(uvs, 2), aMk = new THREE.BufferAttribute(mk, 2);
  geometry.setAttribute("position", aPos); geometry.setAttribute("uv", aUv); geometry.setAttribute("aMark", aMk);
  // a static UP normal (never uploaded again): the post chain's MRT writes normalView into its normal target (GTAO,
  // SSR); with no normal attribute the marks wrote a null normal there and stayed as a dark imprint even at opacity 0
  const nrm = new Float32Array(MAX_SEG * VERTS * 3);
  for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
  geometry.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  geometry.setDrawRange(0, 0);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
  const ATTR = [[aPos, POS_F], [aUv, UV_F], [aMk, MK_F]];
  const RANGES = ATTR.map(() => [{ start: 0, count: 0 }, { start: 0, count: 0 }]);

  const uTime = uniform(0).onFrameUpdate(() => now());
  const uRubber = uniform(new THREE.Color(M.rubber)), uCleared = uniform(new THREE.Color(M.cleared));
  const material = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  material.name = "tyre-marks";
  const setMask = (tex) => {
    const a = attribute("aMark", "vec2");
    material.colorNode = mix(uRubber, uCleared.mul(mix(float(1), float(M.clearedNight), night)), wet);
    const op = Fn(() => {
      // the mask READ SOFT (a blurrier mip, half its contrast): rubber laid by a slide is a smear, not a printed tread
      const m = tex ? texture(tex).bias(1.5).a.mul(0.5).add(0.45) : float(0.8);
      const life = mix(float(M.life), float(M.lifeWet), wet);
      const fade = float(1).sub(smoothstep(life.mul(M.hold), life, uTime.sub(a.y)));
      return a.x.mul(m).mul(fade).mul(mix(float(1), float(M.clearedAlpha), wet)).mul(float(1).sub(smoothstep(M.snowHide[0], M.snowHide[1], snow)));
    })();
    material.opacityNode = op;
    // the post chain's normal / metal-rough targets (viewer/post.js, MaterialBlending): blended by the mark's own
    // opacity, so the road's values stay under a faint or faded mark (written at alpha 1 they left a dark imprint:
    // GTAO / SSR read the mark's flat rough patch even where the mark had faded out)
    if (!NO_MRT) material.mrtNode = mrt({ normal: vec4(normalView, op), metalRough: vec4(0, 1, 1, op) });
    material.needsUpdate = true;
  };
  setMask(null);   // a plain soft ribbon until the mask arrives (or for good: no loader in node)
  if (maskUrl) new THREE.TextureLoader().load(maskUrl, (tex) => {
    tex.wrapS = THREE.MirroredRepeatWrapping;   // the PNG does not tile: mirrored, each repeat meets itself
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.NoColorSpace;        // (only its alpha is read)
    tex.anisotropy = 8;                         // seen at a grazing angle
    setMask(tex);
  }, undefined, () => console.warn("[tyreMarks] mask failed: plain ribbons"));

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "tyre-marks";
  mesh.frustumCulled = false; mesh.renderOrder = 20; mesh.visible = false;
  mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.matrixAutoUpdate = false;
  scene?.add(mesh);

  // ---- the ring and its pending span (segments written since the last render)
  let seg = 0, filled = 0, spanStart = -1, spanCount = 0;
  const stats = { segs: 0, frames: 0, uploads: 0, ms: 0, lastRanges: 0, byWheel: [0, 0, 0, 0] };
  mesh.onBeforeRender = () => {
    if (spanCount <= 0) return;
    const n = Math.min(spanCount, MAX_SEG), a0 = n === MAX_SEG ? 0 : spanStart;
    const first = Math.min(n, MAX_SEG - a0), second = n - first;
    for (let k = 0; k < ATTR.length; k++) {
      const [attr, per] = ATTR[k], R = RANGES[k];
      attr.updateRanges.length = 0;
      R[0].start = a0 * per; R[0].count = first * per; attr.updateRanges.push(R[0]);
      if (second > 0) { R[1].start = 0; R[1].count = second * per; attr.updateRanges.push(R[1]); }
      attr.needsUpdate = true;
    }
    stats.uploads++; stats.lastRanges = second > 0 ? 2 : 1;
    spanStart = -1; spanCount = 0;
  };

  // ---- per wheel: the mark being laid
  const mkState = () => ({ active: false, edge: false, px: 0, pz: 0, lx: 0, ly: 0, lz: 0, rx: 0, ry: 0, rz: 0, dist: 0, alpha: 0, touch: 0, touchK: 0, touchN: -1 });
  const states = [mkState(), mkState(), mkState(), mkState()];
  let lastKind = null;
  // the wheels this frame (filled by the samplers): contact x / z / y (NaN: sample the ground), strength, half width
  const W = { n: 0, x: [0, 0, 0, 0], z: [0, 0, 0, 0], y: [0, 0, 0, 0], k: [0, 0, 0, 0], hw: [0, 0, 0, 0] };
  let _ly = 0, _ry = 0;
  /** the two side points' heights at (x, z) +- (sx, sz) (a step under the mark: both at the wheel's own height) */
  function sideHeights(x, z, sx, sz, yc) {
    const gl = ground(x + sx, z + sz), gr = ground(x - sx, z - sz);
    const c = Number.isFinite(yc) ? yc : ground(x, z);
    _ly = Number.isFinite(gl) && Math.abs(gl - c) < M.step ? gl : c;
    _ry = Number.isFinite(gr) && Math.abs(gr - c) < M.step ? gr : c;
  }

  function writeSeg(st, wi, cx, cz, cy, sx, sz, k, len, t) {
    sideHeights(cx, cz, sx, sz, cy);
    const clx = cx + sx, cly = _ly + M.lift, clz = cz + sz, crx = cx - sx, cry = _ry + M.lift, crz = cz - sz;
    if (!(Number.isFinite(cly) && Number.isFinite(cry))) return false;
    const o = seg * POS_F, uo = seg * UV_F, mo = seg * MK_F;
    const u0 = st.dist / M.tile, u1 = (st.dist + len) / M.tile;
    for (let i = 0; i < VERTS; i++) {
      const p = PREV[i], r = SIDE[i], q = o + i * 3;
      pos[q] = p ? (r ? st.rx : st.lx) : (r ? crx : clx);
      pos[q + 1] = p ? (r ? st.ry : st.ly) : (r ? cry : cly);
      pos[q + 2] = p ? (r ? st.rz : st.lz) : (r ? crz : clz);
      uvs[uo + i * 2] = p ? u0 : u1; uvs[uo + i * 2 + 1] = r;
      // the alpha ramps across the segment (no step at the joins)
      mk[mo + i * 2] = p ? st.alpha : k; mk[mo + i * 2 + 1] = t;
    }
    st.lx = clx; st.ly = cly; st.lz = clz; st.rx = crx; st.ry = cry; st.rz = crz;
    st.dist += len; st.alpha = k;
    if (spanStart < 0) { spanStart = seg; spanCount = 0; }
    spanCount++;
    seg = (seg + 1) % MAX_SEG;
    if (filled < MAX_SEG) { filled++; geometry.setDrawRange(0, filled * VERTS); }
    mesh.visible = true;
    stats.segs++; stats.byWheel[wi]++;
    return true;
  }

  /** one wheel: k = strength 0..1 this frame at contact (x, z) (y: its height if known, else NaN) */
  function track(wi, x, z, y, k, hw, t) {
    const st = states[wi];
    if (k <= 0.02) { st.active = false; return; }
    if (!st.active || (x - st.px) * (x - st.px) + (z - st.pz) * (z - st.pz) > M.restart * M.restart) {
      st.active = true; st.edge = false; st.px = x; st.pz = z; st.dist = 0; st.alpha = 0;
      return;
    }
    const dx = x - st.px, dz = z - st.pz, len = Math.sqrt(dx * dx + dz * dz);
    if (len < M.minSeg) return;
    const sx = (-dz / len) * hw, sz = (dx / len) * hw;
    if (!st.edge) {
      // the mark's first edge, across the first segment's direction
      sideHeights(st.px, st.pz, sx, sz, NaN);
      st.lx = st.px + sx; st.ly = _ly + M.lift; st.lz = st.pz + sz; st.rx = st.px - sx; st.ry = _ry + M.lift; st.rz = st.pz - sz;
      if (!(Number.isFinite(st.ly) && Number.isFinite(st.ry))) { st.px = x; st.pz = z; return; }
      st.edge = true;
    }
    if (writeSeg(st, wi, x, z, y, sx, sz, k, len, t)) { st.px = x; st.pz = z; }
  }

  /** the slide at a wheel at (lx left, lz forward) of the body (u forward, v left, r yaw rate), into S (no object) */
  const S = { k: 0, gate: 0, speed: 0 };
  function slide(u, v, r, lx, lz, front, frontLock) {
    const vLong = u - r * lx, vLat = v + r * lz;
    S.speed = Math.sqrt(vLong * vLong + vLat * vLat);
    let slip = Math.abs(vLat) / Math.max(Math.abs(vLong), M.slipFloor);
    // THE FRONTS STEER INTO THE SLIDE: countersteered down the road they roll; they mark only by what the slide's
    // angle passes the lock (Thunderline: four equal lines in a drift read as "a sticker under the car")
    if (front) slip = Math.tan(Math.max(0, Math.atan(slip) - frontLock));
    S.gate = smooth(M.entrySpeed, M.entrySpeed * 2, S.speed);
    S.k = clamp((slip - M.slipMin) / (M.slipFull - M.slipMin), 0, 1) * S.gate;
    return S;
  }

  function touchdown(st, into, from, dt) {
    if (into > from) { st.touch = M.touchTime; st.touchK = clamp((into - from) / (M.touchFull - from), 0.35, 1); }
    if (st.touch > 0) { st.touch -= dt; return st.touchK; }
    return 0;
  }

  /** the car (carCtl.js c.tyres; the older handling sets: the wheels from the body, no touch / lock data) */
  function sampleCar(c, dt) {
    const T = c.tyres, P = TYRES.car, sinH = Math.sin(c.heading), cosH = Math.cos(c.heading);
    const L = HANDLING.wheelbase || 2.65, a = L / 2, track = Math.max(0.6, (c.bodyHx ?? BODY.hx) * 0.86);
    const u = c.speed, v = c.vx * cosH - c.vz * sinH, r = c.angularVel;
    W.n = 4;
    for (let i = 0; i < 4; i++) {
      const lx = WX[i] * track, lz = WZ[i] > 0 ? a : -a, front = WZ[i] > 0, st = states[i];
      W.hw[i] = (front ? P.front : P.rear) * 0.5;
      if (T) { W.x[i] = T.x[i]; W.z[i] = T.z[i]; W.y[i] = T.y[i]; }
      else { W.x[i] = c.x + sinH * lz + cosH * lx; W.z[i] = c.z + cosH * lz - sinH * lx; W.y[i] = NaN; }
      if ((T && !T.on[i]) || c.surface) { W.k[i] = 0; st.touch = 0; continue; }   // (in the air; on grass / soil: no rubber)
      const s = slide(u, v, r, lx, lz, front, M.frontLockCar);
      let k = s.k;
      if (T) {
        k = Math.max(k, clamp(T.over[i] * M.brakeMark, 0, 1) * smooth(0.3, 2, s.speed));
        if (T.hb && !front) k = Math.max(k, M.hbMark * smooth(M.hbEntry, M.hbEntry * 2.5, s.speed));
        k = Math.max(k, touchdown(st, T.touch[i], M.touchSpeed, dt));
      }
      W.k[i] = k * P.alpha;
    }
  }

  /** a two-wheeler (motoPhysics.js state; H its handling set: the wheelbase) */
  function sampleMoto(c, kind, H, dt) {
    const P = TYRES[kind] || TYRES.moto, sinH = Math.sin(c.heading), cosH = Math.cos(c.heading);
    const L = (H?.wheelbase ?? 1.45) / 2;
    const u = c.speed, v = c.vx * cosH - c.vz * sinH, r = c.angularVel;
    W.n = 2;
    for (let i = 0; i < 2; i++) {
      const front = i === 0, lz = front ? L : -L, st = states[i];
      W.x[i] = c.x + sinH * lz; W.z[i] = c.z + cosH * lz; W.y[i] = NaN;
      W.hw[i] = (front ? P.front : P.rear) * 0.5;
      const off = c.air || c.crashed || (front ? c.wheelie > 0.03 : c.wheelie < -0.03);
      // a touch-down (motoPhysics vertical(): touchN counts them, touchV the speed into the ground)
      let into = 0;
      if (c.touchN !== undefined && st.touchN !== c.touchN) { if (st.touchN >= 0) into = c.touchV || 0; st.touchN = c.touchN; }
      if (off || (surface && surface(W.x[i], W.z[i]))) { W.k[i] = 0; st.touch = 0; continue; }
      const s = slide(u, v, r, 0, lz, front, M.frontLockBike);
      let k = s.k;
      if (!front && c.rearBrake && Math.abs(c.speed) > 4) k = Math.max(k, M.brakeMark * smooth(4, 8, s.speed));   // the rear locks
      if (c.slipping) k = Math.max(k, 0.7 * smooth(3, 6, s.speed));                                             // grip lost
      k = Math.max(k, touchdown(st, into, M.touchSpeedBike, dt));
      W.k[i] = k * P.alpha;
    }
  }

  return {
    mesh, material, geometry, stats, settings: M, uTime,
    get filled() { return filled; },
    get cursor() { return seg; },
    get pending() { return spanCount; },
    /** after the vehicle's step, every frame while driving / riding: kind "car" | "moto" | "scooter" | "villo" */
    update(c, kind = "car", H = null, dt = 1 / 60) {
      if (!c) return;
      const t0 = performance.now();
      if (kind !== lastKind) { for (const st of states) { st.active = false; st.touch = 0; st.touchN = -1; } lastKind = kind; }
      if (kind === "car") sampleCar(c, dt); else sampleMoto(c, kind, H, dt);
      const t = now();
      for (let i = 0; i < W.n; i++) track(i, W.x[i], W.z[i], W.y[i], W.k[i], W.hw[i], t);
      stats.frames++;
      stats.ms = stats.ms * 0.95 + (performance.now() - t0) * 0.05;
    },
    /** stop every mark being laid (the vehicle left / switched): the next contact starts a new mark */
    lift() { for (const st of states) st.active = false; },
    reset() {
      seg = 0; filled = 0; spanStart = -1; spanCount = 0;
      geometry.setDrawRange(0, 0); mesh.visible = false;
      for (const st of states) { st.active = false; st.touch = 0; st.dist = 0; st.touchN = -1; }
    },
    dispose() { scene?.remove(mesh); geometry.dispose(); material.dispose(); },
  };
}
