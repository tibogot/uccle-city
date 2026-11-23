// THE VILLA'S GARAGE: two parked cars and a motorbike (villa.json garage.places), the city's own families (the car pack
// viewer/drive/carPacks.js: cars2's saloon in gloss black and its SUV in pearl white; the motorbike's parked city
// geometry, models/moto/moto_city.glb). Luxury models come later (the owner, 2026-11-20). Static: each car is ONE mesh
// per material (its parts merged in place), the bike one mesh; car colliders for the driver (rings, viewer/drive
// addStatic) come from their footprints. Shown with the villa within 140 m.
//   const g = await buildVillaCars({ notes, rootM, rotationY, groundAt });  scene.add(g.group); g.rings
import * as THREE from "three/webgpu";
import { loadPack, packMaterial, FLEET_SOURCE, standingSeeThrough } from "../drive/carPacks.js";
import { loadCityTwoWheeler } from "../moto/motoModel.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { uv, float, smoothstep, length, vec2 } from "three/tsl";
import { placeVehicle } from "./villaPlace.js";

const PICKS = [{ ids: ["saloon", "estate"], paint: 0x0b0c0f }, { ids: ["suv", "estate"], paint: 0xe4e4df }];

export async function buildVillaCars({ notes, rootM, rotationY, groundAt, lift = 0.07 }) {
  const group = new THREE.Group(); group.name = "villa-cars";
  const rings = [];
  const places = notes.garage.places;
  const pack = await loadPack(FLEET_SOURCE);
  const byId = Object.fromEntries(pack.cars.map((c) => [c.id, c]));
  const v = new THREE.Vector3();
  let tris = 0, ci = 0;
  const blobs = [];
  const materials = [];
  for (const P of places) {
    v.set(P.u, 0, P.w).applyMatrix4(rootM);
    const x = v.x, z = v.z;
    // the nose along the frame's -u / +u: local (-1, 0, 0) rotated by the villa's rotationY
    const sg = P.nose[0] === "-" ? -1 : 1;
    // frame axes in the city: u = (cos, -sin), w = (sin, cos) of rotationY
    const [ax, az] = P.nose[1] === "u" ? [Math.cos(rotationY), -Math.sin(rotationY)] : [Math.sin(rotationY), Math.cos(rotationY)];
    const dx = sg * ax, dz = sg * az;
    const heading = Math.atan2(dx, dz);
    const surf = (px, pz) => groundAt(px, pz) + lift;            // the paving's top (the plane + LIFT, or the drape)
    if (P.kind === "car") {
      const pick = PICKS[ci++ % PICKS.length];
      const car = pick.ids.map((id) => byId[id]).find(Boolean) ?? pack.cars[0];
      const mat = packMaterial({ paint: new THREE.Color(pick.paint), rich: true, seeThrough: standingSeeThrough(true) });
      mat.name = `villa car ${car.id}`;
      materials.push(mat);
      const lod = car.lods[0];
      const geos = [];
      for (const [name, part] of Object.entries(car.parts)) {
        const geo = lod[name]; if (!geo) continue;
        const g = geo.clone(); g.translate(...part.pos); geos.push(g);
      }
      const merged = mergeGeometries(geos, false);
      const m = new THREE.Mesh(merged, mat);
      const pl = placeVehicle({ x, z, heading, size: car.size }, surf);
      m.position.set(x, pl.y, z); m.rotation.set(pl.pitch, heading, pl.roll, "YXZ"); m.castShadow = true; m.receiveShadow = true; m.name = `villa-car-${car.id}`;
      blobs.push([x, pl.y + 0.004, z, heading, car.size[0] * 0.62, car.size[2] * 0.56]);
      group.add(m); tris += merged.index.count / 3;
      const [W, , Lg] = car.size;
      rings.push(footprint(x, z, heading, W / 2 + 0.05, Lg / 2 + 0.05));
    } else {
      const bike = await loadCityTwoWheeler("moto").catch(() => null);
      const geo = bike?.parked?.[0];
      if (!geo) continue;
      const mat = new THREE.MeshStandardNodeMaterial({ vertexColors: !!geo.attributes.color, roughness: 0.38, metalness: 0.2 });
      if (!geo.attributes.color) mat.color.set(0x1c1d20);
      mat.name = "villa moto";
      materials.push(mat);
      const m = new THREE.Mesh(geo, mat);
      const pl = placeVehicle({ x, z, heading, size: [0.5, 1.1, 2.0] }, surf);
      m.position.set(x, pl.y, z); m.rotation.set(pl.pitch, heading, pl.roll, "YXZ"); m.castShadow = true; m.receiveShadow = true; m.name = "villa-moto";
      blobs.push([x, pl.y + 0.004, z, heading, 0.45, 1.05]);
      group.add(m); tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
      rings.push(footprint(x, z, heading, 0.45, 1.1));
    }
  }
  // contact shadows (round 3: the saloon read as floating in the lit garage, where the sun's shadow map never reaches):
  // one soft dark ellipse under each vehicle, one merged mesh, one draw, its transparency fixed (only the alpha varies)
  if (blobs.length) {
    const P = [], U = [], I = [];
    for (const [bx, by, bz, h, hw, hl] of blobs) {
      const fx = Math.sin(h), fz = Math.cos(h), rx = fz, rz = -fx, b = P.length / 3;
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { P.push(bx + rx * sx * hw + fx * sz * hl, by, bz + rz * sx * hw + fz * sz * hl); U.push((sx + 1) / 2, (sz + 1) / 2); }
      I.push(b, b + 2, b + 1, b, b + 3, b + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I);
    g.computeVertexNormals();
    const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, color: 0x000000, side: THREE.DoubleSide });
    mat.opacityNode = float(1).sub(smoothstep(0.35, 1.0, length(uv().sub(0.5).mul(2.0)))).mul(0.55);
    mat.name = "villa contact shadows"; materials.push(mat);
    const blob = new THREE.Mesh(g, mat); blob.name = "villa-contact-shadows"; blob.renderOrder = 1; group.add(blob);
  }
  return { group, rings, tris, materials };
}

/** a rectangle round (x, z) facing heading: half width hw across, half length hl along */
function footprint(x, z, h, hw, hl) {
  const fx = Math.sin(h), fz = Math.cos(h), rx = fz, rz = -fx;
  return [[x + fx * hl + rx * hw, z + fz * hl + rz * hw], [x + fx * hl - rx * hw, z + fz * hl - rz * hw],
    [x - fx * hl - rx * hw, z - fz * hl - rz * hw], [x - fx * hl + rx * hw, z - fz * hl + rz * hw]];
}
