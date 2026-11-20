// THIN BARS' CARD ATLAS as a texture (claude/jitter, docs/JITTER.md): the three side of viewer/thinBars.js (pure).
import * as THREE from "three/webgpu";

/** a thinBars.js packAtlas() result as a DataTexture with its own box mips (each level the exact mean of the one above:
 *  the bars' share of the footprint, for blending), linear data, trilinear + anisotropic, never regenerated */
export function atlasTexture(atlas, name = "thin-bar cards") {
  const tex = new THREE.DataTexture(atlas.levels[0].data, atlas.width, atlas.height, THREE.RGBAFormat);
  tex.name = name;
  tex.mipmaps = atlas.levels;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
