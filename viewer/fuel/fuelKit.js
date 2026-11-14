// THE PETROL STATION KIT (tools/blender/fuelKit.py -> models/fuel/fuelkit.glb + fuelkit_ao.png; our own brand atlas
// tools/fuel/make_brands.py -> textures/fuel/fuel_brands.png + .json), shared by the city (viewer/fuel/cityFuel.js) and
// the Fuel Lab. Loaded once. The same scheme as the stops kit (viewer/stops/stopKit.js):
//   pieces   canopy modules (deck, fascia, corner, LED panel, column + crash sleeve, solar, brand sign), island, crash
//            hoop, dispenser, totem, shop front / door bay, signage band, air stand, pay terminal, bollard, drainage
//            channel, paint line, car-wash box. Some are SCALED per instance (a fascia run's length, the deck's size,
//            a column's height): they are built as prisms whose detail lies across the scaled axis, so a scale never
//            stretches a bevel; their AO is not baked (1)
//   LODs     0 = the Blender mesh (AO from the lightmap); 1 / 2 = welded + meshoptimizer-simplified (6 mm / 2.5 cm),
//            crease normals, AO per vertex (never Blender decimate)
//   draws    per piece and LOD ONE opaque draw (a per-vertex slot index into a palette; the brand_* slots take the
//            instance's colour SCHEME), + the brand / grade / price signs (one draw, the atlas) + the glass
//   colour   instance stride 8: x y z yaw sx sy sz scheme. iBand = (switch 0-1, switch 1-2, end, tile slot), iMisc =
//            (scheme, ...)
//   night    the fascia's LED line, the soffit panels, the screens, the shop interior and the signs glow through their
//            emissive slots x env.uNight (no light is added: fixed light count)
import * as THREE from "three/webgpu";
import {
  attribute, uniformArray, texture, uv, vec2, vec3, float, mix, smoothstep, length, positionWorld, select, fract, clamp, step, max, min,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { lodEye, keepBand, ditherNoise } from "../lodFade.js";
import { FadeSlots, StreamPool, buildSource, MARGIN } from "../instanceStream.js";
import { env } from "../lighting.js";

/** the stations' tile fades (viewer/instanceStream.js): iBand.w = the instance's tile slot */
export const fuelFades = new FadeSlots();

/** slot palette (linear rgb, roughness, metalness, emissive at night, emissive by day) by NAME (tools/blender/fuelKit.py);
 *  the brand_* slots take the scheme's colours instead of theirs */
export const SLOTS = [
  ["canopy_white", [0.74, 0.75, 0.75], 0.42, 0.1, 0, 0],
  ["soffit_white", [0.78, 0.79, 0.79], 0.38, 0.15, 0.05, 0],
  ["trim_alu", [0.5, 0.52, 0.54], 0.32, 0.85, 0, 0],
  ["steel_brushed", [0.52, 0.53, 0.54], 0.28, 0.9, 0, 0],
  ["steel_galv", [0.45, 0.47, 0.48], 0.45, 0.8, 0, 0],
  ["brand_primary", [0.5, 0.5, 0.5], 0.35, 0.05, 0.12, 0],
  ["brand_secondary", [0.5, 0.5, 0.5], 0.35, 0.05, 0.12, 0],
  ["brand_accent", [0.5, 0.5, 0.5], 0.35, 0.05, 0.1, 0],
  ["led_strip", [0.95, 0.95, 0.92], 0.3, 0.0, 3.0, 0.25],
  ["led_panel", [0.95, 0.96, 0.98], 0.3, 0.0, 2.6, 0.5],
  ["screen", [0.06, 0.16, 0.22], 0.12, 0.0, 1.6, 0.8],
  ["rubber_black", [0.018, 0.018, 0.02], 0.7, 0.0, 0, 0],
  ["hose_black", [0.012, 0.012, 0.013], 0.5, 0.0, 0, 0],
  ["chrome", [0.75, 0.75, 0.77], 0.12, 1.0, 0, 0],
  ["grade_green", [0.02, 0.22, 0.06], 0.4, 0.0, 0, 0],
  ["safety_yellow", [0.7, 0.45, 0.02], 0.45, 0.0, 0, 0],
  ["concrete", [0.36, 0.35, 0.33], 0.85, 0.0, 0, 0],
  ["solar_cell", [0.02, 0.03, 0.06], 0.2, 0.3, 0, 0],
  ["paint_white", [0.7, 0.7, 0.67], 0.6, 0.0, 0, 0],
  ["plastic_dark", [0.035, 0.035, 0.04], 0.5, 0.0, 0, 0],
  ["dispenser_body", [0.62, 0.63, 0.64], 0.32, 0.35, 0, 0],
  ["shop_interior", [0.1, 0.09, 0.08], 0.8, 0.0, 1.4, 0.05],
  ["roof_membrane", [0.2, 0.2, 0.21], 0.9, 0.0, 0, 0],
  ["brush_blue", [0.04, 0.12, 0.38], 0.85, 0.0, 0, 0],
  ["cast_iron", [0.045, 0.045, 0.05], 0.6, 0.6, 0, 0],
];
const SLOT = Object.fromEntries(SLOTS.map((s, i) => [s[0], i]));
const BRAND0 = SLOT.brand_primary;                          // brand_primary, _secondary, _accent: consecutive slots

export const PIECES = ["canopy_fascia", "canopy_corner", "canopy_deck", "canopy_light", "canopy_column", "column_base", "solar", "fascia_sign",
  "island", "dispenser", "totem", "shopfront", "shopdoor", "shopsign", "airstand", "paypoint", "bollard", "grate", "line", "carwash"];
const SCALED = new Set(["canopy_fascia", "canopy_deck", "canopy_column", "solar", "shopsign", "line"]);
/** pieces whose baked AO is not used: the fascia corner and the sign box hang below their origin and bake too dark */
const NOAO = new Set(["canopy_corner", "fascia_sign"]);
/** LOD bands (m): [switch 0 -> 1, switch 1 -> 2, end]; glass ends at `glass` */
const BIG = { lod: [70, 200, 900], glass: 0, shadow: true };
export const BANDS = {
  canopy_fascia: BIG, canopy_corner: { lod: [50, 160, 900], shadow: true }, canopy_deck: BIG, canopy_light: { lod: [40, 120, 450], shadow: false },
  canopy_column: BIG, column_base: { lod: [45, 120, 300], shadow: true }, solar: { lod: [60, 200, 600], shadow: false }, fascia_sign: { lod: [60, 200, 900], shadow: true },
  island: { lod: [45, 130, 400], shadow: true }, dispenser: { lod: [40, 110, 450], shadow: true },
  totem: { lod: [60, 200, 900], shadow: true }, shopfront: { lod: [60, 150, 500], glass: 220, shadow: true }, shopdoor: { lod: [60, 150, 500], glass: 220, shadow: true },
  shopsign: { lod: [60, 200, 700], shadow: true }, airstand: { lod: [40, 90, 250], shadow: true }, paypoint: { lod: [40, 90, 300], shadow: true },
  bollard: { lod: [40, 90, 200], shadow: true }, grate: { lod: [45, 100, 160], shadow: false }, line: { lod: [60, 200, 300], shadow: false },
  carwash: { lod: [50, 160, 700], shadow: true },
};
const LOD_ERR = [0, 0.006, 0.025];

let promise = null;
/** { pieces: { <name>: { lods: [geo x3], sign, glass, tris } }, mats, brands } */
export function loadFuelKit(base = new URL("../../", import.meta.url)) {
  return (promise ??= (async () => {
    const t0 = performance.now();
    const [gltf, ao, signTex, brands] = await Promise.all([
      new GLTFLoader().loadAsync(new URL("models/fuel/fuelkit.glb", base).href),
      loadAO(new URL("models/fuel/fuelkit_ao.png", base).href),
      new THREE.TextureLoader().loadAsync(new URL("textures/fuel/fuel_brands.png", base).href),
      fetch(new URL("textures/fuel/fuel_brands.json", base)).then((r) => r.json()),
    ]);
    Object.assign(signTex, { flipY: false, colorSpace: THREE.SRGBColorSpace, anisotropy: 8, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    signTex.needsUpdate = true;
    await MeshoptSimplifier.ready;
    gltf.scene.updateMatrixWorld(true);
    const raw = {};
    const re = new RegExp(`^(${PIECES.join("|")})(__sign|__glass)?$`);
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let name = null;
      for (let q = o; q && !name; q = q.parent) if (re.test(q.name)) name = q.name;
      if (!name) return;
      (raw[name] ??= []).push({ geo: o.geometry.clone().applyMatrix4(o.matrixWorld), slot: o.material.name });
    });
    const pieces = {};
    for (const p of PIECES) {
      if (!raw[p]) throw new Error(`fuel kit: no piece ${p}`);
      const noAO = SCALED.has(p) || NOAO.has(p);
      const lod0 = mainGeometry(raw[p], noAO);
      const lod1 = weldedSimplify(lod0, LOD_ERR[1], ao, noAO);
      const lod2 = weldedSimplify(lod0, LOD_ERR[2], ao, noAO);
      const sign = raw[`${p}__sign`] ? plain(raw[`${p}__sign`], ["position", "normal", "uv"]) : null;
      const glass = raw[`${p}__glass`] ? plain(raw[`${p}__glass`], ["position", "normal"]) : null;
      const lods = [lod0, lod1, lod2];
      for (const g of [...lods, sign, glass]) if (g) { g.computeBoundingSphere(); g.computeBoundingBox(); g.userData.shared = true; }
      pieces[p] = { name: p, lods, sign, glass, tris: lods.map((g) => g.index.count / 3), band: BANDS[p], scaled: SCALED.has(p) };
    }
    const mats = materials(ao.tex, signTex, brands);
    return { pieces, mats, brands, aoTex: ao.tex, signTex, loadMs: performance.now() - t0 };
  })());
}

function loadAO(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, img.width, img.height).data, r = new Uint8Array(img.width * img.height);
      for (let i = 0; i < r.length; i++) r[i] = d[i * 4];
      const tex = new THREE.DataTexture(r, img.width, img.height, THREE.RedFormat, THREE.UnsignedByteType);
      Object.assign(tex, { flipY: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, colorSpace: THREE.NoColorSpace });
      tex.needsUpdate = true;
      const W = img.width, H = img.height;
      const at = (u, v) => { if (u < 0) return 1; const px = Math.min(W - 1, Math.max(0, Math.round(u * W - 0.5))), py = Math.min(H - 1, Math.max(0, Math.round(v * H - 0.5))); return r[py * W + px] / 255; };
      res({ tex, at });
    };
    img.onerror = () => rej(new Error(`AO map ${url}`));
    img.src = url;
  });
}

