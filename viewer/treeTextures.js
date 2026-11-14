// TEXTURED TREES (lab only: labs/tree-textures-lab.html): the texture sources the tree textures lab compares against
// today's procedural bark and leaf masks, as plug-ins of the same chain (viewer/treesStylized.js makeSpecies):
//  - BARK SCANS (CC0, Poly Haven / ambientCG): a `def.bark(material)` that maps a tiling scan on the bark mesh with a
//    TRIPLANAR projection in the tree's own space (the bark mesh has no uv; the trunk, limbs and the root flare all
//    take it without seams), its normals blended UDN-style (Ben Golus, "Normal Mapping for a Triplanar Shader"), the
//    colour graded to the species' own mean (luminance + half the hue) and broken up by the species' MACRO variation
//    (large noise zones, the darker foot, the paler limbs; the plane's old olive plates low down, the beech's algae
//    side), so the 1-2 m repeat never shows; optionally a second scan for the foot (the plane's old dark bark).
//  - LEAF SPRAYS (tools/blender/leafAtlas.py: modelled leaves, or CC0 scanned leaves in the same sprays): the
//    `params.leafAtlas` of vendor CHANGES #16 (albedo + coverage, normal + thickness), coverage-preserving alpha mips.
// KTX2 (Basis UASTC + zstd, 1024 px; three's KTX2Loader transcodes to BC7 / ASTC / ETC2: 1 byte per texel). Built by
// tools/textures/{fetch_tree_textures.py, process_tree_textures.py} and tools/blender/leafAtlas.py; the manifest
// (sources, licences, means, sizes) is textures/tree_textures.json.
import * as THREE from "three/webgpu";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import {
  texture, attribute, positionGeometry, normalGeometry, vec2, vec3, float, mix, smoothstep, abs, pow, max, normalize,
  mx_noise_float, transformNormalToView, dot,
} from "three/tsl";

const BASE = new URL("./trees/textures/", import.meta.url).href;
const TRANSCODER = "https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/libs/basis/";
let ktx = null, manifest = null;
const cache = new Map();

/** The manifest (once). */
export async function treeTextureManifest() {
  return (manifest ??= await fetch(BASE + "tree_textures.json").then((r) => r.json()));
}

/** One KTX2 (cached): { tex, gpuBytes, fileBytes }. role: "colour" (sRGB) | "data". */
async function load(renderer, file, role, repeat) {
  const key = `${file}`;
  if (cache.has(key)) return cache.get(key);
  const p = (async () => {
    if (!ktx) { ktx = new KTX2Loader().setTranscoderPath(TRANSCODER); ktx.detectSupport(renderer); }
    const t = await ktx.loadAsync(BASE + file);
    t.colorSpace = role === "colour" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    t.anisotropy = repeat ? 8 : 4;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    const gpuBytes = (t.mipmaps || []).reduce((s, m) => s + (m.data?.byteLength || 0), 0);
    return { tex: t, gpuBytes };
  })();
  cache.set(key, p);
  return p;
}

/** A leaf spray: the vendor's params.leafAtlas (+ its costs). name: leaf_plane, leaf_plane_scan, leaf_beech, ... */
export async function loadLeafAtlas(renderer, name) {
  const man = await treeTextureManifest(), e = man.leaves[name];
  if (!e) throw new Error(`no leaf spray ${name}`);
  const [a, n] = await Promise.all([load(renderer, `${name}_a.ktx2`, "colour", false), load(renderer, e.n_file ?? `${name}_n.ktx2`, "data", false)]);   // (the factory seasons share one normal: n_file)
  return {
    atlas: { albedo: a.tex, normal: n.tex, mean: e.mean_albedo_linear, meanThick: e.mean_thickness, variation: 1, normalK: 0.8, transK: 1 },
    gpuBytes: a.gpuBytes + n.gpuBytes, fileBytes: e.a_ktx2_bytes + e.n_ktx2_bytes, meta: e,
  };
}

