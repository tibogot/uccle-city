// THE BRUSSELS BICYCLE MARKING AND ITS CHEVRONS (claude/markings, census F, rule 33 provisional). Plain JS, shared by
// the tile worker (viewer/streets/measuredPaint.js: where the glyphs go), the paint shader (viewer/roadPaint.js
// paintMaterial: the same shapes as an analytic signed distance, box-filtered by its own pixel footprint, no texture,
// no facets) and the gate (tools/audit/census/markings.mjs: the geometry test).
//
// WHY. The old symbol was ten straight bars a wheel (decagons: the owner's "octagon wheels", 2026-11-18) and a frame of
// overlapping bars laid flat along the lane, and the overlapping transparent bars doubled the paint where they crossed.
// The real one (Brussels Mobility's inventory, polygon type P09, 608 surveyed in the city: ONE template, 1.50 m along
// the lane x 0.92 m across) is the standard Belgian bicycle pictogram (as on sign D7: two wheels, a diamond frame,
// saddle and handlebar, no rider) painted UPRIGHT for the road user coming toward it: its wheels side by side across
// the lane (the front wheel to the right), stretched along the lane (anamorphic) so it reads round from the saddle /
// driver's seat. The shared-lane chevrons (P10, 224 surveyed) are a 1.50 x 0.90 m "V" pointing the way of travel; on a
// suggested cycle lane ("bande cyclable suggérée": logo + chevrons) two of them stand 1.59 m and 2.38 m (centre to
// centre) ahead of the bicycle (the survey's median spacing). Shapes: our own drawing of the standard pictogram's
// parts (circles, strokes), sized to the survey's outline; nothing traced.
//
// Frames: the GLYPH frame (u along the lane, the way of travel, v across it, +v to the right; metres, the glyph's centre
// at 0, 0) and the SIGN frame of the bicycle (x forward = +v, y up = along u, the ground at y = 0): u = (y - Y_MID) *
// STRETCH, v = x.

/** the bicycle in the sign frame (metres): wheels (rings) and strokes (capsules) */
export const BIKE = (() => {
  const R = 0.185, RING = 0.055, W = 0.045, HUB = 0.25, hy = R + RING / 2;   // wheel centre height: the ring's bottom on the ground
  const rear = [-HUB, hy], front = [HUB, hy];
  const B = [-0.03, 0.195], S = [-0.1, 0.36], Ht = [0.16, 0.375], Hb = [0.185, 0.31];
  const seg = (a, b, w = W) => ({ a, b, w });
  return {
    rings: [{ c: rear, r: R, w: RING }, { c: front, r: R, w: RING }],
    segs: [
      seg(rear, B), seg(rear, S), seg(B, S), seg(S, Ht), seg(B, Hb), seg(Hb, front),       // chainstay, seat stay, seat tube, top tube, down tube, fork
      seg(S, [-0.115, 0.415]), seg([-0.17, 0.425], [-0.06, 0.425], 0.05),                   // seat post, saddle
      seg(Ht, [0.14, 0.425]), seg([0.14, 0.425], [0.21, 0.43]),                              // stem, handlebar
      seg(B, [0.015, 0.125], 0.035),                                                         // crank
    ],
  };
})();
/** the bicycle's sign-frame box (strokes included) */
const box = (() => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const g of BIKE.rings) { const e = g.r + g.w / 2; x0 = Math.min(x0, g.c[0] - e); x1 = Math.max(x1, g.c[0] + e); y0 = Math.min(y0, g.c[1] - e); y1 = Math.max(y1, g.c[1] + e); }
  for (const s of BIKE.segs) for (const p of [s.a, s.b]) { x0 = Math.min(x0, p[0] - s.w / 2); x1 = Math.max(x1, p[0] + s.w / 2); y0 = Math.min(y0, p[1] - s.w / 2); y1 = Math.max(y1, p[1] + s.w / 2); }
  return { x0, x1, y0, y1 };
})();
export const BIKE_LEN = 1.5;                                  // m along the lane (the survey's 1.50)
export const STRETCH = BIKE_LEN / (box.y1 - box.y0);          // the anamorphic stretch along the lane (~3.3)
export const Y_MID = (box.y0 + box.y1) / 2;
export const BIKE_WID = box.x1 - box.x0;                      // m across (the survey's 0.92)
export const X_MID = (box.x0 + box.x1) / 2;

/** the chevron (glyph frame, metres, centred): outer apex, left arm end (outer, inner), inner apex, right arm end */
export const CHEVRON = [[0.755, 0], [-0.745, -0.45], [-0.755, -0.35], [0.405, 0], [-0.755, 0.35], [-0.745, 0.45]];
export const CHEVRON_AT = [1.59, 2.38];                       // m ahead of the bicycle's centre (the survey's median)
export const GLYPH = { bike: 0, chevron: 1 };

// ---- the same distances in JS (the gate's geometry test; the shader builds these expressions in TSL)
const segD = (px, py, [ax, ay], [bx, by]) => {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, t = L2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2)) : 0;
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
};
/** signed distance (m, sign frame) to the bicycle: < 0 inside the paint */
export function bikeSD(x, y) {
  let d = Infinity;
  for (const g of BIKE.rings) d = Math.min(d, Math.abs(Math.hypot(x - g.c[0], y - g.c[1]) - g.r) - g.w / 2);
  for (const s of BIKE.segs) d = Math.min(d, segD(x, y, s.a, s.b) - s.w / 2);
  return d;
}
/** signed distance (m, glyph frame) to a polygon (any simple polygon; Inigo Quilez's sdPolygon) */
export function polySD(u, v, P) {
  let d = Infinity, s = 1;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    d = Math.min(d, segD(u, v, P[j], P[i]));
    const [xi, yi] = P[i], [xj, yj] = P[j];
    const c1 = v >= yj, c2 = v < yi, c3 = (xi - xj) * (v - yj) > (yi - yj) * (u - xj);
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * d;
}
/** glyph frame -> sign frame of the bicycle */
export const toSign = (u, v) => [v + X_MID, u / STRETCH + Y_MID];
/** signed distance of glyph `kind` at glyph-frame (u, v); for the bicycle in SIGN metres (the shader AA's by its own
 *  footprint, so the scale does not matter), for the chevron in metres */
export function glyphSD(kind, u, v) {
  if (kind === GLYPH.chevron) return polySD(u, v, CHEVRON);
  const [x, y] = toSign(u, v);
  return bikeSD(x, y);
}
/** the glyph's footprint half extents (m: along, across) with a margin for the filter */
export function glyphHalf(kind) {
  return kind === GLYPH.chevron ? [0.8, 0.5] : [BIKE_LEN / 2 + 0.05, BIKE_WID / 2 + 0.05];
}
