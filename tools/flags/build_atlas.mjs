// THE EMBASSY FLAG ATLAS (rule embassy-flags): every source of data/flags/embassy_sources.json (the Wikimedia Commons
// SVG of the national flag, in data/raw/flags/commons, its sha1 checked) rasterised by tools/flags/svgRaster.mjs
// (deterministic pure JS) into one cell of the atlas each, then the atlas written as a PNG with its layout:
//   viewer/flags/atlas/embassy_flags.png   CW x CH cells (COLS a row), the flag stretched over the cell's inner part
//                                          (the cloth carries the flag's real proportions: the texels come back square),
//                                          PAD px round it repeating the edge (no neighbour bleeds into a mipmap)
//   viewer/flags/atlas/embassy_flags.json  { cw, ch, pad, cols, rows, width, height, png_sha256, cells: { key: { i,
//                                          aspect, title, page, sha1, licence, author } } }
//   node tools/flags/build_atlas.mjs [--check]   (--check: build in memory, compare with the committed PNG, exit 1 if not equal)
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderSvg } from "./svgRaster.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const CW = 512, CH = 320, PAD = 8, COLS = 4;
const SRC = path.join(ROOT, "data/flags/embassy_sources.json"), OUT = path.join(ROOT, "viewer/flags/atlas");

/** a PNG (RGB, 8 bit, filter 0 per row, zlib level 9): byte-identical for the same pixels */
export function encodePng(rgb, W, H) {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; rgb.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3); }
  const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

export function buildAtlas() {
  const src = JSON.parse(fs.readFileSync(SRC, "utf8"));
  const keys = Object.keys(src.flags), rows = Math.ceil(keys.length / COLS), W = COLS * CW, H = rows * CH;
  const rgb = Buffer.alloc(W * H * 3), cells = {};
  const iw = CW - 2 * PAD, ih = CH - 2 * PAD;
  keys.forEach((key, i) => {
    const f = src.flags[key], file = path.join(ROOT, f.file);
    if (!fs.existsSync(file)) throw new Error(`${key}: the source ${f.file} is not here (node tools/flags/fetch_flags.mjs)`);
    const buf = fs.readFileSync(file), sha1 = crypto.createHash("sha1").update(buf).digest("hex");
    if (sha1 !== f.sha1) throw new Error(`${key}: ${f.file} sha1 ${sha1} is not the recorded ${f.sha1} (a source is never edited)`);
    const img = renderSvg(buf.toString("utf8"), iw, ih);
    const c = i % COLS, r = Math.floor(i / COLS), ox = c * CW, oy = r * CH;
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      let sx = Math.min(iw - 1, Math.max(0, x - PAD)), sy = Math.min(ih - 1, Math.max(0, y - PAD)), s = (sy * iw + sx) * 4, a = img[s + 3];
      // a pixel the drawing leaves (nearly) uncovered, at a flag's very edge: the nearest covered one inward (no white seam)
      for (let k = 1; a < 0.5 && k <= 4; k++) { const tx = Math.min(iw - 1, sx + (sx < iw / 2 ? k : -k)), ty = Math.min(ih - 1, sy + (sy < ih / 2 ? k : -k)), t = (ty * iw + tx) * 4; if (img[t + 3] > a) { s = t; a = img[t + 3]; } }
      const o = ((oy + y) * W + ox + x) * 3;
      for (let k = 0; k < 3; k++) rgb[o + k] = Math.round(Math.min(1, Math.max(0, a > 0 ? img[s + k] / a : 1)) * 255);   // (straight colour; nothing drawn = white)
    }
    cells[key] = { i, aspect: f.aspect, title: f.title, page: f.page, sha1: f.sha1, licence: f.licence, author: f.author };
  });
  const png = encodePng(rgb, W, H);
  const layout = { _doc: "The embassy flags' atlas (tools/flags/build_atlas.mjs from data/flags/embassy_sources.json; never edited by hand: the gate rebuilds it and compares). Cell i at column i % cols, row floor(i / cols) from the top; the flag fills the cell less pad px each side.",
    cw: CW, ch: CH, pad: PAD, cols: COLS, rows, width: W, height: H, png_sha256: crypto.createHash("sha256").update(png).digest("hex"), cells };
  return { png, layout };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const t0 = Date.now(), { png, layout } = buildAtlas();
  if (process.argv.includes("--check")) {
    const cur = fs.readFileSync(path.join(OUT, "embassy_flags.png"));
    const ok = cur.equals(png);
    console.log(`${ok ? "PASS" : "FAIL"} the atlas rebuilt from the sources ${ok ? "equals" : "differs from"} viewer/flags/atlas/embassy_flags.png (${Date.now() - t0} ms)`);
    process.exit(ok ? 0 : 1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "embassy_flags.png"), png);
  fs.writeFileSync(path.join(OUT, "embassy_flags.json"), JSON.stringify(layout, null, 1) + "\n");
  console.log(`atlas ${layout.width} x ${layout.height}, ${Object.keys(layout.cells).length} flags, ${(png.length / 1024).toFixed(0)} KB, ${Date.now() - t0} ms -> viewer/flags/atlas/`);
}
