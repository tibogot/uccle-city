// VISUAL REGRESSION TOUR, the comparison (docs/TOUR.md): a run's images against a baseline run, view by view.
//   node tools/tour/compare.mjs <base> <run> [--views tools/tour/views.json] [--out <dir>]
// <base> / <run>: a run name under .tour/ (or a folder path). Per view:
//   pixels  % of pixels whose largest channel difference is over thresholds.pixel (24 / 255)
//   cell    the worst cell of a 16 x 9 grid: % of its pixels changed (a local change: a hollow front, a missing tree row)
//   ssim    mean SSIM of the luma over 8 x 8 blocks (1 = same; structure, not just colour)
//   mean    mean largest-channel difference (0-255)
// A view is FLAGGED when pixels > tol.pixels, cell > tol.cell or ssim < tol.ssim (views.json "thresholds", a view's
// "tol" overrides), or when an image is missing / a different size. For every flagged view: <out>/<view>.png = baseline
// | run | diff (changed pixels in red over the dimmed baseline, the cells over the cell threshold boxed in yellow).
// <out>/report.html shows them all; compare.json has the numbers. Exit 1 when any view is flagged.
// Default out: <run>/_vs_<base>/.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decode, encode } from "./png.mjs";

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const viewsFile = opt("views", path.join(HERE, "tools/tour/views.json"));
const outArg = opt("out", null);
if (args.length < 2) { console.error("usage: node tools/tour/compare.mjs <base> <run> [--views file] [--out dir]"); process.exit(2); }
const dirOf = (a) => (fs.existsSync(a) && fs.statSync(a).isDirectory() ? path.resolve(a) : path.join(HERE, ".tour", a));
const baseDir = dirOf(args[0]), runDir = dirOf(args[1]);
for (const d of [baseDir, runDir]) if (!fs.existsSync(d)) { console.error(`no run folder ${d}`); process.exit(2); }
const outDir = outArg ? path.resolve(outArg) : path.join(runDir, `_vs_${path.basename(baseDir)}`);
fs.mkdirSync(outDir, { recursive: true });

const cfg = JSON.parse(fs.readFileSync(viewsFile, "utf8"));
const T0 = { pixel: 24, pixels: 1, cell: 8, ssim: 0.985, ...cfg.thresholds };
const GX = 16, GY = 9;
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
const baseRun = readJson(path.join(baseDir, "run.json")), runRun = readJson(path.join(runDir, "run.json"));
if (baseRun && runRun) {
  if (baseRun.devicePixelRatio !== runRun.devicePixelRatio) console.warn(`WARNING: devicePixelRatio ${baseRun.devicePixelRatio} (base) vs ${runRun.devicePixelRatio} (run): the canvas size differs, expect noise`);
  if (baseRun.gpu !== runRun.gpu) console.warn(`WARNING: GPU ${baseRun.gpu} vs ${runRun.gpu}`);
}
const runInfo = (j, id) => j?.results?.find((r) => r.id === id) ?? null;

