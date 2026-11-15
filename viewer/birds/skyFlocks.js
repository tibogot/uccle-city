// THE SKY FLOCKS (?birds=0 = none): every flying flock of the city's sky in ONE GPU simulation (WebGPU compute, storage
// buffers), drawn in TWO indirect draws: near birds as a ~70-triangle mesh flapping in the vertex shader, far birds (a
// few pixels) as a flapping chevron. The CPU only writes uniforms (the director, viewer/birds/cityBirds.js, says where
// each flock is going, when it comes and goes, what threatens it).
//
// One buffer of 3 vec4 per bird: [pos.xyz, slot] [vel.xyz, wing phase] [bank, wing amplitude, glide timer, epoch].
// The birds are split into fixed SLOTS (a flock each, a fixed range of the buffer, a species, a capacity); a slot is
// switched on with a new epoch: its birds respawn round its spawn point (a lattice for a murmuration, a ball for the
// others) and fly to the target the director moves.
//
// The flocking (Reynolds 1987 separation / alignment / cohesion, three.js r187 examples/webgpu_compute_birds.html):
//  - small flocks (<= 256: pigeons, jackdaws, gulls, parakeets, a feeding party of starlings) look at every bird of their
//    own flock (a loop over the slot's range: 256 x 256 = 65k distance tests a frame, nothing on a GPU);
//  - THE MURMURATION (up to 3072 starlings) uses TOPOLOGICAL neighbours, as real starlings do: each bird keeps to its 6-7
//    nearest neighbours whatever the distance (Ballerini et al. 2008, PNAS 105: 1232; the StarDisplay model, Hildenbrandt,
//    Carere & Hemelrijk 2010, Behav. Ecol. 21: 1349). Here the neighbours are FIXED: the bird's 6 neighbours in a 3D index
//    lattice (they start as lattice neighbours, a soft spring with a dead band keeps them neighbours), so the flock moves
//    as one deforming sheet: alignment carries a turn or a scare across it as a wave (the agitation waves of real
//    murmurations, Procaccini et al. 2011; Hemelrijk et al. 2015), the dead band lets it stretch, fold and thin out.
//    3072 x 6 reads instead of 3072^2.
//  - each flock is pulled to its target (a point the director moves; plus a circling term for flocks that wheel round a
//    tower / a square), kept above the city's FLOOR (a 128 x 128 max-height texture of the loaded tiles round the camera,
//    8 m cells, + a clearance), and pushed away from up to 4 THREATS (the falcon, the camera, the peregrines of
//    Saint-Job, a phantom sparrowhawk in the murmuration): the closer, the harder, with more speed (scatter).
// After the step each visible bird is appended to the near or the far list (atomic counters in the indirect-draw
// buffer): no CPU read-back, no draw for what is not on screen.
import * as THREE from "three/webgpu";
import {
  Fn, If, Loop, uniform, uniformArray, float, int, uint, vec3, vec4, ivec2, instanceIndex, instancedArray, storage, atomicAdd,
  atomicStore, hash, mix, clamp, max, min, abs, sqrt, length, normalize, cross, dot, cos, sin, select, floor, pow, attribute,
  sign, positionLocal, cameraPosition, cameraViewMatrix, frontFacing, textureLoad, atan, lights,
} from "three/tsl";
import { SP, SP_STRIDE, PART, speciesTable, nearBirdGeometry, farBirdGeometry } from "./birdMesh.js";
import { setMotionDelta } from "../upscale.js";   // --- instmotion: the birds' motion vectors for the TAAU (docs/UPSCALE.md)

export const LATTICE = 1, SCAN = 0;
/** the fixed flock slots: a range of the buffer each (multiples of 64: one workgroup never mixes two loop lengths much) */
export const SLOTS = [
  { key: "murmuration", species: SP.starling, cap: 3072, mode: LATTICE },
  { key: "starlings", species: SP.starling, cap: 192, mode: SCAN },
  { key: "jackdaws", species: SP.jackdaw, cap: 64, mode: SCAN },
  { key: "jackdaws2", species: SP.jackdaw, cap: 64, mode: SCAN },
  { key: "gulls", species: SP.gull, cap: 64, mode: SCAN },
  { key: "parakeets", species: SP.parakeet, cap: 64, mode: SCAN },
];
let base = 0;
for (const s of SLOTS) { s.start = base; base += s.cap; }
export const TOTAL = base;                 // 3520
const NEAR_CAP = 1536;                     // near-mesh birds at most (the rest of the visible ones fall to the far list)
const SB = 8;                              // vec4 per slot in the slot uniform array
const THREATS = 4;
export const FLOOR = { n: 128, cell: 8 };  // the floor texture: 128 x 128 cells of 8 m (1 km round the camera)

