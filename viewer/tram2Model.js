// THE STIB T3000, SECOND PASS (tools/blender/tram2.py -> models/tram2/t3000.glb + t3000.json + t3000_ao.png): the city's
// default tram (viewer/tramline.js; ?tram=v1 = the first model, viewer/tramModel.js; ?tram=box = the boxes) and the
// Tram Lab's. Same API as tramModel.js (loadTramModel, createTramFleet, tramPose, TRAM_LODS, tramLook), so the two
// swap by one import.
//   - the pieces in their own frames (origin on the track at rail-top height, +x forward): Cab (sections 1 and 5),
//     Susp (2 and 4), Centre (3), Bellows (x4), Bogie (x3), Panto (on section 2);
//   - NAMED MATERIAL SLOTS from Blender (Silver, Gold, Glass, Seat, ...: layout.slots), merged per piece into ONE
//     geometry with a per-vertex slot (aData.w) = one draw per piece type and LOD, ONE node material. Colours,
//     roughness, metalness, emission live HERE (SLOT_LOOK, live through uniform arrays), never in the file. Baked AO in
//     TEXCOORD_1 (t3000_ao.png); TEXCOORD_0 in metres (the grime);
//   - LODs by meshoptimizer here (never Blender decimate): LOD0 = the Blender model; LOD1 = LOD0 trimmed to the
//     budgets below (seats, poles and bogies dropped); LOD2 = the script's coarse "_far" variant trimmed;
//   - see-through glass onto the interior: alpha to coverage in the same opaque draw (as the faceted cars), a light
//     glass shadow; the saloon lit at night (ceiling coves, lining glow);
//   - in the vertex stage: plug doors that open (COLOR_0 leaf code x aInst2 open amounts), the bellows bent between
//     the two module headings (aInst.z = joint angle), no extra draws;
//   - placement: tramPose (tramModel.js) + per-piece pitch on slopes (modules follow the ground at both ends; the
//     pantograph stays vertical under the wire, its head at the contact wire height);
//   - the LED destination displays (front, rear, sides) from the shared atlas (tramModel.js makeSignAtlas).
import * as THREE from "three/webgpu";
import {
  attribute, uv, texture, vec2, vec3, vec4, float, floor, fract, mix, smoothstep, clamp, length, fwidth, color,
  uniform, uniformArray, positionLocal, positionView, select, screenCoordinate, int, cos, sin,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { env } from "./lighting.js";
import { SMOOTH, ditherNoise } from "./lodFade.js";
import { makeSignAtlas, LED, tramPose, headsignText } from "./tramModel.js";
export { tramPose, headsignText };

/** smooth LOD: half-width of the cross-fade band at each switch (a share of its distance), the far fade-out (m) */
const LOD_BANDS = [0.12, 0.08], FADE_END = 150;
export const TRAM_LODS = [
  { until: 90 },
  { until: 240, src: "_mid", target: { Cab: 3200, Susp: 1500, Centre: 700, Bellows: 300, Panto: 300, Bogie: 0 } },
  { until: 1800, src: "_far", target: { Cab: 520, Susp: 130, Centre: 180, Bellows: 60, Panto: 0, Bogie: 0 } },
];
export const PIECES = ["Cab", "Susp", "Centre", "Bellows", "Bogie", "Panto"];
const PER_TRAM = { Cab: 2, Susp: 2, Centre: 1, Bellows: 4, Bogie: 3, Panto: 1 };
const HALF = { Cab: 4.4125, Susp: 2.8, Centre: 1.5, Bellows: 1.2, Bogie: 0.9, Panto: 0 };   // ground samples for the pitch

// slot look: linear colour (from sRGB photo samples), roughness, metalness, AO strength, emission kind
// (emission kinds: 0 none, 1 head lamp, 2 tail lamp, 3 marker, 4 LED display, 5 ceiling light, 6 interior glow)
const SRGB = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
export const SLOT_LOOK = {
  Silver: { c: SRGB(0.76, 0.77, 0.79), r: 0.36, m: 0.35, ao: 1 },        // STIB silver-grey (3097 / 3041, sunlit side)
  Gold: { c: SRGB(0.86, 0.66, 0.38), r: 0.38, m: 0.15, ao: 1 },          // champagne gold of the nose panel and band
  Black: { c: SRGB(0.05, 0.055, 0.06), r: 0.18, m: 0.0, ao: 1 },        // the gloss-black window band, frames
  Bumper: { c: SRGB(0.70, 0.71, 0.72), r: 0.45, m: 0.2, ao: 1 },
  BumperDark: { c: SRGB(0.36, 0.37, 0.38), r: 0.6, m: 0.0, ao: 1 },
  Glass: { c: SRGB(0.10, 0.12, 0.12), r: 0.04, m: 0.0, ao: 0.4 },
  GlassCab: { c: SRGB(0.13, 0.15, 0.17), r: 0.04, m: 0.25, ao: 0.4 },
  Rubber: { c: SRGB(0.035, 0.035, 0.04), r: 0.75, m: 0.0, ao: 1 },
  Metal: { c: SRGB(0.16, 0.16, 0.17), r: 0.55, m: 0.6, ao: 1 },
  Bellows: { c: SRGB(0.55, 0.56, 0.57), r: 0.8, m: 0.0, ao: 1 },      // light grey folds (photos: the joints read pale)
  LampHead: { c: SRGB(0.85, 0.86, 0.84), r: 0.08, m: 0.0, ao: 0, e: 1 },
  LampTail: { c: SRGB(0.45, 0.04, 0.04), r: 0.12, m: 0.0, ao: 0, e: 2 },
  LampMarker: { c: SRGB(0.85, 0.85, 0.82), r: 0.12, m: 0.0, ao: 0, e: 3 },
  Display: { c: SRGB(0.02, 0.02, 0.02), r: 0.3, m: 0.0, ao: 0, e: 4 },
  Seat: { c: SRGB(0.30, 0.16, 0.11), r: 0.4, m: 0.0, ao: 0.7, e: 6 },  // brown leather (interior photos 2010 / 2022)
  Lining: { c: SRGB(0.74, 0.75, 0.75), r: 0.5, m: 0.0, ao: 0.7, e: 6 },
  Floor: { c: SRGB(0.33, 0.33, 0.34), r: 0.7, m: 0.0, ao: 0.7, e: 6 },
  CeilingLight: { c: SRGB(0.92, 0.91, 0.86), r: 0.3, m: 0.0, ao: 0, e: 5 },
  Pole: { c: SRGB(0.78, 0.79, 0.80), r: 0.3, m: 0.4, ao: 0.6, e: 6 },
  Wood: { c: SRGB(0.66, 0.48, 0.32), r: 0.55, m: 0.0, ao: 0.7, e: 6 },
  Console: { c: SRGB(0.07, 0.07, 0.08), r: 0.6, m: 0.0, ao: 0.6 },
  GlassFar: { c: SRGB(0.07, 0.08, 0.085), r: 0.06, m: 0.0, ao: 0.3, e: 7 },   // LOD1-2 glass: opaque, lit at night
};

/** Live look controls (uniforms: no recompiles). */
export const tramLook = {
  interior: uniform(1.0),          // saloon light at night
  headlights: uniform(1.0),
  display: uniform(1.0),
  dirt: uniform(1.0),              // grime low on the body
  glassOpacity: uniform(0.62),     // saloon glass (the cab glass is darker)
  ao: uniform(1.0),                // baked AO strength
  doors: uniform(-1),              // lab: force every door open amount (-1 = per tram)
};

let promise = null;
export function loadTramModel() {
  return (promise ??= (async () => {
    const base = new URL("../models/tram2/", import.meta.url).href;
    const [gltf, layout, aoTex] = await Promise.all([
      new GLTFLoader().loadAsync(base + "t3000.glb"),
      fetch(base + "t3000.json").then((r) => r.json()),
      new THREE.TextureLoader().loadAsync(base + "t3000_ao.png"),
    ]);
    aoTex.colorSpace = THREE.NoColorSpace; aoTex.flipY = false; aoTex.anisotropy = 4;
    await MeshoptSimplifier.ready;
    gltf.scene.updateMatrixWorld(true);
    const slotOf = Object.fromEntries(layout.slots.map((n, i) => [n, i]));
    const objects = {};
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const RE = /^(Cab|Susp|Centre|Bellows|Bogie|Panto)(_mid|_far)?$/;
      let node = o; while (node && !RE.test(node.name)) node = node.parent;
      if (!node) return;
      const slot = slotOf[o.material.name.replace(/\.\d+$/, "")];
      if (slot === undefined) { console.warn("tram2: unknown material", o.material.name); return; }
      (objects[node.name] ??= []).push({ g: o.geometry, slot, name: layout.slots[slot] });
    });
    const lods = TRAM_LODS.map((L, k) => {
      const out = {};
      for (const p of PIECES) {
        let src = objects[p + (L.src || "")] || objects[p];
        const target = L.target ? L.target[p] : 0;
        if (k && target === 0) { out[p] = null; continue; }
        if (L.drop) src = src.filter((q) => !L.drop.includes(q.name));
        out[p] = mergePrims(src, target);
      }
      out.tris = PIECES.reduce((s, p) => s + (out[p] ? out[p].index.count / 3 * PER_TRAM[p] : 0), 0);
      return out;
    });
    const sign = makeSignAtlas(["FORT-JACO", "SCHAERBEEK GARE"]);
    const material = makeMaterial(sign, aoTex, layout);
    return { layout, lods, material, sign, version: 2 };
  })());
}