/** the piece's main primitives merged: position, normal, uv1 (AO; u < 0 = none), slot */
function mainGeometry(prims, noAO) {
  let nv = 0, ni = 0;
  for (const p of prims) { nv += p.geo.attributes.position.count; ni += p.geo.index.count; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), S = new Float32Array(nv), I = new Uint32Array(ni);
  let v = 0, i = 0;
  for (const p of prims) {
    const g = p.geo, n = g.attributes.position.count, s = SLOT[p.slot];
    if (s === undefined) throw new Error(`fuel kit: unknown slot ${p.slot}`);
    P.set(g.attributes.position.array, v * 3); N.set(g.attributes.normal.array, v * 3);
    if (g.attributes.uv1 && !noAO) U.set(g.attributes.uv1.array, v * 2); else U.fill(-1, v * 2, (v + n) * 2);
    S.fill(s, v, v + n);
    const gi = g.index.array; for (let k = 0; k < gi.length; k++) I[i + k] = gi[k] + v;
    v += n; i += gi.length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
  g.setAttribute("uv1", new THREE.BufferAttribute(U, 2)); g.setAttribute("slot", new THREE.BufferAttribute(S, 1));
  g.setIndex(new THREE.BufferAttribute(I, 1));
  return g;
}

function plain(prims, keep) {
  const parts = prims.map((p) => { const g = p.geo; for (const k of Object.keys(g.attributes)) if (!keep.includes(k)) g.deleteAttribute(k); return g; });
  if (parts.length === 1) return parts[0];
  let nv = 0, ni = 0;
  for (const g of parts) { nv += g.attributes.position.count; ni += g.index.count; }
  const out = new THREE.BufferGeometry(), I = new Uint32Array(ni);
  for (const k of keep) {
    const w = parts[0].attributes[k].itemSize, A = new Float32Array(nv * w);
    let v = 0; for (const g of parts) { A.set(g.attributes[k].array, v * w); v += g.attributes.position.count; }
    out.setAttribute(k, new THREE.BufferAttribute(A, w));
  }
  let v = 0, i = 0;
  for (const g of parts) { const gi = g.index.array; for (let k = 0; k < gi.length; k++) I[i + k] = gi[k] + v; v += g.attributes.position.count; i += gi.length; }
  out.setIndex(new THREE.BufferAttribute(I, 1));
  return out;
}

/** LOD1 / LOD2: weld by position + slot, simplify, crease normals (25 deg), AO per vertex (slot + ao * 0.99) */
function weldedSimplify(g, err, ao, noAO) {
  const P = g.attributes.position.array, S = g.attributes.slot.array, UV = g.attributes.uv1.array, n = S.length;
  const key = new Map(), remap = new Uint32Array(n), wp = [], wslot = [], aoSum = [], aoN = [];
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(P[3 * i] * 2000)},${Math.round(P[3 * i + 1] * 2000)},${Math.round(P[3 * i + 2] * 2000)},${S[i]}`;
    let j = key.get(k);
    if (j === undefined) { j = wslot.length; key.set(k, j); wp.push(P[3 * i], P[3 * i + 1], P[3 * i + 2]); wslot.push(S[i]); aoSum.push(0); aoN.push(0); }
    remap[i] = j; aoSum[j] += noAO ? 1 : ao.at(UV[2 * i], UV[2 * i + 1]); aoN[j]++;
  }
  const I0 = Uint32Array.from(g.index.array, (i) => remap[i]), pos = new Float32Array(wp);
  const [I] = err > 0 ? MeshoptSimplifier.simplify(I0, pos, 3, 0, err, ["ErrorAbsolute", "Prune"]) : [I0];
  const T = I.length / 3, fn = new Float32Array(T * 3), fa = new Float32Array(T), around = new Map();
  const pk = (v) => `${pos[3 * v].toFixed(4)},${pos[3 * v + 1].toFixed(4)},${pos[3 * v + 2].toFixed(4)}`;
  for (let t = 0; t < T; t++) {
    const a = I[3 * t] * 3, b = I[3 * t + 1] * 3, c = I[3 * t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1e-12;
    fn[3 * t] = nx / l; fn[3 * t + 1] = ny / l; fn[3 * t + 2] = nz / l; fa[t] = l / 2;
    for (let k = 0; k < 3; k++) { const q = pk(I[3 * t + k]); if (!around.has(q)) around.set(q, []); around.get(q).push(t); }
  }
  const crease = Math.cos(25 * Math.PI / 180);
  const OP = new Float32Array(T * 9), ON = new Float32Array(T * 9), OS = new Float32Array(T * 3);
  for (let t = 0; t < T; t++) for (let k = 0; k < 3; k++) {
    const v = I[3 * t + k], o = 3 * t + k;
    OP[3 * o] = pos[3 * v]; OP[3 * o + 1] = pos[3 * v + 1]; OP[3 * o + 2] = pos[3 * v + 2];
    let nx = 0, ny = 0, nz = 0;
    for (const u of around.get(pk(v))) {
      if (fn[3 * u] * fn[3 * t] + fn[3 * u + 1] * fn[3 * t + 1] + fn[3 * u + 2] * fn[3 * t + 2] >= crease) { nx += fn[3 * u] * fa[u]; ny += fn[3 * u + 1] * fa[u]; nz += fn[3 * u + 2] * fa[u]; }
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    ON[3 * o] = nx / l; ON[3 * o + 1] = ny / l; ON[3 * o + 2] = nz / l;
    OS[o] = wslot[v] + 0.99 * Math.min(1, aoSum[v] / aoN[v]) * 0.999;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(OP, 3)); out.setAttribute("normal", new THREE.BufferAttribute(ON, 3));
  out.setAttribute("slot", new THREE.BufferAttribute(OS, 1));
  out.setIndex(new THREE.BufferAttribute(Uint32Array.from({ length: T * 3 }, (_, i) => i), 1));
  return out;
}

// ------------------------------------------------------------------------------------------------ materials
const slotA = uniformArray(SLOTS.map((s) => new THREE.Vector4(s[1][0], s[1][1], s[1][2], s[2])), "vec4");
const slotB = uniformArray(SLOTS.map((s) => new THREE.Vector4(s[3], s[4], s[5], 0)), "vec4");
/** the LOD's dither keep (iBand = switch01, switch12, end, tile slot) */
function lodKeep(lod, band, n = ditherNoise()) {
  const d = length(positionWorld.sub(lodEye));
  const t1 = smoothstep(band.x.mul(0.9), band.x.mul(1.1), d), t2 = smoothstep(band.y.mul(0.9), band.y.mul(1.1), d), e = smoothstep(band.z.mul(0.85), band.z, d);
  const f = fuelFades.fade(band.w);
  const tile = select(f.greaterThan(1.5), n.greaterThanEqual(f.sub(2)), n.lessThan(f));
  const k = lod === 0 ? keepBand(t1, float(1.01), n) : lod === 1 ? keepBand(t2, t1, n) : lod === 2 ? keepBand(e, t2, n) : keepBand(e, float(1.01), n);
  return k.and(tile);
}

function materials(aoTex, signTex, brands) {
  const night = env.uNight;
  // the schemes' three colours (linear), scheme-major
  const pal = [];
  for (const s of brands.schemes) { const p = brands.palette[s]; pal.push(new THREE.Vector4(...p.primary, 0), new THREE.Vector4(...p.secondary, 0), new THREE.Vector4(...p.accent, 0)); }
  const palA = uniformArray(pal, "vec4");
  const opaque = [0, 1, 2].map((lod) => {
    const m = new THREE.MeshStandardNodeMaterial();
    const sl = attribute("slot", "float"), idx = sl.add(0.0005).floor().toInt();
    const A = slotA.element(idx), B = slotB.element(idx);
    const scheme = attribute("iMisc", "vec4").x.add(0.5).floor();
    const bi = idx.sub(BRAND0), isBrand = bi.greaterThanEqual(0).and(bi.lessThan(3));
    const brandCol = palA.element(scheme.mul(3).add(bi.clamp(0, 2).toFloat()).toInt()).xyz;
    const col = select(isBrand, brandCol, A.xyz);
    const uv1 = uv(1);
    const ao = lod >= 1 ? fract(sl.add(0.0005)).div(0.99).min(1) : select(uv1.x.lessThan(0), float(1), texture(aoTex, uv1).r);
    m.colorNode = col.mul(mix(float(1), ao, 0.55));
    m.aoNode = ao;
    m.roughnessNode = A.w;
    m.metalnessNode = B.x;
    m.emissiveNode = col.mul(mix(B.z, B.y, night));
    m.maskNode = lodKeep(lod, attribute("iBand", "vec4"));
    m.maskShadowNode = m.maskNode;
    m.name = `fuel-lod${lod}`;
    m.userData.shared = true; m.userData.noFade = true;
    return m;
  });
  // signs: u 0..1 wordmark, 1..2 emblem (row = scheme), 2..3 the four grade tabs, 3..4 the LED window (shared rows)
  const sign = new THREE.MeshStandardNodeMaterial();
  {
    const [AW, AH] = brands.size, RH = brands.rowH, rows = brands.rows;
    const u = uv().x, v = clamp(uv().y, 0.01, 0.99);
    const scheme = attribute("iMisc", "vec4").x.add(0.5).floor();
    const k = u.floor().clamp(0, 3), f = clamp(fract(u), 0.003, 0.997);
    const x = select(k.lessThan(0.5), f.mul(brands.word[1] / AW),
      select(k.lessThan(1.5), f.mul((brands.emblem[1] - brands.emblem[0]) / AW).add(brands.emblem[0] / AW),
        select(k.lessThan(2.5), f, f.mul(brands.ledW / AW))));
    const row = select(k.lessThan(1.5), scheme, select(k.lessThan(2.5), float(brands.gradesRow), float(brands.ledRow)));
    const t = texture(signTex, vec2(x, row.add(v).mul(RH / AH))).rgb;
    const led = k.greaterThan(2.5);
    sign.colorNode = t.mul(0.9);
    sign.roughnessNode = select(led, float(0.08), float(0.45));
    sign.metalnessNode = float(0);
    // lit signs: a little by day, more at night (the LED window's ghost segments glow a dim red)
    sign.emissiveNode = t.mul(mix(select(led, float(0.6), float(0.08)), select(led, float(1.4), float(0.85)), night));
    sign.maskNode = lodKeep(3, attribute("iBand", "vec4"));
    sign.name = "fuel-sign";
    sign.userData.shared = true; sign.userData.noFade = true;
  }
  const glass = new THREE.MeshStandardNodeMaterial({ transparent: true, depthWrite: false, roughness: 0.04, metalness: 0 });
  {
    const band = attribute("iBandGlass", "vec4"), d = length(positionWorld.sub(lodEye));
    const f = fuelFades.fade(band.w), tileA = select(f.greaterThan(1.5), float(3).sub(f), f.min(1));
    glass.colorNode = vec3(0.55, 0.62, 0.64);
    glass.opacityNode = float(0.22).mul(smoothstep(band.z, band.z.mul(0.7), d)).mul(tileA);
    glass.name = "fuel-glass";
    glass.userData.shared = true; glass.userData.noFade = true;
  }
  const standin = new THREE.MeshStandardNodeMaterial({ color: 0x555555 });
  standin.name = "fuel-collision-standin";
  standin.userData.shared = true; standin.userData.noFade = true;
  return { opaque, sign, glass, standin };
}

// ------------------------------------------------------------------------------------------------ sources + pools
/** a tile's instance array of one piece (x y z yaw sx sy sz scheme) as a streaming source: the matrix WITH the scale */
export function fuelSource(piece, a, slot) {
  const stride = 8, n = a.length / stride, M = new Float32Array(n * 16), cen = new Float32Array(n * 4);
  const iBand = new Float32Array(n * 4), iBandGlass = new Float32Array(n * 4), iMisc = new Float32Array(n * 4);
  const [s1, s2, end] = piece.band.lod, r = piece.lods[0].boundingSphere.radius, bc = piece.lods[0].boundingSphere.center;
  for (let i = 0; i < n; i++) {
    const o = i * stride, x = a[o], y = a[o + 1], z = a[o + 2], yaw = a[o + 3], sx = a[o + 4], sy = a[o + 5], sz = a[o + 6];
    const cs = Math.cos(yaw), sn = Math.sin(yaw), k = i * 16;
    M[k] = cs * sx; M[k + 2] = -sn * sx; M[k + 5] = sy; M[k + 8] = sn * sz; M[k + 10] = cs * sz; M[k + 12] = x; M[k + 13] = y; M[k + 14] = z; M[k + 15] = 1;
    const ms = Math.max(sx, sy, sz);
    // the bounding centre in world (the scaled piece's own centre: a fascia run's middle, a column's mid-height)
    const lx = bc.x * sx, ly = bc.y * sy, lz = bc.z * sz;
    cen[i * 4] = x + cs * lx + sn * lz; cen[i * 4 + 1] = y + ly; cen[i * 4 + 2] = z - sn * lx + cs * lz; cen[i * 4 + 3] = r * ms;
    iBand.set([s1, s2, end, slot], i * 4);
    iBandGlass.set([s1, s2, piece.band.glass || 0, slot], i * 4);
    iMisc.set([a[o + 7], 0, 0, 0], i * 4);
  }
  return buildSource(n, { instanceMatrix: [M, 16], iBand: [iBand, 4], iBandGlass: [iBandGlass, 4], iMisc: [iMisc, 4] }, cen);
}

/** ONE pool per piece for the whole city: LOD0..2 + sign + glass instanced meshes (viewer/instanceStream.js) */
export class FuelPool {
  constructor(piece, mats, group, margin = MARGIN) {
    this.piece = piece; this.meshes = [];
    const [s1, s2, end] = piece.band.lod, spec = [];
    const mk = (geo, mat, name, shadow, l0, l1, band = "iBand") => {
      const g = new THREE.BufferGeometry();
      for (const k of Object.keys(geo.attributes)) g.setAttribute(k, geo.attributes[k]);
      g.setIndex(geo.index);
      const m = new THREE.InstancedMesh(g, mat, 1);
      m.receiveShadow = true; m.castShadow = shadow; m.frustumCulled = true;
      m.boundingSphere = new THREE.Sphere(); m.name = `fuel-${piece.name}-${name}`;
      group.add(m); this.meshes.push(m);
      spec.push({ mesh: m, l0, l1, attrs: [["instanceMatrix", "instanceMatrix", 16], ["iBand", band, 4], ["iMisc", "iMisc", 4]] });
      return m;
    };
    const sh = piece.band.shadow;
    const live = [[0, s1 * 1.1], [s1 * 0.9, s2 * 1.1], [s2 * 0.9, end]];
    this.lod = piece.lods.map((g, k) => mk(g, mats.opaque[k], `lod${k}`, sh, live[k][0], live[k][1]));
    this.sign = piece.sign ? mk(piece.sign, mats.sign, "sign", false, 0, end) : null;
    this.glass = piece.glass && piece.band.glass > 0 ? mk(piece.glass, mats.glass, "glass", false, 0, piece.band.glass, "iBandGlass") : null;
    if (this.glass) this.glass.renderOrder = 2;
    this.stream = new StreamPool(piece.name, spec, piece.lods[0].boundingSphere.radius * 30, margin);
  }
  /** the lab: a synchronous gather of tiles [{ inst: { <piece>: Float32Array stride 8 } }] round c */
  gather(tiles, c) {
    const srcs = [], k = this.piece.name;
    for (const t of tiles) {
      const a = t.inst[k]; if (!a) continue;
      t.__src ||= {};
      srcs.push({ src: (t.__src[k] ||= fuelSource(this.piece, a, 0)) });
    }
    const it = this.stream.gather(srcs, c, () => false);
    while (!it.next().done);
  }
  get drawn() { return this.meshes.filter((m) => m.visible).length; }
}

// ------------------------------------------------------------------------------------------------ one station = few draws
/** pieces left out of a station's far LODs (sub-pixel there: their triangles would be wasted) */
const DROP = { 1: new Set(["grate", "line"]), 2: new Set(["grate", "line", "bollard", "canopy_light", "airstand", "paypoint", "column_base", "solar"]) };
/** the station's LOD bands (m): switch 0 -> 1, switch 1 -> 2, end; the glass ends at 220 m */
export const STATION_BAND = [60, 180, 900];

/** ONE station's pieces merged (its instances baked into world space) into: LOD0 / LOD1 / LOD2 opaque geometries, one
 *  sign geometry and one glass geometry, each with the station's per-vertex iBand (bands + the tile's fade slot) and
 *  iMisc (scheme). A station is then 3 draws near (opaque LOD, signs, glass) + its shadow, instead of one per piece.
 *  Built piece by piece: `yieldEvery` ms of work at most, then a macrotask (no main-thread spike on a tile load). */
export async function buildStation(kit, inst, scheme, slot, yieldEvery = 3) {
  const M = new THREE.Matrix4(), N = new THREE.Matrix3(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), s = new THREE.Vector3(), v = new THREE.Vector3();
  const parts = { lod0: [], lod1: [], lod2: [], sign: [], glass: [] };
  let t0 = performance.now();
  for (const [name, a] of Object.entries(inst)) {
    const piece = kit.pieces[name];
    for (let o = 0; o < a.length; o += 8) {
      q.setFromAxisAngle(up, a[o + 3]);
      M.compose(p.set(a[o], a[o + 1], a[o + 2]), q, s.set(a[o + 4], a[o + 5], a[o + 6]));
      N.getNormalMatrix(M);
      for (let k = 0; k < 3; k++) if (!DROP[k]?.has(name)) parts[`lod${k}`].push([piece.lods[k], M.clone(), N.clone()]);
      if (piece.sign) parts.sign.push([piece.sign, M.clone(), N.clone()]);
      if (piece.glass) parts.glass.push([piece.glass, M.clone(), N.clone()]);
    }
  }
  const out = {};
  for (const [key, list] of Object.entries(parts)) {
    if (!list.length) continue;
    let nv = 0, ni = 0;
    for (const [g] of list) { nv += g.attributes.position.count; ni += g.index.count; }
    const P = new Float32Array(nv * 3), Nn = new Float32Array(nv * 3), I = new Uint32Array(ni);
    const hasSlot = key.startsWith("lod"), hasUV1 = key === "lod0", hasUV = key === "sign";
    const S = hasSlot ? new Float32Array(nv) : null, U1 = hasUV1 ? new Float32Array(nv * 2) : null, U = hasUV ? new Float32Array(nv * 2) : null;
    let vo = 0, io = 0;
    for (const [g, m, n] of list) {
      const gp = g.attributes.position, gn = g.attributes.normal, c = gp.count;
      for (let i = 0; i < c; i++) {
        v.fromBufferAttribute(gp, i).applyMatrix4(m); P[(vo + i) * 3] = v.x; P[(vo + i) * 3 + 1] = v.y; P[(vo + i) * 3 + 2] = v.z;
        v.fromBufferAttribute(gn, i).applyMatrix3(n).normalize(); Nn[(vo + i) * 3] = v.x; Nn[(vo + i) * 3 + 1] = v.y; Nn[(vo + i) * 3 + 2] = v.z;
      }
      if (S) S.set(g.attributes.slot.array, vo);
      if (U1) U1.set(g.attributes.uv1.array, vo * 2);
      if (U) U.set(g.attributes.uv.array, vo * 2);
      const gi = g.index.array; for (let k = 0; k < gi.length; k++) I[io + k] = gi[k] + vo;
      vo += c; io += gi.length;
      if (performance.now() - t0 > yieldEvery) { await new Promise((r) => setTimeout(r, 0)); t0 = performance.now(); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(P, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(Nn, 3));
    if (S) geo.setAttribute("slot", new THREE.BufferAttribute(S, 1));
    if (U1) geo.setAttribute("uv1", new THREE.BufferAttribute(U1, 2));
    if (U) geo.setAttribute("uv", new THREE.BufferAttribute(U, 2));
    const [s1, s2, end] = STATION_BAND;
    const band = new Float32Array(nv * 4), misc = new Float32Array(nv * 4);
    for (let i = 0; i < nv; i++) { band[i * 4] = s1; band[i * 4 + 1] = s2; band[i * 4 + 2] = key === "glass" ? 220 : end; band[i * 4 + 3] = slot; misc[i * 4] = scheme; }
    geo.setAttribute(key === "glass" ? "iBandGlass" : "iBand", new THREE.BufferAttribute(band, 4));
    geo.setAttribute("iMisc", new THREE.BufferAttribute(misc, 4));
    geo.setIndex(new THREE.BufferAttribute(I, 1));
    geo.computeBoundingSphere(); geo.computeBoundingBox();
    out[key] = geo;
  }
  return out;
}