export class SkyFlocks {
  constructor(renderer, { lightList = null } = {}) {
    this.renderer = renderer;
    this.group = new THREE.Group(); this.group.name = "sky-birds";
    // ---- the buffers
    const init = new Float32Array(TOTAL * 12);
    for (let k = 0; k < SLOTS.length; k++) for (let i = SLOTS[k].start; i < SLOTS[k].start + SLOTS[k].cap; i++) {
      init[i * 12 + 1] = -1e4; init[i * 12 + 3] = k;            // parked far under the city, its slot
      init[i * 12 + 4] = 1; init[i * 12 + 11] = -1;             // a velocity (never 0: normalize), no epoch yet
    }
    this.data = instancedArray(init, "vec4").setName("birds");
    this.lists = instancedArray(NEAR_CAP + TOTAL, "uint").setName("birdLists");
    this.nearGeo = nearBirdGeometry(); this.farGeo = farBirdGeometry();
    const args = new Uint32Array(10);
    args[0] = this.nearGeo.index.count; args[5] = this.farGeo.index.count;
    this.indirect = new THREE.IndirectStorageBufferAttribute(args, 5);
    this.counter = storage(this.indirect, "uint", 10).toAtomic();
    this.nearGeo.setIndirect(this.indirect, 0);
    this.farGeo.setIndirect(this.indirect, 5 * 4);
    // ---- uniforms
    this.slotV = []; for (let i = 0; i < SLOTS.length * SB; i++) this.slotV.push(new THREE.Vector4(0, 0, 0, 0));   // (w = 0: a Vector4 starts at w = 1, which read as "slot on")
    this.slotU = uniformArray(this.slotV, "vec4").setName("birdSlots");
    this.threatV = []; for (let i = 0; i < THREATS; i++) this.threatV.push(new THREE.Vector4(0, -1e5, 0, 0));
    this.threatU = uniformArray(this.threatV, "vec4").setName("birdThreats");
    this.spU = uniformArray(speciesTable(), "vec4").setName("birdSpecies");
    this.u = {
      dt: uniform(0), frame: uniform(0, "uint"), cam: uniform(new THREE.Vector3()), vp: uniform(new THREE.Matrix4()),
      pixelScale: uniform(800), nearPx: uniform(7), farEnd: uniform(2600), light: uniform(1),
      floorO: uniform(new THREE.Vector2(-1e6, -1e6)), floorBase: uniform(0),
    };
    this.floorData = new Float32Array(FLOOR.n * FLOOR.n).fill(-1e4);
    this.floorTex = new THREE.DataTexture(this.floorData, FLOOR.n, FLOOR.n, THREE.RedFormat, THREE.FloatType);
    this.floorTex.minFilter = this.floorTex.magFilter = THREE.NearestFilter;
    this.floorTex.needsUpdate = true;
    this.lightList = lightList;
    this.buildCompute();
    this.near = this.buildNear(); this.far = this.buildFar();
    this.group.add(this.near, this.far);
    for (let k = 0; k < SLOTS.length; k++) {
      const s = SLOTS[k], o = k * SB;
      this.slotV[o + 3].set(s.species, 0, s.start, s.mode);
      this.slotV[o + 5].set(1, 1, 1, 1);
    }
    this.epoch = 0;
    this.active = 0;
    this.visible = true;
  }

  /** the slot's uniform row k (0..5) */
  row(k, r) { return this.slotV[k * SB + r]; }