/** Merge a piece's primitives into one indexed geometry (position, normal, uv, uv1, aData = door code + slot); trim each
 *  primitive to its share of `target` triangles (meshoptimizer, borders locked: the slots stay sealed). */
function mergePrims(prims, target) {
  const total = prims.reduce((s, q) => s + q.g.index.count / 3, 0);
  const parts = prims.map((q) => {
    let idx = q.g.index.array;
    if (target && total > target) {
      // each door leaf is simplified on its own (else the simplifier welds leaf and body vertices, and an open door
      // drags body triangles with it): split the triangles by the leaf code of their first vertex
      const C = q.g.attributes.color, groups = new Map();
      for (let t = 0; t < idx.length; t += 3) {
        const v = idx[t], key = C ? `${C.getX(v).toFixed(2)},${C.getY(v).toFixed(2)},${C.getZ(v).toFixed(2)}` : "";
        let a = groups.get(key); if (!a) groups.set(key, (a = []));
        a.push(idx[t], idx[t + 1], idx[t + 2]);
      }
      const out = [];
      for (const tri of groups.values()) {
        const sub = new Uint32Array(tri), want = Math.max(6, Math.floor((sub.length / 3) * (target / total))) * 3;
        out.push(...(want < sub.length ? simplifyWelded(q.g, want, sub) : sub));
      }
      idx = new Uint32Array(out);
    }
    return { ...q, idx };
  });
  const nV = parts.reduce((s, q) => s + q.g.attributes.position.count, 0), nI = parts.reduce((s, q) => s + q.idx.length, 0);
  const pos = new Float32Array(nV * 3), nrm = new Float32Array(nV * 3), uv0 = new Float32Array(nV * 2), uv1 = new Float32Array(nV * 2);
  const door = new Float32Array(nV * 4);     // aData: door leaf code (x dir, y slide, z side) + w = the slot
  const index = new Uint32Array(nI);
  let v0 = 0, i0 = 0;
  for (const { g, slot: s, idx } of parts) {
    const n = g.attributes.position.count, A = g.attributes;
    pos.set(A.position.array, v0 * 3); nrm.set(A.normal.array, v0 * 3);
    if (A.uv) uv0.set(A.uv.array, v0 * 2);
    if (A.uv1) uv1.set(A.uv1.array, v0 * 2);
    for (let i = 0; i < n; i++) {
      if (A.color) { door[(v0 + i) * 4] = A.color.getX(i); door[(v0 + i) * 4 + 1] = A.color.getY(i); door[(v0 + i) * 4 + 2] = A.color.getZ(i); }
      door[(v0 + i) * 4 + 3] = s;
    }
    for (let i = 0; i < idx.length; i++) index[i0 + i] = idx[i] + v0;
    v0 += n; i0 += idx.length;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv0, 2));
  geo.setAttribute("uv1", new THREE.BufferAttribute(uv1, 2));
  geo.setAttribute("aData", new THREE.BufferAttribute(door, 4));      // (WebGPU: 8 vertex buffers at most, instancing included)
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeBoundingSphere();
  geo.userData.shared = true;
  return geo;
}

