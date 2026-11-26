// A SMALL, DETERMINISTIC SVG RASTERISER for the national-flag SVGs of Wikimedia Commons (tools/flags/build_atlas.mjs):
// pure JS, no dependency, so the atlas rebuilt from the same sources is byte-identical anywhere (the gate checks it).
// What the flag files use, and nothing more:
//   elements  svg (width / height / viewBox, stretched to the target: preserveAspectRatio none), g, defs, use (x, y,
//             xlink:href / href, to any id, also defined later), path (the full path grammar, arcs included), rect,
//             circle, ellipse, polygon, polyline, line, clipPath (clip-path="url(#id)", userSpaceOnUse), linearGradient
//             (userSpaceOnUse / objectBoundingBox, gradientTransform, href inheritance, pad), stop; title / metadata /
//             desc ignored;
//   paint     fill / stroke (#rgb, #rrggbb, rgb(), the CSS named colours the files use, none, url(#gradient)),
//             fill-rule / clip-rule (nonzero, evenodd), stroke-width, opacity (multiplied down a group), fill-opacity,
//             stroke-opacity, presentation attributes and style="" alike, inherited as in SVG;
//   strokes   each segment a quad, each vertex a round join (a union by nonzero: every piece wound the same way);
//   coverage  6 sub-scanlines a pixel, exact horizontal coverage on each (anti-aliased edges), composited "over" in
//             sRGB values like the browsers.
// renderSvg(text, W, H) -> Float32Array RGBA (0..1), W x H, the viewBox stretched onto it.