  // ------------------------------------------------------------------------------------------------ compute
  buildCompute() {
    const D = this.data, U = this.u, S = this.slotU, T = this.threatU, SPU = this.spU, cnt = this.counter, lists = this.lists;
    const sp = (s, k) => SPU.element(s.mul(SP_STRIDE).add(k));
    this.reset = Fn(() => { atomicStore(cnt.element(1), uint(0)); atomicStore(cnt.element(6), uint(0)); })().compute(1).setName("birds reset");
    // ---- pass 1: the forces -> the velocity, the bank, the wings
    this.steer = Fn(() => {
      const i = int(instanceIndex);
      const o = i.mul(3);
      const p = D.element(o).toVar(), v = D.element(o.add(1)).toVar(), x = D.element(o.add(2)).toVar();
      const slot = int(p.w), sb = slot.mul(SB);
      const B0 = S.element(sb), B1 = S.element(sb.add(1)), B2 = S.element(sb.add(2)), B3 = S.element(sb.add(3)), B4 = S.element(sb.add(4)), B5 = S.element(sb.add(5));
      const count = int(B3.y), start = int(B3.z), local = i.sub(start);
      const s = int(B3.x);
      const seed = uint(i).mul(uint(2654435761)).toVar();
      If(B1.w.greaterThan(0.5).and(local.lessThan(count)), () => {
        // (FALCON GAME dead flag, claude/falcongame1: epoch + 0.5 = caught by the falcon: it flies on with its flock, never
        // drawn, never respawned until the slot's next epoch; see kill() below)
        If(x.w.notEqual(B2.w).and(x.w.notEqual(B2.w.add(0.5))), () => {
          // ---- (re)spawn: a lattice for the murmuration (the neighbours' rest spacing), a ball for the others
          const nx = int(B4.x), ny = int(B4.y), rest = B4.z;
          const lx = local.mod(nx), ly = local.div(nx).mod(ny), lz = local.div(nx.mul(ny));
          const nz = count.add(nx.mul(ny)).sub(1).div(nx.mul(ny));
          const jit = vec3(hash(seed), hash(seed.add(1)), hash(seed.add(2))).sub(0.5);
          const lat = vec3(float(lx).sub(float(nx).mul(0.5)), float(lz).sub(float(nz).mul(0.5)), float(ly).sub(float(ny).mul(0.5))).add(jit.mul(0.6)).mul(rest);
          const ball = jit.mul(2).mul(B0.w.mul(0.25).add(8));
          const off = select(B3.w.greaterThan(0.5), lat, ball);
          const dir = normalize(B0.xyz.sub(B2.xyz).add(vec3(0.001, 0, 0)));
          D.element(o).assign(vec4(B2.xyz.add(off), p.w));
          D.element(o.add(1)).assign(vec4(dir.mul(B1.y.add(B1.z).mul(0.5)), hash(seed.add(3)).mul(6.283)));
          D.element(o.add(2)).assign(vec4(0, 0.5, hash(seed.add(4)).mul(2), B2.w));
        }).Else(() => {
          const acc = vec3(0).toVar();
          const align = vec3(0).toVar(), nb = float(0).toVar();
          const alarm = float(0).toVar();
          If(B3.w.greaterThan(0.5), () => {
            // ---- topological: the 6 lattice neighbours (a spring with a dead band + alignment)
            const nx = int(B4.x), ny = int(B4.y), rest = B4.z;
            const lx = local.mod(nx), ly = local.div(nx).mod(ny);
            const offs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
            for (const [ox, oy, oz] of offs) {
              const okx = ox > 0 ? lx.lessThan(nx.sub(1)) : ox < 0 ? lx.greaterThan(0) : null;
              const oky = oy > 0 ? ly.lessThan(ny.sub(1)) : oy < 0 ? ly.greaterThan(0) : null;
              const nl = local.add(ox).add(nx.mul(oy)).add(nx.mul(ny).mul(oz));
              let ok = nl.greaterThanEqual(0).and(nl.lessThan(count));
              if (okx) ok = ok.and(okx);
              if (oky) ok = ok.and(oky);
              If(ok, () => {
                const j = start.add(nl).mul(3);
                const q = D.element(j), w = D.element(j.add(1));
                const dv = q.xyz.sub(p.xyz), d = max(length(dv), 0.01);
                // the dead band: no force between 0.65 and 1.5 x the rest spacing (the sheet stretches and folds)
                const pull = max(d.sub(rest.mul(1.5)), 0).mul(0.9).sub(max(rest.mul(0.65).sub(d), 0).mul(6));
                acc.addAssign(dv.div(d).mul(pull.mul(B5.y)));
                align.addAssign(w.xyz); nb.addAssign(1);
              });
            }
          }).Else(() => {
            // ---- metric: every bird of the flock (separation 1.4 m, alignment / cohesion within 12 m)
            const sep = vec3(0).toVar(), coh = vec3(0).toVar(), nc = float(0).toVar();
            // personal space ~2.6 spans (a starling 1 m, a jackdaw 1.8 m, a gull 2.6 m)
            const sr = sp(s, 0).x.mul(2.6), sr2 = sr.mul(sr).toVar();
            Loop({ start: start, end: start.add(count), type: "int", condition: "<" }, ({ i: k }) => {
              If(k.notEqual(i), () => {
                const j = k.mul(3);
                const q = D.element(j);
                const dv = q.xyz.sub(p.xyz), d2 = dot(dv, dv);
                If(d2.lessThan(144), () => {
                  const w = D.element(j.add(1));
                  align.addAssign(w.xyz); nb.addAssign(1);
                  coh.addAssign(dv); nc.addAssign(1);
                  If(d2.lessThan(sr2), () => { sep.subAssign(dv.div(max(d2, 0.04)).mul(sr2.div(1.96))); });
                });
              });
            });
            acc.addAssign(sep.mul(B5.w.mul(2.5)));
            If(nc.greaterThan(0), () => { acc.addAssign(coh.div(nc).mul(B5.y.mul(0.35))); });
          });
          If(nb.greaterThan(0), () => { acc.addAssign(align.div(nb).sub(v.xyz).mul(B5.z.mul(1.6))); });
          const to = B0.xyz.sub(p.xyz), dh = max(length(to.xz), 0.01);
          If(B3.w.greaterThan(0.5), () => {
            // ---- the murmuration's FORMATION: each bird has its own place in the flock's shape round the leader (the
            // target), in the leader's frame (heading row 6), scaled / bent by the director (row 7: the shifting shapes);
            // a soft pull, so the lattice + alignment keep it fluid and a scare ripples through it
            const B6 = S.element(sb.add(6)), B7 = S.element(sb.add(7));
            const nx = int(B4.x), ny = int(B4.y), rest = B4.z;
            const lx = local.mod(nx), ly = local.div(nx).mod(ny), lz = local.div(nx.mul(ny));
            const nz = count.add(nx.mul(ny)).sub(1).div(nx.mul(ny));
            const H = normalize(B6.xyz.add(vec3(0.0001, 0, 0)));
            const R = normalize(cross(H, vec3(0, 1, 0)).add(vec3(0, 0, 0.0001))), Up = cross(R, H);
            // the lattice square -> a disc (no box corners, no rows: each bird a fixed random offset in its cell)
            const jx = hash(seed.add(11)).sub(0.5), jy = hash(seed.add(12)).sub(0.5);
            const u = float(lx).add(0.5).add(jx.mul(0.9)).div(float(nx)).mul(2).sub(1), w = float(ly).add(0.5).add(jy.mul(0.9)).div(float(ny)).mul(2).sub(1);
            const ud = u.mul(sqrt(max(float(1).sub(w.mul(w).mul(0.5)), 0))), wd = w.mul(sqrt(max(float(1).sub(u.mul(u).mul(0.5)), 0)));
            const halfW = float(nx).mul(rest).mul(B7.x).mul(0.5).add(1);
            const ox = ud.mul(halfW);
            const oz = wd.mul(float(ny).mul(rest).mul(B7.z).mul(0.5));
            // the bend (a sheet curling up / down at its wings) and a travelling wave along it (row 7 w: its phase)
            // thicker in the middle than at the rim (a lens, not a slab)
            const lens = sqrt(max(float(1).sub(ud.mul(ud).add(wd.mul(wd)).mul(0.7)), 0.05));
            const oy = float(lz).add(0.5).add(hash(seed.add(13)).sub(0.5)).sub(float(nz).mul(0.5)).mul(rest).mul(B7.y).mul(lens)
              .add(B6.w.mul(ox.mul(ox)).div(halfW))
              .add(sin(oz.mul(0.08).add(B7.w)).mul(halfW.mul(0.18)));
            const goal = B0.xyz.add(R.mul(ox)).add(Up.mul(oy)).add(H.mul(oz));
            const g = goal.sub(p.xyz), gl = length(g);
            acc.addAssign(g.mul(min(gl, 40).div(max(gl, 0.01)).mul(0.45)));
          }).Else(() => {
            // ---- the flock's target: inside radius B0.w free, beyond pulled in; height sprung; circling
            const outR = max(dh.sub(B0.w), 0);
            acc.addAssign(vec3(to.x, 0, to.z).div(dh).mul(outR.mul(0.06).add(min(dh, 30).mul(0.015))));
            acc.y.addAssign(clamp(to.y.mul(0.12), -4, 4));
            acc.addAssign(vec3(to.z.negate(), 0, to.x).div(dh).mul(B4.w));
          });
          // ---- threats: away, harder the closer, the alarm (speed, flapping) with it
          for (let t = 0; t < THREATS; t++) {
            const th = T.element(t);
            const dv = p.xyz.sub(th.xyz), d = max(length(dv), 0.5);
            If(d.lessThan(th.w), () => {
              const k = float(1).sub(d.div(th.w));
              acc.addAssign(dv.div(d).mul(k.mul(k).mul(40)).add(vec3(0, k.mul(6), 0)));
              alarm.assign(max(alarm, k));
            });
          }
          // ---- the floor: the city's max height (texture window round the camera) + the clearance, looking ahead 1.5 s
          const floorAt = (P) => {
            const c = P.xz.sub(U.floorO).div(FLOOR.cell);
            const inside = c.x.greaterThanEqual(0).and(c.y.greaterThanEqual(0)).and(c.x.lessThan(FLOOR.n)).and(c.y.lessThan(FLOOR.n));
            const h = textureLoad(this.floorTex, ivec2(clamp(int(c.x), 0, FLOOR.n - 1), clamp(int(c.y), 0, FLOOR.n - 1))).x;
            return select(inside, h, U.floorBase);
          };
          const fl = max(floorAt(p.xyz), floorAt(p.xyz.add(v.xyz.mul(1.5)))).add(B1.x);
          If(p.y.lessThan(fl), () => { acc.y.addAssign(fl.sub(p.y).mul(3).add(4)); });
          // ---- a little noise (each bird its own)
          const nz = vec3(hash(seed.add(U.frame.mul(3))), hash(seed.add(U.frame.mul(3).add(1))), hash(seed.add(U.frame.mul(3).add(2)))).sub(0.5);
          acc.addAssign(nz.mul(vec3(3, 1.2, 3)));
          // ---- integrate the velocity, the speed band (faster when alarmed)
          const nv = v.xyz.add(acc.mul(U.dt)).toVar();
          const vmax = B1.z.mul(alarm.mul(0.45).add(1)), vmin = B1.y;
          const spd = max(length(nv), 0.01);
          nv.assign(nv.mul(clamp(spd, vmin, vmax).div(spd)));
          nv.y.assign(clamp(nv.y, vmax.mul(-0.55), vmax.mul(0.45)));
          // bank into the turn: the horizontal turn rate x speed / g (pigeons.js), eased
          const a0 = atan(v.x, v.z), a1 = atan(nv.x, nv.z);
          const dy = atan(sin(a1.sub(a0)), cos(a1.sub(a0)));
          const bankT = clamp(dy.negate().div(max(U.dt, 0.001)).mul(length(nv)).div(9.81).mul(0.5), -1.1, 1.1);
          const bank = mix(x.x, bankT, min(U.dt.mul(5), 1));
          // the wings: a flapping burst, a glide (more gliding for gulls), none of it when alarmed or climbing
          const S0 = sp(s, 2), S1 = sp(s, 1);
          const gt = x.z.sub(U.dt).toVar();
          const cyc = hash(seed.add(U.frame)).mul(0.6).add(0.7);
          If(gt.lessThan(float(-1.6).mul(cyc)), () => { gt.assign(S0.x.mul(2.2).mul(cyc)); });
          const gliding = gt.greaterThan(0).and(alarm.lessThan(0.15)).and(nv.y.lessThan(0.6));
          const ampT = select(gliding, float(0.05), S0.y.mul(alarm.mul(0.2).add(1)));
          const amp = mix(x.y, ampT, min(U.dt.mul(6), 1));
          const hz = select(gliding, float(0.25), S1.w.mul(hash(seed.add(7)).mul(0.25).add(0.9)).mul(alarm.mul(0.3).add(1)));
          const ph = v.w.add(U.dt.mul(hz).mul(6.2832)).mod(62.832);
          D.element(o.add(1)).assign(vec4(nv, ph));
          D.element(o.add(2)).assign(vec4(bank, amp, gt, x.w));
        });
      });
    })().compute(TOTAL, [64]).setName("birds steer");
    // ---- pass 2: move, the hard floor, the visible lists
    this.move = Fn(() => {
      const i = int(instanceIndex), o = i.mul(3);
      const p = D.element(o).toVar(), v = D.element(o.add(1)), x = D.element(o.add(2));
      const slot = int(p.w), sb = slot.mul(SB);
      const B1 = S.element(sb.add(1)), B2 = S.element(sb.add(2)), B3 = S.element(sb.add(3)), B5 = S.element(sb.add(5));
      const local = i.sub(int(B3.z));
      If(B1.w.greaterThan(0.5).and(local.lessThan(int(B3.y))).and(x.w.equal(B2.w).or(x.w.equal(B2.w.add(0.5)))), () => {
        const np = p.xyz.add(v.xyz.mul(U.dt)).toVar();
        D.element(o).assign(vec4(np, p.w));
        If(x.w.equal(B2.w), () => {                     // (FALCON GAME dead flag: a caught bird is not listed / drawn)
        // on screen? (a rough clip test with a margin), the size in pixels -> near / far list
        const c = U.vp.mul(vec4(np, 1));
        const inView = c.w.greaterThan(0.3).and(abs(c.x).lessThan(c.w.mul(1.06).add(2))).and(abs(c.y).lessThan(c.w.mul(1.06).add(2)));
        const d = length(np.sub(U.cam));
        If(inView.and(d.lessThan(U.farEnd)).and(B5.x.greaterThan(0.01)), () => {
          const span = SPU.element(int(B3.x).mul(SP_STRIDE)).x;
          const px = span.mul(U.pixelScale).div(max(d, 0.1)).mul(hash(uint(i).mul(uint(747796405))).mul(0.3).add(0.85));
          const near = px.greaterThan(U.nearPx);
          If(near, () => {
            const k = atomicAdd(this.counter.element(1), uint(1));
            If(k.lessThan(uint(NEAR_CAP)), () => { lists.element(k).assign(uint(i)); }).Else(() => {
              const f = atomicAdd(this.counter.element(6), uint(1));
              lists.element(f.add(uint(NEAR_CAP))).assign(uint(i));
            });
          }).Else(() => {
            const f = atomicAdd(this.counter.element(6), uint(1));
            lists.element(f.add(uint(NEAR_CAP))).assign(uint(i));
          });
        });
        });
      });
    })().compute(TOTAL, [64]).setName("birds move");
    // ---- FALCON GAME (claude/falcongame1, viewer/falconGame/gpuPrey.js): the DEAD FLAG. kill(i) marks bird i caught: its
    // epoch + 0.5 (steer: no respawn; move: still integrated with its flock, never listed so never drawn). One thread,
    // dispatched only on a catch (compiled once at start with i = -1).
    this.killU = uniform(-1, "int");
    this.killNode = Fn(() => {
      const i = this.killU;
      If(i.greaterThanEqual(0), () => {
        const o = i.mul(3), p = D.element(o), x = D.element(o.add(2));
        const ep = S.element(int(p.w).mul(SB).add(2)).w;
        If(x.w.equal(ep), () => { D.element(o.add(2)).assign(vec4(x.xyz, ep.add(0.5))); });
      });
    })().compute(1).setName("birds kill");
    this.clamp = Fn(() => {
      const n = this.counter.element(1);
      // (the overflow went to the far list: the near count is capped)
      atomicStore(n, min(atomicAdd(n, uint(0)), uint(NEAR_CAP)));
    })().compute(1).setName("birds clamp");
    this.nodes = [this.reset, this.steer, this.move, this.clamp];
  }

