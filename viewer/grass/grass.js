// OUR GRASS (docs/GRASS.md). The engine room of alezen9/revo-realms (MIT) and game-engine-v1's Hybrid grass, rebuilt
// for Uccle on our own plumbing (no code copied):
//
//   Every frame ONE compute pass walks a stable WORLD grid of candidate blades around the camera, reads the grass
//   field (grassField.js: the drawn surface's height, density, length, dryness, flowers, and whether a solid covers
//   it), culls (distance, frustum, density), and appends each survivor to one of THREE level-of-detail lists
//   (5 / 3 / 1 segments) whose counts feed INDIRECT draws: 3 draws, culled blades cost no vertex work, the CPU only
//   writes a few uniforms. Each list has its own buffers + draw arguments, so the WebGPU feature
//   "indirect-first-instance" (Revo's one shared list) is not needed.
//
//   STOCHASTIC THINNING BY LEVEL (ours). Candidates live in 6 cm cells. Cell (i, j) has a LEVEL: the number of times
//   both indices divide by 2 (capped at 3). A level-k candidate jitters inside its 2^k x 2^k block and gets a rank r
//   in [4^-(k+1), 4^-k) (the top level: [0, 4^-3)). A candidate is kept while the density p(d) = min(1, (d0/d)^2) is
//   above its rank, so as p falls with distance the finest level goes first, then the next ... : the blades that stay
//   are always evenly spread (a jittered quadtree), the count on screen stays ~constant per pixel, and one dispatch
//   per level only walks the cells that can survive at its distances (+-16 / 32 / 48 / 48 m). A kept blade's height
//   follows smoothstep(0, .35, 1 - r / p): it GROWS out of the ground as you come near and sinks back as you leave;
//   survivors widen 1/sqrt(p) (capped) so the cover thins slower than the count; past the type's reach every blade
//   shrinks into the textured ground, whose mean colour the blades converge to (no line, no pop).
//
//   PER BLADE ONCE, in compute (Hybrid's lesson, ~3x cheaper than per-vertex work): height, width, facing (+ turned
//   toward the camera when edge-on, Ghost of Tsushima), Voronoi clump (facing, lean, height), wind lean, push, the
//   ground's colour under it. The vertex stage only bends the blade along that lean and adds a small flutter.
//
// Types (grassTypes.js, via the field): mown lawn 5-8 cm, park grass 10-16 cm clumpy, roadside verge 25-35 cm dry,
// meadow 40-60 cm with wildflowers, thin under tree crowns. Light: the city's sun and sky, the sun's shadow map (tree
// and building shadows), the street-lamp light map at night, the season (viewer/seasons/season.js).
import * as THREE from "three/webgpu";
import {
  Fn, If, uniform, float, int, uint, vec2, vec3, vec4, instanceIndex, instancedArray, storage, atomicAdd, atomicStore, atomicLoad,
  hash, smoothstep, mix, clamp, max, min, abs, sqrt, length, normalize, cross, dot, cos, sin, cameraPosition, cameraViewMatrix,
  varying, select, floor, pow, attribute, sign, PI2, texture, atan, time,
} from "three/tsl";
import { windAt, wind } from "../foliage/wind.js";
import { noiseTex } from "../ground.js";
import { addLampLight } from "../lampLight.js";
import { env } from "../lighting.js";
import { season } from "../seasons/season.js";
import { GrassField } from "./grassField.js";
import { GrassPush } from "./grassPush.js";

const CELL = 0.045;                       // m: the finest candidate grid
const TOP = 3;                           // levels 0..3
const LOD_SEG = [5, 3, 1];
// the textured ground's mean colours (viewer/materials/textures/ground/ground.json, linear): lawn, rough, dry
const LAWN = vec3(0.1283, 0.1626, 0.0349), ROUGH = vec3(0.0608, 0.1097, 0.0228), DRY = vec3(0.2384, 0.221, 0.0793);

