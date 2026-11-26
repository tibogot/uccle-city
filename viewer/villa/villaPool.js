// THE POOL WATER v2 (claude/villa3 job 3, docs/VILLA_V3_PLAN.md item 5; ?villa3=0 = round 2's poolMaterial in
// villaModel.js). Still ONE opaque draw on a 2-triangle surface: the basin is ray-traced in the fragment, nothing
// moves on the CPU (no vertex mover), no render target, no light (rule fixed-light-count).
//
// What round 2 got wrong (audit e01 / e02 / e01_night): milky water with no reflection of the sky, the house or the
// trees (the PMREM env at roughness 0.05 only), giant even caustics (noise at 0.77 m), the entry steps invisible (only
// colliders), a flat cyan sheet at night, and a dark 24 cm bar across the middle of the pool: a "lane line" tested on
// the WRONG AXIS (|w - mid w|: across the 4.5 m width at mid-length, not along the 16 m length), so it read as a
// stripe floating in the water. Real residential pools have no lane line: removed.
//
// Now, per fragment (villa local frame: u, y = TAW - 100, w):
//   - the surface: a calm normal from two octaves of small wind ripples (value-noise gradients, 0.3 / 0.12 m, moving);
//   - Fresnel (Schlick, F0 0.02) between the REFLECTION (the glass model's outdoor scene: sky, tree line, lawn, sun
//     glint, villaGlass.js; plus the HOUSE itself, a ray-box test against the villa's two masses: its glazing below the
//     upper box, the dark cladding above, warm at night) and the REFRACTED view (Snell, n 1.33) traced to the floor,
//     the walls or one of the four ENTRY STEPS (boxes, with a dark nosing tile on each tread edge);
//   - the basin: 2.5 cm mosaic, caustics at 0.25 m (two noise layers, sharpened, fading with depth), Beer-Lambert
//     absorption over the in-water path (shallow turquoise -> deep blue-green);
//   - night: four LED niches in the long walls (emissive spots on the wall, a glow in the water round them), the water
//     faintly lit from below.
import * as THREE from "three/webgpu";
import {
  vec2, vec3, vec4, float, floor, fract, mix, step, smoothstep, clamp, abs, dot, max, min, uniform, Fn, positionWorld, cameraPosition,
  normalize, pow, time, fwidth, select, length, reflect, transpose, texture, int,
} from "three/tsl";
import { env } from "../lighting.js";
import { outdoor } from "./villaGlass.js";

const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const hash2 = (p) => {
  const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar();
  const q = p3.add(dot(p3, vec3(p3.y, p3.z, p3.x).add(33.33)));
  return fract(q.x.add(q.y).mul(q.z));
};
const vnoise = (p) => {
  const i = floor(p), f = fract(p), u2 = f.mul(f).mul(float(3).sub(f.mul(2)));
  return mix(mix(hash2(i), hash2(i.add(vec2(1, 0))), u2.x), mix(hash2(i.add(vec2(0, 1))), hash2(i.add(vec2(1, 1))), u2.x), u2.y);
};
/** the night glow's constants: the shader and the gate's tone check (villaCheck 2f) both read these */
export const POOL_NIGHT = {
  aqua: 0x38c8f2, base: 0.06, gain: 0.62, i_max: 1.25, fall: 2.2, c_mix: 0.45, spot: 0.35, spot_r: 0.32, niche_depth: 0.45,
  niches: (pool) => [[pool.u0, -11.0], [pool.u0, -3.0], [pool.u1, -11.0], [pool.u1, -3.0]],
};
/** CPU replica of the night glow's luminance at a basin point (u, y, w): the tone check (no blow-out, a real glow) */
export function poolNightLum(pool, u, y, w, cweb = 0.35) {
  const W = pool.water - 100; let I = 0, spot = 0;
  for (const [lu, lw] of POOL_NIGHT.niches(pool)) {
    const d = Math.hypot(u - lu, y - (W - POOL_NIGHT.niche_depth), w - lw);
    I += Math.exp(-d / POOL_NIGHT.fall); spot = Math.max(spot, Math.max(0, 1 - d / POOL_NIGHT.spot_r));
  }
  const lum = Math.min(I, POOL_NIGHT.i_max) * POOL_NIGHT.gain * ((1 - POOL_NIGHT.c_mix) + 2 * POOL_NIGHT.c_mix * cweb) + POOL_NIGHT.base + spot * POOL_NIGHT.spot;
  const c = new THREE.Color(POOL_NIGHT.aqua);
  return lum * (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b);
}
/** the baked caustics array (models/villa/caustics.ktx2, streamed with the villa's near textures): a placeholder of
 *  the same kind until it lands (the texture nodes' value swapped: no pipeline rebuild) */
