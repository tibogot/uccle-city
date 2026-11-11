// THE FRONT-GARDEN TEST SCENE of the Foliage Lab (?scene=front): three Uccle-like terraced houses with front gardens,
// built with the city's own façade material (viewer/facades.js wallMaterial, imported read-only: the same windows,
// doors, bricks and render the city draws) on quads carrying its attributes (aWall, aBld, aFN):
//   main house  red-brown brick, 3 bays, door in the middle bay; front garden: a low brick wall on the street line
//               with a gate, a gravel path to the door, two lawns, a privet hedge behind the wall, a bed along the
//               façade (hydrangea, roses, lavender, spring bulbs), box balls by the door, a rhododendron, ivy
//               climbing the left of the façade (cut back round the windows), window boxes of geraniums under the
//               first-floor windows
//   left        cream render, a laurel hedge, lawn, hydrangeas      right   buff brick, a beech hedge, gravel front
// Sidewalk (paving), kerb, street (asphalt). Everything here is a lab set, not data: the city will place the same
// systems from UrbIS / OSM (placement.js).
import * as THREE from "three/webgpu";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { mix, vec3, positionWorld, color } from "three/tsl";
import { wallMaterial } from "../viewer/facades.js";
import { KIND } from "../viewer/foliage/placement.js";
import { growIvy } from "../viewer/foliage/ivy.js";
import { windowBoxes } from "../viewer/foliage/windowBoxes.js";
import { noiseAt } from "../viewer/foliage/noise.js";

export const FRONT_REGION = { x0: -24, z0: -22, size: 48 };
const ZF = -7;                 // main façade line (street line z = 0, street toward +z)

/** one façade quad: from `a` along `dir` (unit, horizontal) for `len`, `height` up; attributes for wallMaterial */
function wallQuad(a, dir, len, height, normal, eh, style, rnd, street = 1) {
  const b = a.clone().addScaledVector(dir, len);
  const P = [a, b, b.clone().setY(b.y + height), a.clone().setY(a.y + height)];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P.flatMap((p) => [p.x, p.y, p.z]), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(Array(4).fill([normal.x, normal.y, normal.z]).flat(), 3));
  const W = [[0, len, 0, eh], [len, len, 0, eh], [len, len, height, eh], [0, len, height, eh]];
  g.setAttribute("aWall", new THREE.Float32BufferAttribute(W.flat(), 4));
  g.setAttribute("aBld", new THREE.Float32BufferAttribute(Array(4).fill([style, 0, street, rnd]).flat(), 4));
  g.setAttribute("aFN", new THREE.Float32BufferAttribute(Array(4).fill([normal.x, normal.z, 0, 0]).flat(), 4));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

/** the facade's window grid, as the shader lays it out (viewer/facades.js wallMaterial): openings in (u, v) */
function windowsOf(fw, eh, rnd) {
  const pier = 0.55, usable = Math.max(fw - 2 * pier, 0.001), nb = Math.max(Math.floor(usable / 2.6 + 0.5), 1), bw = usable / nb;
  const ww = Math.min(1.2, bw * 0.52), G = 3.4, S = 3.0, door = Math.floor(rnd * nb);
  const out = [];
  for (let k = 0; k < nb; k++) {
    const c = pier + (k + 0.5) * bw;
    if (k === door) out.push({ kind: "door", u0: c - 0.55, u1: c + 0.55, v0: 0, v1: 0.72 * G });
    else out.push({ kind: "win", storey: 0, u0: c - ww / 2, u1: c + ww / 2, v0: 0.27 * G, v1: 0.77 * G });
    for (let f = 1; G + (f - 1 + 0.79) * S + 0.35 <= eh; f++) out.push({ kind: "win", storey: f, u0: c - ww / 2, u1: c + ww / 2, v0: G + (f - 1 + 0.29) * S, v1: G + (f - 1 + 0.79) * S, c });
  }
  return out;
}