// ------------------------------------------------------------------ XML (the subset the files use)
function parseXml(src) {
  src = src.replace(/<\?[\s\S]*?\?>/g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/<!DOCTYPE[^>]*>/gi, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");
  const root = { tag: "#root", attrs: {}, children: [] }, stack = [root];
  const re = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
  let m;
  while ((m = re.exec(src))) {
    const [, close, tag, attrSrc, self] = m;
    if (close) { while (stack.length > 1 && stack.pop().tag !== tag); continue; }
    const attrs = {};
    for (const a of attrSrc.matchAll(/([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) attrs[a[1]] = (a[3] ?? a[4]).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    const el = { tag: tag.replace(/^svg:/, ""), attrs, children: [] };
    stack[stack.length - 1].children.push(el);
    if (!self) stack.push(el);
  }
  return root;
}

// ------------------------------------------------------------------ matrices [a b c d e f]: x' = a x + c y + e
const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const inv = (m) => { const d = m[0] * m[3] - m[1] * m[2]; return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d]; };
const I = [1, 0, 0, 1, 0, 0];
const nums = (s) => (String(s).match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []).map(Number);
function parseTransform(s) {
  let m = I;
  for (const t of String(s ?? "").matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)) {
    const v = nums(t[2]); let n = I;
    if (t[1] === "matrix") n = v.slice(0, 6);
    else if (t[1] === "translate") n = [1, 0, 0, 1, v[0], v[1] ?? 0];
    else if (t[1] === "scale") n = [v[0], 0, 0, v[1] ?? v[0], 0, 0];
    else if (t[1] === "rotate") {
      const a = (v[0] * Math.PI) / 180, c = Math.cos(a), s2 = Math.sin(a), r = [c, s2, -s2, c, 0, 0];
      n = v.length >= 3 ? mul(mul([1, 0, 0, 1, v[1], v[2]], r), [1, 0, 0, 1, -v[1], -v[2]]) : r;
    } else if (t[1] === "skewX") n = [1, 0, Math.tan((v[0] * Math.PI) / 180), 1, 0, 0];
    else if (t[1] === "skewY") n = [1, Math.tan((v[0] * Math.PI) / 180), 0, 1, 0, 0];
    m = mul(m, n);
  }
  return m;
}

// ------------------------------------------------------------------ colours
const NAMED = { black: "#000000", white: "#ffffff", red: "#ff0000", lime: "#00ff00", green: "#008000", blue: "#0000ff", yellow: "#ffff00", purple: "#800080",
  orange: "#ffa500", gold: "#ffd700", navy: "#000080", maroon: "#800000", gray: "#808080", grey: "#808080", silver: "#c0c0c0", aqua: "#00ffff", cyan: "#00ffff",
  fuchsia: "#ff00ff", magenta: "#ff00ff", olive: "#808000", teal: "#008080", darkgreen: "#006400", darkred: "#8b0000", brown: "#a52a2a" };
function parseColor(s) {
  s = String(s).trim().toLowerCase();
  if (NAMED[s]) s = NAMED[s];
  let m = /^#([0-9a-f]{3})$/.exec(s);
  if (m) return [...m[1]].map((h) => parseInt(h + h, 16) / 255);
  m = /^#([0-9a-f]{6})$/.exec(s);
  if (m) return [0, 2, 4].map((k) => parseInt(m[1].slice(k, k + 2), 16) / 255);
  m = /^rgb\(([^)]*)\)$/.exec(s);
  if (m) return m[1].split(",").map((v) => (v.includes("%") ? parseFloat(v) / 100 : parseFloat(v) / 255));
  throw new Error(`svgRaster: colour ${s}`);
}

// ------------------------------------------------------------------ geometry -> polygons in device space
/** path data -> subpaths [{ pts: [[x, y] ...] (device), closed }] under matrix m, curves flattened to ~0.25 px */
function pathPolys(d, m) {
  const tok = String(d).match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  const subs = []; let cur = null, i = 0, cmd = "", x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0, qx = 0, qy = 0, last = "";
  const isCmd = (t) => /^[A-Za-z]$/.test(t), n = () => +tok[i++];
  const dev = (px, py) => apply(m, px, py);
  const push = (px, py) => cur.pts.push(dev(px, py));
  const segs = (p) => { let L = 0; for (let k = 1; k < p.length; k++) L += Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]); return Math.min(256, Math.max(2, Math.ceil(L / 0.6))); };
  const cubic = (x1, y1, x2, y2, x3, y3) => {
    const P = [dev(x, y), dev(x1, y1), dev(x2, y2), dev(x3, y3)], N = segs(P);
    for (let k = 1; k <= N; k++) { const t = k / N, u = 1 - t; cur.pts.push([u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0], u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1]]); }
  };
  const quad = (x1, y1, x2, y2) => {
    const P = [dev(x, y), dev(x1, y1), dev(x2, y2)], N = segs(P);
    for (let k = 1; k <= N; k++) { const t = k / N, u = 1 - t; cur.pts.push([u * u * P[0][0] + 2 * u * t * P[1][0] + t * t * P[2][0], u * u * P[0][1] + 2 * u * t * P[1][1] + t * t * P[2][1]]); }
  };
  const arc = (rx, ry, phi, fa, fs, x2, y2) => {
    if (rx === 0 || ry === 0) { push(x2, y2); return; }
    rx = Math.abs(rx); ry = Math.abs(ry);
    const ph = (phi * Math.PI) / 180, cp = Math.cos(ph), sp = Math.sin(ph);
    const dx = (x - x2) / 2, dy = (y - y2) / 2, x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
    const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p, den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    const co = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
    const cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx;
    const ccx = cp * cxp - sp * cyp + (x + x2) / 2, ccy = sp * cxp + cp * cyp + (y + y2) / 2;
    const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
    const sc = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])), N = Math.min(256, Math.max(4, Math.ceil((Math.abs(dt) * Math.max(rx, ry) * sc) / 0.6)));
    for (let k = 1; k <= N; k++) { const t = t1 + (dt * k) / N, ex = rx * Math.cos(t), ey = ry * Math.sin(t); push(cp * ex - sp * ey + ccx, sp * ex + cp * ey + ccy); }
  };
  while (i < tok.length) {
    if (isCmd(tok[i])) cmd = tok[i++];
    else if (!cmd) { i++; continue; }
    const rel = cmd === cmd.toLowerCase() && cmd !== "Z" && cmd !== "z", C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === "Z") { if (cur) { cur.closed = true; x = sx; y = sy; } last = "Z"; cur = null; continue; }
    if (C !== "M" && !cur) { cur = { pts: [dev(x, y)], closed: false }; subs.push(cur); }
    if (C === "M") { x = ox + n(); y = oy + n(); sx = x; sy = y; cur = { pts: [dev(x, y)], closed: false }; subs.push(cur); cmd = rel ? "l" : "L"; last = "M"; cx = x; cy = y; continue; }
    if (C === "L") { x = ox + n(); y = oy + n(); push(x, y); }
    else if (C === "H") { x = ox + n(); push(x, y); }
    else if (C === "V") { y = oy + n(); push(x, y); }
    else if (C === "C") { const x1 = ox + n(), y1 = oy + n(), x2 = ox + n(), y2 = oy + n(), x3 = ox + n(), y3 = oy + n(); cubic(x1, y1, x2, y2, x3, y3); cx = x2; cy = y2; x = x3; y = y3; }
    else if (C === "S") { const x1 = /[CS]/.test(last) ? 2 * x - cx : x, y1 = /[CS]/.test(last) ? 2 * y - cy : y, x2 = ox + n(), y2 = oy + n(), x3 = ox + n(), y3 = oy + n(); cubic(x1, y1, x2, y2, x3, y3); cx = x2; cy = y2; x = x3; y = y3; }
    else if (C === "Q") { const x1 = ox + n(), y1 = oy + n(), x2 = ox + n(), y2 = oy + n(); quad(x1, y1, x2, y2); qx = x1; qy = y1; x = x2; y = y2; }
    else if (C === "T") { const x1 = /[QT]/.test(last) ? 2 * x - qx : x, y1 = /[QT]/.test(last) ? 2 * y - qy : y, x2 = ox + n(), y2 = oy + n(); quad(x1, y1, x2, y2); qx = x1; qy = y1; x = x2; y = y2; }
    else if (C === "A") { const rx = n(), ry = n(), phi = n(), fa = n(), fs = n(), x2 = ox + n(), y2 = oy + n(); arc(rx, ry, phi, fa, fs, x2, y2); x = x2; y = y2; }
    else { i++; continue; }
    last = C;
  }
  return subs.filter((s) => s.pts.length >= 2);
}
const ellipseD = (cx, cy, rx, ry) => `M${cx - rx},${cy}A${rx},${ry} 0 1 0 ${cx + rx},${cy}A${rx},${ry} 0 1 0 ${cx - rx},${cy}Z`;
function shapeD(el, num) {
  const a = el.attrs;
  if (el.tag === "path") return a.d ?? "";
  if (el.tag === "rect") { const x = num(a.x), y = num(a.y), w = num(a.width), h = num(a.height); return w > 0 && h > 0 ? `M${x},${y}H${x + w}V${y + h}H${x}Z` : ""; }
  if (el.tag === "circle") return ellipseD(num(a.cx), num(a.cy), num(a.r), num(a.r));
  if (el.tag === "ellipse") return ellipseD(num(a.cx), num(a.cy), num(a.rx), num(a.ry));
  if (el.tag === "polygon" || el.tag === "polyline") { const v = nums(a.points); let d = ""; for (let k = 0; k + 1 < v.length; k += 2) d += `${k ? "L" : "M"}${v[k]},${v[k + 1]}`; return d + (el.tag === "polygon" ? "Z" : ""); }
  if (el.tag === "line") return `M${num(a.x1)},${num(a.y1)}L${num(a.x2)},${num(a.y2)}`;
  return null;
}
/** a stroke as polygons (device), every piece counter-clockwise: union by nonzero */
function strokePolys(subs, w) {
  const out = [], r = w / 2, ccw = (p) => { let A = 0; for (let k = 0; k < p.length; k++) { const a = p[k], b = p[(k + 1) % p.length]; A += a[0] * b[1] - b[0] * a[1]; } return A < 0 ? p.reverse() : p; };
  const NJ = Math.max(8, Math.min(32, Math.ceil(r * 2)));
  for (const s of subs) {
    const P = s.pts.slice(); if (s.closed) P.push(P[0]);
    for (let k = 0; k + 1 < P.length; k++) {
      const [ax, ay] = P[k], [bx, by] = P[k + 1], L = Math.hypot(bx - ax, by - ay); if (L < 1e-9) continue;
      const nx = (-(by - ay) / L) * r, ny = ((bx - ax) / L) * r;
      out.push(ccw([[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]]));
    }
    for (let k = s.closed ? 0 : 1; k < P.length - (s.closed ? 1 : 1); k++) { const [px, py] = P[k], c = []; for (let j = 0; j < NJ; j++) { const t = (j / NJ) * Math.PI * 2; c.push([px + Math.cos(t) * r, py + Math.sin(t) * r]); } out.push(ccw(c)); }
  }
  return out;
}

