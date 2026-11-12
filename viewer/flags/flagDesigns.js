// FLAG DESIGNS, drawn in code on a canvas (no image files): sRGB colour textures, 2:3 (the shape flown on public
// buildings; Belgium's legal 13:15 is offered too). Sources (checked 2026-11-10):
//   - Belgium: vertical black / yellow / red, black at the hoist (Constitution art. 193; colours per the federal
//     protocol: yellow Pantone 116, red 032) -> #000000 / #FDDA24 / #EF3340.
//   - European Union: 12 gold five-pointed stars, upright, on a circle of radius 1/3 of the height, each star's outer
//     radius 1/18 of the height, on reflex blue (#003399 / #FFCC00) (EU graphical specifications).
//   - Uccle / Ukkel: vertically divided light blue - white, blue at the hoist (Flags of the World, be-bxluc, after
//     the municipality; colours from its arms). The exact blue is not specified: a mid light blue is used.
import * as THREE from "three/webgpu";

export const FLAG_DESIGNS = {
  belgium: { name: "Belgium", aspect: 1.5, draw: (g, w, h) => {
    const c = ["#000000", "#FDDA24", "#EF3340"];
    c.forEach((col, k) => { g.fillStyle = col; g.fillRect(Math.round((k * w) / 3), 0, Math.ceil(w / 3) + 1, h); });
  } },
  belgium_legal: { name: "Belgium (legal 13:15)", aspect: 15 / 13, draw: (g, w, h) => FLAG_DESIGNS.belgium.draw(g, w, h) },
  eu: { name: "European Union", aspect: 1.5, draw: (g, w, h) => {
    g.fillStyle = "#003399"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#FFCC00";
    const cx = w / 2, cy = h / 2, R = h / 3, r = h / 18;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      star(g, cx + Math.sin(a) * R, cy - Math.cos(a) * R, r);
    }
  } },
  uccle: { name: "Uccle / Ukkel", aspect: 1.5, draw: (g, w, h) => {
    g.fillStyle = "#5aa7dd"; g.fillRect(0, 0, Math.ceil(w / 2), h);
    g.fillStyle = "#ffffff"; g.fillRect(Math.floor(w / 2), 0, Math.ceil(w / 2), h);
  } },
  test: { name: "UV test", aspect: 1.5, draw: (g, w, h) => {
    for (let j = 0; j < 8; j++) for (let i = 0; i < 12; i++) { g.fillStyle = (i + j) % 2 ? "#e8e8e8" : "#3a7bd5"; g.fillRect((i * w) / 12, (j * h) / 8, w / 12 + 1, h / 8 + 1); }
    g.fillStyle = "#d33"; g.fillRect(0, 0, w * 0.04, h);
  } },
};

/** an upright five-pointed star (outer radius r) */
function star(g, x, y, r) {
  const ri = r * 0.381966;                       // inner radius of a regular pentagram
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2, rr = k % 2 ? ri : r;
    g[k ? "lineTo" : "moveTo"](x + Math.sin(a) * rr, y - Math.cos(a) * rr);
  }
  g.closePath(); g.fill();
}

const cache = new Map();
/** the design as a texture (u along the fly from the hoist, v up): cached per key */
export function flagTexture(key, renderer, px = 512) {
  if (cache.has(key)) return cache.get(key);
  const d = FLAG_DESIGNS[key] ?? FLAG_DESIGNS.test;
  const w = px, h = Math.round(px / d.aspect), cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  d.draw(g, w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer?.getMaxAnisotropy?.() ?? 8;
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(key, tex);
  return tex;
}
