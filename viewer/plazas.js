// Paved open areas (squares, plazas) that OSM leaves out and the ground shader would draw as grass:
// data/overrides.json "plazas" (hand corrections with a why and a source). Each tile clips every outline
// to its own bounds (a square across a tile edge is drawn by both tiles, each its part), triangulates it,
// subdivides the triangles to <= 2 m and drapes them on the terrain, with one shared setts material.
//
// The setts look is matched to the owner's photos of Place de Saint-Job (2026-11-04): old grey granite
// setts ~12 x 15 cm in straight running rows (no arcs), each stone its own blue-grey to brown-grey,
// light sandy joints, slightly domed and worn tops.
import * as THREE from "three/webgpu";
import { positionWorld, vec2, vec3, float, mix, smoothstep, uniform, attribute, texture, transformNormalToView } from "three/tsl";
import { addLampLight } from "./lampLight.js";
import { courses, n3 } from "./roadPaint.js";
import { bumpNormal } from "./tslkit.js";
import { pavingTextures, pavingSample, pavingNormal, regrade, LAYER } from "./streets/paving.js";

/** The Saint-Job setts: { color, rough, height } nodes for world coords rotated to the rows. */
export function settsLook(a, b, seed = float(0)) {
  const c = courses(a, b, 0.125, 0.15, float(0.018), seed);
  const P = positionWorld;
  const grain = n3(P.x.mul(23.0), P.z.mul(23.0), 1.0);
  const blotch = n3(P.x.mul(0.35), P.z.mul(0.35), 4.0);                 // wear and dirt over metres
  // per stone: blue-grey granite to warmer brown-grey, light and dark ones
  const t = c.tone, t2 = c.tone.mul(7.31).fract();                       // a second per-stone value: the hue
  let stone = mix(vec3(0.115, 0.125, 0.14), vec3(0.2, 0.185, 0.165), t2);
  stone = stone.mul(t.mul(0.55).add(0.72)).add(grain.mul(0.012)).mul(blotch.mul(0.08).add(1.0));
  const joint = vec3(0.19, 0.18, 0.155).mul(blotch.mul(0.12).add(0.95));   // sandy, lighter than the stones
  const color = mix(stone, joint, c.joint);
  const rough = mix(float(0.78).sub(t.mul(0.08)), float(0.95), c.joint);     // worn tops a little smoother
  const height = float(1).sub(c.joint).mul(0.012);                            // domed: joints 1.2 cm lower
  return { color, rough, height };
}

