// A FLAG DESIGN ATLAS: several flagDesigns.js designs drawn once into one canvas texture (cells of 3:2), so many flags
// with different designs share ONE material and ONE draw (viewer/embassyFlags.js: the embassy flags). Each cell is the
// design drawn over the cell plus a padding (the padding repeats the design's edge colours, so mipmaps never bleed a
// neighbour's colour in); the cloth samples the inner part. u along the fly from the hoist, v up (as flagTexture).
import * as THREE from "three/webgpu";
import { float, vec2, floor, mod } from "three/tsl";
import { FLAG_DESIGNS } from "./flagDesigns.js";

const CW = 256, CH = 176, PAD = 6;           // a cell (px) incl. its padding: the inner part 244 x 164 (1.49:1)

/** keys: flagDesigns.js keys -> { map, cellOf(key), uvOf(cellNode, uvNode), keys, cols, rows } */
export function flagAtlas(keys, renderer) {
  const cols = Math.min(4, Math.max(1, keys.length)), rows = Math.max(1, Math.ceil(keys.length / cols));
  const W = cols * CW, H = rows * CH, cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  keys.forEach((k, i) => {
    const d = FLAG_DESIGNS[k] ?? FLAG_DESIGNS.test, c = i % cols, r = Math.floor(i / cols);
    g.save();
    g.beginPath(); g.rect(c * CW, r * CH, CW, CH); g.clip();
    // the design over the whole cell (inner + padding): the inner part is what the cloth shows
    g.translate(c * CW, r * CH);
    d.draw(g, CW, CH);
    g.restore();
  });
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = renderer?.getMaxAnisotropy?.() ?? 8;
  map.generateMipmaps = true; map.minFilter = THREE.LinearMipmapLinearFilter;
  map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
  map.name = "flag-atlas";
  const fx = (CW - 2 * PAD) / W, fy = (CH - 2 * PAD) / H;
  /** the atlas uv of `uvN` (the cloth's 0..1 uv, v up) in cell `cellN` (a float node); the canvas is flipped (flipY):
   *  canvas row r is v from 1 - (r + 1) * CH / H up */
  const uvOf = (cellN, uvN) => {
    const cell = floor(float(cellN).add(0.5)), c = mod(cell, cols), r = floor(cell.div(cols));
    return vec2(c.mul(CW / W).add(PAD / W).add(uvN.x.mul(fx)), float(1).sub(r.add(1).mul(CH / H)).add(PAD / H).add(uvN.y.mul(fy)));
  };
  return { map, keys, cols, rows, cellOf: (k) => keys.indexOf(k), uvOf };
}