export const CAUST_FRAMES = 12;
const CAUST = (() => {
  const ph = new THREE.DataArrayTexture(new Uint8Array(4 * CAUST_FRAMES).fill(90), 1, 1, CAUST_FRAMES); ph.needsUpdate = true;
  return { node: { value: ph }, nodes: [] };
})();
export async function loadCaustics(ktx, url) {
  const tex = await ktx.loadAsync(url);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.NoColorSpace; tex.needsUpdate = true;
  CAUST.node.value = tex;
  return tex;
}
/** live look (uniforms) */
export const poolLook = { ripple: uniform(1.0), refl: uniform(1.0), caustic: uniform(1.2), led: uniform(1.0), absorb: uniform(new THREE.Vector3(0.75, 0.13, 0.1)) };

/** a ray-box (slab) test: the entry t (0 when inside), or 1e6 for a miss */
function slab(o, d, b0, b1) {
  const dx = select(abs(d.x).lessThan(1e-5), float(1e-5), d.x), dy = select(abs(d.y).lessThan(1e-5), float(1e-5), d.y), dz = select(abs(d.z).lessThan(1e-5), float(1e-5), d.z);
  const t0 = vec3(b0.x.sub(o.x).div(dx), b0.y.sub(o.y).div(dy), b0.z.sub(o.z).div(dz));
  const t1 = vec3(b1.x.sub(o.x).div(dx), b1.y.sub(o.y).div(dy), b1.z.sub(o.z).div(dz));
  const tn = min(t0, t1), tf = max(t0, t1);
  const tin = max(max(tn.x, tn.y), tn.z), tout = min(min(tf.x, tf.y), tf.z);
  return select(tout.greaterThan(max(tin, 0.0)), tin.max(0.0), float(1e6));
}