// ------------------------------------------------------------------ coverage
const SUB = 6;
/** polygons (closed point lists, device) -> { x0, y0, w, h, cov: Float32Array } over their bbox clipped to W x H */
function coverage(polys, rule, W, H) {
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  const edges = [];
  for (const p of polys) for (let k = 0; k < p.length; k++) {
    const a = p[k], b = p[(k + 1) % p.length];
    bx0 = Math.min(bx0, a[0]); bx1 = Math.max(bx1, a[0]); by0 = Math.min(by0, a[1]); by1 = Math.max(by1, a[1]);
    if (a[1] === b[1]) continue;
    const up = a[1] < b[1], ya = up ? a[1] : b[1], yb = up ? b[1] : a[1], xa = up ? a[0] : b[0], xb = up ? b[0] : a[0];
    edges.push([ya, yb, xa, (xb - xa) / (yb - ya), up ? 1 : -1]);
  }
  const x0 = Math.max(0, Math.floor(bx0)), y0 = Math.max(0, Math.floor(by0)), x1 = Math.min(W, Math.ceil(bx1)), y1 = Math.min(H, Math.ceil(by1));
  const w = Math.max(0, x1 - x0), h = Math.max(0, y1 - y0), cov = new Float32Array(w * h);
  if (!w || !h) return { x0, y0, w, h, cov };
  edges.sort((p, q) => p[0] - q[0]);
  let next = 0; const active = [], xs = [];
  for (let row = 0; row < h; row++) for (let s = 0; s < SUB; s++) {
    const sy = y0 + row + (s + 0.5) / SUB;
    while (next < edges.length && edges[next][0] <= sy) active.push(edges[next++]);
    for (let k = active.length - 1; k >= 0; k--) if (active[k][1] <= sy) active.splice(k, 1);
    xs.length = 0;
    for (const e of active) if (e[0] <= sy && sy < e[1]) xs.push([e[2] + (sy - e[0]) * e[3], e[4]]);
    if (xs.length < 2) continue;
    xs.sort((p, q) => p[0] - q[0]);
    let wind = 0;
    for (let k = 0; k + 1 < xs.length; k++) {
      wind += xs[k][1];
      const inside = rule === "evenodd" ? (k + 1) % 2 === 1 : wind !== 0;
      if (!inside) continue;
      let a = Math.max(xs[k][0], x0), b = Math.min(xs[k + 1][0], x1);
      if (b <= a) continue;
      const base = row * w, ia = Math.floor(a), ib = Math.floor(b), wt = 1 / SUB;
      if (ia === ib) { if (ia - x0 < w) cov[base + ia - x0] += (b - a) * wt; continue; }
      cov[base + ia - x0] += (ia + 1 - a) * wt;
      for (let px = ia + 1; px < ib; px++) cov[base + px - x0] += wt;
      if (ib < x1) cov[base + ib - x0] += (b - ib) * wt;
    }
  }
  for (let k = 0; k < cov.length; k++) if (cov[k] > 1) cov[k] = 1;
  return { x0, y0, w, h, cov };
}

