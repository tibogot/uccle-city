// THE HORIZON RING (?horizon=1, docs/HORIZON.md): the real landscape round Uccle, 32 x 32 km, beyond the streamed
// tiles: the Senne valley, the Linkebeek / Rhode / Forest hills, the Sonian forest, Brabant's fields, in the haze.
//
// ONE static mesh (data/horizon/horizon.bin: a 20 m DTM grid simplified by tools/terrain/build_horizon_mesh.mjs, error
// 0.5 m at the city's edge growing to a few m in the haze), static buffers, one draw, no shadows. Colour: two
// orthophoto mosaics (inner = the city + 1 km at 5 m/px, outer = the 32 km square at 15.6 m/px). Fog: the scene's
// fogNode, like every other material.
//
// Hand-over to the tiles (smooth LOD, joins rule): the ring runs UNDER the whole city too, and every pixel of it that
// falls inside a tile the viewer is drawing is dropped by a mask: a 15 x 12 table (one cell per grid tile) with the
// tile's current fade, read with the SAME screen dither as lodFade.js. A tile fading in over 0.9 s keeps the pixels
// n < f, the ring keeps n >= f: every pixel is drawn by exactly one of them (no hole, no double layer, no pop). Along
// the edge of the drawn tiles the ring is kept EDGE m into the tile when the cell across the edge is not drawn: it
// sits 0.6 m under the tile's ground (the far tiles sit 0.3 m under), so it closes the open edge seen from outside and
// stays hidden from above.
import * as THREE from "three/webgpu";
import { Fn, texture, textureLoad, positionWorld, vec2, vec3, ivec2, float, int, select, smoothstep, mix, uniform } from "three/tsl";
import { ditherNoise } from "./lodFade.js";

const TILE = 500, I0 = -6, J0 = -4, NI = 15, NJ = 12;   // pipeline/common.py I_RANGE / J_RANGE
const DROP = 0.6;           // m under the DTM (the far tiles: 0.3)
const EDGE = 3.0;           // m: the ring stays this far inside a drawn tile along an edge whose other side is not drawn