export function poolMaterialV3(pool, rootInv, notes) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 1.0, metalness: 0.0 });
  const uInv = uniform(rootInv.clone());
  const W = pool.water - 100, D = pool.water - pool.floor, FL = pool.floor - 100;
  const b0 = vec3(pool.u0, W - D, pool.w0), b1 = vec3(pool.u1, W, pool.w1);
  // the entry steps (villa.py interior(): colbox(u0, u0 + 1.6, w1 - (k + 1) 0.35, w1 - k 0.35, floor, GL - 0.3 - k 0.27))
  const GL = notes.levels_taw.ground;
  const steps = [0, 1, 2, 3].map((k) => ({ b0: vec3(pool.u0, FL, pool.w1 - (k + 1) * 0.35), b1: vec3(pool.u0 + 1.6, GL - 0.3 - k * 0.27 - 100, pool.w1 - k * 0.35) }));
  // the house's two masses (villa.py GF / UB, three local)
  const houseA = { b0: vec3(14.0, 15.0, -23.0), b1: vec3(36.0, 25.7, 23.0) }, houseB = { b0: vec3(12.0, 22.0, -8.0), b1: vec3(37.5, 26.3, 23.5) };
  const parts = () => {
    const pW = positionWorld, eW = cameraPosition;
    const p = uInv.mul(vec4(pW, 1.0)).xyz.toVar(), e = uInv.mul(vec4(eW, 1.0)).xyz.toVar();
    const t = time.mul(0.5);
    // wind ripples: the gradient of two noise octaves (finite differences), small and calm
    const rq = p.xz.div(0.3).add(vec2(t.mul(0.6), t.mul(0.35))), rq2 = p.xz.div(0.12).sub(vec2(t.mul(0.9), t.mul(1.1)));
    const g1 = vec2(vnoise(rq.add(vec2(0.05, 0))).sub(vnoise(rq.sub(vec2(0.05, 0)))), vnoise(rq.add(vec2(0, 0.05))).sub(vnoise(rq.sub(vec2(0, 0.05)))));
    const g2 = vec2(vnoise(rq2.add(vec2(0.05, 0))).sub(vnoise(rq2.sub(vec2(0.05, 0)))), vnoise(rq2.add(vec2(0, 0.05))).sub(vnoise(rq2.sub(vec2(0, 0.05)))));
    const slope = g1.mul(0.09).add(g2.mul(0.045)).mul(poolLook.ripple);
    const n = normalize(vec3(slope.x.negate(), 1.0, slope.y.negate())).toVar();
    const v = normalize(p.sub(e)).toVar();
    const cosi = dot(v, n).negate().max(0.0).toVar();
    const F = float(0.02).add(float(0.98).mul(pow(float(1).sub(cosi), 5.0))).toVar();
    // ---- the refracted ray to the basin: the box's inner planes, then the steps
    const eta = float(1.0 / 1.33);
    const k = float(1).sub(eta.mul(eta).mul(float(1).sub(cosi.mul(cosi))));
    const r = normalize(v.mul(eta).add(n.mul(eta.mul(cosi).sub(k.max(0).sqrt())))).toVar();
    const tx = select(r.x.greaterThan(0), b1.x.sub(p.x).div(r.x.max(1e-4)), b0.x.sub(p.x).div(r.x.min(-1e-4)));
    const tz = select(r.z.greaterThan(0), b1.z.sub(p.z).div(r.z.max(1e-4)), b0.z.sub(p.z).div(r.z.min(-1e-4)));
    const ty = b0.y.sub(p.y).div(r.y.min(-1e-4));
    let tt = min(min(tx, tz), ty).max(0.0).toVar();
    const onFloor = step(ty, min(tx, tz).add(1e-3)).toVar();
    let ts = float(1e6);
    for (const s of steps) ts = min(ts, slab(p, r, s.b0, s.b1));
    const onStep = step(ts, tt).toVar();
    tt = min(tt, ts);
    const h = p.add(r.mul(tt)).toVar();
    // the surface's coordinates there: the floor / a tread (xz), a wall or a riser (its plane)
    let tread = float(0);
    for (let kk = 0; kk < 4; kk++) tread = max(tread, step(abs(h.y.sub(GL - 0.3 - kk * 0.27 - 100)), 0.004));
    const horiz = max(onFloor, onStep.mul(tread));
    const wallU = step(abs(h.x.sub(pool.u0)), 0.002).add(step(abs(h.x.sub(pool.u1)), 0.002)).min(1);
    const tc = select(horiz.greaterThan(0.5), h.xz, select(wallU.greaterThan(0.5), vec2(h.z, h.y), vec2(h.x, h.y))).toVar();
    // mosaic, 2.5 cm, joints faded with distance
    const g = tc.div(0.025), f = fract(g), fw = fwidth(g.x).max(1e-4);
    const joint = float(1).sub(smoothstep(0.0, fw.mul(1.5).max(0.08), min(min(f.x, float(1).sub(f.x)), min(f.y, float(1).sub(f.y))))).mul(float(1).sub(smoothstep(0.3, 1.0, fw)));
    const th = hash2(floor(g));
    let tile = mix(lin(0xe4f1ef), lin(0xbfe0e2), th.mul(0.7)).mul(float(1).sub(joint.mul(0.22)));
    // the steps' nosing: a dark tile band on each tread's edge (the safety line every real pool has)
    let nose = float(0);
    for (let kk = 0; kk < 4; kk++) {
      const wEdge = pool.w1 - (kk + 1) * 0.35, yTop = GL - 0.3 - kk * 0.27 - 100;
      nose = max(nose, onStep.mul(step(abs(h.z.sub(wEdge)), 0.05)).mul(step(abs(h.y.sub(yTop)), 0.06)));
    }
    tile = mix(tile, lin(0x22394a), nose);
    // caustics (job 3b, rule villa-caustics-baked): the BAKED light-through-waves tile (models/villa/caustics.ktx2,
    // tools/villa/caustics_bake.py: R / G / B at three refractive indices = the rainbow edges), projected along the
    // refracted SUN onto the floor, the treads and the walls, sampled TWICE (two scales, scroll directions, frame
    // phases) and the MIN kept: the sharp web (2 lookups, the only ones on this material). Moving with the ripples,
    // fading with depth, none where the coping shades the water (the sun's entry point outside the open surface)
    const dz = float(W).sub(h.y).max(0.0);
    const sdl = normalize(uInv.mul(vec4(vec3(env.uSunDir), 0.0)).xyz);
    const rsun = normalize(vec3(sdl.x.mul(-0.75), sdl.y.mul(-1.0).min(-0.2), sdl.z.mul(-0.75)));     // (refracted, steeper)
    const sp = h.xz.sub(rsun.xz.mul(float(W).sub(h.y).div(rsun.y.negate()))).add(slope.mul(0.35)).toVar();
    const inside = step(pool.u0 + 0.04, sp.x).mul(step(sp.x, pool.u1 - 0.04)).mul(step(pool.w0 + 0.04, sp.y)).mul(step(sp.y, pool.w1 - 0.04));
    const fr = floor(time.mul(8.0)), lay1 = fr.mod(CAUST_FRAMES), lay2 = fr.add(CAUST_FRAMES / 2).mod(CAUST_FRAMES);
    const cu1 = sp.div(1.3).add(vec2(time.mul(0.021), time.mul(0.013)));
    const cu2 = vec2(sp.x.mul(0.6).sub(sp.y.mul(0.8)), sp.x.mul(0.8).add(sp.y.mul(0.6))).div(1.75).add(vec2(time.mul(-0.017), time.mul(0.019)));
    const cA = texture(CAUST.node.value, cu1).depth(int(lay1)), cB = texture(CAUST.node.value, cu2).depth(int(lay2));
    const cweb = min(cA.rgb, cB.rgb).toVar();
    const caust = cweb.mul(4.5).mul(mix(float(1), float(0.4), smoothstep(0.2, 1.5, dz))).mul(inside).mul(poolLook.caustic);
    const sunK = smoothstep(0.02, 0.2, env.uSunDir.y).mul(float(1).sub(env.uNight));
    const lit = tile.mul(vec3(0.7).add(vec3(env.uSunColor).mul(caust.mul(sunK))));
    // absorption over the in-water path: shallow turquoise, deep blue-green
    const path = tt.add(dz.mul(0.6));
    const a = vec3(poolLook.absorb);
    const trans = vec3(a.x.mul(path).negate().exp(), a.y.mul(path).negate().exp(), a.z.mul(path).negate().exp());
    const deep = lin(0x0a4a55);
    const under = mix(deep, lit, trans).mul(0.62);
    // ---- night (job 3b, rule villa-pool-v2 + its tone check): a lit pool GLOWS: bright aqua round the four LED niches
    // (the long walls), fading into the deep end, the walls and floor lit from below with the same caustic web
    // rippling, the water itself faintly luminous; emissive only, inside the tone range POOL_NIGHT (gate villa 2f)
    const n_ = env.uNight;
    let I = float(0), spot = float(0);
    for (const [lu, lw] of POOL_NIGHT.niches(pool)) {
      const dN = length(vec3(h.x.sub(lu), h.y.sub(W - POOL_NIGHT.niche_depth), h.z.sub(lw)));
      I = I.add(dN.div(POOL_NIGHT.fall).negate().exp());
      spot = max(spot, smoothstep(POOL_NIGHT.spot_r, 0.0, dN));
    }
    const lumN = I.min(POOL_NIGHT.i_max).mul(POOL_NIGHT.gain).mul(mix(float(1 - POOL_NIGHT.c_mix), float(1 + POOL_NIGHT.c_mix), cweb.g))
      .add(POOL_NIGHT.base).add(spot.mul(POOL_NIGHT.spot));
    const glow = lin(POOL_NIGHT.aqua).mul(n_).mul(lumN).mul(trans.mul(0.6).add(0.4)).mul(poolLook.led).mul(tile.mul(0.4).add(0.6));
    // ---- the reflection: the house (a ray-box test on its masses) or the outdoor scene
    const R = reflect(v, n).toVar();
    const tA = slab(p, R, houseA.b0, houseA.b1), tB = slab(p, R, houseB.b0, houseB.b1);
    const tH = min(tA, tB);
    const hp = p.add(R.mul(tH));
    // the house in the water: its curtain walls (dark glass mirroring the sky, mullions every 1.6 m, the rooms warm at
    // night) below the upper box's floor, its dark cladding above
    const glassBand = step(hp.y, float(GL - 100 + 3.6));
    const along = select(abs(hp.x.sub(36.0)).lessThan(0.05), hp.z, hp.x);
    const mull = step(fract(along.div(1.6)), 0.035);
    const bay = step(0.45, hash2(vec2(floor(along.div(3.2)), floor(hp.y.div(3.6)))));          // (a lit room every other bay at night)
    const glassC = mix(mix(lin(0x101820), vec3(env.uSkyHorizon).mul(0.35), 0.5).mul(float(1).sub(n_.mul(0.9))), lin(0xffc58a).mul(bay.mul(0.22).add(0.02)), n_.mul(0.85));
    const house = mix(lin(0x231a15).mul(float(1).sub(n_.mul(0.85))), mix(glassC, lin(0x141416), mull), glassBand);
    const Rw = normalize(transpose(uInv).mul(vec4(R, 0.0)).xyz);            // (local -> world: the root's rotation is orthonormal)
    // (the trees / hedges near the horizon: leafy light and dark, not one flat green)
    const leaf = vnoise(vec2(Rw.x.add(Rw.z).mul(60.0), Rw.y.mul(90.0))).mul(0.5).add(vnoise(vec2(Rw.x.sub(Rw.z).mul(23.0), Rw.y.mul(31.0))).mul(0.5));
    const sky = outdoor(Rw).mul(mix(float(1), leaf.mul(0.9).add(0.55), smoothstep(0.35, 0.0, Rw.y)));
    const refl = mix(sky, house, step(tH, float(1e5))).mul(poolLook.refl);
    return { under, refl, F, glow };
  };
  const r = parts();
  m.colorNode = r.under.mul(float(1).sub(r.F));      // the basin seen through the water, lit by the scene (the trees' shadows on it)
  m.emissiveNode = r.refl.mul(r.F).add(r.glow);       // what the surface reflects, the LEDs at night
  m.userData.uInv = uInv;
  m.userData.poolV3 = true;
  m.name = "villa pool_water v3";
  return m;
}