// ------------------------------------------------------------------ render
const PAINT_PROPS = ["fill", "fill-rule", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "clip-rule", "stop-color", "stop-opacity"];
export function renderSvg(text, W, H) {
  const root = parseXml(text), svg = root.children.find((e) => e.tag === "svg");
  if (!svg) throw new Error("svgRaster: no <svg>");
  const ids = new Map(), walk = (e) => { if (e.attrs.id) ids.set(e.attrs.id, e); e.children.forEach(walk); }; walk(svg);
  const vb = svg.attrs.viewBox ? nums(svg.attrs.viewBox) : [0, 0, parseFloat(svg.attrs.width), parseFloat(svg.attrs.height)];
  const base = [W / vb[2], 0, 0, H / vb[3], (-vb[0] * W) / vb[2], (-vb[1] * H) / vb[3]];
  const vw = vb[2], vh = vb[3], len = (v, ref) => (v == null ? 0 : String(v).trim().endsWith("%") ? (parseFloat(v) / 100) * ref : parseFloat(v));
  const numX = (v) => len(v, vw);
  const img = new Float32Array(W * H * 4);
  const styleOf = (e) => { const st = {}; for (const k of PAINT_PROPS.concat(["opacity", "clip-path", "display", "visibility"])) if (e.attrs[k] != null) st[k] = e.attrs[k]; if (e.attrs.style) for (const d of e.attrs.style.split(";")) { const [k, v] = d.split(":").map((q) => q?.trim()); if (k && v != null) st[k] = v; } return st; };
  const refId = (s) => /url\(\s*#([^)\s]+)\s*\)/.exec(s ?? "")?.[1] ?? null;

  function gradientAt(g, ctm, bbox) {
    // the attributes and stops, inherited along href
    const chain = []; for (let e = g; e; e = ids.get((e.attrs["xlink:href"] ?? e.attrs.href ?? "").slice(1))) { chain.push(e); if (chain.length > 8) break; }
    const attr = (k) => { for (const e of chain) if (e.attrs[k] != null) return e.attrs[k]; return null; };
    const stopsEl = chain.find((e) => e.children.some((c) => c.tag === "stop"))?.children.filter((c) => c.tag === "stop") ?? [];
    const stops = stopsEl.map((s) => { const st = styleOf(s); const o = s.attrs.offset ?? "0"; return { o: Math.min(1, Math.max(0, String(o).endsWith("%") ? parseFloat(o) / 100 : parseFloat(o))), c: parseColor(st["stop-color"] ?? "#000"), a: st["stop-opacity"] != null ? +st["stop-opacity"] : 1 }; });
    for (let k = 1; k < stops.length; k++) if (stops[k].o < stops[k - 1].o) stops[k].o = stops[k - 1].o;
    const obb = (attr("gradientUnits") ?? "objectBoundingBox") === "objectBoundingBox";
    const frac = (v, d, ref) => { if (v == null) return d; const s = String(v).trim(); return s.endsWith("%") ? (parseFloat(s) / 100) * (obb ? 1 : ref) : parseFloat(s); };
    const x1 = frac(attr("x1"), 0, vw), y1 = frac(attr("y1"), 0, vh), x2 = frac(attr("x2"), obb ? 1 : vw, vw), y2 = frac(attr("y2"), 0, vh);
    let m = ctm;
    if (obb) m = mul(m, [bbox[2] - bbox[0] || 1, 0, 0, bbox[3] - bbox[1] || 1, bbox[0], bbox[1]]);
    m = mul(m, parseTransform(attr("gradientTransform")));
    const im = inv(m), dx = x2 - x1, dy = y2 - y1, dd = dx * dx + dy * dy || 1;
    return (px, py) => {
      const [gx, gy] = apply(im, px, py), t = Math.min(1, Math.max(0, ((gx - x1) * dx + (gy - y1) * dy) / dd));
      if (!stops.length) return [0, 0, 0, 0];
      if (t <= stops[0].o) return [...stops[0].c, stops[0].a];
      for (let k = 1; k < stops.length; k++) if (t <= stops[k].o) { const a = stops[k - 1], b = stops[k], f = b.o > a.o ? (t - a.o) / (b.o - a.o) : 1; return [a.c[0] + (b.c[0] - a.c[0]) * f, a.c[1] + (b.c[1] - a.c[1]) * f, a.c[2] + (b.c[2] - a.c[2]) * f, a.a + (b.a - a.a) * f]; }
      const z = stops[stops.length - 1]; return [...z.c, z.a];
    };
  }
  function paintCov(cv, paint, alpha, ctm, bbox, clip) {
    if (!cv.w || !cv.h) return;
    let solid = null, grad = null;
    const id = refId(paint);
    if (id) { const g = ids.get(id); if (!g || g.tag !== "linearGradient") return; grad = gradientAt(g, ctm, bbox); }
    else solid = parseColor(paint);
    for (let r = 0; r < cv.h; r++) for (let c = 0; c < cv.w; c++) {
      let a = cv.cov[r * cv.w + c]; if (a <= 0) continue;
      const px = cv.x0 + c, py = cv.y0 + r;
      if (clip) { a *= clip[py * W + px]; if (a <= 0) continue; }
      let col = solid, ca = 1;
      if (grad) { const g = grad(px + 0.5, py + 0.5); col = g; ca = g[3]; }
      a *= alpha * ca; if (a <= 0) continue;
      const o = (py * W + px) * 4;
      img[o] = col[0] * a + img[o] * (1 - a); img[o + 1] = col[1] * a + img[o + 1] * (1 - a); img[o + 2] = col[2] * a + img[o + 2] * (1 - a); img[o + 3] = a + img[o + 3] * (1 - a);
    }
  }
  /** the clip mask (W x H, 0..1) of a clipPath in the user space ctm */
  function clipMask(id, ctm, inherited) {
    const cp = ids.get(id); if (!cp) return inherited;
    const mask = new Float32Array(W * H);
    const draw = (e, m, st) => {
      if (e.tag === "use") { const t = ids.get((e.attrs["xlink:href"] ?? e.attrs.href ?? "").slice(1)); if (t) draw(t, mul(mul(m, parseTransform(e.attrs.transform)), [1, 0, 0, 1, numX(e.attrs.x), len(e.attrs.y, vh)]), { ...st, ...styleOf(e) }); return; }
      const mm = e.tag === "use" ? m : mul(m, parseTransform(e.attrs.transform)), s2 = { ...st, ...styleOf(e) };
      if (e.tag === "g") { for (const c of e.children) draw(c, mm, s2); return; }
      const d = shapeD(e, numX); if (d == null) return;
      const subs = pathPolys(d, mm), cv = coverage(subs.map((s) => s.pts), s2["clip-rule"] ?? "nonzero", W, H);
      for (let r = 0; r < cv.h; r++) for (let c = 0; c < cv.w; c++) { const k = (cv.y0 + r) * W + cv.x0 + c; mask[k] = Math.max(mask[k], cv.cov[r * cv.w + c]); }
    };
    for (const c of cp.children) draw(c, ctm, {});
    if (inherited) for (let k = 0; k < mask.length; k++) mask[k] *= inherited[k];
    return mask;
  }
  function render(e, ctm, st, opac, clip, depth = 0) {
    if (depth > 32) return;
    if (["defs", "clipPath", "linearGradient", "radialGradient", "title", "desc", "metadata", "style", "symbol", "mask", "pattern"].includes(e.tag)) return;
    const own = styleOf(e);
    if (own.display === "none" || own.visibility === "hidden") return;
    const s2 = { ...st }; for (const k of PAINT_PROPS) if (own[k] != null) s2[k] = own[k];
    const m = mul(ctm, parseTransform(e.attrs.transform));
    const op = opac * (own.opacity != null ? +own.opacity : 1);
    const cl = own["clip-path"] && refId(own["clip-path"]) ? clipMask(refId(own["clip-path"]), m, clip) : clip;
    if (e.tag === "svg" || e.tag === "g") { for (const c of e.children) render(c, m, s2, op, cl, depth + 1); return; }
    if (e.tag === "use") { const t = ids.get((e.attrs["xlink:href"] ?? e.attrs.href ?? "").slice(1)); if (t) render(t, mul(m, [1, 0, 0, 1, numX(e.attrs.x), len(e.attrs.y, vh)]), s2, op, cl, depth + 1); return; }
    const d = shapeD(e, numX); if (d == null) return;
    const subs = pathPolys(d, m);
    if (!subs.length) return;
    // the user-space bbox (for an objectBoundingBox gradient): the device points mapped back
    const im = inv(m); let b = [Infinity, Infinity, -Infinity, -Infinity];
    for (const s of subs) for (const p of s.pts) { const [ux, uy] = apply(im, p[0], p[1]); b = [Math.min(b[0], ux), Math.min(b[1], uy), Math.max(b[2], ux), Math.max(b[3], uy)]; }
    const fill = s2.fill ?? "#000";
    if (fill !== "none") paintCov(coverage(subs.map((s) => s.pts), s2["fill-rule"] ?? "nonzero", W, H), fill, op * (s2["fill-opacity"] != null ? +s2["fill-opacity"] : 1), m, b, cl);
    const stroke = s2.stroke ?? "none";
    if (stroke !== "none") {
      const sw = (s2["stroke-width"] != null ? numX(s2["stroke-width"]) : 1) * Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
      if (sw > 0) paintCov(coverage(strokePolys(subs, sw), "nonzero", W, H), stroke, op * (s2["stroke-opacity"] != null ? +s2["stroke-opacity"] : 1), m, b, cl);
    }
  }
  render(svg, base, {}, 1, null);
  return img;
}