/** meshoptimizer on a position-welded index (as tramModel.js): the flat-shaded export is many loose pieces
 *  otherwise. Welded by position, door code and lightmap UV (see below); borders locked. */
function simplifyWelded(g, want, I = g.index.array) {
  const P = g.attributes.position.array, Nn = g.attributes.normal.array, C = g.attributes.color, U = g.attributes.uv1;
  const n = P.length / 3, canon = new Uint32Array(n), map = new Map(), cpos = [], members = [];
  for (let i = 0; i < n; i++) {
    // welded by position, door code AND lightmap UV: an AO seam stays a (locked) border, so no triangle samples the
    // AO of the island across the seam (the dark streaks of the first LOD1)
    const dk = C ? Math.round(C.getY(i) * 100) : 0, uk = U ? `${Math.round(U.getX(i) * 4096)},${Math.round(U.getY(i) * 4096)}` : "";
    const key = `${Math.round(P[i * 3] * 1000)},${Math.round(P[i * 3 + 1] * 1000)},${Math.round(P[i * 3 + 2] * 1000)},${dk},${uk}`;
    let c = map.get(key);
    if (c === undefined) { c = cpos.length / 3; map.set(key, c); cpos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); members.push([]); }
    canon[i] = c; members[c].push(i);
  }
  const ci = new Uint32Array(I.length);
  for (let i = 0; i < I.length; i++) ci[i] = canon[I[i]];
  const [out] = MeshoptSimplifier.simplify(ci, new Float32Array(cpos), 3, want, 1.0, ["ErrorAbsolute", "LockBorder"]);
  const res = new Uint32Array(out.length), Cp = cpos;
  for (let t = 0; t < out.length; t += 3) {
    const a = out[t], b = out[t + 1], c = out[t + 2];
    const ux = Cp[b * 3] - Cp[a * 3], uy = Cp[b * 3 + 1] - Cp[a * 3 + 1], uz = Cp[b * 3 + 2] - Cp[a * 3 + 2];
    const vx = Cp[c * 3] - Cp[a * 3], vy = Cp[c * 3 + 1] - Cp[a * 3 + 1], vz = Cp[c * 3 + 2] - Cp[a * 3 + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    for (let k = 0; k < 3; k++) {
      let best = members[out[t + k]][0], bd = -Infinity;
      for (const v of members[out[t + k]]) {
        const d = Nn[v * 3] * fx + Nn[v * 3 + 1] * fy + Nn[v * 3 + 2] * fz;
        if (d > bd) { bd = d; best = v; }
      }
      res[t + k] = best;
    }
  }
  return res;
}

