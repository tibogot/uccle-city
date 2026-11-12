// PARK PLANTS (near only): small procedural clumps for the rockwork's ledges and cracks: ferns, ivy sprays, grass
// tufts. Opaque geometry (no alpha cut-out), vertex colours, one InstancedMesh per kind (one draw each), NO shadows,
// faded out by a dither between `near` and `far` metres from the camera (lodFade's screen noise) and not drawn beyond.
//   const plants = new PlantField({ near: 16, far: 22 }); scene.add(plants.group);
//   plants.set("fern", [matrix4, ...]); ...  plants.commit();   per frame: plants.update(cameraPosition)
import * as THREE from "three/webgpu";
import { attribute, positionWorld, cameraPosition, float, smoothstep, length, mix, vec3, uniform } from "three/tsl";
import { ditherNoise } from "./lodFade.js";

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function build(tris, cols) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(tris, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  g.computeVertexNormals();
  return g;
}
const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

/** a fern rosette: 7 arching fronds, leaflets alternating along each (about 220 triangles) */
function fern() {
  const P = [], C = [];
  const base = lin(0.16, 0.27, 0.07), tip = lin(0.36, 0.52, 0.14);
  const F = 7;
  for (let f = 0; f < F; f++) {
    const a = (f / F) * Math.PI * 2 + rnd() * 0.4, L = 0.38 + rnd() * 0.18, rise = 0.25 + rnd() * 0.15;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const pt = (t) => new THREE.Vector3().addScaledVector(dir, L * t).setY(rise * Math.sin(Math.PI * 0.62 * t) - 0.08 * t * t);
    const N = 7;
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N, p0 = pt(t0), p1 = pt(t1), w = 0.012 * (1 - t0);
      const a0 = p0.clone().addScaledVector(side, w), b0 = p0.clone().addScaledVector(side, -w), a1 = p1.clone().addScaledVector(side, w * 0.6), b1 = p1.clone().addScaledVector(side, -w * 0.6);
      P.push(...a0.toArray(), ...b0.toArray(), ...a1.toArray(), ...a1.toArray(), ...b0.toArray(), ...b1.toArray());
      const c0 = base.clone().lerp(tip, t0), c1 = base.clone().lerp(tip, t1);
      C.push(...c0.toArray(), ...c0.toArray(), ...c1.toArray(), ...c1.toArray(), ...c0.toArray(), ...c1.toArray());
      for (const s of [1, -1]) {        // a leaflet each side
        const lw = 0.09 * (1 - t0 * 0.8);
        const tipP = p0.clone().lerp(p1, 0.5).addScaledVector(side, s * lw).add(new THREE.Vector3(0, -0.015, 0)).addScaledVector(dir, 0.03);
        P.push(...p0.toArray(), ...p1.toArray(), ...tipP.toArray());
        const cl = base.clone().lerp(tip, (t0 + t1) / 2 + 0.1);
        C.push(...c0.toArray(), ...c1.toArray(), ...cl.toArray());
      }
    }
  }
  return build(P, C);
}
/** a grass tuft: 14 curved blades (about 84 triangles) */
function grass() {
  const P = [], C = [];
  const base = lin(0.2, 0.28, 0.08), tip = lin(0.55, 0.6, 0.25);
  for (let b = 0; b < 14; b++) {
    const a = rnd() * Math.PI * 2, r0 = rnd() * 0.06, H = 0.18 + rnd() * 0.22, lean = 0.08 + rnd() * 0.18, w = 0.008 + rnd() * 0.005;
    const d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), s = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const pt = (t) => new THREE.Vector3(d.x * (r0 + lean * t * t), H * t, d.z * (r0 + lean * t * t));
    for (let i = 0; i < 3; i++) {
      const t0 = i / 3, t1 = (i + 1) / 3, p0 = pt(t0), p1 = pt(t1), w0 = w * (1 - t0), w1 = w * (1 - t1);
      const a0 = p0.clone().addScaledVector(s, w0), b0 = p0.clone().addScaledVector(s, -w0), a1 = p1.clone().addScaledVector(s, w1), b1 = p1.clone().addScaledVector(s, -w1);
      P.push(...a0.toArray(), ...b0.toArray(), ...a1.toArray(), ...a1.toArray(), ...b0.toArray(), ...b1.toArray());
      const c0 = base.clone().lerp(tip, t0), c1 = base.clone().lerp(tip, t1);
      C.push(...c0.toArray(), ...c0.toArray(), ...c1.toArray(), ...c1.toArray(), ...c0.toArray(), ...c1.toArray());
    }
  }
  return build(P, C);
}
/** an ivy spray: 16 lobed leaves on short stems, lying low and drooping (about 64 triangles) */
function ivy() {
  const P = [], C = [];
  const dark = lin(0.07, 0.15, 0.05), light = lin(0.15, 0.27, 0.08);
  for (let l = 0; l < 16; l++) {
    const a = rnd() * Math.PI * 2, r = 0.05 + rnd() * 0.32, y = 0.02 + rnd() * 0.06 - r * 0.15, sz = 0.04 + rnd() * 0.03;
    const c = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r), u = new THREE.Vector3(Math.cos(a + 0.8), 0.35, Math.sin(a + 0.8)).normalize(), v = new THREE.Vector3(-Math.sin(a), 0.25, Math.cos(a)).normalize();
    const pts = [[0, -1], [0.8, -0.2], [0.5, 0.6], [0, 1], [-0.5, 0.6], [-0.8, -0.2]].map(([x, z]) => c.clone().addScaledVector(u, x * sz).addScaledVector(v, z * sz));
    const col = dark.clone().lerp(light, rnd());
    for (let k = 1; k < pts.length - 1; k++) { P.push(...pts[0].toArray(), ...pts[k].toArray(), ...pts[k + 1].toArray()); C.push(...col.toArray(), ...col.toArray(), ...col.toArray()); }
  }
  return build(P, C);
}
export const PLANT_KINDS = { fern, grass, ivy };

