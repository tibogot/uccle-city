// impostorKit source: the city's parked-car fleet, the faceted family (tools/blender/carFaceted.py ->
// models/cars/faceted.glb, LODs by viewer/carLodWorker.js exactly as viewer/carFleet.js gets them; read-only use).
// One variant (array layer) per car type: hatch_s, hatch_c, estate, saloon, suv, van_c, van_p, taxi.
// It bakes the shading INPUTS of viewer/drive/carPacks.js packMaterial (the far LODs' material: standard, opaque
// glass, no clear coat) split LINEARLY so ONE atlas serves every paint (the per-instance paint is applied live,
// types.js carShade):  colour = A.rgb + B.a x paint
//   A.rgb = the colour of everything that is NOT paint (0 on the paint)
//   B.a   = the paint's shade (its vertex colour is a grey the paint colour multiplies; 0 off the paint)
// Both are plain linear quantities, so the bake's coverage resolve, the dilation, the mips and the bilinear taps all
// stay exact at the paint's borders. (A first cut stored a neutral albedo + a paint MASK and did albedo x mix(1, paint,
// mask): every texel straddling a border then leaked the white neutral shade, which drew bright lines along the
// window line and the sills of dark cars: a black car came out 2-3x too bright.)
// Bake state = the mesh at the hand-over: LOD 3 (>= 130 m) by default, the LOD the fleet draws there.
import * as THREE from "three/webgpu";
import { attribute, float, vec3, select, normalGeometry } from "three/tsl";
import { bakeMaterial } from "../bake.js";

/** cars: the LOD worker's output (viewer/carLodWorker.js: [{ id, extras, lods: [{ P, N, C, K, I }] }]).
 *  glass: packMaterial's glass multiplier (viewer/drive/carPacks.js packLook.glass; passed in, so the kit does not
 *  import carPacks.js and its meshoptimizer dependency). */
export function fleetCarSource(cars, { lod = 3, glass = float(1) } = {}) {
  const kind = attribute("_kind", "float").add(0.5).floor(), vc = attribute("color", "vec3");
  const isPaint = kind.equal(1), isGlass = kind.equal(4);
  const albedo = select(isPaint, vec3(0), select(isGlass, vc.mul(glass), vc));
  const aux = select(isPaint, vc.x, float(0));
  const mat = bakeMaterial({ albedo, normal: normalGeometry, aux, side: THREE.DoubleSide });
  const geo = (m) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(m.P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(m.N, 3));
    g.setAttribute("color", new THREE.BufferAttribute(m.C, 3)); g.setAttribute("_kind", new THREE.BufferAttribute(m.K, 1));
    g.setIndex(new THREE.BufferAttribute(m.I, 1));
    return g;
  };
  const spheres = [], objects = [], boxes = [];
  for (const c of cars) {
    // the sphere and footprint from LOD 0 (the same whatever LOD is baked): the box centre, the farthest vertex
    const P = c.lods[0].P, box = new THREE.Box3(), v = new THREE.Vector3();
    for (let i = 0; i < P.length; i += 3) box.expandByPoint(v.set(P[i], P[i + 1], P[i + 2]));
    const ctr = box.getCenter(new THREE.Vector3());
    let R = 0;
    for (let i = 0; i < P.length; i += 3) R = Math.max(R, v.set(P[i], P[i + 1], P[i + 2]).distanceTo(ctr));
    spheres.push(new THREE.Sphere(ctr, R * 1.01));
    boxes.push(box);
    const g = geo(c.lods[Math.min(lod, c.lods.length - 1)]);
    const m = new THREE.Mesh(g, mat);
    m.frustumCulled = false;
    objects.push(m);
  }
  return {
    count: cars.length, lod, ids: cars.map((c) => c.id),
    sphere: (v) => spheres[v],
    object: (v) => objects[v],
    /** object-space bounding box of a variant (LOD 0): the contact shadow's footprint */
    box: (v) => boxes[v],
    dispose() { mat.dispose(); for (const o of objects) o.geometry.dispose(); },
  };
}
