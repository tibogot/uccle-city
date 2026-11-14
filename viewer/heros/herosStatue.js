// SQUARE DES HEROS: THE BRONZE GROUP AS A SWAPPABLE SLOT (docs/landmarks/HEROS.md "statue slot"). The monument is scripted
// (tools/blender/heros.py); its bronze group (the winged Victory lifting the dying soldier) can be replaced by a dropped-in
// model (the owner's, made in Tripo AI from his own photos) without touching the rest:
//
//   models/heros/statue_slot.json   always there: {"glb": null} = our scripted bronze (inside heros.glb); else the files
//                                   written by tools/blender/heros_statue_slot.py from ANY source model:
//   models/heros/statue.glb         nodes Statue_LOD0 / _LOD1 / _LOD2 (meshopt LODs of the source), POSITION, NORMAL,
//                                   TANGENT, TEXCOORD_0; metres, +Y up, the group's FRONT toward +Z, the pivot (0, 0, 0) =
//                                   the centre of the statue's base standing on the obelisk's cap (the rock's foot);
//   models/heros/statue_normal.png  the source's detail baked to LOD0's UVs (tangent space, OpenGL +Y), shared by the LODs;
//   models/heros/statue_ao.png      ambient occlusion baked on LOD0 (the patina: dark in the folds, gold on the raised parts).
//
// Here: loaded with the monument (?herostatue=ours forces our scripted bronze), dressed in OUR bronze material by the slot
// name (bronze_gilt: herosModel.js bronzeMaterial, its occlusion from the AO map, the normal map on top; the rock, when the
// source's faces under the slot's rock height were split off by the tool, in the stone grey of our rock), three LODs with
// the dithered cross-fade (lodFade.js through setLodFades), and an invisible collider mesh (LOD2) for heroColliders.js.
import * as THREE from "three/webgpu";
import { texture, uv, normalMap, float, mix } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const qs = new URLSearchParams(location.search);
/** ?herostatue=ours: our scripted bronze even when a statue slot model is there (A/B) */
export const FORCE_OURS = qs.get("herostatue") === "ours";

/** null = our scripted bronze; else { info, lods: [geometry x3], material, rockMaterial, tris, make() } */
export async function loadStatueSlot(base, bronzeMaterial, stoneOf) {
  if (FORCE_OURS) return null;
  const info = await fetch(base + "statue_slot.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!info?.glb) return null;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const texL = new THREE.TextureLoader();
  const [gltf, nrm, ao] = await Promise.all([
    loader.loadAsync(base + info.glb),
    info.normal ? texL.loadAsync(base + info.normal) : null,
    info.ao ? texL.loadAsync(base + info.ao) : null,
  ]);
  for (const t of [nrm, ao]) if (t) { t.flipY = false; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; }    // (glTF UVs)
  const lods = [[], [], []];
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    let k = -1;
    for (let p = o; p && k < 0; p = p.parent) { const m = /_LOD(\d)$/i.exec(p.name || ""); if (m) k = +m[1]; }
    if (k < 0 || k > 2) return;
    o.geometry.userData.shared = true;
    o.geometry.computeBoundingSphere();
    lods[k].push({ geometry: o.geometry, rock: /rock|stone/i.test(o.material?.name || "") });
  });
  if (!lods[0].length) { console.warn("[heros] statue slot: no Statue_LOD0 node in", info.glb); return null; }
  for (let k = 1; k < 3; k++) if (!lods[k].length) lods[k] = lods[k - 1];
  const occ = ao ? texture(ao, uv()).r : float(1);
  const material = bronzeMaterial(occ, false, nrm ? normalMap(texture(nrm, uv())) : null);
  material.name = "heros statue bronze_gilt"; material.userData.shared = true;
  const rockMaterial = stoneOf(occ, nrm ? normalMap(texture(nrm, uv())) : null);
  const tris = lods.map((l) => l.reduce((s, e) => s + (e.geometry.index ? e.geometry.index.count : e.geometry.attributes.position.count) / 3, 0));
  /** the statue group (in the monument's local frame), its 3 levels, and an invisible collider (LOD2) */
  const make = () => {
    const group = new THREE.Group(); group.name = "heros_statue";
    group.position.fromArray(info.base_local ?? [0, 0, 0]);
    group.rotation.y = Math.PI / 2;                    // the file's front +Z -> the monument's front +X (u: south)
    const levels = lods.map((l, k) => {
      const g = new THREE.Group(); g.name = `heros_statue_lod${k}`;
      for (const e of l) {
        const mat = e.rock ? rockMaterial : material;
        const m = new THREE.Mesh(e.geometry, mat); m.name = e.rock ? "heros statue rock" : "heros statue";
        m.userData.base = mat; m.castShadow = true; m.receiveShadow = true;
        g.add(m);
      }
      group.add(g);
      return g;
    });
    // the collider: LOD2's meshes, invisible, placed as the group (they go into the monument's "_lod0" group, which
    // heroColliders.js reads; setLodFades only swaps their material)
    const collider = lods[2].map((e) => {
      const m = new THREE.Mesh(e.geometry, material); m.visible = false; m.name = "heros statue collider"; m.userData.base = material;
      m.position.copy(group.position); m.rotation.copy(group.rotation);
      return m;
    });
    return { group, levels, collider };
  };
  return { info, lods, material, rockMaterial, tris, make, glbBytes: info.bytes };
}

/** the statue's three levels' (shown, fades) at distance d (m): LOD0 -> 1 at info.lod_m[0], 1 -> 2 at lod_m[1], each
 *  with a dithered band (half-width band_m); fades as lodFade's objectFade: [0, 1] fading in, [2, 3] fading out */
export function statueLodState(d, info) {
  const [a, b] = info.lod_m ?? [40, 110];
  const [wa, wb] = info.band_m ?? [6, 12];
  const t1 = THREE.MathUtils.smoothstep(d, a - wa, a + wa), t2 = THREE.MathUtils.smoothstep(d, b - wb, b + wb);
  const shown = [t1 < 1, t1 > 0 && t2 < 1, t2 > 0];
  const fades = [2 + t1, t2 > 0 ? 2 + t2 : t1, t2];
  return { shown, fades };
}