function makeMaterial(sign, aoTex, layout) {
  const m = new THREE.MeshStandardNodeMaterial();
  const names = layout.slots;
  const look = names.map((n) => SLOT_LOOK[n] || { c: new THREE.Color(1, 0, 1), r: 0.5, m: 0, ao: 1 });
  const uCol = uniformArray(look.map((l) => l.c.clone()), "color");
  const uRMAE = uniformArray(look.map((l) => new THREE.Vector4(l.r, l.m, l.ao, l.e || 0)), "vec4");
  m.userData.slotColors = uCol; m.userData.slotNames = names;
  const door = attribute("aData", "vec4");
  const slot = int(door.w.add(0.5).floor());
  const inst = attribute("aInst", "vec4"), inst2 = attribute("aInst2", "vec4");
  const is = (name) => slot.equal(int(names.indexOf(name)));
  const rmae = uRMAE.element(slot);
  const emitKind = int(rmae.w.add(0.5).floor());
  const isGlass = is("Glass").or(is("GlassCab"));

  // ---- vertex stage: doors (plug: out 5.5 cm, then slide one leaf width) and the bellows' bend
  // (three r187 applies material.positionNode AFTER the instance transform: positionLocal is already placed. So the
  // door / bellows offsets are worked out on the raw vertex, then turned by the instance's yaw, aInst2.w; the pitch
  // of a module on a slope (a few %) is left out of these few-cm offsets)
  const p0 = attribute("position", "vec3");
  const leaf = door.y.greaterThan(0.01);
  const right = door.z.greaterThan(0.5);
  const openI = select(right, inst2.x, inst2.y);
  const open = select(tramLook.doors.greaterThanEqual(0), tramLook.doors, openI);
  const outM = smoothstep(0.0, 0.22, open).mul(0.055);
  const slide = smoothstep(0.18, 1.0, open).mul(door.y).mul(select(door.x.greaterThan(0.5), float(1), float(-1)));
  const theta = inst.z.mul(p0.x).div(layout.bellowsHalf * -2);       // 0 for every piece but the bellows
  const ct = cos(theta), st = sin(theta);
  const bend = vec3(p0.x.mul(ct).add(p0.z.mul(st)).sub(p0.x), 0, p0.z.mul(ct).sub(p0.x.mul(st)).sub(p0.z));
  const local = select(leaf, vec3(slide, 0, outM.mul(select(right, float(1), float(-1)))), bend);
  const cy = cos(inst2.w), sy = sin(inst2.w);
  m.positionNode = positionLocal.add(vec3(local.x.mul(cy).add(local.z.mul(sy)), local.y, local.z.mul(cy).sub(local.x.mul(sy))));

  // ---- surface
  const ao = texture(aoTex, uv(1)).r;
  const aoK = rmae.z.mul(tramLook.ao);
  const yLocal = p0.y;                                                // (raw local height)
  const exterior = rmae.z.greaterThan(0.85);
  // grime: duller low on the body, a little in the roof well
  const grime = mix(float(0.80), float(1.0), smoothstep(0.25, 1.15, yLocal)).mul(tramLook.dirt).add(float(1).sub(tramLook.dirt));
  const base = uCol.element(slot);
  const lit = mix(float(1), ao, aoK.mul(0.3));                             // a little of the AO on the direct light too
  // LOD1-2 glass: opaque, so it fakes what LOD0's see-through glass shows at that range (seats and lining low, the
  // far windows' daylight high), else the windows go black at the LOD switch (checked at 68 m, 2026-11-06)
  const farGlass = mix(vec3(0.11, 0.10, 0.10), vec3(0.42, 0.46, 0.50), smoothstep(1.55, 2.35, yLocal));
  m.colorNode = select(is("GlassFar"), farGlass, base.mul(select(exterior, grime, float(1))).mul(lit));
  m.roughnessNode = rmae.x.add(select(exterior, float(1).sub(grime).mul(0.6), float(0)));
  m.metalnessNode = rmae.y;
  m.aoNode = mix(float(1), ao, aoK);

  // ---- glass: see-through (alpha to coverage, one opaque draw), lighter shadow
  m.alphaToCoverage = true;
  m.opacityNode = select(is("Glass"), tramLook.glassOpacity, select(is("GlassCab"), tramLook.glassOpacity.mul(0.4).add(0.5), float(1)));
  const glassShadow = isGlass.not().or(screenCoordinate.x.floor().add(screenCoordinate.y.floor()).mod(3).equal(0));

  // ---- emission
  const g = uv().mul(vec2(LED[0], LED[1]));
  const cell = floor(g);
  const tv = float(1).sub(inst.y.add(cell.y.add(0.5).div(LED[1])).div(sign.rows));
  const ledOn = smoothstep(0.35, 0.6, texture(sign.tex, vec2(cell.x.add(0.5).div(LED[0]), tv)).r);
  const dotM = smoothstep(0.5, 0.28, length(fract(g).sub(0.5)));
  const blur = clamp(fwidth(g.x).mul(1.2), 0, 1);
  const led = ledOn.mul(mix(dotM, float(0.55), blur)).add(float(0.012));
  const night = env.uNight;
  const lead = inst.x, brake = inst2.z;
  const eHead = lead.mul(mix(float(2.5), float(14.0), night)).mul(tramLook.headlights);
  const eTail = lead.oneMinus().mul(mix(float(1.0), float(4.0), night).add(brake.mul(6.0))).mul(tramLook.headlights);
  const eMarker = mix(float(0.4), float(2.0), night).mul(tramLook.headlights);
  const eDisp = led.mul(mix(float(3.2), float(2.4), night)).mul(tramLook.display);
  const glow = night.mul(tramLook.interior).mul(env.uInteriorGlow);
  const eCeil = mix(float(0.5), float(6.0), glow);
  const eIn = glow.mul(0.16);
  m.emissiveNode = select(emitKind.equal(1), color(1.0, 0.95, 0.86).mul(eHead),
    select(emitKind.equal(2), color(1.0, 0.04, 0.02).mul(eTail),
      select(emitKind.equal(3), select(lead.greaterThan(0.5), color(1.0, 0.95, 0.86), color(1.0, 0.25, 0.05)).mul(eMarker),
        select(emitKind.equal(4), color(1.0, 0.5, 0.06).mul(eDisp),
          select(emitKind.equal(5), color(1.0, 0.95, 0.85).mul(eCeil),
            select(emitKind.equal(6), base.mul(color(1.0, 0.9, 0.75)).mul(eIn),
              select(emitKind.equal(7), color(1.0, 0.9, 0.74).mul(glow).mul(0.35), vec3(0)))))))).add(
    isGlass.and(is("Glass")).select(color(1.0, 0.9, 0.74).mul(glow).mul(0.05), vec3(0)));

  // ---- smooth LOD: the per-instance dither of the fleet's cross-fades (aInst.w; 0 = whole)
  let keep = null;
  if (SMOOTH) {
    const w = inst.w, n = ditherNoise();
    keep = w.lessThan(0.001).or(w.lessThan(1.5).and(n.lessThan(w))).or(w.greaterThan(1.5).and(n.greaterThanEqual(w.sub(2))));
    m.maskNode = keep;
  }
  m.maskShadowNode = keep ? keep.and(glassShadow) : glassShadow;
  m.userData.shared = true;
  return m;
}

