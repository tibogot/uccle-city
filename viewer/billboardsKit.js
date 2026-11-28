// THE BILLBOARD KIT, PURE (claude/billboards round 3): the boards' geometry from the data file and the poster atlas,
// with no three.js import, so the gate row `billboards` builds EXACTLY what the city draws and checks it against each
// board's `at` (tools/billboards/billboards.mjs "drawn where the data says"). viewer/billboards.js turns the soups into
// meshes and materials.
/** the trivision's step: CYCLE s per poster, the turn TURN s, the wave across the board WAVE s (left to right) */
export const PRISM = { cycle: 7.5, turn: 0.9, wave: 0.9 };
/** frame dimensions (m): the steel border round the poster, the box depth, the stand-off from the wall */
export const FRAME = {
  panel: { border: 0.14, depth: 0.22, standoff: 0.22, lip: 0.06 },
  backlit: { border: 0.16, depth: 0.32, standoff: 0.2, lip: 0.05 },
  trivision: { border: 0.18, depth: 0.2, standoff: 0.22, lip: 0.0 },
  gable: { border: 0.07, depth: 0.05, standoff: 0.06, lip: 0.025 },
  roof: { border: 0.14, depth: 0.22, standoff: 0, lip: 0.06 },
};
export const ROOF = { legClear: 1.3, brace: 2.6 };   // m: the board's foot over the roof, the braces' reach behind it

const s2l = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
/** an sRGB hex colour as linear { r, g, b } (three's Color.convertSRGBToLinear, without three: the gate imports this file) */
export const lin = (hex) => ({ r: s2l(((hex >> 16) & 255) / 255), g: s2l(((hex >> 8) & 255) / 255), b: s2l((hex & 255) / 255) });
const rgb = (r, g, b) => ({ r, g, b });
const STEEL = lin(0x3a3f42), STEEL_DARK = lin(0x24282a), GALV = lin(0x8b8f8c), LAMP = lin(0xd8d6cf), CONCRETE = lin(0x8a877f);

// ------------------------------------------------------------------------------------------------ the poster atlas
/** shelf-pack the posters (cell px by aspect), draw them; -> { canvas, cells: { id: [u0, v0, u1, v1] } } */
export function drawAtlas(posters, opts = {}) {
  const H = opts.cellH || 300, W = 2048, PAD = 6;
  const items = posters.map((p) => { const [a, b] = p.aspect.split(":").map(Number); const h = a >= b ? H : Math.round(H * 1.3); return { p, w: Math.round(h * a / b), h }; })
    .sort((x, y) => y.h - x.h || y.w - x.w);
  let x = 0, y = 0, rowH = 0;
  for (const it of items) {
    if (x + it.w > W) { x = 0; y += rowH + PAD; rowH = 0; }
    it.x = x; it.y = y; x += it.w + PAD; rowH = Math.max(rowH, it.h);
  }
  const AH = Math.ceil((y + rowH) / 256) * 256;
  const cv = opts.canvas || document.createElement("canvas");
  cv.width = W; cv.height = AH;
  const g = cv.getContext("2d");
  g.fillStyle = "#777"; g.fillRect(0, 0, W, AH);
  const cells = {};
  for (const it of items) {
    g.save(); g.translate(it.x, it.y); g.beginPath(); g.rect(0, 0, it.w, it.h); g.clip();
    drawPoster(g, it.p, it.w, it.h);
    g.restore();
    // (v: three's flipY canvas texture, v = 0 at the bottom)
    cells[it.p.id] = [(it.x + 0.5) / W, 1 - (it.y + it.h - 0.5) / AH, (it.x + it.w - 0.5) / W, 1 - (it.y + 0.5) / AH];
  }
  return { canvas: cv, cells, width: W, height: AH };
}