export class PlantField {
  constructor({ near = 16, far = 22 } = {}) {
    this.group = new THREE.Group(); this.group.name = "park plants";
    this.near = uniform(near); this.far = uniform(far); this.farM = far;
    this.kinds = {}; this.meshes = {};
    const m = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.75 });
    m.colorNode = attribute("color", "vec3");
    const d = length(positionWorld.sub(cameraPosition));
    m.maskNode = ditherNoise().lessThan(float(1).sub(smoothstep(this.near, this.far, d)));
    this.material = m;
  }
  set(kind, matrices) { this.kinds[kind] = matrices.map((m) => ({ m, p: new THREE.Vector3().setFromMatrixPosition(m) })); }
  commit() {
    for (const im of Object.values(this.meshes)) this.group.remove(im);
    this.meshes = {};
    for (const [kind, list] of Object.entries(this.kinds)) {
      const im = new THREE.InstancedMesh(PLANT_KINDS[kind](), this.material, Math.max(1, list.length));
      im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; im.count = 0; im.name = `plants ${kind}`;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(im); this.meshes[kind] = im;
    }
  }
  /** only the clumps within `far` go to the GPU (the shader dithers them out between near and far) */
  update(eye) {
    let n = 0, tris = 0;
    for (const [kind, list] of Object.entries(this.kinds)) {
      const im = this.meshes[kind]; if (!im) continue;
      let c = 0;
      for (const it of list) if (it.p.distanceTo(eye) < this.farM) im.setMatrixAt(c++, it.m);
      im.count = c; im.visible = c > 0; im.instanceMatrix.needsUpdate = c > 0;
      n += c; tris += c * im.geometry.attributes.position.count / 3;
    }
    return { plants: n, tris };
  }
  get total() { return Object.values(this.kinds).reduce((s, l) => s + l.length, 0); }
}