export const PRESETS = {
  low:    { density: 0.55, d0: 0.7, reach: 0.6, rmax: 28, caps: [60000, 50000, 40000] },
  medium: { density: 0.8, d0: 0.85, reach: 0.8, rmax: 38, caps: [100000, 80000, 60000] },
  high:   { density: 1, d0: 1, reach: 1, rmax: 48, caps: [150000, 110000, 90000] },
  ultra:  { density: 1, d0: 1.3, reach: 1.1, rmax: 48, caps: [220000, 160000, 120000] },
};

/** shared uniforms (live tuning from a lab panel) */
export const grassU = {
  density: uniform(1), d0: uniform(1), reach: uniform(1), rmax: uniform(48), maxWiden: uniform(2.6),
  minPixels: uniform(0.9), pixelScale: uniform(500),
  lod0: uniform(7), lod1: uniform(18),
  height: uniform(1),                    // global height (season growth)
  dry: uniform(0),                       // season: summer drought 0..1 on top of the types' own dryness
  frost: uniform(0),                     // season: hoar frost on the tips 0..1
  tint: uniform(new THREE.Color(1, 1, 1)),   // season tint (olive winter, fresh spring)
  tip: uniform(1.1), root: uniform(0.32), // brightness root (AO) -> tip, over the ground's mean colour
  conv: uniform(1),
  flat: uniform(0.78),                    // lighting normal: share of 'up' (Hybrid: flat lighting reads as one field)                      // converge to the ground colour with distance (debug: 0 = off)
  debugLod: uniform(0),
};

const P0 = () => attribute("position", "vec3");