// ------------------------------------------------------------------------------------------------ the fleet
/** InstancedMeshes per piece type and LOD for up to `maxTrams` trams. Per frame: begin(camera); add(pose, ground,
 *  { sign, doors: [right, left], brake }) per tram; end(). */
export function createTramFleet(model, parent, maxTrams = 40) {
  const meshes = [];
  for (let k = 0; k < model.lods.length; k++) {
    const row = {};
    for (const p of PIECES) {
      const geo0 = model.lods[k][p];
      if (!geo0) continue;
      const cap = Math.max(1025, maxTrams * PER_TRAM[p]);
      const geo = new THREE.BufferGeometry();
      for (const [name, a] of Object.entries(geo0.attributes)) geo.setAttribute(name, a);
      geo.setIndex(geo0.index);
      geo.boundingSphere = geo0.boundingSphere;
      // rewritten every frame, uploaded once through needsUpdate + the used range (end()), not DynamicDrawUsage
      const inst = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
      const inst2 = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
      geo.setAttribute("aInst", inst); geo.setAttribute("aInst2", inst2);
      const mesh = new THREE.InstancedMesh(geo, model.material, cap);
      mesh.count = 0; mesh.frustumCulled = false; mesh.castShadow = SMOOTH || k < 2; mesh.receiveShadow = true;
      mesh.name = `tram2-${p}-lod${k}`;
      parent.add(mesh);
      row[p] = { mesh, inst, inst2, n: 0 };
    }
    meshes.push(row);
  }
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), qp = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), zAx = new THREE.Vector3(0, 0, 1);
  const one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  const frustum = new THREE.Frustum(), sphere = new THREE.Sphere(), pm = new THREE.Matrix4();
  let cam = null, eye = null, lodScale = 1, forced = -1;
  const stats = { trams: 0, perLod: [0, 0, 0], culled: 0 };
  const placed = [];      // per piece of the current tram: [y, pitch]
  return {
    meshes, stats,
    set lodScale(s) { lodScale = s; },
    set forceLod(k) { forced = k; },
    begin(camera, camPos = null) {
      cam = camera; eye = camera ? camera.position : camPos;
      if (cam) { pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frustum.setFromProjectionMatrix(pm); }
      for (const row of meshes) for (const r of Object.values(row)) r.n = 0;
      stats.trams = 0; stats.perLod = [0, 0, 0]; stats.culled = 0;
    },
    /** pose from tramPose(); ground(x, z) -> rail-top height; returns the LOD used or -1 */
    add(pose, ground, { sign = 0, doors = null, brake = 0 } = {}) {
      let cx = 0, cz = 0;
      for (const p of pose) { cx += p.x; cz += p.z; }
      cx /= pose.length; cz /= pose.length;
      const cy = ground(cx, cz);
      let k = forced;
      sphere.center.set(cx, cy + 2, cz); sphere.radius = 19;
      if (cam && !frustum.intersectsSphere(sphere)) { stats.culled++; return -1; }
      let fadeA = 0, kB = -1, fadeB = 0;
      if (eye && k < 0) {
        const dist = eye.distanceTo(sphere.center) / lodScale;
        k = TRAM_LODS.findIndex((l) => dist < l.until);
        if (SMOOTH) {
          const last = TRAM_LODS.length - 1, end = TRAM_LODS[last].until;
          for (let j = 0; j < last; j++) {
            const s = TRAM_LODS[j].until, w = s * LOD_BANDS[j];
            if (dist > s - w && dist < s + w) { const t = THREE.MathUtils.smoothstep(dist, s - w, s + w); k = j; fadeA = 2 + t; kB = j + 1; fadeB = t; }
          }
          if (k === last && dist > end - FADE_END) fadeA = 2 + THREE.MathUtils.smoothstep(dist, end - FADE_END, end);
        }
        if (k < 0) { stats.culled++; return -1; }
      }
      if (k < 0) k = 0;
      // heights and pitch once per piece (both LODs of a cross-fade use them)
      placed.length = 0;
      for (const p of pose) {
        const h = HALF[p.piece] || 0;
        if (!h) { placed.push(ground(p.x, p.z), 0); continue; }
        const dx = Math.cos(p.yaw) * h, dz = -Math.sin(p.yaw) * h;
        const yf = ground(p.x + dx, p.z + dz), yr = ground(p.x - dx, p.z - dz);
        placed.push((yf + yr) / 2, Math.atan2(yf - yr, 2 * h));
      }
      const dR = doors ? doors[0] : 0, dL = doors ? doors[1] : 0;
      const put = (kk, fade) => {
        const row = meshes[kk];
        for (let i = 0; i < pose.length; i++) {
          const p = pose[i], r = row[p.piece];
          if (!r || r.n >= r.mesh.instanceMatrix.count) continue;
          q.setFromAxisAngle(up, p.yaw); qp.setFromAxisAngle(zAx, placed[i * 2 + 1]); q.multiply(qp);
          M.compose(v.set(p.x, placed[i * 2], p.z), q, one);
          r.mesh.setMatrixAt(r.n, M);
          r.inst.array.set([p.lead ? 1 : 0, sign, p.angle || 0, fade], r.n * 4);
          r.inst2.array.set(p.flip ? [dL, dR, brake, p.yaw] : [dR, dL, brake, p.yaw], r.n * 4);
          r.n++;
        }
      };
      put(k, fadeA);
      if (kB >= 0) put(kB, fadeB);
      stats.trams++; stats.perLod[k]++;
      return k;
    },
    end() {
      for (const row of meshes) for (const r of Object.values(row)) {
        r.mesh.count = r.n;
        if (r.n) {
          r.mesh.instanceMatrix.clearUpdateRanges(); r.mesh.instanceMatrix.addUpdateRange(0, r.n * 16); r.mesh.instanceMatrix.needsUpdate = true;
          for (const a of [r.inst, r.inst2]) { a.clearUpdateRanges(); a.addUpdateRange(0, r.n * 4); a.needsUpdate = true; }
        }
      }
    },
    dispose() { for (const row of meshes) for (const r of Object.values(row)) { r.mesh.removeFromParent(); r.mesh.dispose(); } },
  };
}