function metrics(A, B, tol) {
  const { width: w, height: h } = A, a = A.data, b = B.data;
  const n = w * h, d = new Uint8Array(n);
  let changed = 0, sum = 0;
  const cells = new Uint32Array(GX * GY), cellN = new Uint32Array(GX * GY);
  for (let y = 0; y < h; y++) {
    const cy = Math.min(GY - 1, Math.floor((y * GY) / h));
    for (let x = 0; x < w; x++) {
      const i = y * w + x, o = i * 4;
      const v = Math.max(Math.abs(a[o] - b[o]), Math.abs(a[o + 1] - b[o + 1]), Math.abs(a[o + 2] - b[o + 2]));
      d[i] = v; sum += v;
      const c = cy * GX + Math.min(GX - 1, Math.floor((x * GX) / w));
      cellN[c]++;
      if (v > tol.pixel) { changed++; cells[c]++; }
    }
  }
  let worst = 0, worstAt = 0;
  const cellPct = [...cells].map((c, i) => (100 * c) / cellN[i]);
  cellPct.forEach((p, i) => { if (p > worst) { worst = p; worstAt = i; } });
  // SSIM on luma, 8 x 8 blocks
  const C1 = (0.01 * 255) ** 2, C2 = (0.03 * 255) ** 2;
  const Y = (px, o) => 0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2];
  let ss = 0, blocks = 0;
  for (let by = 0; by + 8 <= h; by += 8) for (let bx = 0; bx + 8 <= w; bx += 8) {
    let ma = 0, mb = 0, va = 0, vb = 0, cov = 0;
    for (let y = by; y < by + 8; y++) for (let x = bx; x < bx + 8; x++) { const o = (y * w + x) * 4; ma += Y(a, o); mb += Y(b, o); }
    ma /= 64; mb /= 64;
    for (let y = by; y < by + 8; y++) for (let x = bx; x < bx + 8; x++) {
      const o = (y * w + x) * 4, p = Y(a, o) - ma, q = Y(b, o) - mb;
      va += p * p; vb += q * q; cov += p * q;
    }
    va /= 63; vb /= 63; cov /= 63;
    ss += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
    blocks++;
  }
  return { pixels: (100 * changed) / n, cell: worst, cellAt: [worstAt % GX, Math.floor(worstAt / GX)], ssim: ss / blocks, mean: sum / n, d, cellPct };
}

function triple(A, B, m, tol) {
  const { width: w, height: h } = A, W = w * 3, out = new Uint8Array(W * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, o = i * 4;
    for (const [k, src] of [[0, A.data], [1, B.data]]) {
      const t = (y * W + x + k * w) * 4;
      out[t] = src[o]; out[t + 1] = src[o + 1]; out[t + 2] = src[o + 2]; out[t + 3] = 255;
    }
    const t = (y * W + x + 2 * w) * 4, g = 0.3 * (0.299 * A.data[o] + 0.587 * A.data[o + 1] + 0.114 * A.data[o + 2]);
    const v = m.d[i];
    if (v > tol.pixel) { out[t] = Math.min(255, 120 + v * 2); out[t + 1] = g * 0.5; out[t + 2] = g * 0.5; }
    else { out[t] = out[t + 1] = out[t + 2] = g + v * 2; }
    out[t + 3] = 255;
  }
  // the cells over the cell threshold, boxed in yellow on the diff panel
  m.cellPct.forEach((p, c) => {
    if (p <= tol.cell) return;
    const cx = c % GX, cy = Math.floor(c / GX);
    const x0 = Math.floor((cx * w) / GX), x1 = Math.floor(((cx + 1) * w) / GX) - 1, y0 = Math.floor((cy * h) / GY), y1 = Math.floor(((cy + 1) * h) / GY) - 1;
    const dot = (x, y) => { const t = (y * W + x + 2 * w) * 4; out[t] = 255; out[t + 1] = 220; out[t + 2] = 0; };
    for (let x = x0; x <= x1; x++) { dot(x, y0); dot(x, y1); }
    for (let y = y0; y <= y1; y++) { dot(x0, y); dot(x1, y); }
  });
  return encode(out, W, h);
}