/** one invented poster: a background (two-tone gradient), a motif, the brand, a headline, a small line */
function drawPoster(g, p, w, h) {
  const s = p.style || {};
  const [c0, c1] = s.bg || ["#1f4e79", "#2e86c1"];
  const gr = s.split === "v" ? g.createLinearGradient(0, 0, w, 0) : g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, c0); gr.addColorStop(1, c1);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const fg = s.fg || "#fff", ac = s.accent || "#ffd23f", u = Math.min(w, h) / 100;
  motif(g, s.motif, w, h, ac, fg, u);
  g.textBaseline = "alphabetic";
  const fit = (txt, font, px, maxW) => { let k = px; g.font = `${font.replace("PX", k)}`; while (g.measureText(txt).width > maxW && k > 8) { k -= 2; g.font = `${font.replace("PX", k)}`; } return k; };
  const left = s.textX != null ? s.textX * w : w * 0.06, maxW = (s.textW ?? 0.88) * w;
  g.fillStyle = fg; g.textAlign = s.align || "left";
  const tx = s.align === "center" ? w / 2 : left;
  const brand = p.brand || "";
  if (brand) { fit(brand, `900 PXpx "Arial Black", "Segoe UI Black", Arial, sans-serif`, Math.round(h * (s.brandSize || 0.2)), maxW); g.fillText(brand, tx, h * (s.brandY ?? 0.3)); }
  const [l1, l2] = p.lines || [];
  if (l1) { fit(l1, `700 PXpx Georgia, "Times New Roman", serif`, Math.round(h * 0.12), maxW); g.fillStyle = s.lineColor || fg; g.fillText(l1, tx, h * (s.line1Y ?? 0.56)); }
  if (l2) { fit(l2, `600 PXpx Arial, Helvetica, sans-serif`, Math.round(h * 0.075), maxW); g.fillStyle = ac; g.fillText(l2, tx, h * (s.line2Y ?? 0.72)); }
  // the small print strip at the foot (a fake web address)
  if (p.small) { g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(0, h * 0.86, w, h * 0.14); g.fillStyle = "#fff"; g.textAlign = "left"; fit(p.small, `600 PXpx Arial, sans-serif`, Math.round(h * 0.06), w * 0.9); g.fillText(p.small, w * 0.04, h * 0.955); }
}