/** A bark scan: { albedo, nra, meta, gpuBytes, fileBytes }. id: Bark009, bark_platanus, chinese_hackberry_bark, Bark005. */
export async function loadBarkScan(renderer, id) {
  const man = await treeTextureManifest(), e = man.bark[id];
  if (!e) throw new Error(`no bark scan ${id}`);
  const [a, n] = await Promise.all([load(renderer, `bark_${id}_albedo.ktx2`, "colour", true), load(renderer, `bark_${id}_nra.ktx2`, "data", true)]);
  return { id, albedo: a.tex, nra: n.tex, meta: e, gpuBytes: a.gpuBytes + n.gpuBytes, fileBytes: e.albedo_ktx2_bytes + e.nra_ktx2_bytes };
}

const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/** Triplanar sample of one scan in tree space (p, n): colour, the UDN-blended normal (tree space), roughness, AO.
 *  uv per plane: X (z, -y), Y (x, z), Z (x, -y) / the repeat size; an offset per plane so the three never align. */
function triplanar(scan, p, n, sizeM) {
  const w0 = pow(abs(n), vec3(4, 4, 4)), w = w0.div(w0.x.add(w0.y).add(w0.z));
  const k = 1 / sizeM;
  const uvX = vec2(p.z, p.y.negate()).mul(k).add(vec2(0.37, 0.11)), uvY = vec2(p.x, p.z).mul(k).add(vec2(0.71, 0.53)), uvZ = vec2(p.x, p.y.negate()).mul(k);
  const aX = texture(scan.albedo, uvX), aY = texture(scan.albedo, uvY), aZ = texture(scan.albedo, uvZ);
  const nX = texture(scan.nra, uvX), nY = texture(scan.nra, uvY), nZ = texture(scan.nra, uvZ);
  const col = aX.rgb.mul(w.x).add(aY.rgb.mul(w.y)).add(aZ.rgb.mul(w.z));
  const rough = nX.b.mul(w.x).add(nY.b.mul(w.y)).add(nZ.b.mul(w.z));
  const ao = nX.a.mul(w.x).add(nY.a.mul(w.y)).add(nZ.a.mul(w.z));
  // UDN: each plane's tangent normal added to the geometry normal's matching components (image up = +y on X / Z,
  // = -z on Y: our uv runs v down the image)
  const t = (s) => vec2(s.r.mul(2).sub(1), s.g.mul(2).sub(1));
  const tX = t(nX), tY = t(nY), tZ = t(nZ);
  const nXw = vec3(n.x, tX.y.add(n.y), tX.x.add(n.z));
  const nYw = vec3(tY.x.add(n.x), n.y, tY.y.negate().add(n.z));
  const nZw = vec3(tZ.x.add(n.x), tZ.y.add(n.y), n.z);
  const nrm = normalize(nXw.mul(w.x).add(nYw.mul(w.y)).add(nZw.mul(w.z)));
  return { col, rough, ao, nrm };
}

/**
 * A def.bark for makeSpecies from scans. opts = {
 *   scans: [main, foot?] (loadBarkScan results), target: the species' mean bark colour (linear), hueK (0.5),
 *   species: "plane" | "beech" (its macro variation), normalK (1) }
 */
