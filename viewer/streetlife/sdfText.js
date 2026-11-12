// SIGNED-DISTANCE TEXT LABELS for the street-life layer (pure JS: the tile worker and the main thread).
//
// three.js r187 has no SDF / MSDF text (TextGeometry extrudes glyphs: thousands of triangles per sign; troika-three-text
// is WebGL-only); Mr.doob's slop-newyork draws canvas text into an alpha atlas and samples it with an explicit mip level
// that fades the ink out before it turns sub-pixel (his js/tsl-materials.js:511-565, see vendor/slop-street/ORIGIN.md).
// We keep his idea (one canvas-drawn atlas, a footprint-driven fade) and store a SIGNED DISTANCE instead of the
// coverage, so a 40 px row stays crisp at 1 m from a fascia (magnified SDF edges stay sharp) and mips average distances
// (no sparkle when minified; the shader fades the ink before the strokes go sub-pixel).
//
// A label is one or more LINES of text in one style, drawn by the browser's own text engine (kerning, accents, any
// glyph the data has: "é", "&", "ü"), ROW px per line, then turned into a distance field by the exact Euclidean
// distance transform (Felzenszwalb & Huttenlocher 2012, the 1D lower-envelope pass in x then y; the same approach as
// Mapbox's TinySDF, BSD-2, with the anti-aliased edge kept as a sub-pixel offset). Value 0.5 = the glyph edge,
// 1 = RADIUS px inside, 0 = RADIUS px outside.

export const ROW = 64;            // px per text line in the atlas
export const RADIUS = 8;          // px of distance either side of the edge
export const FONT_PX = 40;        // nominal font size: cap height ~28 px, room for accents and descenders
export const MAX_W = 2048;        // px: longer labels are drawn smaller (same row height)

/** The styles signs use. Fonts are the system's (Arial / Georgia / Trebuchet / Verdana are on every desktop browser). */
export const STYLES = {
  plate: { font: "700 {px}px Arial, Helvetica, sans-serif", px: 40, track: 0.02 },
  plateSmall: { font: "600 {px}px Arial, Helvetica, sans-serif", px: 34, track: 0.03 },
  number: { font: "700 {px}px Arial, Helvetica, sans-serif", px: 46, track: 0 },
  stop: { font: "700 {px}px Arial, Helvetica, sans-serif", px: 40, track: 0.01 },
  line: { font: "800 {px}px Arial, Helvetica, sans-serif", px: 44, track: 0 },
  shopSans: { font: "700 {px}px Arial, Helvetica, sans-serif", px: 40, track: 0.02 },
  shopSerif: { font: "700 {px}px Georgia, 'Times New Roman', serif", px: 40, track: 0.01 },
  shopItalic: { font: "italic 700 {px}px Georgia, 'Times New Roman', serif", px: 40, track: 0 },
  shopHumanist: { font: "700 {px}px 'Trebuchet MS', Verdana, sans-serif", px: 40, track: 0.02 },
  brand: { font: "800 {px}px Arial, Helvetica, sans-serif", px: 42, track: 0.03 },
  board: { font: "700 {px}px Arial, Helvetica, sans-serif", px: 36, track: 0.02 },
};
export const SHOP_STYLES = ["shopSans", "shopSerif", "shopHumanist", "shopItalic"];

let canvas = null, ctx = null;
function context(w, h) {
  if (!canvas || canvas.width < w || canvas.height < h) {
    canvas = new OffscreenCanvas(Math.max(w, canvas?.width || 0), Math.max(h, canvas?.height || 0));
    ctx = canvas.getContext("2d", { willReadFrequently: true });
  }
  return ctx;
}

/** Measure a label: { w, h, px } (px = the font size used, smaller when the widest line would pass MAX_W). */
export function measureLabel(lines, styleName) {
  const st = STYLES[styleName] || STYLES.shopSans;
  const c = context(64, 64);
  let px = st.px, wide = 0;
  for (let pass = 0; pass < 2; pass++) {
    c.font = st.font.replace("{px}", px);
    c.letterSpacing = `${(st.track * px).toFixed(1)}px`;
    wide = Math.max(...lines.map((l) => c.measureText(l).width));
    if (wide + 2 * RADIUS + 4 <= MAX_W) break;
    px = Math.floor(px * (MAX_W - 2 * RADIUS - 4) / wide);
  }
  return { w: Math.min(MAX_W, Math.ceil(wide) + 2 * RADIUS + 4), h: ROW * lines.length, px, ink: wide };
}

const INF = 1e20;
function edt1d(grid, offset, stride, length, f, v, z) {
  v[0] = 0; z[0] = -INF; z[1] = INF; f[0] = grid[offset];
  for (let q = 1, k = 0, s = 0; q < length; q++) {
    f[q] = grid[offset + q * stride];
    const q2 = q * q;
    do { const r = v[k]; s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2; } while (s <= z[k] && --k > -1);
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k], qr = q - r;
    grid[offset + q * stride] = f[r] + qr * qr;
  }
}
function edt(data, w, h, f, v, z) {
  for (let x = 0; x < w; x++) edt1d(data, x, w, h, f, v, z);
  for (let y = 0; y < h; y++) edt1d(data, y * w, 1, w, f, v, z);
}

/** Draw + distance-transform one label: { w, h, data: Uint8Array(w * h) } (row 0 = top). */
export function labelSDF(lines, styleName, m = measureLabel(lines, styleName)) {
  const st = STYLES[styleName] || STYLES.shopSans;
  const { w, h, px } = m;
  const c = context(w, h);
  c.clearRect(0, 0, w, h);
  c.font = st.font.replace("{px}", px);
  c.letterSpacing = `${(st.track * px).toFixed(1)}px`;
  c.fillStyle = "#fff";
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  // one baseline per line: the cap height (~0.72 em) centred in the row, the same for every label of a style
  lines.forEach((l, i) => c.fillText(l, w / 2, i * ROW + ROW / 2 + px * 0.36));
  const img = c.getImageData(0, 0, w, h).data;
  const n = w * h, outer = new Float64Array(n), inner = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = img[i * 4 + 3] / 255;
    if (a >= 1) { outer[i] = 0; inner[i] = INF; }
    else if (a <= 0) { outer[i] = INF; inner[i] = 0; }
    else { const d = 0.5 - a; outer[i] = d > 0 ? d * d : 0; inner[i] = d < 0 ? d * d : 0; }
  }
  const L = Math.max(w, h), f = new Float64Array(L), v = new Uint16Array(L), z = new Float64Array(L + 1);
  edt(outer, w, h, f, v, z);
  edt(inner, w, h, f, v, z);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const d = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);
    out[i] = Math.max(0, Math.min(255, Math.round(255 * (0.5 - d / (2 * RADIUS)))));
  }
  return { w, h, data: out };
}

/** Shelf packer for the shared atlas (main thread): fixed-height shelves per label height, left to right. */
export class ShelfPacker {
  constructor(W, H) { this.W = W; this.H = H; this.shelves = []; this.top = 0; }
  add(w, h) {
    for (const s of this.shelves) if (s.h === h && s.x + w + 2 <= this.W) { const x = s.x; s.x += w + 2; return { x, y: s.y }; }
    if (this.top + h > this.H) return null;
    const s = { y: this.top, h, x: w + 2 };
    this.top += h + 2;
    this.shelves.push(s);
    return { x: 0, y: s.y };
  }
  get used() { return this.top / this.H; }
}
