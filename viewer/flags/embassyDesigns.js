// THE EMBASSY FLAGS' DESIGNS (rule embassy-flags; viewer/embassyFlags.js), drawn in code on a canvas like
// flagDesigns.js (merged into its FLAG_DESIGNS / FLAG_SOURCES). A national flag is an official design, not protected by
// copyright (public domain; Wikimedia Commons hosts each as PD): drawn here from the legal description named in
// EMBASSY_SOURCES. Where a flag carries a coat of arms or an emblem, it is drawn SIMPLIFIED to its main shapes (no
// lettering, no fine heraldry): readable at flag distance, and no copied artwork. Only the designs a real flag of the
// commune's embassies flies (data/places/embassy_flags.json) are here.
//   (g, w, h): the canvas context and the size; u along the fly from the hoist (x), v down from the top (y).

/** horizontal / vertical equal stripes (top to bottom, hoist to fly) */
function hStripes(g, w, h, c) { c.forEach((col, k) => { g.fillStyle = col; g.fillRect(0, Math.round((k * h) / c.length), w, Math.ceil(h / c.length) + 1); }); }
function vStripes(g, w, h, c) { c.forEach((col, k) => { g.fillStyle = col; g.fillRect(Math.round((k * w) / c.length), 0, Math.ceil(w / c.length) + 1, h); }); }
/** bands of given parts (top to bottom): [[parts, colour], ...] */
function bands(g, w, h, list) {
  const n = list.reduce((a, [p]) => a + p, 0);
  let y = 0;
  for (const [p, c] of list) { g.fillStyle = c; g.fillRect(0, Math.round((y * h) / n), w, Math.ceil((p * h) / n) + 1); y += p; }
}
/** an upright five-pointed star (outer radius r) */
function star(g, x, y, r) {
  const ri = r * 0.381966;
  g.beginPath();
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, rr = k % 2 ? ri : r; g[k ? "lineTo" : "moveTo"](x + Math.sin(a) * rr, y - Math.cos(a) * rr); }
  g.closePath(); g.fill();
}
/** a wreath of leaves round (cx, cy), radius r, open at the top; stem: an upright branch inside (Eritrea's olive) */
function wreath(g, cx, cy, r, col, stem = false) {
  g.fillStyle = col; g.strokeStyle = col; g.lineWidth = r * 0.06;
  for (const side of [-1, 1]) {
    g.beginPath();
    for (let k = 0; k <= 20; k++) { const a = Math.PI / 2 + side * (k / 20) * Math.PI * 0.85, x = cx + Math.cos(a) * r * 0.85, y = cy + Math.sin(a) * r * 0.85; g[k ? "lineTo" : "moveTo"](x, y); }
    g.stroke();
    for (let k = 0; k < 9; k++) {
      const a = Math.PI / 2 + side * (0.25 + k * 0.29), x = cx + Math.cos(a) * r * 0.85, y = cy + Math.sin(a) * r * 0.85;
      g.save(); g.translate(x, y); g.rotate(a + side * 0.6); g.beginPath(); g.ellipse(0, 0, r * 0.15, r * 0.06, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }
  if (stem) {
    g.beginPath(); g.moveTo(cx, cy + r * 0.75); g.lineTo(cx, cy - r * 0.6); g.stroke();
    for (let k = 0; k < 5; k++) for (const side of [-1, 1]) {
      g.save(); g.translate(cx, cy + r * (0.5 - k * 0.25)); g.rotate(-side * 0.8);
      g.beginPath(); g.ellipse(side * r * 0.12, 0, r * 0.13, r * 0.05, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }
}

export const EMBASSY_DESIGNS = {
  hungary: { name: "Hungary", aspect: 2, draw: (g, w, h) => hStripes(g, w, h, ["#CE2939", "#FFFFFF", "#477050"]) },
  bulgaria: { name: "Bulgaria", aspect: 5 / 3, draw: (g, w, h) => hStripes(g, w, h, ["#FFFFFF", "#00966E", "#D62612"]) },
  romania: { name: "Romania", aspect: 1.5, draw: (g, w, h) => vStripes(g, w, h, ["#002B7F", "#FCD116", "#CE1126"]) },
  ukraine: { name: "Ukraine", aspect: 1.5, draw: (g, w, h) => hStripes(g, w, h, ["#0057B7", "#FFD700"]) },
  burkina_faso: { name: "Burkina Faso", aspect: 1.5, draw: (g, w, h) => { hStripes(g, w, h, ["#EF2B2D", "#009E49"]); g.fillStyle = "#FCD116"; star(g, w / 2, h / 2 + h * 0.015, h * 0.17); } },
  eritrea: { name: "Eritrea", aspect: 2, draw: (g, w, h) => {
    hStripes(g, w, h, ["#12AD2B", "#418FDE"]);
    g.fillStyle = "#EA0437"; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h / 2); g.lineTo(0, h); g.closePath(); g.fill();
    wreath(g, h * 0.3, h / 2, h * 0.2, "#FFC726", true);
  } },
  kenya: { name: "Kenya", aspect: 1.5, draw: (g, w, h) => {
    bands(g, w, h, [[6, "#000000"], [1, "#FFFFFF"], [6, "#BB0000"], [1, "#FFFFFF"], [6, "#006600"]]);
    g.strokeStyle = "#FFFFFF"; g.lineWidth = h * 0.018;                     // two crossed white spears behind the shield
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(w / 2 - sx * h * 0.24, h * 0.12); g.lineTo(w / 2 + sx * h * 0.24, h * 0.88); g.stroke(); }
    const cx = w / 2, cy = h / 2, rx = h * 0.15, ry = h * 0.38;
    g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.clip();
    g.fillStyle = "#BB0000"; g.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    g.fillStyle = "#000000"; g.fillRect(cx - rx, cy - ry, rx * 0.55, ry * 2); g.fillRect(cx + rx * 0.45, cy - ry, rx * 0.55, ry * 2);
    g.fillStyle = "#FFFFFF"; g.beginPath(); g.ellipse(cx, cy, rx * 0.12, ry * 0.42, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  } },
  angola: { name: "Angola", aspect: 1.5, draw: (g, w, h) => {
    hStripes(g, w, h, ["#CC092F", "#000000"]);
    const cx = w * 0.5, cy = h * 0.5, R = h * 0.26, c = "#FFCB00";     // the half cog wheel, the machete, the star
    g.strokeStyle = c; g.fillStyle = c; g.lineWidth = h * 0.05;
    g.beginPath(); g.arc(cx, cy, R, Math.PI * 0.95, Math.PI * 2.3); g.stroke();
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (1.0 + k * 0.19);
      g.save(); g.translate(cx + Math.cos(a) * (R + h * 0.04), cy + Math.sin(a) * (R + h * 0.04)); g.rotate(a); g.fillRect(-h * 0.025, -h * 0.03, h * 0.05, h * 0.06); g.restore();
    }
    g.lineWidth = h * 0.045; g.beginPath(); g.moveTo(cx - R * 0.75, cy + R * 0.85); g.quadraticCurveTo(cx + R * 0.1, cy - R * 0.1, cx + R * 0.7, cy - R * 0.75); g.stroke();
    star(g, cx - R * 0.05, cy - R * 0.2, h * 0.07);
  } },
  nicaragua: { name: "Nicaragua", aspect: 5 / 3, draw: (g, w, h) => {
    hStripes(g, w, h, ["#0067C6", "#FFFFFF", "#0067C6"]);
    // the arms simplified: the equilateral triangle (sky, five volcanoes, the sea) in its gold ring, no lettering
    const cx = w / 2, cy = h / 2, r = h * 0.14;
    g.strokeStyle = "#C8A400"; g.lineWidth = h * 0.012; g.beginPath(); g.arc(cx, cy, r * 1.25, 0, Math.PI * 2); g.stroke();
    const tri = () => { g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r * 0.87, cy + r * 0.5); g.lineTo(cx - r * 0.87, cy + r * 0.5); g.closePath(); };
    g.save(); tri(); g.clip();
    g.fillStyle = "#7FC6F0"; g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    g.fillStyle = "#2E8B3A";
    for (let k = 0; k < 5; k++) { const x = cx - r * 0.7 + k * r * 0.35; g.beginPath(); g.moveTo(x - r * 0.2, cy + r * 0.3); g.lineTo(x, cy); g.lineTo(x + r * 0.2, cy + r * 0.3); g.fill(); }
    g.fillStyle = "#1F5FAF"; g.fillRect(cx - r, cy + r * 0.3, 2 * r, r);
    g.restore(); tri(); g.stroke();
  } },
  afghanistan: { name: "Afghanistan (2013-2021)", aspect: 1.5, draw: (g, w, h) => {
    vStripes(g, w, h, ["#000000", "#D32011", "#007A36"]);
    // the emblem simplified to its outline: a mosque with its mihrab inside a wheat wreath, white, no lettering
    const cx = w / 2, cy = h / 2, R = h * 0.27;
    wreath(g, cx, cy, R, "#FFFFFF");
    g.fillStyle = "#FFFFFF";
    g.fillRect(cx - R * 0.45, cy - R * 0.05, R * 0.9, R * 0.45);
    g.beginPath(); g.arc(cx, cy - R * 0.05, R * 0.25, Math.PI, 0); g.fill();
    g.fillRect(cx - R * 0.55, cy - R * 0.45, R * 0.06, R * 0.85); g.fillRect(cx + R * 0.49, cy - R * 0.45, R * 0.06, R * 0.85);
    g.fillStyle = "#D32011";
    g.beginPath(); g.moveTo(cx - R * 0.1, cy + R * 0.4); g.lineTo(cx - R * 0.1, cy + R * 0.15); g.arc(cx, cy + R * 0.15, R * 0.1, Math.PI, 0); g.lineTo(cx + R * 0.1, cy + R * 0.4); g.fill();
  } },
  eswatini: { name: "Eswatini", aspect: 1.5, draw: (g, w, h) => {
    bands(g, w, h, [[3, "#3E5EB9"], [1, "#FFD900"], [8, "#B10C0C"], [1, "#FFD900"], [3, "#3E5EB9"]]);
    const cx = w / 2, cy = h / 2, rx = w * 0.2, ry = h * 0.17;             // the Nguni shield over a staff and two spears
    g.fillStyle = "#FFD900"; g.fillRect(w * 0.14, cy - h * 0.012, w * 0.72, h * 0.024);
    g.fillStyle = "#FFFFFF"; g.fillRect(w * 0.16, cy - h * 0.06, w * 0.66, h * 0.012); g.fillRect(w * 0.16, cy + h * 0.05, w * 0.66, h * 0.012);
    g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.clip();
    g.fillStyle = "#FFFFFF"; g.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    g.fillStyle = "#000000";
    g.beginPath(); g.moveTo(cx, cy - ry); g.bezierCurveTo(cx - rx * 0.3, cy - ry * 0.3, cx - rx * 0.3, cy + ry * 0.3, cx, cy + ry); g.lineTo(cx + rx, cy + ry); g.lineTo(cx + rx, cy - ry); g.fill();
    for (let k = -2; k <= 2; k++) { g.fillStyle = "#FFFFFF"; g.beginPath(); g.ellipse(cx + rx * 0.5, cy + k * ry * 0.33, rx * 0.06, ry * 0.08, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#000000"; g.beginPath(); g.ellipse(cx - rx * 0.5, cy + k * ry * 0.33, rx * 0.06, ry * 0.08, 0, 0, Math.PI * 2); g.fill(); }
    g.restore();
  } },
};

const PD = "public domain (official national flag)";
export const EMBASSY_SOURCES = {
  hungary: { source: "Fundamental Law of Hungary art. I (Commons: Flag of Hungary.svg, 1:2)", licence: PD },
  bulgaria: { source: "Constitution of Bulgaria art. 166 (Commons: Flag of Bulgaria.svg, 3:5)", licence: PD },
  romania: { source: "Constitution of Romania art. 12, Law 75/1994 (Commons: Flag of Romania.svg)", licence: PD },
  ukraine: { source: "Constitution of Ukraine art. 20, DSTU 4512:2006 (Commons: Flag of Ukraine.svg)", licence: PD },
  burkina_faso: { source: "Constitution of Burkina Faso art. 34 (Commons: Flag of Burkina Faso.svg)", licence: PD },
  eritrea: { source: "Proclamation 104/1997 (Commons: Flag of Eritrea.svg, 1:2); the olive wreath simplified", licence: PD },
  kenya: { source: "Constitution of Kenya 2010, 2nd schedule (Commons: Flag of Kenya.svg; bands 6:1:6:1:6); the shield and spears simplified", licence: PD },
  angola: { source: "Constitution of Angola art. 18 and annex (Commons: Flag of Angola.svg); the cog, machete and star simplified", licence: PD },
  nicaragua: { source: "Ley de los símbolos patrios (Commons: Flag of Nicaragua.svg, 3:5); the arms simplified to the triangle in its ring, no lettering", licence: PD },
  afghanistan: { source: "Constitution of Afghanistan 2004 art. 19 (Commons: Flag of Afghanistan (2013-2021).svg, the flag seen flown); the emblem simplified to its outline, no lettering", licence: PD },
  eswatini: { source: "the national flag of 1968 (Commons: Flag of Eswatini.svg; bands 3:1:8:1:3); the shield, staff and spears simplified", licence: PD },
};
