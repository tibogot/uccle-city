// THE SAINT-JOB CHURCH (tools/blender/stjob.py -> models/stjob/stjob.glb + stjob_ao.png + stjob.json), shared by the
// Church Lab and, once the owner approves it there, the city. Loaded once: the glTF's four primitives (Masonry, Roof,
// Glass, Metal = 4 draw calls) in the church's own frame (origin = the octagon's centre at floor level, -z = the front),
// two more levels of detail made here by meshoptimizer, the baked ambient occlusion (UV1) as a one-channel texture,
// and the four materials: procedural TSL, driven by world-scale UVs (1 unit = 1 m) and the per-face codes in COLOR_0
// (r = subtype, g = band pattern: see stjob.py).
//   const m = await loadStJob();   m.lods[k] = { meshes: [geometry x4], tris };   m.materials[4];   m.nest, m.spireTip
//   m.placement = { position: Vector3 (city local, m TAW), rotationY }   m.make(k) -> a Group of 4 meshes (shared geometry)
import * as THREE from "three/webgpu";
import {
  Fn, attribute, uv, texture, positionLocal, normalWorld, vec2, vec3, float, floor, fract, mix, step, smoothstep, clamp, abs, sin, dot,
  fwidth, max, min, mod, select, mrt, roughness, uniform, color,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { env } from "./lighting.js";

// LOD targets (triangles for the whole church) and the distances (m, camera to the octagon) they are used up to
export const STJOB_LODS = [
  { target: 0, until: 170 },        // LOD0: the Blender model (~38.6k triangles)
  { target: 15000, until: 520 },    // LOD1
  { target: 3000, until: Infinity, far: true },   // LOD2: the script's far variant trimmed to 3k
];
export const STJOB_BU_ID = "https://databrussels.be/id/building/1587133";

/**
 * Drive-mode colliders the UrbIS footprint does not have: the front flight of steps (stjob.py steps(): the front face
 * 25.53 m out on -z, cheek walls at +-3.0 m, a 1.25 m landing and 13 runs of 0.34 m fanning out to 10.4 m), as a
 * city-local polygon ({ rings, kind: 5 = wall } for viewer/drive/colliders.js).
 */
export function stjobColliders(placement) {
  const face = 25.53, foot = face + 1.25 + 13 * 0.34;
  const local = [[-3.0, -face + 0.3], [3.0, -face + 0.3], [5.2, -foot], [-5.2, -foot]];
  const c = Math.cos(placement.rotationY), s = Math.sin(placement.rotationY), p = placement.position;
  const ring = local.map(([x, z]) => [p.x + x * c + z * s, p.z - x * s + z * c]);   // three.js rotation.y
  return [{ rings: [ring], kind: 5 }];
}

/** Live look controls (uniforms: no recompiles). */
export const stjobLook = {
  brickTone: uniform(1.0), bandStrength: uniform(1.0), moss: uniform(1.0), aoStrength: uniform(1.0), dirt: uniform(1.0),
};

let promise = null;
export function loadStJob() {
  return (promise ??= (async () => {
    const base = new URL("../models/stjob/", import.meta.url).href;
    const [gltf, notes, aoTex] = await Promise.all([
      new GLTFLoader().loadAsync(base + "stjob.glb"),
      fetch(base + "stjob.json").then((r) => r.json()),
      loadAO(base + "stjob_ao.png"),
    ]);
    await MeshoptSimplifier.ready;
    gltf.scene.updateMatrixWorld(true);
    const prims = [null, null, null, null], farPrims = [null, null, null, null];
    let nest = null, spireTip = null;
    const perches = {};                                 // falcon perches (stjob.py PERCH): position + facing (local -z)
    const isFar = (o) => { for (let p = o; p; p = p.parent) if (/StJob_far/.test(p.name)) return true; return false; };
    gltf.scene.traverse((o) => {
      if (o.isMesh) {
        const k = ["Masonry", "Roof", "Glass", "Metal"].indexOf(o.material.name);
        (isFar(o) ? farPrims : prims)[k] = o.geometry;
      }
      if (o.name === "nest") nest = o.position.clone();
      if (o.name === "spire_tip") spireTip = o.position.clone();
      if (o.name.startsWith("perch_")) perches[o.name] = { pos: o.position.clone(), facing: new THREE.Vector3(0, 0, -1).applyQuaternion(o.quaternion) };
    });
    const tris0 = prims.reduce((s, g) => s + g.index.count / 3, 0);
    const lods = STJOB_LODS.map(({ target, far }) => {
      if (!target) return { meshes: prims, tris: tris0 };
      // the far LOD starts from the script's own far variant (same plan, openings as flat shapes, no small details):
      // meshoptimizer only trims it to budget; simplifying the full model that far tore the walls open
      const src = far && farPrims.every(Boolean) ? farPrims : prims;
      const srcTris = src.reduce((s, g) => s + g.index.count / 3, 0);
      if (srcTris <= target) return { meshes: src, tris: srcTris };
      const ratio = target / srcTris;
      const meshes = src.map((g) => {
        const want = Math.max(12, Math.floor((g.index.count / 3) * ratio)) * 3;
        const s = new THREE.BufferGeometry();
        for (const k of Object.keys(g.attributes)) s.setAttribute(k, g.attributes[k]);
        s.setIndex(new THREE.BufferAttribute(simplifyWelded(g, want, false), 1));
        return s;
      });
      return { meshes, tris: meshes.reduce((s, g) => s + g.index.count / 3, 0) };
    });
    for (const l of lods) for (const g of l.meshes) { g.computeBoundingSphere(); g.userData.shared = true; }
    const materials = makeMaterials(aoTex);
    const pl = notes.placement;
    const placement = { position: new THREE.Vector3(...pl.city_local_position), rotationY: pl.rotation_y_rad };
    const make = (k) => {
      const g = new THREE.Group(); g.name = `stjob_lod${k}`;
      lods[k].meshes.forEach((geo, i) => { const m = new THREE.Mesh(geo, materials[i]); m.castShadow = i !== 2; m.receiveShadow = true; g.add(m); });
      return g;
    };
    return { lods, materials, nest, spireTip, perches, notes, placement, make, aoTex, aoBytes: aoTex.userData.bytes };
  })());
}

/** meshoptimizer on a flat-shaded, unwelded architectural mesh: every hard edge and UV seam splits the vertices, so
 *  the plain simplifier sees thousands of loose pieces and stops early (38.6k -> 19k). Simplify on a position-WELDED
 *  index buffer instead (1 mm), then give each corner of each new triangle back the ORIGINAL vertex at that position
 *  whose normal best matches the new triangle: its UVs (bricks, lightmap), codes and normal stay right on every face
 *  that survives as itself. Prune (far LOD) drops the small loose parts (railing bars, quoins). */
function simplifyWelded(g, want, prune) {
  const P = g.attributes.position.array, Nn = g.attributes.normal.array, I = g.index.array;
  const n = P.length / 3, canon = new Uint32Array(n), map = new Map(), cpos = [], members = [];
  for (let i = 0; i < n; i++) {
    const key = `${Math.round(P[i * 3] * 1000)},${Math.round(P[i * 3 + 1] * 1000)},${Math.round(P[i * 3 + 2] * 1000)}`;
    let c = map.get(key);
    if (c === undefined) { c = cpos.length / 3; map.set(key, c); cpos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); members.push([]); }
    canon[i] = c; members[c].push(i);
  }
  const ci = new Uint32Array(I.length);
  for (let i = 0; i < I.length; i++) ci[i] = canon[I[i]];
  const [out] = MeshoptSimplifier.simplify(ci, new Float32Array(cpos), 3, want, 4.0, prune ? ["ErrorAbsolute", "Prune"] : ["ErrorAbsolute"]);
  const res = new Uint32Array(out.length);
  const C = cpos;
  for (let t = 0; t < out.length; t += 3) {
    const a = out[t], b = out[t + 1], c = out[t + 2];
    const ux = C[b * 3] - C[a * 3], uy = C[b * 3 + 1] - C[a * 3 + 1], uz = C[b * 3 + 2] - C[a * 3 + 2];
    const vx = C[c * 3] - C[a * 3], vy = C[c * 3 + 1] - C[a * 3 + 1], vz = C[c * 3 + 2] - C[a * 3 + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    for (let k = 0; k < 3; k++) {
      let best = -1, bd = -Infinity;
      for (const v of members[out[t + k]]) {
        const d = Nn[v * 3] * fx + Nn[v * 3 + 1] * fy + Nn[v * 3 + 2] * fz;
        if (d > bd) { bd = d; best = v; }
      }
      res[t + k] = best;
    }
  }
  return res;
}

/** The AO lightmap as ONE channel (R8 + mips: 2048 px = 5.6 MB instead of 22 MB as RGBA). */
async function loadAO(url) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const cx = c.getContext("2d", { willReadFrequently: true }); cx.drawImage(img, 0, 0);
  const rgba = cx.getImageData(0, 0, img.width, img.height).data;
  const r = new Uint8Array(img.width * img.height);
  for (let i = 0; i < r.length; i++) r[i] = rgba[i * 4];
  const t = new THREE.DataTexture(r, img.width, img.height, THREE.RedFormat, THREE.UnsignedByteType);
  t.flipY = false;                                   // glTF UVs: origin top-left, as the PNG rows
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  t.userData.bytes = Math.round(r.length * 4 / 3);
  return t;
}