const rows = [], report = [];
let flagged = 0;
for (const v of cfg.views) {
  const tol = { ...T0, ...v.tol };
  const fa = path.join(baseDir, `${v.id}.png`), fb = path.join(runDir, `${v.id}.png`);
  const row = { view: v.id, pixels: "", cell: "", ssim: "", mean: "", result: "" };
  const info = { base: runInfo(baseRun, v.id), run: runInfo(runRun, v.id) };
  let why = [];
  if (!fs.existsSync(fa) || !fs.existsSync(fb)) {
    why.push(!fs.existsSync(fa) ? "no baseline image" : "no run image");
  } else {
    const A = decode(fs.readFileSync(fa)), B = decode(fs.readFileSync(fb));
    if (A.width !== B.width || A.height !== B.height) why.push(`size ${A.width}x${A.height} vs ${B.width}x${B.height}`);
    else {
      const m = metrics(A, B, tol);
      Object.assign(row, { pixels: +m.pixels.toFixed(2), cell: +m.cell.toFixed(1), ssim: +m.ssim.toFixed(4), mean: +m.mean.toFixed(2) });
      if (m.pixels > tol.pixels) why.push(`pixels ${m.pixels.toFixed(2)} % > ${tol.pixels}`);
      if (m.cell > tol.cell) why.push(`cell ${m.cell.toFixed(1)} % > ${tol.cell} at col ${m.cellAt[0]} row ${m.cellAt[1]}`);
      if (m.ssim < tol.ssim) why.push(`ssim ${m.ssim.toFixed(4)} < ${tol.ssim}`);
      if (why.length) fs.writeFileSync(path.join(outDir, `${v.id}.png`), triple(A, B, m, tol));
    }
  }
  if (info.run && !info.run.ok) why.push(`run view not fully built (${info.run.fail ?? info.run.why})`);
  if (info.run?.errors?.length) why.push(`${info.run.errors.length} console errors in the run`);
  row.result = why.length ? "FLAG" : "ok";
  if (why.length) flagged++;
  rows.push(row);
  report.push({ ...row, what: v.what, why, tol, errors: info.run?.errors ?? [], img: why.length && fs.existsSync(path.join(outDir, `${v.id}.png`)) ? `${v.id}.png` : null,
    baseImg: path.relative(outDir, fa).replace(/\\/g, "/"), runImg: path.relative(outDir, fb).replace(/\\/g, "/") });
}

console.log(`\nVISUAL TOUR: ${path.basename(runDir)} vs ${path.basename(baseDir)}  (thresholds: pixel ${T0.pixel}, pixels ${T0.pixels} %, cell ${T0.cell} %, ssim ${T0.ssim})`);
console.table(rows);
for (const r of report) if (r.why.length) console.log(`FLAG ${r.view}: ${r.why.join("; ")}${r.img ? `  -> ${path.join(outDir, r.img)}` : ""}`);
console.log(`${flagged} of ${rows.length} views flagged. Report: ${path.join(outDir, "report.html")}`);
fs.writeFileSync(path.join(outDir, "compare.json"), JSON.stringify({ base: baseDir, run: runDir, thresholds: T0, views: report }, null, 1));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Tour ${esc(path.basename(runDir))} vs ${esc(path.basename(baseDir))}</title>
<style>body{background:#111;color:#ddd;font:13px system-ui,sans-serif;margin:16px}img{max-width:100%;display:block;margin:4px 0 18px}
.flag{color:#ff8a65}.ok{color:#8bc34a}table{border-collapse:collapse}td,th{padding:2px 8px;border-bottom:1px solid #333;text-align:left}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:6px}</style></head><body>
<h1>Visual tour: ${esc(path.basename(runDir))} vs ${esc(path.basename(baseDir))}</h1>
<p>${flagged} of ${rows.length} views flagged. Flagged views: baseline | run | diff (red: changed pixels; yellow boxes: cells over the cell threshold).</p>
<table><tr><th>view</th><th>pixels %</th><th>worst cell %</th><th>ssim</th><th>mean</th><th>result</th></tr>
${report.map((r) => `<tr><td><a href="#${r.view}">${r.view}</a></td><td>${r.pixels}</td><td>${r.cell}</td><td>${r.ssim}</td><td>${r.mean}</td><td class="${r.result === "ok" ? "ok" : "flag"}">${r.result}</td></tr>`).join("\n")}</table>
${report.map((r) => `<h2 id="${r.view}" class="${r.why.length ? "flag" : "ok"}">${r.view} ${r.why.length ? "FLAG" : "ok"}</h2><p>${esc(r.what ?? "")}</p>
${r.why.length ? `<p class="flag">${r.why.map(esc).join("<br>")}</p>` : ""}${r.errors.length ? `<pre>${r.errors.map(esc).join("\n")}</pre>` : ""}
${r.img ? `<img src="${r.img}">` : `<div class="pair"><img src="${r.baseImg}"><img src="${r.runImg}"></div>`}`).join("\n")}
</body></html>`;
fs.writeFileSync(path.join(outDir, "report.html"), html);
process.exitCode = flagged ? 1 : 0;