function motif(g, m, w, h, ac, fg, u) {
  g.save();
  if (m === "cup") {                       // a steaming cup on the right
    const cx = w * 0.78, cy = h * 0.58, r = h * 0.2;
    g.fillStyle = fg; g.beginPath(); g.ellipse(cx, cy, r, r * 0.95, 0, 0, Math.PI); g.fill();
    g.fillRect(cx - r, cy - r * 0.05, 2 * r, r * 0.1);
    g.lineWidth = r * 0.16; g.strokeStyle = fg; g.beginPath(); g.arc(cx + r * 1.05, cy + r * 0.25, r * 0.32, -1.2, 1.5); g.stroke();
    g.fillStyle = ac; g.beginPath(); g.ellipse(cx, cy, r * 0.92, r * 0.18, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = r * 0.07;
    for (const k of [-0.4, 0, 0.4]) { g.beginPath(); g.moveTo(cx + k * r, cy - r * 0.3); g.bezierCurveTo(cx + k * r - r * 0.25, cy - r * 0.6, cx + k * r + r * 0.25, cy - r * 0.8, cx + k * r, cy - r * 1.15); g.stroke(); }
  } else if (m === "rings") {             // concentric rings (a concert / sound)
    const cx = w * 0.8, cy = h * 0.45;
    for (let i = 7; i >= 1; i--) { g.fillStyle = i % 2 ? ac : "rgba(255,255,255,0.08)"; g.beginPath(); g.arc(cx, cy, i * h * 0.07, 0, Math.PI * 2); g.fill(); }
  } else if (m === "stripes") {           // diagonal speed stripes
    g.fillStyle = ac; g.globalAlpha = 0.85;
    for (let i = 0; i < 4; i++) { g.beginPath(); const x = w * (0.62 + i * 0.09); g.moveTo(x, h); g.lineTo(x + w * 0.05, h); g.lineTo(x + w * 0.2, 0); g.lineTo(x + w * 0.15, 0); g.fill(); }
  } else if (m === "drop") {              // a water drop
    const cx = w * 0.8, cy = h * 0.52, r = h * 0.22;
    g.fillStyle = ac; g.beginPath(); g.moveTo(cx, cy - r * 1.6); g.bezierCurveTo(cx + r * 0.3, cy - r * 0.9, cx + r, cy - r * 0.3, cx + r, cy + r * 0.2);
    g.arc(cx, cy + r * 0.2, r, 0, Math.PI); g.bezierCurveTo(cx - r, cy - r * 0.3, cx - r * 0.3, cy - r * 0.9, cx, cy - r * 1.6); g.fill();
    g.fillStyle = "rgba(255,255,255,0.55)"; g.beginPath(); g.ellipse(cx - r * 0.4, cy + r * 0.1, r * 0.14, r * 0.3, 0.3, 0, Math.PI * 2); g.fill();
  } else if (m === "sun") {               // a low sun and hills
    g.fillStyle = ac; g.beginPath(); g.arc(w * 0.75, h * 0.5, h * 0.2, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.moveTo(w * 0.45, h); g.quadraticCurveTo(w * 0.7, h * 0.45, w, h * 0.7); g.lineTo(w, h); g.fill();
  } else if (m === "bike") {              // a bicycle, two wheels and a frame
    const cy = h * 0.62, r = h * 0.17, x0 = w * 0.62, x1 = x0 + r * 2.6;
    g.strokeStyle = fg; g.lineWidth = h * 0.025;
    for (const x of [x0, x1]) { g.beginPath(); g.arc(x, cy, r, 0, Math.PI * 2); g.stroke(); }
    g.strokeStyle = ac; g.lineWidth = h * 0.03; g.beginPath(); g.moveTo(x0, cy); g.lineTo(x0 + r * 1.1, cy - r * 1.1); g.lineTo(x0 + r * 2.1, cy - r * 1.1); g.lineTo(x1, cy); g.moveTo(x0 + r * 1.1, cy - r * 1.1); g.lineTo(x0 + r * 1.3, cy); g.lineTo(x0, cy); g.moveTo(x0 + r * 1.3, cy); g.lineTo(x0 + r * 2.1, cy - r * 1.1); g.stroke();
  } else if (m === "star") {              // a big star (winter / Christmas market)
    const cx = w * 0.8, cy = h * 0.45, R = h * 0.24;
    g.fillStyle = ac; g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * 0.42 : R; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.8)"; for (let i = 0; i < 40; i++) { const x = ((i * 97) % 100) / 100 * w, y = ((i * 61) % 100) / 100 * h; g.fillRect(x, y, u * 0.8, u * 0.8); }
  } else if (m === "house") {             // a house outline (insurance / estate)
    const cx = w * 0.8, cy = h * 0.62, s = h * 0.28;
    g.fillStyle = ac; g.beginPath(); g.moveTo(cx - s, cy); g.lineTo(cx, cy - s * 0.9); g.lineTo(cx + s, cy); g.closePath(); g.fill();
    g.fillRect(cx - s * 0.75, cy, s * 1.5, s * 0.8); g.fillStyle = fg; g.fillRect(cx - s * 0.15, cy + s * 0.3, s * 0.3, s * 0.5);
  } else if (m === "film") {              // film strip frames
    g.fillStyle = "rgba(0,0,0,0.55)"; g.fillRect(w * 0.58, 0, w * 0.34, h);
    g.fillStyle = ac; for (let i = 0; i < 3; i++) g.fillRect(w * 0.62, h * (0.08 + i * 0.3), w * 0.26, h * 0.24);
    g.fillStyle = "#fff"; for (let i = 0; i < 10; i++) { g.fillRect(w * 0.59, h * (0.02 + i * 0.1), w * 0.015, h * 0.05); g.fillRect(w * 0.895, h * (0.02 + i * 0.1), w * 0.015, h * 0.05); }
  } else if (m === "phone") {             // a phone with signal bars
    const x = w * 0.74, y = h * 0.14, pw = h * 0.3, ph = h * 0.62;
    g.fillStyle = "#111"; g.fillRect(x, y, pw, ph); g.fillStyle = ac; g.fillRect(x + pw * 0.08, y + ph * 0.06, pw * 0.84, ph * 0.8);
    g.fillStyle = fg; for (let i = 0; i < 4; i++) g.fillRect(x + pw * (0.2 + i * 0.17), y + ph * (0.62 - i * 0.1), pw * 0.12, ph * (0.18 + i * 0.1));
  } else if (m === "glass") {             // a beer glass
    const cx = w * 0.8, top = h * 0.16, bot = h * 0.84, tw = h * 0.2, bw = h * 0.15;
    g.fillStyle = ac; g.beginPath(); g.moveTo(cx - tw, top + h * 0.08); g.lineTo(cx + tw, top + h * 0.08); g.lineTo(cx + bw, bot); g.lineTo(cx - bw, bot); g.fill();
    g.fillStyle = "#fffbe8"; g.beginPath(); g.ellipse(cx, top + h * 0.06, tw * 1.05, h * 0.07, 0, 0, Math.PI * 2); g.fill();
  } else if (m === "tag") {               // a sale tag
    const cx = w * 0.8, cy = h * 0.5;
    g.translate(cx, cy); g.rotate(-0.25); g.fillStyle = ac; g.fillRect(-h * 0.28, -h * 0.17, h * 0.56, h * 0.34);
    g.fillStyle = fg; g.font = `900 ${Math.round(h * 0.2)}px "Arial Black", Arial, sans-serif`; g.textAlign = "center"; g.fillText("-50%", 0, h * 0.07);
  }
  g.restore();
}

// ------------------------------------------------------------------------------------------------ geometry
/** a growing triangle soup: position, normal, colour + roughness (aCR), emissive (aEm: x day, y night) */
export class Soup {
  constructor() { this.p = []; this.n = []; this.cr = []; this.em = []; this.uv = []; this.ex = []; this.tt = []; }
  quad(a, b, c, d, n, col, rough, em = [0, 0], uvq = null, ex = null) {
    for (const [v, k] of [[a, 0], [b, 1], [c, 2], [a, 0], [c, 2], [d, 3]]) {
      this.p.push(v[0], v[1], v[2]); this.n.push(n[0], n[1], n[2]); this.cr.push(col.r, col.g, col.b, rough); const e = Array.isArray(em[0]) ? em[k] : em; this.em.push(e[0], e[1]);
      if (uvq) this.uv.push(uvq[k][0], uvq[k][1]); else this.uv.push(0, 0);
      if (ex) this.ex.push(...ex(k)); else this.ex.push(0, 0, 0, 0);
    }
  }

}

/** the board's frame: world = O + t * a + up * b + n * c */
export function frameOf(b) {
  const [x, y, z] = b.at.p, [nx, nz] = b.at.n;
  const t = [nz, 0, -nx], n = [nx, 0, nz];            // t: the viewer's right, seen from outside (t x up = n)
  const P = (a, h, c) => [x + t[0] * a + n[0] * c, y + h, z + t[2] * a + n[2] * c];
  const V = (a, h, c) => [t[0] * a + n[0] * c, h, t[2] * a + n[2] * c];
  return { P, V, t, n };
}

/** an axis-aligned box in the board's frame: a in [a0, a1], h in [h0, h1], c in [c0, c1] (5 faces: not the back
 *  unless `back`, never the bottom unless `bottom`) */
function box(S, F, a0, a1, h0, h1, c0, c1, col, rough, em = [0, 0], o = {}) {
  const { P, V } = F, N = (a, h, c) => { const v = V(a, h, c), l = Math.hypot(...v); return v.map((q) => q / l); };
  S.quad(P(a0, h0, c1), P(a1, h0, c1), P(a1, h1, c1), P(a0, h1, c1), N(0, 0, 1), col, rough, o.frontEm || em);   // front
  S.quad(P(a1, h0, c1), P(a1, h0, c0), P(a1, h1, c0), P(a1, h1, c1), N(1, 0, 0), col, rough, em);               // right
  S.quad(P(a0, h0, c0), P(a0, h0, c1), P(a0, h1, c1), P(a0, h1, c0), N(-1, 0, 0), col, rough, em);              // left
  S.quad(P(a0, h1, c1), P(a1, h1, c1), P(a1, h1, c0), P(a0, h1, c0), [0, 1, 0], col, rough, em);                // top
  if (o.bottom !== false) S.quad(P(a0, h0, c0), P(a1, h0, c0), P(a1, h0, c1), P(a0, h0, c1), [0, -1, 0], col, rough, o.bottomEm || em);
  if (o.back) S.quad(P(a1, h0, c0), P(a0, h0, c0), P(a0, h1, c0), P(a1, h1, c0), N(0, 0, -1), col, rough, em);
}

/** -> { frames: Soup, posters: Soup, slats: Soup, stats } for every board */
export function buildBoards(doc, cells) {
  const frames = new Soup(), posters = new Soup(), slats = new Soup();
  const stats = { boards: 0, prisms: 0, slats: 0 }, ranges = [];
  doc.boards.forEach((b, bi) => {
    const K = FRAME[b.kind] || FRAME.panel, F = frameOf(b), W = b.w, H = b.h, hw = W / 2, bd = K.border;
    const roof = b.mount === "roof", back = b.kind === "backlit", lit = b.lit === "front", prism = b.kind === "trivision";
    const c0 = K.standoff, c1 = c0 + K.depth;
    const cellsOf = (b.posters || []).map((id) => cells[id]).filter(Boolean);
    if (!cellsOf.length) return;
    stats.boards++;
    ranges.push({ id: b.id, f: frames.p.length, p: posters.p.length, s: slats.p.length });   // (the gate: what each board drew)
    // the box (the poster's back plate inside the border), its back closed on a roof board, the LED edge on a backlit one
    const edgeEm = back ? [0.0, 1.0] : [0, 0];
    box(frames, F, -hw - bd, hw + bd, -bd, H + bd, c0, c1, roof ? GALV : STEEL, 0.55, [0, 0], { back: roof || c0 > 0.01 });
    // the lips round the poster (in front of the plate): the LED strip is their inner face on a backlit board
    const lip = K.lip, cl = c1 + lip;
    if (lip > 0) {
      box(frames, F, -hw - bd, -hw, -bd, H + bd, c1, cl, STEEL_DARK, 0.5, [0, 0]);
      box(frames, F, hw, hw + bd, -bd, H + bd, c1, cl, STEEL_DARK, 0.5, [0, 0]);
      box(frames, F, -hw, hw, H, H + bd, c1, cl, STEEL_DARK, 0.5, [0, 0], { bottomEm: edgeEm });
      box(frames, F, -hw, hw, -bd, 0, c1, cl, STEEL_DARK, 0.5, [0, 0]);
    }
    // the lit edge: a 3 cm LED band on the lips' front round the poster (white by day, glowing at night on a backlit
    // board, a faint glow on the others' when lit from the front)
    if (lip > 0 && (back || lit)) {
      const e = 0.035, ce = cl + 0.002, eg = rgb(0.85, 0.86, 0.84), eem = [0.0, back ? 1.6 : 0.5], nf = F.V(0, 0, 1);
      frames.quad(F.P(-hw - e, -e, ce), F.P(hw + e, -e, ce), F.P(hw + e, 0, ce), F.P(-hw - e, 0, ce), nf, eg, 0.3, eem);
      frames.quad(F.P(-hw - e, H, ce), F.P(hw + e, H, ce), F.P(hw + e, H + e, ce), F.P(-hw - e, H + e, ce), nf, eg, 0.3, eem);
      frames.quad(F.P(-hw - e, 0, ce), F.P(-hw, 0, ce), F.P(-hw, H, ce), F.P(-hw - e, H, ce), nf, eg, 0.3, eem);
      frames.quad(F.P(hw, 0, ce), F.P(hw + e, 0, ce), F.P(hw + e, H, ce), F.P(hw, H, ce), nf, eg, 0.3, eem);
    }
    // wall brackets (the stand-off), two rows
    const ground = b.mount === "ground";
    if (!roof && !ground && c0 > 0.03) for (const fh of [0.2, 0.8]) for (const fa of [-0.35, 0.35]) box(frames, F, fa * W - 0.05, fa * W + 0.05, fh * H - 0.05, fh * H + 0.05, 0, c0, STEEL_DARK, 0.6, [0, 0]);
    // a roof board's legs (I-section posts down to the roof), braces back to the roof, the service walkway
    if (roof) {
      const foot = -(b.at.leg ?? ROOF.legClear), nLeg = Math.max(2, Math.round(W / 3.2) + 1);
      for (let i = 0; i < nLeg; i++) {
        const a = -hw + (W * i) / (nLeg - 1);
        box(frames, F, a - 0.09, a + 0.09, foot, -bd, c0 - 0.16, c0, GALV, 0.6, [0, 0], { back: true, bottom: false });
        // the brace: a slim post from the board's top third down to the roof ROOF.brace m behind
        const steps = 6;
        for (let s = 0; s < steps; s++) {
          const h0 = foot + ((H * 0.66 - foot) * s) / steps, h1 = foot + ((H * 0.66 - foot) * (s + 1)) / steps;
          const cA = -ROOF.brace * (1 - s / steps), cB = -ROOF.brace * (1 - (s + 1) / steps);
          box(frames, F, a - 0.05, a + 0.05, h0, h1 + 0.04, Math.min(cA, cB) - 0.04, Math.max(cA, cB) + 0.04, GALV, 0.6, [0, 0], { back: true, bottom: s === 0 });
        }
      }
      box(frames, F, -hw - bd, hw + bd, -bd - 0.08, -bd, c1, c1 + 0.7, GALV, 0.7, [0, 0], { back: true });   // walkway grate
    }
    // a free-standing board's legs: steel posts from the frame down into the ground (sunk: no gap at the foot, rule
    // joins), concrete feet, a cross rail between them
    if (ground && b.at.legs) {
      for (const [a, yf] of b.at.legs) {
        const h0 = yf - b.at.p[1];
        box(frames, F, a - 0.11, a + 0.11, h0, -bd, c0 - 0.26, c0 - 0.04, STEEL, 0.6, [0, 0], { back: true, bottom: false });
        box(frames, F, a - 0.17, a + 0.17, h0, h0 + 0.62, c0 - 0.32, c0 + 0.02, CONCRETE, 0.9, [0, 0], { back: true, bottom: false });
      }
      const a0 = b.at.legs[0][0], a1 = b.at.legs[b.at.legs.length - 1][0];
      box(frames, F, a0, a1, -bd - 0.55, -bd - 0.45, c0 - 0.2, c0 - 0.1, STEEL, 0.6, [0, 0], { back: true });
    }
    // front-lit boards: lamp arms over the top, the heads' undersides glow at night
    if (lit) {
      const nArm = Math.max(2, Math.round(W / 2.2));
      for (let i = 0; i < nArm; i++) {
        const a = -hw + (W * (i + 0.5)) / nArm;
        box(frames, F, a - 0.03, a + 0.03, H + bd, H + bd + 0.05, c1, c1 + 0.85, STEEL_DARK, 0.5, [0, 0]);
        box(frames, F, a - 0.2, a + 0.2, H + bd - 0.02, H + bd + 0.09, c1 + 0.7, c1 + 0.98, LAMP, 0.35, [0, 0], { bottomEm: [0.05, 2.2] });
      }
    }
    // the poster face(s)
    const gl = back ? 1.0 : lit ? 0.85 : 0.0;      // night glow (x env.uNight): the backlit box, the lamps' wash
    // (front-lit: the wash falls off from the lamps at the top to 45 % at the foot)
    const emq = lit ? [[gl * 0.45, 1], [gl * 0.45, 1], [gl, 1], [gl, 1]] : [gl, 0];
    if (!prism) {
      const [u0, v0, u1, v1] = cellsOf[0], cp = c1 + 0.004;
      posters.quad(F.P(-hw, 0, cp), F.P(hw, 0, cp), F.P(hw, H, cp), F.P(-hw, H, cp), F.V(0, 0, 1), rgb(1, 1, 1), back ? 0.3 : 0.75, emq,
        [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);
      return;
    }
    // TRIVISION: N vertical slats, each a triangular prism (face width s), turning on its own axis
    stats.prisms++;
    const N = Math.max(6, Math.round(W / 0.2)), s = W / N, r = s / Math.sqrt(3), cAx = c1 + r + 0.01;
    const C3 = [0, 1, 2].map((k) => cellsOf[k % cellsOf.length]);
    const off = (bi * 2.3) % PRISM.cycle;                     // each board on its own beat
    for (let i = 0; i < N; i++) {
      const aAx = -hw + s * (i + 0.5), [ax, , az] = F.P(aAx, 0, cAx), delay = off + (PRISM.wave * i) / N;
      // local (along t, up, along n) of the prism round its axis; face k's outward normal at angle 120 k from +n
      for (let k = 0; k < 3; k++) {
        const th = (k * 2 * Math.PI) / 3, nl = [Math.sin(th), Math.cos(th)];                 // (t, n) components
        const tl = [Math.cos(th), -Math.sin(th)];                                            // the face's left -> right
        const m = [nl[0] * r / 2, nl[1] * r / 2];                                            // the face's centre (inradius)
        const L = [m[0] - tl[0] * s / 2, m[1] - tl[1] * s / 2], R = [m[0] + tl[0] * s / 2, m[1] + tl[1] * s / 2];
        const [u0, v0, u1, v1] = C3[k], ua = u0 + ((u1 - u0) * i) / N, ub = u0 + ((u1 - u0) * (i + 1)) / N;
        // position = the axis foot (world); the local offset rides aEx (t, up, n) + delay; the normal is local (t, 0, n)
        const loc = [[L[0], 0, L[1]], [R[0], 0, R[1]], [R[0], H, R[1]], [L[0], H, L[1]]];
        slats.quad([ax, b.at.p[1], az], [ax, b.at.p[1], az], [ax, b.at.p[1], az], [ax, b.at.p[1], az], [nl[0], 0, nl[1]], rgb(1, 1, 1), 0.45, lit ? [[gl * 0.45, 1], [gl * 0.45, 1], [gl, 1], [gl, 1]] : [gl, 0],
          [[ua, v0], [ub, v0], [ub, v1], [ua, v1]], (q) => [loc[q][0], loc[q][1], loc[q][2], delay]);
        for (let q = 0; q < 6; q++) slats.tt.push(F.t[0], F.t[2]);                          // the board's t (tx, tz)
      }
      stats.slats++;
    }
    // the prism row's axle rails top and bottom
    box(frames, F, -hw, hw, -0.06, 0, c1, cAx + r * 0.6, STEEL_DARK, 0.5, [0, 0]);
    box(frames, F, -hw, hw, H, H + 0.06, c1, cAx + r * 0.6, STEEL_DARK, 0.5, [0, 0]);
    box(frames, F, -hw - bd, -hw, -bd, H + bd, c1, cAx + r * 0.7, STEEL_DARK, 0.5, [0, 0]);
    box(frames, F, hw, hw + bd, -bd, H + bd, c1, cAx + r * 0.7, STEEL_DARK, 0.5, [0, 0]);
  });
  // each board's [start, end) in the three position arrays (floats)
  ranges.forEach((r, i) => { const n = ranges[i + 1]; r.f = [r.f, n ? n.f : frames.p.length]; r.p = [r.p, n ? n.p : posters.p.length]; r.s = [r.s, n ? n.s : slats.p.length]; });
  return { frames, posters, slats, stats, ranges };
}

// ------------------------------------------------------------------------------------------------ materials
/** the trivision's turn at time t for a slat with this delay: 120 degrees x (the steps done + the eased current one) */
export function prismAngle(t, delay) {
  const q = (t - delay) / PRISM.cycle, k = Math.floor(q), f = ((q - k) * PRISM.cycle) / PRISM.turn;
  const e = Math.min(Math.max(f, 0), 1);
  return (k + e * e * (3 - 2 * e)) * (2 * Math.PI) / 3;
}