// ?setts=tex: the CC0 scan (textures/polyhaven/cobblestone_floor_08, 2 x 2 m) instead of the procedural setts,
// for an A/B. Rows aligned to the square; two samples at different offsets blended by a large noise and a
// macro tint (wear, dirt) so the 2 m tile doesn't repeat visibly.
const useScan = /[?&]setts=tex/.test(location.search);
function scanMaterial(m) {
  const base = new URL("../textures/polyhaven/cobblestone_floor_08/cobblestone_floor_08_", import.meta.url).href;
  const L = new THREE.TextureLoader();
  const tex = (name, srgb) => {
    const t = L.load(`${base}${name}_1k.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const diff = tex("diff", true), nor = tex("nor_gl", false), arm = tex("arm", false);
  const dir = attribute("aCourse", "vec2");
  const P = positionWorld;
  const uvA = vec2(P.x.mul(dir.x).add(P.z.mul(dir.y)), P.z.mul(dir.x).sub(P.x.mul(dir.y))).div(2.0);   // 2 m tile
  const uvB = uvA.mul(0.97).add(vec2(0.37, 0.61));
  const k = smoothstep(0.35, 0.65, n3(P.x.mul(0.09), P.z.mul(0.09), 7.0).mul(0.5).add(0.5));
  const macro = n3(P.x.mul(0.25), P.z.mul(0.25), 2.0).mul(0.09).add(1.0);
  const col = mix(texture(diff, uvA).rgb, texture(diff, uvB).rgb, k).mul(macro);
  const ar = mix(texture(arm, uvA).rgb, texture(arm, uvB).rgb, k);
  m.colorNode = col.mul(ar.r);                                                // baked AO into the joints
  m.roughnessNode = ar.g;
  // the normal map in world space: the texture's u / v axes are the rows' rotated world axes, the plaza is ~flat
  const nt = texture(nor, uvA).rgb.mul(2.0).sub(1.0);
  const U = vec3(dir.x, 0, dir.y), V = vec3(dir.y.negate(), 0, dir.x);        // d(uv)/d(world): u along the rows
  const nW = U.mul(nt.x).add(V.mul(nt.y)).add(vec3(0, 1, 0).mul(nt.z)).normalize();
  m.normalNode = transformNormalToView(nW);
  return m;
}

let MAT = null;
function plazaMaterial() {
  if (MAT) return MAT;
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const dir = attribute("aCourse", "vec2");                                  // (cos, sin) of the rows' direction
  const P = positionWorld;
  const a = P.x.mul(dir.x).add(P.z.mul(dir.y));                               // along the rows
  const b = P.z.mul(dir.x).sub(P.x.mul(dir.y));                               // across
  if (pavingTextures() && !useScan) {
    // the street texture array's setts (viewer/streets/paving.js), as the measured squares (cobbles.js texturedSquare):
    // rows across b, along the square's rows; ?paving=old: the procedural settsLook
    const S = pavingSample(a, b, float(LAYER.setts), float(1.3));
    const dirt = n3(P.x.mul(0.45), P.z.mul(0.45), 6.0);
    m.colorNode = regrade(S.col, "setts", [0.2, 0.198, 0.192], 0.85).mul(dirt.mul(0.08).add(1.0)).mul(mix(float(1), S.ao, 0.5));
    m.roughnessNode = S.rough.mul(1.05).min(0.97);
    m.aoNode = S.ao;
    m.normalNode = pavingNormal(S.n, a, b, float(1));
  } else {
    const L = settsLook(b, a, float(3.0));
    m.colorNode = L.color;
    m.roughnessNode = L.rough;
    m.normalNode = bumpNormal(L.height);
  }
  if (useScan) scanMaterial(m);
  addLampLight(m);
  m.userData.shared = true;
  return (MAT = m);
}

let OVERRIDES = null;
/** data/overrides.json, fetched once (null if missing). */
export async function loadOverrides(dataUrl) {
  if (OVERRIDES !== null) return OVERRIDES;
  try { const r = await fetch(new URL("../overrides.json", dataUrl)); OVERRIDES = r.ok ? await r.json() : {}; }
  catch { OVERRIDES = {}; }
  return OVERRIDES;
}

/** Sutherland-Hodgman: the ring clipped to the rectangle. */
function clipRing(ring, b) {
  let out = ring;
  const edges = [
    (p) => p[0] >= b.x0, (p) => p[0] <= b.x1, (p) => p[1] >= b.z0, (p) => p[1] <= b.z1,
  ];
  const cut = [
    (p, q) => lerpAt(p, q, 0, b.x0), (p, q) => lerpAt(p, q, 0, b.x1), (p, q) => lerpAt(p, q, 1, b.z0), (p, q) => lerpAt(p, q, 1, b.z1),
  ];
  for (let e = 0; e < 4 && out.length; e++) {
    const inp = out; out = [];
    for (let i = 0; i < inp.length; i++) {
      const p = inp[i], q = inp[(i + 1) % inp.length], pin = edges[e](p), qin = edges[e](q);
      if (pin) out.push(p);
      if (pin !== qin) out.push(cut[e](p, q));
    }
  }
  return out;
}
const lerpAt = (p, q, k, v) => { const t = (v - p[k]) / (q[k] - p[k]); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };

/** Triangles subdivided until every edge is <= maxLen (so the mesh follows the terrain). */
function subdivide(tris, maxLen) {
  const out = [];
  const stack = [...tris];
  while (stack.length) {
    const [a, b, c] = stack.pop();
    const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const ab = d(a, b), bc = d(b, c), ca = d(c, a), m = Math.max(ab, bc, ca);
    if (m <= maxLen) { out.push([a, b, c]); continue; }
    const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    if (m === ab) { const k = mid(a, b); stack.push([a, k, c], [k, b, c]); }
    else if (m === bc) { const k = mid(b, c); stack.push([a, b, k], [a, k, c]); }
    else { const k = mid(c, a); stack.push([a, b, k], [k, b, c]); }
  }
  return out;
}

/** This tile's plaza meshes (a Group; empty without overrides). ground(x, z) = terrain height. */
export function buildPlazas(overrides, bounds, ground) {
  const group = new THREE.Group();
  group.name = "plazas";
  let count = 0;
  for (const pz of overrides?.plazas || []) {
    const ring = clipRing(pz.ring, bounds);
    if (ring.length < 3) continue;
    const contour = ring.map(([x, z]) => new THREE.Vector2(x, z));
    if (THREE.ShapeUtils.isClockWise(contour)) contour.reverse();
    const idx = THREE.ShapeUtils.triangulateShape(contour, []);
    const tris = subdivide(idx.map((t) => t.map((i) => [contour[i].x, contour[i].y])), 2.0);
    const pos = new Float32Array(tris.length * 9), course = new Float32Array(tris.length * 6);
    const ang = THREE.MathUtils.degToRad(pz.courseDeg || 0), cs = Math.cos(ang), sn = Math.sin(ang);
    let k = 0, j = 0;
    for (const t of tris) {
      // wound so the face points up (+y): (x, z) counter-clockwise seen from above is clockwise in 3D
      for (const p of [t[0], t[2], t[1]]) {
        pos[k++] = p[0]; pos[k++] = ground(p[0], p[1]) + 0.05; pos[k++] = p[1];
        course[j++] = cs; course[j++] = sn;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aCourse", new THREE.BufferAttribute(course, 2));
    g.computeVertexNormals();
    if (g.attributes.normal.getY(0) < 0) {                                   // wound downward: flip
      for (let i = 0; i < pos.length; i += 9) for (let c = 0; c < 3; c++) { const t = pos[i + 3 + c]; pos[i + 3 + c] = pos[i + 6 + c]; pos[i + 6 + c] = t; }
      g.attributes.position.needsUpdate = true;
      g.computeVertexNormals();
    }
    const mesh = new THREE.Mesh(g, plazaMaterial());
    mesh.name = `plaza-${pz.id}`;
    mesh.receiveShadow = true;
    group.add(mesh);
    count++;
  }
  return { group, count };
}