// ---------------------------------------------------------------------------------------------- materials
// integer-cell hash (inputs are floor()ed cell indices, never interpolated values)
const hash2 = (p) => fract(sin(dot(p, vec2(12.9898, 78.233))).mul(43758.5453));
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };   // sRGB hex -> linear

function makeMaterials(aoTex) {
  const L = stjobLook;
  const code = attribute("color", "vec4");
  const sub = floor(code.r.mul(8));                  // constant over each face (the three corners carry the same code)
  const band = floor(code.g.mul(4));
  const is = (k) => float(1).sub(clamp(abs(sub.sub(k)), 0, 1));
  const ao = texture(aoTex, uv(1)).r;
  const aoK = mix(float(1), ao, L.aoStrength);
  const wuv = uv(0);                                 // metres
  const y = positionLocal.y;                         // metres above the church floor

  // ---- Masonry: Belgian red-brown brick (19 x 5 cm faces, 1 cm joints, running bond), white stone bands, quoins and
  //      surrounds, a blue-grey sandstone plinth, dark louvres / doors
  const masonry = new THREE.MeshStandardNodeMaterial();
  {
    const cv = wuv.y.div(0.062), row = floor(cv);
    const cu = wuv.x.div(0.205).add(mod(row, 2).mul(0.5)), cell = floor(cu);
    const fu = fract(cu), fv = fract(cv);
    const fw = max(fwidth(cv), fwidth(cu));
    const jv = smoothstep(0.1, 0.18, fv).mul(smoothstep(1.0, 0.985, fv));
    const ju = smoothstep(0.0, 0.05, fu).mul(smoothstep(1.0, 0.95, fu));
    const brickMask = mix(jv.mul(ju), float(0.82), smoothstep(0.25, 0.7, fw));      // fades to the mean far away
    const h = hash2(vec2(cell, row));
    const h2 = hash2(vec2(cell.add(17.0), row.mul(3.0)));
    const brick = mix(lin(0x7a3a2b), lin(0x5a2a22), h).mul(mix(float(0.78), float(1.12), h2)).mul(L.brickTone);
    const burnt = step(0.93, h2);                                                     // a few dark burnt headers
    const brickCol = mix(mix(brick, lin(0x3a2420), burnt.mul(0.7)), lin(0xa49a8c), float(1).sub(brickMask));
    // stone courses (blocks 0.3 m high, 0.6-0.9 m long), off-white with grime
    const sv = wuv.y.div(0.3), srow = floor(sv), su = wuv.x.div(0.75).add(mod(srow, 2).mul(0.37)), scell = floor(su);
    const sj = smoothstep(0.0, 0.04, fract(sv)).mul(smoothstep(0.0, 0.025, fract(su)));
    const sfw = max(fwidth(sv), fwidth(su));
    const stoneJ = mix(sj, float(0.95), smoothstep(0.3, 0.8, sfw));
    const sh = hash2(vec2(scell, srow));
    const stone = mix(lin(0xbdb7aa), lin(0xa9a397), sh).mul(mix(float(0.86), float(1), stoneJ));
    const sand = mix(lin(0x8d8c84), lin(0x7c7a70), sh).mul(mix(float(0.8), float(1), stoneJ));   // the plinth: grey sandstone
    // bands by height (pattern 1: 15 cm every 1.10 m from the plinth up; 2: every third only)
    const bpos = y.sub(0.9).div(1.1), bi = floor(bpos);
    const inBand = step(fract(bpos), 0.136).mul(step(0.0, y.sub(0.9)));
    const bandOn = select(band.equal(2), step(mod(bi, 3), 0.5), select(band.equal(1), float(1), float(0)));
    const isBrick = is(0);
    const bandK = inBand.mul(bandOn).mul(isBrick).mul(L.bandStrength);
    const plinthK = step(y, 0.9).mul(isBrick.add(is(5)).min(1));
    let col = mix(brickCol, stone, bandK);
    col = mix(col, sand, plinthK);
    col = mix(col, stone, is(1));
    col = mix(col, lin(0x2a2018), is(3));             // louvres, doors: dark oak
    col = mix(col, lin(0x0c0b0a), is(4));             // the belfry's inside
    col = mix(col, mix(brickCol, sand, step(y, 0.9)), is(5));
    // grime: darker near the ground (splash), soot under the stone (AO does the rest)
    const splash = smoothstep(1.6, -0.4, y).mul(0.22).mul(L.dirt);
    col = col.mul(float(1).sub(splash));
    masonry.colorNode = col.mul(mix(float(1), aoK, 0.45));
    masonry.aoNode = aoK;
    masonry.roughnessNode = mix(mix(float(0.9), float(0.8), is(1).add(bandK).min(1)), float(0.72), is(3));
    masonry.metalnessNode = float(0);
  }

  // ---- Roof: slate rows (0.22 m, 0.3 m wide, half-bond), grey-blue on the wings and spire, grey-green on the dome,
  //      moss on the north faces and low courses; red paint (dormers, railing), lead ribs / ridges
  const roof = new THREE.MeshStandardNodeMaterial();
  {
    const rv = wuv.y.div(0.22), row = floor(rv), ru = wuv.x.div(0.3).add(mod(row, 2).mul(0.5)), cell = floor(ru);
    const fw = max(fwidth(rv), fwidth(ru));
    const jl = mix(smoothstep(0.0, 0.08, fract(rv)).mul(smoothstep(0.0, 0.04, fract(ru))), float(0.9), smoothstep(0.3, 0.8, fw));
    const h = hash2(vec2(cell, row)), h2 = hash2(vec2(row, cell.mul(1.7)));
    const slate = mix(lin(0x4a4f58), lin(0x3a3e45), h);
    const domeSlate = mix(lin(0x66716b), lin(0x58625d), h);
    let col = mix(slate, domeSlate, is(1)).mul(mix(float(0.72), float(1.0), jl)).mul(mix(float(0.9), float(1.08), h2));
    // moss: north-facing (city -z) and low on the slope; patchy by tile
    const north = clamp(normalWorld.z.negate().mul(0.7).add(0.3), 0, 1);
    // patches of ~2 x 1.3 m, two scales; a soft per-slate tint inside them (no hard tile mosaic)
    const pa = hash2(vec2(floor(cell.div(7)), floor(row.div(6)))), pb = hash2(vec2(floor(cell.div(3)), floor(row.div(3))).add(31.0));
    const patch = smoothstep(0.62, 0.9, pa).mul(0.7).add(smoothstep(0.75, 0.95, pb).mul(0.3)).mul(mix(float(0.6), float(1), h2));
    const mossK = clamp(north.mul(patch).mul(0.32).mul(L.moss), 0, 0.6).mul(is(0).add(is(1)).min(1));
    col = mix(col, lin(0x4d5636), mossK);
    col = mix(col, lin(0x8e2a22), is(2));            // red paint
    col = mix(col, lin(0x7d8285), is(3));            // lead / zinc
    roof.colorNode = col.mul(mix(float(1), aoK, 0.35));
    roof.aoNode = aoK;
    roof.roughnessNode = mix(mix(float(0.52), float(0.8), mossK), float(0.45), is(2).add(is(3)).min(1));
    roof.metalnessNode = is(3).mul(0.35);
  }

  // ---- Glass: dark leaded glass, diamond quarries; coloured (stained) glass that glows at night; no screen-space AO
  const glass = new THREE.MeshStandardNodeMaterial();
  {
    const q = vec2(wuv.x.add(wuv.y), wuv.x.sub(wuv.y)).div(0.16);
    const qc = floor(q), qf = fract(q);
    const fw = fwidth(q.x);
    const lead = mix(float(1).sub(smoothstep(0.06, 0.0, qf.x).add(smoothstep(0.94, 1.0, qf.x)).add(smoothstep(0.06, 0.0, qf.y)).add(smoothstep(0.94, 1.0, qf.y)).min(1)),
      float(0.85), smoothstep(0.25, 0.7, fw));
    const h = hash2(qc);
    const tint = mix(mix(lin(0x3c5a8a), lin(0xb07a30), step(0.55, h)), lin(0x8a2a2a), step(0.85, h));
    const base = mix(lin(0x16191c), tint.mul(0.22), 0.35);
    glass.colorNode = base.mul(lead);
    glass.roughnessNode = mix(float(0.55), float(0.12), lead);
    glass.metalnessNode = float(0);
    glass.emissiveNode = mix(tint, lin(0xffc070), 0.35).mul(lead).mul(env.uNight).mul(env.uInteriorGlow).mul(1.1);
    glass.mrtNode = mrt({ metalRough: vec3(0, roughness, float(0)) });
  }

  // ---- Metal: wrought iron (crosses, railings), gilded (weathercock, ball, clock hands), clock dials
  const metal = new THREE.MeshStandardNodeMaterial();
  {
    metal.colorNode = mix(mix(lin(0x1c1c1e), lin(0xd9a54a), is(1)), lin(0xe8e2d0), is(2)).mul(mix(float(1), aoK, 0.3));
    metal.metalnessNode = mix(mix(float(0.7), float(1.0), is(1)), float(0), is(2));
    metal.roughnessNode = mix(mix(float(0.55), float(0.28), is(1)), float(0.6), is(2));
    metal.aoNode = aoK;
  }
  for (const m of [masonry, roof, glass, metal]) m.userData.shared = true;
  masonry.name = "stjob masonry"; roof.name = "stjob roof"; glass.name = "stjob glass"; metal.name = "stjob metal";
  return [masonry, roof, glass, metal];
}