function bladeGeometry(seg) {
  const pos = [], idx = [];
  for (let s = 0; s < seg; s++) { const y = s / seg; pos.push(-0.5, y, 0, 0.5, y, 0); }
  pos.push(0, 1, 0);
  for (let s = 0; s < seg - 1; s++) { const a = s * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  const l = (seg - 1) * 2; idx.push(l, l + 1, seg * 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

export class Grass {
  /** renderer: WebGPURenderer (WebGPU backend); opts.preset */
  static supported(renderer) { return !!renderer?.backend?.isWebGPUBackend; }

  constructor(renderer, { preset = "high" } = {}) {
    this.renderer = renderer;
    this.field = new GrassField(renderer);
    this.push = new GrassPush();
    this.group = new THREE.Group(); this.group.name = "grass";
    this.u = { cam: uniform(new THREE.Vector3()), vp: uniform(new THREE.Matrix4()), groundY: uniform(0) };
    this.levelU = [];
    this.lods = [];
    this.presetName = PRESETS[preset] ? preset : "high";
    // ONE data buffer (4 vec4 per blade, one region per LOD) and ONE draw-argument buffer (3 x 5 uints, a byte offset per
    // LOD): 3 storage buffers in the compute stage with the push field, far under WebGPU's default limit of 8
    const caps = PRESETS[this.presetName].caps;
    this.capTotal = caps.reduce((a, b) => a + b, 0);
    this.data = instancedArray(this.capTotal * 4, "vec4");
    const args = new Uint32Array(15);
    this.indirect = new THREE.IndirectStorageBufferAttribute(args, 5);
    this.counter = storage(this.indirect, "uint", 15).toAtomic();
    let base = 0;
    for (let l = 0; l < 3; l++) { this.lods.push(this.buildLod(l, caps[l], base)); base += caps[l]; }
    this.buildCompute();
    for (const L of this.lods) this.group.add(L.mesh);
    this.setPreset(this.presetName);
    this.enabled = true;
    this.counts = [0, 0, 0];
  }

  buildLod(l, cap, base) {
    const geom = bladeGeometry(LOD_SEG[l]);
    this.indirect.array[l * 5] = geom.index.count;
    geom.setIndirect(this.indirect, l * 5 * 4);
    const L = { l, cap, base, geom, n: l * 5 + 1 };
    const mat = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.85, metalness: 0 });
    this.bladeNodes(mat, L);
    mat.name = `grass-lod${l}`;
    L.mesh = new THREE.Mesh(geom, mat);
    L.mesh.frustumCulled = false; L.mesh.castShadow = false; L.mesh.receiveShadow = true;
    L.mesh.name = `grass-lod${l}`;
    L.material = mat;
    return L;
  }

  /** the candidate pass: one compute node per level, plus the counters' reset and clamp */
  buildCompute() {
    const F = this.field, U = grassU, u = this.u, lods = this.lods;
    const cnt = this.counter, data = this.data;
    this.reset = Fn(() => { for (const L of lods) atomicStore(cnt.element(L.n), uint(0)); })().compute(1);
    this.reset.setName("grass reset");
    this.clamp = Fn(() => {
      for (const L of lods) { const n = atomicLoad(cnt.element(L.n)); atomicStore(cnt.element(L.n), min(n, uint(L.cap))); }
    })().compute(1);
    this.clamp.setName("grass clamp");
    this.levels = [];
    for (let k = 0; k <= TOP; k++) {
      const lu = { base: uniform(new THREE.Vector2()), side: uniform(1, "uint") };
      this.levelU.push(lu);
      const stride = 1 << k;
      const lo = k === TOP ? 0 : Math.pow(4, -(k + 1)), hi = Math.pow(4, -k);
      const node = Fn(() => {
        const i = instanceIndex;
        const ci = int(lu.base.x).add(int(i.mod(lu.side)).mul(stride)), cj = int(lu.base.y).add(int(i.div(lu.side)).mul(stride));
        // a higher level owns the cells on its own coarser grid
        const owned = k === TOP ? float(1) : select(ci.bitAnd(2 * stride - 1).equal(0).and(cj.bitAnd(2 * stride - 1).equal(0)), float(0), float(1));
        const seed = uint(ci.add(4194304)).mul(uint(73856093)).bitXor(uint(cj.add(4194304)).mul(uint(19349663))).toVar();
        const h0 = hash(seed), h1 = hash(seed.add(1));
        const xz = vec2(float(ci).add(h0.mul(stride)), float(cj).add(h1.mul(stride))).mul(CELL).toVar();
        const dxz = length(xz.sub(u.cam.xz));
        // cheap tests first, no memory reads: owned, inside the reach, roughly in the frustum at the camera's ground
        const rc = u.vp.mul(vec4(xz.x, u.groundY, xz.y, 1));
        const roughIn = abs(rc.x).lessThan(rc.w.add(3)).and(abs(rc.y).lessThan(rc.w.add(14))).and(rc.w.greaterThan(-4));
        // the rank against the most generous density any type could have here (d0 of a meadow): most far candidates
        // of the fine levels end here, before any memory read
        const r0 = hash(seed.add(2)).mul(hi - lo).add(lo);
        const d0max = U.d0.mul(10);
        const pMax = min(float(1), d0max.div(max(dxz, 0.05)).mul(d0max.div(max(dxz, 0.05))));
        If(owned.greaterThan(0.5).and(dxz.lessThan(U.rmax)).and(pMax.greaterThan(r0)).and(roughIn), () => {
          const f = F.sample(xz);
          const r2 = hash(seed.add(3));
          const keepCover = f.dens.mul(U.density).sub(r2);
          If(f.free.greaterThan(0.5).and(keepCover.greaterThan(0)), () => {
            const len = f.len;
            const root = vec3(xz.x, f.y, xz.y);
            const d = max(length(root.sub(u.cam)), 0.05);
            const d0 = mix(float(6), float(10), len).mul(U.d0);
            const rEnd = min(mix(float(20), float(46), sqrt(len)).mul(U.reach), U.rmax);
            const pd = min(float(1), d0.div(d).mul(d0.div(d)));
            const p = pd.mul(float(1).sub(smoothstep(rEnd.mul(0.55), rEnd, d)));
            const r = r0;
            If(p.greaterThan(r), () => {
              const grow = smoothstep(0, 0.35, float(1).sub(r.div(p))).mul(smoothstep(0, 0.12, keepCover));
              // blade shape: type height x own random x clump
              const rH = hash(seed.add(4)), rY = hash(seed.add(5)), rL = hash(seed.add(6));
              const cl = this.nearestClump(xz, mix(float(0.22), float(0.55), len));
              const clumpK = smoothstep(0.85, 0.1, cl.dist).mul(mix(float(0.35), float(0.85), len));
              const Hb = float(0.055).add(pow(len, float(1.6)).mul(0.47));
              const H = Hb.mul(rH.mul(0.7).add(0.65)).mul(mix(float(1), cl.p.x.mul(0.7).add(0.65), clumpK)).mul(grow).mul(U.height);
              If(H.greaterThan(0.004), () => {
                // exact frustum (the tallest blade with its lean is < 0.8 m)
                const clip = u.vp.mul(vec4(root.add(vec3(0, H.mul(0.5), 0)), 1));
                const mg = H.add(0.3).mul(1.5);
                If(abs(clip.x).lessThan(clip.w.add(mg)).and(abs(clip.y).lessThan(clip.w.add(mg))).and(clip.w.greaterThan(mg.negate())), () => {
                  const widen = clamp(float(1).div(sqrt(max(pd, 0.01))), 1, U.maxWiden);
                  const W0 = float(0.005).add(len.mul(0.002)).mul(hash(seed.add(7)).mul(0.5).add(0.75)).mul(widen);
                  const W = max(W0, U.minPixels.mul(d).div(U.pixelScale)).mul(min(grow.mul(3), 1));
                  // facing: own, pulled toward the clump's; turned toward the camera when edge-on
                  let yaw = mix(rY, cl.p.z, clumpK).mul(PI2);
                  const toCam = u.cam.xz.sub(xz), tcl = max(length(toCam), 1e-3);
                  const camYaw = atan(toCam.x.negate(), toCam.y).toVar();         // blade side vector perpendicular to the view
                  const sideV = vec2(cos(yaw), sin(yaw));
                  const edgeOn = abs(dot(sideV, toCam.div(tcl)));                  // 1 = side vector along the view: edge-on
                  const dy = camYaw.sub(yaw); const wrap = dy.sub(floor(dy.div(Math.PI).add(0.5)).mul(Math.PI));
                  yaw = yaw.add(wrap.mul(smoothstep(0.55, 1.0, edgeOn).mul(0.6)));
                  // lean: rest (clump-led, long grass flops more) + wind + push
                  const restA = mix(rL, cl.p.w, clumpK).mul(PI2);
                  const rest = vec2(cos(restA), sin(restA)).mul(mix(float(0.08), float(0.42), len).mul(hash(seed.add(8)).mul(0.6).add(0.4)));
                  const w = windAt(xz);
                  const pu = this.push.at(xz);
                  const lean0 = rest.add(w.xy.mul(mix(float(0.3), float(1.25), len))).add(pu.xy.mul(pu.z.mul(1.3)));
                  const lm = min(length(lean0), 0.95);
                  const lean = lean0.div(max(length(lean0), 1e-4)).mul(lm);
                  const crush = pu.z;
                  // the ground's colour here (what the textured ground averages to): lawn / rough / dry + macro tone
                  const nA = texture(noiseTex, xz.div(640)).level(0), nB = texture(noiseTex, xz.div(176).add(0.37)).level(0);
                  const rough = smoothstep(0.45, 0.8, nA.r);
                  let fc = mix(mix(LAWN, ROUGH, rough.mul(0.8)), DRY, f.dry.mul(0.6));
                  fc = fc.mul(nB.b.sub(0.5).mul(0.16).add(nA.g.sub(0.5).mul(0.22)).add(1));
                  const flower = select(hash(seed.add(9)).lessThan(f.flowers.mul(0.05)), float(2), float(0));
                  const dl = d.mul(hash(seed.add(10)).mul(0.3).add(0.85));          // dithered hand-over: no line where the LOD changes
                  const lodSel = select(dl.lessThan(U.lod0), int(0), select(dl.lessThan(U.lod1), int(1), int(2)));
                  const seedF = float(seed.bitAnd(uint(0xffffff)));
                  for (const L of lods) {
                    If(lodSel.equal(L.l), () => {
                      const slot = atomicAdd(cnt.element(L.n), uint(1));
                      If(slot.lessThan(uint(L.cap)), () => {
                        const o = slot.add(uint(L.base)).mul(4);
                        data.element(o).assign(vec4(root, seedF));
                        data.element(o.add(1)).assign(vec4(H, W, yaw, len.add(flower)));
                        data.element(o.add(2)).assign(vec4(lean, crush, d.add(floor(cl.p.y.mul(0.36).add(0.82).mul(100)).mul(1000))));
                        data.element(o.add(3)).assign(vec4(fc, f.dry));
                      });
                    });
                  }
                });
              });
            });
          });
        });
      })().compute(1, [64]);
      node.setName(`grass level ${k}`);
      this.levels.push(node);
    }
  }

  /** nearest clump centre (Voronoi over the 3x3 cells, Ghost of Tsushima / Hybrid) -> { dist (cells), p: 4 randoms } */
  nearestClump(xz, scale) {
    const cp = xz.div(scale), base = floor(cp), fr = cp.sub(base);
    let best = float(9), bestCell = vec2(base);
    for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
      const cell = base.add(vec2(ox, oz));
      const s = uint(int(cell.x).add(65536)).mul(uint(2654435761)).bitXor(uint(int(cell.y).add(65536)).mul(uint(40503)));
      const rel = vec2(ox, oz).add(vec2(hash(s), hash(s.add(17)))).sub(fr);
      const dd = length(rel);
      const closer = dd.lessThan(best);
      bestCell = select(closer, cell, bestCell);
      best = min(best, dd);
    }
    const s2 = uint(int(bestCell.x).add(65536)).mul(uint(97)).bitXor(uint(int(bestCell.y).add(65536)).mul(uint(2246822519))).add(uint(7));
    return { dist: best, p: vec4(hash(s2), hash(s2.add(1)), hash(s2.add(2)), hash(s2.add(3))) };
  }

  bladeNodes(mat, L) {
    const o = instanceIndex.add(uint(L.base)).mul(4);
    const a = this.data.element(o), b = this.data.element(o.add(1)), c = this.data.element(o.add(2)), dd = this.data.element(o.add(3));
    const root = a.xyz, seed = uint(a.w);
    const H = b.x, W = b.y, yaw = b.z, isFlower = b.w.greaterThanEqual(2), len = b.w.sub(select(isFlower, float(2), float(0)));
    const lean = c.xy, crush = c.z;
    const cpk = floor(c.w.div(1000)), dist = c.w.sub(cpk.mul(1000)), cshade = mix(float(1), cpk.div(100), clamp(len.mul(2).add(0.4), 0, 1));
    const fc = dd.xyz, dry = dd.w;
    const h = P0().y, side = P0().x;
    const rnd = (k) => hash(seed.add(uint(k)));
    const sideV = vec3(cos(yaw), 0, sin(yaw));
    // flutter (vertex, cheap): along the wind, tip-weighted, more in long grass
    const ph = rnd(11).mul(PI2);
    const fl = sin(wind.uTime.mul(2.3).add(ph)).mul(0.05).add(sin(wind.uTime.mul(4.1).add(ph.mul(1.7))).mul(0.02)).mul(len.mul(0.8).add(0.2)).mul(wind.uStrength.mul(2).add(0.2));
    const lv = lean.add(vec2(wind.uDir.x, wind.uDir.y).mul(fl));
    const lm = min(length(lv), 0.97);
    const prof = h.mul(h);
    const drop = float(1).sub(lm.mul(lm).mul(0.5).mul(h));
    const Hc = H.mul(mix(float(1), float(0.3), crush));
    // taper; a flower's top swells into a small head
    const taper = float(1).sub(pow(max(h, 0.001), float(1.5)).mul(0.85));
    const head = select(isFlower, smoothstep(0.7, 0.95, h).mul(4.5), float(0));
    const p = root.add(vec3(lv.x.mul(prof).mul(Hc), h.mul(Hc).mul(drop), lv.y.mul(prof).mul(Hc))).add(sideV.mul(side.mul(W).mul(taper.add(head))));
    mat.positionNode = p;
    // lighting normal: mostly up (the field reads like the ground it fades into), a little of the blade's face, rounded
    const tang = normalize(vec3(lv.x.mul(h.mul(2)), drop, lv.y.mul(h.mul(2))));
    const toCam = cameraPosition.sub(root);
    let nf = normalize(cross(sideV, tang));
    // a thin blade is lit through: its face turned to the SUN (not to the camera), so a backlit lawn is not black stubble
    nf = nf.mul(sign(dot(nf, env.uSunDir)).add(0.001));
    const nW = normalize(mix(normalize(nf.add(sideV.mul(side.mul(1.2)))), vec3(0, 1, 0), grassU.flat));
    mat.normalNode = normalize(cameraViewMatrix.mul(vec4(varying(nW, "v_grN"), 0)).xyz);
    // colour: the ground's mean colour, darker at the root (the thatch), brighter / yellower at the tip, per blade
    const r1 = rnd(12), r2 = rnd(13);
    const grad = mix(grassU.root.mul(mix(float(1), float(0.8), len)), grassU.tip, pow(max(h, 0.001), float(0.85)));
    const shade = rnd(15).mul(0.4).add(0.78).mul(cshade);                // per blade x per clump (Hybrid: 0.82..1.18)
    let col = fc.mul(grad).mul(shade).mul(vec3(r1.sub(0.5).mul(0.22).add(1), 1, float(1).sub(r1.sub(0.5).mul(0.3))));
    col = col.mul(mix(vec3(1), vec3(1.05, 1.05, 0.84), h.mul(0.6)));
    col = col.mul(vec3(grassU.tint));
    // dry / straw blades (verges, summer drought)
    const dryAmt = clamp(dry.add(grassU.dry.mul(0.6)).mul(1.4).sub(r2.mul(0.8)), 0, 1);
    col = mix(col, vec3(0.30, 0.25, 0.11).mul(h.mul(0.5).add(0.62)), dryAmt.mul(0.85));
    // frost on the tips
    col = mix(col, vec3(0.62, 0.66, 0.7), grassU.frost.mul(smoothstep(0.3, 1, h)).mul(0.75));
    // a flower head: buttercup yellow, oxeye white, clover pink, knapweed purple
    const sp = rnd(14);
    const petal = select(sp.lessThan(0.4), vec3(0.85, 0.62, 0.03), select(sp.lessThan(0.7), vec3(0.82, 0.82, 0.76), select(sp.lessThan(0.88), vec3(0.6, 0.27, 0.42), vec3(0.36, 0.2, 0.55))));
    col = select(isFlower.and(h.greaterThan(0.72)), petal, col);
    // far: converge to the ground's colour, so the last blades sinking into it change the picture little
    const cv = smoothstep(5, 30, dist).mul(grassU.conv).mul(0.8);
    col = mix(col, fc.mul(1.02), cv);
    const dbg = [vec3(1.6, 0.5, 0.5), vec3(0.5, 1.6, 0.5), vec3(0.5, 0.5, 1.8)][L.l];
    col = mix(col, col.mul(dbg), grassU.debugLod);
    mat.colorNode = varying(col, "v_grC");
    mat.roughnessNode = float(0.82);
    addLampLight(mat);
  }

  setPreset(name) {
    const P = PRESETS[name] || PRESETS.high;
    this.presetName = name;
    grassU.density.value = P.density; grassU.d0.value = P.d0; grassU.reach.value = P.reach; grassU.rmax.value = P.rmax;
    this.sizeLevels();
  }

  /** dispatch sizes per level from the reach (no shader rebuild: counts are uniforms) */
  sizeLevels() {
    const d0max = 10 * grassU.d0.value, rmax = grassU.rmax.value;
    this.levelR = [];
    for (let k = 0; k <= TOP; k++) {
      const R = Math.min(rmax, k === TOP ? rmax : 2 * d0max * (1 << k));
      const step = CELL * (1 << k);
      const side = Math.ceil((2 * R) / step) + 2;
      this.levelR.push({ R, step, side });

    }
  }

  /** CPU per frame: a few uniform writes; returns the compute nodes to run (one renderer.compute call) */
  frame(camera, dt = 1 / 60) {
    const cam = camera.position;
    this.field.update(cam);
    const gy = this.groundAt ? this.groundAt(cam.x, cam.z) : cam.y - 1.6;
    const above = cam.y - gy;
    const on = this.enabled && above < grassU.rmax.value;
    this.group.visible = on;
    if (!on) return [];
    this.u.cam.value.copy(cam);
    this.u.groundY.value = gy;
    this.u.vp.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    grassU.pixelScale.value = camera.projectionMatrix.elements[5] * this.renderer.domElement.height * 0.5;
    // per level: only the part of its square the view can see (the horizontal sector of the view, plus 3 m round the
    // camera), as an axis-aligned box of cells: ~4x fewer candidate threads than the whole square
    const e = camera.matrixWorld.elements, fx = -e[8], fy = -e[9], fz = -e[10];
    const hl = Math.hypot(fx, fz), pitchDown = Math.atan2(-fy, hl);
    const half = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect) + 0.25;
    const yaw = Math.atan2(fz, fx);
    let ndisp = 0;
    for (let k = 0; k <= TOP; k++) {
      const { R, step } = this.levelR[k];
      let x0 = cam.x - 3, x1 = cam.x + 3, z0 = cam.z - 3, z1 = cam.z + 3;
      if (pitchDown > 0.9 || hl < 1e-3) { x0 = cam.x - R; x1 = cam.x + R; z0 = cam.z - R; z1 = cam.z + R; }
      else for (let a = -half; a <= half + 1e-6; a += half / 4) {
        const x = cam.x + Math.cos(yaw + a) * R, z = cam.z + Math.sin(yaw + a) * R;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
      }
      const s = 1 << k;
      const i0 = Math.floor(x0 / step), i1 = Math.ceil(x1 / step), j0 = Math.floor(z0 / step), j1 = Math.ceil(z1 / step);
      const sx = i1 - i0 + 1, sz = j1 - j0 + 1;
      this.levelU[k].base.value.set(i0 * s, j0 * s);
      this.levelU[k].side.value = sx;
      this.levels[k].count = sx * sz;
      ndisp += sx * sz;
    }
    this.threads = ndisp;
    const ps = this.push.frame(cam, dt);
    return [...(ps ? [ps] : []), this.reset, ...this.levels, this.clamp];
  }

  update(camera, dt) {
    const nodes = this.frame(camera, dt);
    if (nodes.length) this.renderer.compute(nodes);
  }

  /** blades drawn per LOD (async read-back, occasional) */
  async readCounts() {
    const out = [];
    const a = new Uint32Array(await this.renderer.getArrayBufferAsync(this.indirect));
    for (const L of this.lods) out.push(Math.min(a[L.n], L.cap));
    this.counts = out;
    return out;
  }

  /** the season's hook: drought in late summer, olive winter, frost on cold mornings, growth */
  syncSeason(info = season.info) {
    const day = season.day ?? 200;
    const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    grassU.dry.value = sm(190, 220, day) * (1 - sm(240, 265, day)) * 0.7;
    const winter = Math.max(1 - sm(60, 110, day), sm(310, 345, day));
    grassU.tint.value.setRGB(1 + 0.08 * winter, 1 - 0.1 * winter, 1 - 0.05 * winter);
    grassU.height.value = 0.8 + 0.2 * sm(90, 140, day) * (1 - sm(290, 330, day));
    grassU.frost.value = Math.max(0, Math.min(1, (5 - (info?.temp ?? 10)) / 3));      // monthly mean < 5 C: hoar frost (a morning look; the weather can drive it later)
  }
}