export function buildFront(heights) {
  const group = new THREE.Group(); group.name = "front_scene";
  const y0 = heights.get(0, -3);
  const walls = [], plain = [];
  const houses = [
    { x0: -4.2, fw: 8.4, zf: ZF, eh: 9.5, style: 1, rnd: 0.4 },
    { x0: -12.6, fw: 8.4, zf: ZF + 0.6, eh: 9.0, style: 3, rnd: 0.1 },
    { x0: 4.2, fw: 8.4, zf: ZF - 0.5, eh: 9.5, style: 2, rnd: 0.75 },
  ];
  const X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);
  const roofG = [];
  for (const h of houses) {
    const base = Math.min(heights.get(h.x0, h.zf), heights.get(h.x0 + h.fw, h.zf)) - 0.3;
    const top = h.eh + 0.3;
    walls.push(wallQuad(new THREE.Vector3(h.x0, base, h.zf), X, h.fw, top, Z, top, h.style, h.rnd));
    // sides (only the row's ends show) and a pitched roof (ridge along the street)
    const depth = 10;
    if (h.x0 < -12) walls.push(wallQuad(new THREE.Vector3(h.x0, base, h.zf - depth), Z, depth, top, X.clone().negate(), top, h.style, h.rnd, 0));
    if (h.x0 > 4) walls.push(wallQuad(new THREE.Vector3(h.x0 + h.fw, base, h.zf), Z.clone().negate(), depth, top, X, top, h.style, h.rnd, 0));
    const eY = base + top, rY = eY + 3.6, zb = h.zf - depth, zm = h.zf - depth / 2;
    const r = new THREE.BufferGeometry();
    const v = [[h.x0 - 0.2, eY, h.zf + 0.35], [h.x0 + h.fw + 0.2, eY, h.zf + 0.35], [h.x0 + h.fw + 0.2, rY, zm], [h.x0 - 0.2, rY, zm],
               [h.x0 - 0.2, eY, zb - 0.35], [h.x0 + h.fw + 0.2, eY, zb - 0.35]];
    r.setAttribute("position", new THREE.Float32BufferAttribute(v.flat(), 3));
    r.setIndex([0, 1, 2, 0, 2, 3, 5, 4, 3, 5, 3, 2, 0, 3, 4, 1, 5, 2]);
    roofG.push(r.toNonIndexed());
    h.base = base; h.top = top; h.wins = windowsOf(h.fw, top, h.rnd);
  }
  const wallM = wallMaterial();
  const facade = new THREE.Mesh(mergeGeometries(walls), wallM); facade.castShadow = facade.receiveShadow = true;
  const rg = mergeGeometries(roofG); rg.computeVertexNormals();
  const roofM = new THREE.MeshStandardNodeMaterial({ roughness: 0.75, side: THREE.DoubleSide });
  roofM.colorNode = mix(color(0x2c3036), color(0x3c4048), noiseAt(positionWorld.xz.add(positionWorld.y), 1 / 0.6).a);
  const roof = new THREE.Mesh(rg, roofM); roof.castShadow = roof.receiveShadow = true;
  group.add(facade, roof);
  // the low brick wall on the street line (0.6 m, a gate in the main garden), coping stones; and the kerb
  const lowWalls = [];
  const wallRuns = [[-12.6, -4.2], [-4.2, -0.65], [0.65, 4.2], [4.2, 12.6]];
  for (const [a, b] of wallRuns) {
    const gy = Math.min(heights.get(a, -0.15), heights.get(b, -0.15)) - 0.2;
    lowWalls.push(wallQuad(new THREE.Vector3(a, gy, 0), X, b - a, 0.82, Z, 0.82, 1, 0.3));
    lowWalls.push(wallQuad(new THREE.Vector3(b, gy, -0.25), X.clone().negate(), b - a, 0.82, Z.clone().negate(), 0.82, 1, 0.3, 0));
    plain.push(new THREE.BoxGeometry(b - a + 0.04, 0.06, 0.32).translate((a + b) / 2, gy + 0.85, -0.125));
  }
  const lw = new THREE.Mesh(mergeGeometries(lowWalls), wallM); lw.castShadow = lw.receiveShadow = true;
  const copeM = new THREE.MeshStandardNodeMaterial({ color: 0x8c8a84, roughness: 0.8 });
  const cope = new THREE.Mesh(mergeGeometries(plain), copeM); cope.castShadow = cope.receiveShadow = true;
  const kerb = new THREE.Mesh(new THREE.BoxGeometry(48, 0.3, 0.25).translate(0, heights.get(0, 2.7) - 0.15 + 0.12, 2.75), copeM); kerb.receiveShadow = true;
  group.add(lw, cope, kerb);

  // ---- masks: lawns (main, left), gravel (path, right front), paving (sidewalk), asphalt
  const rect = (x0, z0, x1, z1) => [[[x0, z0], [x1, z0], [x1, z1], [x0, z1]]];
  const lawns = [rect(-4.0, -5.7, -0.75, -0.9), rect(0.75, -5.7, 4.0, -0.9), rect(-12.4, -5.4, -4.4, -1.0)];
  const gravel = [rect(-0.65, ZF, 0.65, 0), rect(4.3, -7.4, 12.5, -0.35)];
  const hedges = [
    { species: "privet", height: 1.15, width: 0.55, points: line([[-3.95, -0.6], [-0.85, -0.6]]) },
    { species: "privet", height: 1.15, width: 0.55, points: line([[0.85, -0.6], [3.95, -0.6]]) },
    { species: "laurel", height: 1.6, width: 0.8, points: line([[-12.3, -0.65], [-4.6, -0.65]]) },
    { species: "beech", height: 1.3, width: 0.6, points: line([[4.6, -0.6], [12.3, -0.6]]) },
    { species: "box", height: 0.4, width: 0.3, points: line([[-0.85, -6.0], [-0.85, -1.2]]) },
    { species: "box", height: 0.4, width: 0.3, points: line([[0.85, -6.0], [0.85, -1.2]]) },
  ];
  const plants = [];
  const bed = (x0, x1, z, types) => { let k = 0; for (let x = x0; x <= x1; x += 0.75, k++) plants.push({ x: x + (k % 2) * 0.12, z: z + ((k * 7) % 3) * 0.12, type: types[k % types.length], yaw: k * 2.3, scale: 0.85 + (k % 3) * 0.1 }); };
  bed(-3.8, -1.4, ZF + 0.65, ["hydrangea", "lavender", "rose", "bulbs", "lavender"]);
  bed(1.4, 3.8, ZF + 0.65, ["rose", "lavender", "hydrangea", "bulbs", "lavender"]);
  plants.push({ x: -1.15, z: ZF + 0.55, type: "box_ball", yaw: 0, scale: 1 }, { x: 1.15, z: ZF + 0.55, type: "box_ball", yaw: 1, scale: 1 });
  plants.push({ x: 3.2, z: -2.2, type: "rhododendron", yaw: 2, scale: 0.9 });
  plants.push({ x: -11, z: -5.2, type: "hydrangea", yaw: 1, scale: 1.1 }, { x: -9.6, z: -5.3, type: "hydrangea", yaw: 3, scale: 1 }, { x: -6, z: -5.1, type: "laurel", yaw: 0.5, scale: 0.9 });
  plants.push({ x: 6.2, z: -6.8, type: "box_ball", yaw: 0, scale: 0.8 }, { x: 10.5, z: -6.9, type: "hydrangea", yaw: 0, scale: 1 }, { x: 11.6, z: -3.2, type: "box_ball", yaw: 2, scale: 1.2 });
  // ---- window boxes under the main house's first-floor windows
  const main = houses[0];
  const sills = main.wins.filter((w) => w.kind === "win" && w.storey === 1);
  const wb = windowBoxes(sills.map((w) => ({ centre: new THREE.Vector3(main.x0 + (w.u0 + w.u1) / 2, main.base + w.v0 - 0.02, main.zf), right: X, out: Z, width: w.u1 - w.u0 - 0.1 })), 7);
  group.add(wb.group);
  plants.push(...wb.plants);
  // ---- ivy on the left of the main façade, cut back round the windows and the door
  const ivy = growIvy({ origin: new THREE.Vector3(main.x0, main.base + 0.3, main.zf), right: X, up: new THREE.Vector3(0, 1, 0), normal: Z, width: 3.4, height: main.top - 0.6 },
    { roots: [0.35, 1.0, 2.9], maxHeight: 7.4, avoid: main.wins.map((w) => [w.u0, w.v0 - 0.3, w.u1, w.v1 - 0.3]), seed: 11, reach: 3 });
  group.add(ivy.group);
  return { group, lawns, gravel, hedges, plants, ivy, houses, KIND };
}

function line(pts, step = 0.5) {
  const o = [];
  for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]], d = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let t = 0; t < d; t += step) o.push([a[0] + (b[0] - a[0]) * t / d, a[1] + (b[1] - a[1]) * t / d]); }
  o.push(pts[pts.length - 1]);
  return o;
}
