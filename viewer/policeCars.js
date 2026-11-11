// PARKED POLICE CARS in the Rue Rouge 17 yard: the city's own faceted car family (tools/blender/carFaceted.py ->
// models/cars/faceted.glb, loaded through viewer/drive/carPacks.js with its meshoptimizer LODs) in a POLICE LIVERY made
// in the material (no texture, no logo): white paint, the sides' lower half in two rows of "Battenburg" blocks of
// fluorescent yellow and blue (the current Belgian federal / local police scheme), a blue light bar on the roof. The
// lettering ("POLICE / POLITIE") and the emblem are NOT drawn. Places: the north yard's bays along the hedge and one
// south bay (the orthophoto's parked patrol cars, NOTES.md).
// Two levels per car (pack LOD1 near, LOD3 far), cross-faded by distance like the station (lodFade fading copies only
// inside the bands), gone past 300 m (faded 260-340 m).
//   const cars = await buildPoliceCars({ site, groundAt, lift });  scene.add(cars.group);  cars.update(cameraPos)
import * as THREE from "three/webgpu";
import { attribute, select, positionLocal, normalLocal, abs, floor, mod, mix, smoothstep, step, vec3 } from "three/tsl";
import { loadPack, packMaterial } from "./drive/carPacks.js";
import { fadeVariant, SMOOTH } from "./lodFade.js";

// the frame (u toward Rue Rouge, w south-east along it), heading: "u+" = nose toward the street, "w+" = nose south-east
export const POLICE_CAR_PLACES = [
  { type: "estate", u: 22.75, w: -9.15, nose: "u+" },
  { type: "van_c", u: 22.70, w: -6.65, nose: "u+" },
  { type: "estate", u: 22.75, w: -1.65, nose: "u+" },
  { type: "suv", u: 22.75, w: 3.35, nose: "u+" },
  { type: "estate", u: 10.35, w: 3.70, nose: "w-" },
];
const LODS = [{ pack: 1, until: 60, band: 10 }, { pack: 3, until: 300, band: 40 }];
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };

/** the livery on the faceted pack material: paint (kind 1) -> white + Battenburg blocks on the sides */
function liveryMaterial() {
  const m = packMaterial({ paint: new THREE.Color(1, 1, 1), rich: true });
  const kind = attribute("_kind", "float").add(0.5).floor(), vc = attribute("color", "vec3");
  const isPaint = kind.equal(1);
  const p = positionLocal, n = normalLocal;
  // the sides (normal mostly across the car), between 0.40 and 0.86 m: two rows of 0.23 m, blocks 0.46 m long
  const side = smoothstep(0.55, 0.8, abs(n.x));
  const band = step(0.40, p.y).mul(step(p.y, 0.86));
  const row = floor(p.y.sub(0.40).div(0.23)), col = floor(p.z.add(4.0).div(0.46));
  const chk = mod(row.add(col), 2);
  const blocks = mix(lin(0x0b2f86), lin(0xd9f20f), chk);
  const paint = mix(lin(0xf2f2ee), blocks, side.mul(band));
  m.colorNode = select(isPaint, vc.mul(paint), m.colorNode);
  m.name = "police livery";
  return m;
}

function lightBarMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.3, metalness: 0 });
  const p = positionLocal;
  const blue = step(0.18, abs(p.x));                         // the two blue ends, a white-grey middle
  m.colorNode = mix(lin(0xb9bec4), lin(0x1640c8), blue);
  m.emissiveNode = lin(0x1d4dff).mul(blue).mul(0.15);
  return m;
}

export async function buildPoliceCars({ site, groundAt, lift = 0.06 }) {
  const pack = await loadPack("faceted");
  const byId = Object.fromEntries(pack.cars.map((c) => [c.id, c]));
  const F = site.frame, ca = Math.cos(F.rotation_rad), sa = Math.sin(F.rotation_rad);
  const toCity = (u, w) => [F.origin_city[0] + u * ca - w * sa, F.origin_city[1] + u * sa + w * ca];
  const mat = liveryMaterial(), barMat = lightBarMaterial();
  const group = new THREE.Group(); group.name = "police-cars";
  const levels = LODS.map(() => new THREE.Group());
  levels.forEach((g, k) => { g.name = `police-cars-lod${k}`; group.add(g); });
  let tris = [0, 0];
  for (const P of POLICE_CAR_PLACES) {
    const car = byId[P.type] ?? pack.cars[0];
    const [x, z] = toCity(P.u, P.w);
    // nose direction in city (x, z): the frame's u or w axis
    const dir = P.nose[0] === "u" ? [ca, sa] : [-sa, ca];
    const sg = P.nose[1] === "+" ? 1 : -1;
    const heading = Math.atan2(dir[0] * sg, dir[1] * sg);       // local +z (the nose) -> (sin h, cos h)
    const y = groundAt(x, z) + lift;
    LODS.forEach((L, k) => {
      const lod = car.lods[Math.min(L.pack, car.lods.length - 1)];
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = heading;
      for (const [name, part] of Object.entries(car.parts)) {
        const geo = lod[name]; if (!geo) continue;
        const mm = new THREE.Mesh(geo, mat); mm.position.fromArray(part.pos);
        mm.castShadow = true; mm.receiveShadow = true; mm.userData.base = mat;
        g.add(mm); tris[k] += geo.index.count / 3;
      }
      // the light bar (a box on the roof, 1.1 x 0.07 x 0.24 m)
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.24), barMat);
      bar.position.set(0, car.size[1] + 0.035, -0.15); bar.castShadow = k === 0; bar.userData.base = barMat;
      g.add(bar);
      levels[k].add(g);
    });
  }
  const state = { d: 0, shown: [true, false], fades: [1, 1] };
  /** distance-driven cross-fade (the station's convention: 1 or 2 = whole, 0..1 in, 2..3 out) */
  const update = (camPos, center) => {
    const d = camPos.distanceTo(center);
    state.d = d;
    let prevT = null;
    LODS.forEach((L, k) => {
      const t = THREE.MathUtils.smoothstep(d, L.until - L.band, L.until + L.band);
      const tin = prevT ?? 1;
      const shown = k === 0 ? t < 1 : tin > 0 && t < 1;
      const f = k === 0 ? 2 + t : tin < 1 ? tin : 2 + t;
      levels[k].visible = shown; state.shown[k] = shown; state.fades[k] = f;
      if (shown) {
        const whole = !SMOOTH || f === 1 || f === 2;
        levels[k].traverse((o) => {
          if (!o.isMesh) return;
          o.userData.fade = f;
          const want = whole ? o.userData.base : fadeVariant(o.userData.base);
          if (o.material !== want) o.material = want;
        });
      }
      prevT = t;
    });
  };
  return { group, levels, update, state, tris, materials: [mat, barMat], places: POLICE_CAR_PLACES };
}