/** Load and build. Returns { mesh, update(tiles), dispose, info } or null when the data is missing. */
export async function createHorizon({ scene, base = new URL("../data/horizon/", import.meta.url) } = {}) {
  const get = async (p, bin) => { const r = await fetch(new URL(p, base)); if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return bin ? r.arrayBuffer() : r.json(); };
  const tl = new THREE.TextureLoader();
  const loadTex = (p) => tl.loadAsync(new URL(p, base).href).then((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; });
  const [hdr, bin, texIn, texOut] = await Promise.all([get("heights.json"), get("horizon.bin", true), loadTex("colour_inner.jpg"), loadTex("colour_outer.jpg")]);
  const dv = new DataView(bin);
  if (dv.getUint32(0, true) !== 0x314e5a48) throw new Error("horizon.bin: bad magic");
  const V = dv.getUint32(4, true), T = dv.getUint32(8, true);
  const x0 = dv.getFloat32(12, true), z0 = dv.getFloat32(16, true), step = dv.getFloat32(20, true), hb = dv.getFloat32(24, true);
  const pos = new Float32Array(V * 3), nrm = new Float32Array(V * 3);
  for (let i = 0, p = 28; i < V; i++, p += 10) {
    pos[i * 3] = x0 + dv.getUint16(p, true) * step;
    pos[i * 3 + 1] = dv.getUint16(p + 4, true) / 100 + hb - DROP;
    pos[i * 3 + 2] = z0 + dv.getUint16(p + 2, true) * step;
    const nx = dv.getInt8(p + 6) / 127, nz = dv.getInt8(p + 7) / 127;
    nrm[i * 3] = nx; nrm[i * 3 + 1] = Math.sqrt(Math.max(0, 1 - nx * nx - nz * nz)); nrm[i * 3 + 2] = nz;
  }
  const idx = new Uint32Array(bin, 28 + V * 10, T * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  geo.setIndex(new THREE.BufferAttribute(idx.slice(), 1));
  geo.computeBoundingSphere();

  // the tile mask: per grid tile (A, B): the ring keeps a pixel when A <= n < B (n = the fade dither)
  const maskData = new Float32Array(NI * NJ * 4);
  for (let k = 0; k < NI * NJ; k++) { maskData[k * 4] = 0; maskData[k * 4 + 1] = 1; }
  const maskTex = new THREE.DataTexture(maskData, NI, NJ, THREE.RGBAFormat, THREE.FloatType);
  maskTex.minFilter = maskTex.magFilter = THREE.NearestFilter;
  maskTex.needsUpdate = true;

  const ib = hdr.inner, ob = hdr.outer;
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.95, metalness: 0 });
  m.name = "horizon";
  const xz = positionWorld.xz;
  const uvIn = vec2(xz.x.sub(ib.x0).div(ib.x1 - ib.x0), float(1).sub(xz.y.sub(ib.z0).div(ib.z1 - ib.z0)));
  const uvOut = vec2(xz.x.sub(ob.x0).div(ob.x1 - ob.x0), float(1).sub(xz.y.sub(ob.z0).div(ob.z1 - ob.z0)));
  // inner photo inside its box, faded to the outer one over its last 300 m
  const edgeIn = xz.x.sub(ib.x0).min(float(ib.x1).sub(xz.x)).min(xz.y.sub(ib.z0)).min(float(ib.z1).sub(xz.y));
  const wIn = smoothstep(float(0), float(300), edgeIn);
  m.colorNode = mix(texture(texOut, uvOut).rgb, texture(texIn, uvIn).rgb, wIn);
  m.maskNode = Fn(() => {
    const n = ditherNoise();
    const fi = xz.x.div(TILE), fj = xz.y.div(TILE);
    const ci = fi.floor(), cj = fj.floor();
    const keepAt = (di, dj) => {
      const i = ci.add(di - I0), j = cj.add(dj - J0);
      const inGrid = i.greaterThanEqual(0).and(i.lessThan(NI)).and(j.greaterThanEqual(0)).and(j.lessThan(NJ));
      const ab = textureLoad(maskTex, ivec2(int(i.clamp(0, NI - 1)), int(j.clamp(0, NJ - 1))));
      return inGrid.not().or(n.greaterThanEqual(ab.x).and(n.lessThan(ab.y)));
    };
    const ex = float(EDGE / TILE);
    const u = fi.sub(ci), v = fj.sub(cj);
    // here, or near an edge whose other side the ring has to show (the tile there is not drawn for this pixel)
    return keepAt(0, 0)
      .or(u.lessThan(ex).and(keepAt(-1, 0))).or(u.greaterThan(float(1).sub(ex)).and(keepAt(1, 0)))
      .or(v.lessThan(ex).and(keepAt(0, -1))).or(v.greaterThan(float(1).sub(ex)).and(keepAt(0, 1)));
  })();
  const mesh = new THREE.Mesh(geo, m);
  mesh.name = "horizon-ring";
  mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.renderOrder = 10;                 // after the city's opaque meshes: most of its pixels then fail the depth test
  mesh.matrixAutoUpdate = false;
  mesh.userData.noFade = true;
  scene.add(mesh);
  // its data's credits on screen (docs/DATA_LICENCES.md): SPW orthophotos (CC BY 4.0), Copernicus DEM
  const cr = document.getElementById("credits");
  if (cr && !cr.dataset.horizon) { cr.dataset.horizon = "1"; cr.append(" · SPW (CC BY 4.0) · Copernicus DEM © DLR / Airbus, EU / ESA"); }

  /** tiles: [{ name, group }] currently in the scene (full tiles: their first layer group; far tiles: their group). */
  const cellOf = (name) => { const i = "ABCDEFGHIJKLMNO".indexOf(name[0]), j = +name.slice(1) - 1; return i >= 0 && j >= 0 && j < NJ ? j * NI + i : -1; };
  const next = new Float32Array(NI * NJ * 2);
  let changes = 0;
  const update = (tiles) => {
    for (let k = 0; k < NI * NJ; k++) { next[k * 2] = 0; next[k * 2 + 1] = 1; }
    for (const { name, group } of tiles) {
      const k = cellOf(name);
      if (k < 0 || !group?.visible || !group.parent) continue;
      const f = group.userData.fade ?? 1;
      if (f > 1.5) next[k * 2 + 1] = Math.min(next[k * 2 + 1], f - 2);      // fading out: it keeps n >= f - 2
      else next[k * 2] = Math.max(next[k * 2], Math.min(1, f));              // fading in / drawn: it keeps n < f
    }
    let diff = false;
    for (let k = 0; k < NI * NJ; k++) {
      if (maskData[k * 4] !== next[k * 2] || maskData[k * 4 + 1] !== next[k * 2 + 1]) { diff = true; maskData[k * 4] = next[k * 2]; maskData[k * 4 + 1] = next[k * 2 + 1]; }
    }
    if (diff) { maskTex.needsUpdate = true; changes++; }      // 2.9 KB, only while tiles stream / fade
  };
  return {
    mesh, update,
    info: () => `horizon ring: ${V} vertices, ${T} triangles, ${(bin.byteLength / 1e6).toFixed(2)} MB mesh, colour ${texIn.image.width}x${texIn.image.height} + ${texOut.image.width}x${texOut.image.height}, mask uploads ${changes}`,
    dispose: () => { mesh.removeFromParent(); geo.dispose(); m.dispose(); texIn.dispose(); texOut.dispose(); maskTex.dispose(); },
  };
}