  /** the per-bird frame (shared by both draws): { p, f, r, u, s (species), phase, amp, bank, scale } */
  birdFrame(listOffset) {
    const D = this.data, S = this.slotU;
    const idx = int(this.lists.element(instanceIndex.add(uint(listOffset))));
    const o = idx.mul(3);
    const p = D.element(o), v = D.element(o.add(1)), x = D.element(o.add(2));
    const sb = int(p.w).mul(SB);
    const B3 = S.element(sb.add(3)), B5 = S.element(sb.add(5));
    const f = normalize(v.xyz);
    const r0 = normalize(cross(vec3(0, 1, 0), f).add(vec3(0.0001, 0, 0)));
    const u0 = cross(f, r0);
    const b = x.x;
    const r = r0.mul(cos(b)).add(u0.mul(sin(b))), u = u0.mul(cos(b)).sub(r0.mul(sin(b)));
    const scale = B5.x.mul(hash(uint(idx).mul(uint(97))).mul(0.16).add(0.92));
    return { p: p.xyz, v: v.xyz, f, r, u, s: int(B3.x), phase: v.w, amp: x.y, scale, idx };
  }

  buildNear() {
    const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.8, metalness: 0, flatShading: true, side: THREE.DoubleSide });
    m.name = "sky-birds-near";
    const F = this.birdFrame(0), sp = (k) => this.spU.element(F.s.mul(SP_STRIDE).add(k));
    const S0 = sp(0), S1 = sp(1);
    const span = S0.x, len = S0.y, tail = S0.z, tailW = S0.w, root = S1.x, tip = S1.y, sweep = S1.z;
    const part = attribute("part", "float"), P = positionLocal;
    const isWing = part.equal(PART.wing), isTail = part.equal(PART.tail);
    // the wing's planform (s, q) -> x, z; the flap about the shoulder (the angle grows and lags along the span)
    const s = abs(P.x), side = sign(P.x), q = P.z;
    const bodyHW = len.mul(0.11), half = span.mul(0.5);
    const rr = s.mul(half.sub(bodyHW));
    const chord = mix(root, tip, pow(s, float(1.3))).mul(span);
    const zle = len.mul(0.1).sub(sweep.mul(span).mul(pow(s, float(1.5))));
    const th = F.amp.mul(s.mul(0.35).add(0.75)).mul(sin(F.phase.sub(s.mul(0.9)))).add(s.mul(0.08));
    const wing = vec3(side.mul(bodyHW.add(rr.mul(cos(th)))), rr.mul(sin(th)).add(len.mul(0.03)), zle.sub(q.mul(chord)));
    const tl = vec3(q.mul(len.mul(0.04).add(P.x.mul(tailW).mul(tail).mul(len))), len.mul(0.01), len.mul(-0.38).sub(P.x.mul(tail).mul(len)));
    const body = P.mul(len);
    const local = select(isWing, wing, select(isTail, tl, body));
    m.positionNode = F.p.add(F.r.mul(local.x).add(F.u.mul(local.y)).add(F.f.mul(local.z)).mul(F.scale));
    // colour by part; the wings: top / underside by the face, the dark tips beyond 72 % of the span
    const col = (k) => sp(3 + k).xyz;
    const wingC = select(s.greaterThan(0.72), col(4), select(frontFacing, col(2), col(3)));
    const c = select(part.equal(PART.back), col(0), select(part.equal(PART.belly), col(1), select(part.equal(PART.head), col(5), select(part.equal(PART.beak), col(6), select(isTail, col(0), wingC)))));
    m.colorNode = c;
    if (this.lightList) m.lightsNode = lights(this.lightList);
    // --- instmotion: this frame's move pass did p += v dt, so last frame the bird was v dt back (its turn and the
    // wing beat between the two frames are left out: a few cm)
    setMotionDelta(m, F.v.mul(this.u.dt).negate());
    const mesh = new THREE.Mesh(this.nearGeo, m);
    mesh.name = "sky-birds-near"; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
    return mesh;
  }

  buildFar() {
    // lit like the near birds by the sun + the sky (Lambert, the normal straight up: a bird's back / belly catch the sky
    // light), so a far flock is as dark against the dusk sky as the near birds, never brighter than it (an unlit
    // colour glowed grey in the night exposure)
    const m = new THREE.MeshLambertNodeMaterial({ side: THREE.DoubleSide });
    m.name = "sky-birds-far";
    m.normalNode = normalize(cameraViewMatrix.mul(vec4(0, 1, 0, 0)).xyz);
    if (this.lightList) m.lightsNode = lights(this.lightList);
    const F = this.birdFrame(NEAR_CAP), sp = (k) => this.spU.element(F.s.mul(SP_STRIDE).add(k));
    const span = sp(0).x;
    const P = positionLocal, side = P.x, edge = P.y;
    const toB = F.p.sub(cameraPosition), d = max(length(toB), 0.1), view = toB.div(d);
    // across the screen: the span axis as it is (a bird seen side on is a dash), the arms flap along the screen's "up"
    const U0 = normalize(cross(F.r, view).add(vec3(0, 0.0001, 0)));
    const U = U0.mul(sign(U0.y).add(0.0001));
    const pxW = d.div(this.u.pixelScale);                                        // metres per pixel there
    const half = max(span.mul(0.5).mul(F.scale), pxW.mul(1.1));
    const thick = max(span.mul(0.06), pxW.mul(0.75));
    const flapY = sin(F.phase).mul(F.amp).mul(0.5);
    m.positionNode = F.p.add(F.r.mul(side.mul(half))).add(U.mul(abs(side).mul(flapY).mul(half).add(edge.mul(thick))));
    // unlit silhouette: the species' back colour lit by the hour (a white gull is not a lamp at dusk)
    m.colorNode = mix(sp(3).xyz, sp(4).xyz, 0.5).mul(this.u.light);
    setMotionDelta(m, F.v.mul(this.u.dt).negate());               // --- instmotion
    const mesh = new THREE.Mesh(this.farGeo, m);
    mesh.name = "sky-birds-far"; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
    return mesh;
  }

  // ------------------------------------------------------------------------------------------------ CPU side
  /** switch a slot on (a new epoch: its birds respawn at spawn, fly to the target) or off */
  setSlot(k, { on, count, spawn, target, radius = 30, floorClear = 12, vmin = 8, vmax = 16, circle = 0, rest = 2, cohesion = 1, align = 1, sep = 1 }) {
    const S = SLOTS[k];
    if (!on) { this.row(k, 1).w = 0; return; }
    count = Math.max(1, Math.min(S.cap, Math.round(count ?? S.cap)));
    // the lattice: flat (thin sheets: Ballerini et al. 2008, flocks ~3x wider than thick): nx : ny : nz ~ 8 : 6 : 1
    const nz = Math.max(1, Math.round(Math.cbrt(count / 48))), ny = Math.max(1, Math.round(Math.sqrt(count / nz * 0.75))), nx = Math.ceil(count / (ny * nz));
    this.row(k, 0).set(target.x, target.y, target.z, radius);
    this.row(k, 1).set(floorClear, vmin, vmax, 1);
    this.row(k, 2).set(spawn.x, spawn.y, spawn.z, ++this.epoch);
    this.row(k, 3).y = count;
    this.row(k, 4).set(nx, ny, rest, circle);
    this.row(k, 5).set(1, cohesion, align, sep);
    const hx = target.x - spawn.x, hz = target.z - spawn.z, hl = Math.hypot(hx, hz) || 1;
    this.row(k, 6).set(hx / hl, 0, hz / hl, 0);
    this.row(k, 7).set(1, 1, 1, 0);
  }
  /** the murmuration's shape: heading (h, normalised by the GPU), bend, per-axis scale (across, up, along), wave phase */
  setShape(k, hx, hy, hz, bend, sx, sy, sz, wave) { this.row(k, 6).set(hx, hy, hz, bend); this.row(k, 7).set(sx, sy, sz, wave); }
  setTarget(k, x, y, z, radius) { const r = this.row(k, 0); r.set(x, y, z, radius ?? r.w); }
  setFade(k, f) { this.row(k, 5).x = f; }
  setThreat(t, x, y, z, r) { this.threatV[t].set(x, y, z, r); }
  slotOn(k) { return this.row(k, 1).w > 0.5; }

  /** per frame: a few uniform writes and one compute submit (nothing at all when no flock is on) */
  update(camera, dt, frame) {
    let any = false;
    for (let k = 0; k < SLOTS.length; k++) if (this.slotOn(k)) { any = true; break; }
    const on = any && this.visible;
    this.near.visible = this.far.visible = on;
    if (!on) return false;
    const U = this.u;
    U.dt.value = Math.min(dt, 0.05);
    U.frame.value = frame >>> 0;
    U.cam.value.copy(camera.position);
    U.vp.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    U.pixelScale.value = camera.projectionMatrix.elements[5] * this.renderer.domElement.height * 0.5;
    this.renderer.compute(this.nodes);
    return true;
  }

  /** FALCON GAME (claude/falcongame1): bird i caught by the falcon (the dead flag above); i < 0: a no-op dispatch (compile) */
  kill(i) { this.killU.value = i; this.renderer.compute(this.killNode); }

  /** the GPU's lists (async read-back, debug): { near, far } */
  async readCounts() {
    const a = new Uint32Array(await this.renderer.getArrayBufferAsync(this.indirect));
    return { near: a[1], far: a[6] };
  }
  /** a few birds' positions (async read-back, debug / audits) */
  async readBirds() { return new Float32Array(await this.renderer.getArrayBufferAsync(this.data.value)); }
}
