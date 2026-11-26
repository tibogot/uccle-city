// THE EMBASSY FLAG ATLAS at runtime (rule embassy-flags): viewer/flags/atlas/embassy_flags.png, built by
// tools/flags/build_atlas.mjs from the national flags' Wikimedia Commons SVGs (data/flags/embassy_sources.json: every
// one public domain, its page and author recorded), with its layout (embassy_flags.json). One texture for every
// embassy flag: they share ONE material and ONE draw (viewer/embassyFlags.js), each instance its cell. The flag fills a
// cell's inner part stretched to the cell (the cloth carries the flag's real proportions, cells[key].aspect, so the
// texels come back square); the padding round it repeats the edge, so mipmaps never bleed a neighbour in.
// u along the fly from the hoist, v up (as flagDesigns.js flagTexture).
import * as THREE from "three/webgpu";
import { float, vec2, floor, mod } from "three/tsl";

const BASE = new URL("./atlas/", import.meta.url);
let loading = null;

/** -> { map, layout, keys, cellOf(key), aspectOf(key), uvOf(cellNode, uvNode) } (loaded once) */
export function loadFlagAtlas(renderer) {
  return (loading ??= (async () => {
    const layout = await (await fetch(new URL("embassy_flags.json", BASE))).json();
    const map = await new THREE.TextureLoader().loadAsync(new URL("embassy_flags.png", BASE).href);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = renderer?.getMaxAnisotropy?.() ?? 8;
    map.generateMipmaps = true; map.minFilter = THREE.LinearMipmapLinearFilter;
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    map.name = "flag-atlas";
    const { cw, ch, pad, cols, width: W, height: H, cells } = layout, keys = Object.keys(cells);
    const fx = (cw - 2 * pad) / W, fy = (ch - 2 * pad) / H;
    /** the atlas uv of the cloth's uv in cell `cellN` (a float node); flipY: canvas row r is v from 1 - (r + 1) ch / H */
    const uvOf = (cellN, uvN) => {
      const cell = floor(float(cellN).add(0.5)), c = mod(cell, cols), r = floor(cell.div(cols));
      return vec2(c.mul(cw / W).add(pad / W).add(uvN.x.mul(fx)), float(1).sub(r.add(1).mul(ch / H)).add(pad / H).add(uvN.y.mul(fy)));
    };
    return { map, layout, keys, uvOf, cellOf: (k) => cells[k]?.i ?? -1, aspectOf: (k) => cells[k]?.aspect ?? 1.5 };
  })());
}