export function scanBark({ scans, target, hueK = 0.5, species, normalK = 1 }) {
  return (m) => {
    const p = positionGeometry, n = normalize(normalGeometry), level = attribute("bark", "vec4").w;
    const grade = (s) => {
      const mean = s.meta.mean_albedo_linear, gL = lum(target) / Math.max(lum(mean), 1e-4);
      const g = [0, 1, 2].map((i) => gL + ((target[i] / Math.max(mean[i], 1e-4)) - gL) * hueK);
      return vec3(...g);
    };
    const A = triplanar(scans[0], p, n, scans[0].meta.size_m);
    let col = A.col.mul(grade(scans[0])), rough = A.rough, ao = A.ao, nrm = A.nrm;
    // the macro variation: large soft zones of value and warmth (1.7 m and 0.45 m), so the repeat never shows
    const q = p.mul(0.6), z1 = mx_noise_float(q.add(3.0)), z2 = mx_noise_float(p.mul(2.2).add(7.0));
    col = col.mul(z1.mul(0.16).add(z2.mul(0.1)).add(1)).mul(mix(vec3(0.94, 1.0, 1.08), vec3(1.06, 1.0, 0.9), smoothstep(-0.4, 0.4, mx_noise_float(q.mul(0.7).add(19.0)))));
    if (species === "plane") {
      // the old bark: olive-brown plates still on in big zones, more of them low down (as the procedural plane bark);
      // the plates follow the SCAN's own darker flakes (its luminance under its mean), so their edges are the scan's
      const sm = scans[0].meta.mean_albedo_linear, lumN = dot(A.col, vec3(0.2126, 0.7152, 0.0722)).div(lum(sm));
      col = col.mul(pow(max(lumN, 0.05), 0.5));                               // more of the scan's own contrast
      const zone = smoothstep(-0.25, 0.2, mx_noise_float(p.mul(vec3(1.3, 0.7, 1.3)).add(41.0)).add(smoothstep(6.0, 1.0, p.y).mul(0.4))).mul(smoothstep(1.5, 0.5, level));
      const flake = smoothstep(1.04, 0.9, lumN.add(mx_noise_float(p.mul(9.0)).mul(0.06)));
      col = mix(col, col.mul(vec3(0.6, 0.64, 0.4)), zone.mul(flake).mul(0.75));
    }
    if (scans[1]) {
      // a second scan for the foot (the plane: the old, dark, flaking bark of old trees; the beech: a mossy, algae-green
      // scan), with a ragged boundary
      const B = triplanar(scans[1], p, n, scans[1].meta.size_m);
      const top = species === "plane" ? 2.4 : 1.6;
      const foot = smoothstep(top, top - 1.4, p.y.add(mx_noise_float(p.mul(vec3(3.0, 1.2, 3.0))).mul(0.6))).mul(smoothstep(0.5, -0.5, level).mul(2).min(1));
      col = mix(col, B.col.mul(grade(scans[1])).mul(species === "plane" ? 0.75 : 0.85), foot);
      rough = mix(rough, B.rough, foot); ao = mix(ao, B.ao, foot); nrm = normalize(mix(nrm, B.nrm, foot));
    }
    if (species === "plane") {
      col = mix(col, col.mul(1.25), smoothstep(0.5, 1.5, level));          // the limbs: paler, younger bark
      col = col.mul(smoothstep(-0.5, 0.5, p.y).mul(0.3).add(0.7));           // earth-darkened at the very bottom
    } else {
      // the beech: green algae toward the foot and on the damp side; darker, damp roots; paler limbs
      const side = smoothstep(-0.2, 0.8, normalGeometry.x.mul(0.6).add(normalGeometry.z.mul(-0.8)));
      const algae = smoothstep(4.0, 0.3, p.y).max(side.mul(0.55)).mul(smoothstep(-0.2, 0.4, mx_noise_float(p.mul(2.1).add(9.0))));
      col = mix(col, col.mul(vec3(0.75, 1.0, 0.55)), algae.mul(0.6));
      col = col.mul(smoothstep(-0.5, 0.6, p.y).mul(0.4).add(0.6));
      col = mix(col, col.mul(1.08), smoothstep(0.5, 1.5, level));
    }
    col = col.mul(mix(float(1), ao, 0.6));      // (the scan's AO in the colour: makeSpecies copies colour / normal / roughness to the far bark)
    m.colorNode = col;
    // the normal: tree space -> world (the instance's turn, treeXf) -> view
    const xf = attribute("treeXf", "vec3");
    const nT = normalize(mix(n, nrm, normalK));
    m.normalNode = transformNormalToView(vec3(xf.x.mul(nT.x).add(xf.y.mul(nT.z)), nT.y, xf.x.mul(nT.z).sub(xf.y.mul(nT.x)))).normalize();
    m.roughnessNode = rough.mul(0.85).add(0.12);
    m.needsUpdate = true;
  };
}
