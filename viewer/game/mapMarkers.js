// MAP MARKERS (docs/GAMEKIT.md "Waypoints"): the game's waypoints and GPS route on the minimap and the full map, drawn
// through their overlay hooks (viewer/map/minimap.js `overlay`, viewer/map/fullMap.js `overlay`). The minimap redraws only
// when the view moves (its own skip test) or when we call redraw(): on a marker / route change, and ~8 times a second
// while a marker follows a moving target. Off the disc, a marker sits on the rim as an arrow pointing to it.
// The route comes from the map worker (viewer/map/mapRoute.js: A* over the city's road graph).
const TAU = Math.PI * 2;

export class MapMarkers {
  constructor() {
    this.list = [];            // [{ id, x, z, color, kind: 'goal' | 'target' | 'poi', label }]
    this.route = null;         // Float32Array [x, z, ...]
    this.routeColor = "#ffcc33";
    this.map = null;
  }
  /** attach to the city map (viewer/map/cityMap.js handle) once it exists */
  attach(map) {
    if (this.map === map || !map) return;
    this.map = map;
    map.mini.overlay = (ctx, toScreen, s, R) => this.drawMini(ctx, toScreen, s, R);
    map.full.overlay = (ctx, v, w, h) => this.drawFull(ctx, v, w, h);
    this.redraw();
  }
  redraw() { this.map?.mini.redraw(); if (this.map) this.map.full.dirty = true; }
  set(id, m) {
    const i = this.list.findIndex((o) => o.id === id);
    if (!m) { if (i >= 0) this.list.splice(i, 1); }
    else if (i >= 0) Object.assign(this.list[i], m);
    else this.list.push({ id, kind: "goal", color: "#ffcc33", ...m });
    this.redraw();
  }
  /** move a marker (a moving target): no redraw request of its own (the kit asks a few times a second) */
  move(id, x, z) { const o = this.list.find((q) => q.id === id); if (o) { o.x = x; o.z = z; } }
  clear() { this.list.length = 0; this.route = null; this.redraw(); }
  setRoute(pts, color = "#ffcc33") { this.route = pts; this.routeColor = color; this.redraw(); }

  pin(ctx, X, Y, color, kind, r = 7) {
    if (kind === "target") {          // a moving target: a pulsing disc
      ctx.beginPath(); ctx.arc(X, Y, r, 0, TAU); ctx.fillStyle = color; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = "#10141a"; ctx.stroke();
      ctx.beginPath(); ctx.arc(X, Y, r * 0.38, 0, TAU); ctx.fillStyle = "#fff"; ctx.fill();
      return;
    }
    ctx.beginPath(); ctx.arc(X, Y - r * 2, r, Math.PI * 0.82, Math.PI * 0.18); ctx.lineTo(X, Y); ctx.closePath();
    ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#10141a"; ctx.stroke();
    ctx.beginPath(); ctx.arc(X, Y - r * 2, r * 0.36, 0, TAU); ctx.fillStyle = "#10141a"; ctx.fill();
  }
  line(ctx, pts, map, width) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) { const [X, Y] = map(pts[i], pts[i + 1]); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.lineWidth = width + 3; ctx.strokeStyle = "rgba(16,20,26,.75)"; ctx.stroke();
    ctx.lineWidth = width; ctx.strokeStyle = this.routeColor; ctx.stroke();
  }
  drawMini(ctx, toScreen, s, R) {
    if (this.route) this.line(ctx, this.route, toScreen, 4);
    const lim = R - 12;
    for (const m of this.list) {
      const [X, Y] = toScreen(m.x, m.z), d = Math.hypot(X, Y);
      if (d <= lim) { this.pin(ctx, X, Y + (m.kind === "target" ? 0 : 0), m.color, m.kind); continue; }
      // on the rim: an arrow pointing out towards it
      const a = Math.atan2(Y, X), rx = Math.cos(a) * lim, ry = Math.sin(a) * lim;
      ctx.save(); ctx.translate(rx, ry); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, -7); ctx.lineTo(-3, 0); ctx.lineTo(-6, 7); ctx.closePath();
      ctx.fillStyle = m.color; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = "#10141a"; ctx.stroke();
      ctx.restore();
    }
  }
  drawFull(ctx, v) {
    const map = (x, z) => [v.toX(x), v.toY(z)];
    if (this.route) this.line(ctx, this.route, map, 5);
    for (const m of this.list) { const [X, Y] = map(m.x, m.z); this.pin(ctx, X, Y, m.color, m.kind, 9); }
  }
}
