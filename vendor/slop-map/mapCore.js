// Map building blocks copied from mrdoob/slop-newyork js/nyc-map.js (MIT, © Mr.doob, see LICENSE in this folder),
// commit 536a907c605964421563f12f15c5e00d735fc94f. What was copied and what was changed: ORIGIN.md.
// Do not edit without logging it in CHANGES.md; our adaptation lives in viewer/map/.
//
// World frame: 1 unit = 1 m, x east, z south (the same as ours).

// ---------------------------------------------------------------------------------------------------------------------
// World-space vector layers: built once into Path2D objects (world metres) and drawn through a canvas transform
// ---------------------------------------------------------------------------------------------------------------------

// Point accessors for rings / polylines given as [{x, z}, ...] or flat [x0, z0, x1, z1, ...]
export function accessor(pts) {
  const flat = typeof pts[0] === 'number';
  return {
    n: flat ? pts.length >> 1 : pts.length,
    X: flat ? (i) => pts[2 * i] : (i) => pts[i].x,
    Z: flat ? (i) => pts[2 * i + 1] : (i) => pts[i].z
  };
}

export function boundsOf(pts) {
  const { n, X, Z } = accessor(pts);
  const b = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let i = 0; i < n; i++) {
    const x = X(i);
    const z = Z(i);
    if (x < b.minX) b.minX = x;
    if (x > b.maxX) b.maxX = x;
    if (z < b.minZ) b.minZ = z;
    if (z > b.maxZ) b.maxZ = z;
  }
  return b;
}

// Match Path2D.rect winding so overlapping outlines unite; reverse courtyard holes.
export function addRing(path, pts, hole = false) {
  if (!pts || pts.length < 3) return;
  const { n, X, Z } = accessor(pts);
  if (n < 3) return;
  let a = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) a += X(j) * Z(i) - X(i) * Z(j);
  if ((a >= 0) !== hole) {
    path.moveTo(X(0), Z(0));
    for (let i = 1; i < n; i++) path.lineTo(X(i), Z(i));
  } else {
    path.moveTo(X(n - 1), Z(n - 1));
    for (let i = n - 2; i >= 0; i--) path.lineTo(X(i), Z(i));
  }
  path.closePath();
}

export function addLine(path, pts) {
  if (!pts || pts.length < 2) return;
  const { n, X, Z } = accessor(pts);
  path.moveTo(X(0), Z(0));
  for (let i = 1; i < n; i++) path.lineTo(X(i), Z(i));
}

/**
 * A vector layer split into square tiles of Path2D, so a view only rasterizes the tiles it overlaps. Every item goes
 * to the tile holding its centre; a tile's bounds grow to cover its items.
 */
export class TiledLayer {
  constructor(size = 500) {
    this.size = size;
    this.tiles = new Map();
  }

  pathFor(b) {
    const ix = Math.floor((b.minX + b.maxX) * 0.5 / this.size);
    const iz = Math.floor((b.minZ + b.maxZ) * 0.5 / this.size);
    const key = `${ix},${iz}`;
    let t = this.tiles.get(key);
    if (!t) {
      t = { path: new Path2D(), minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ };
      this.tiles.set(key, t);
    } else {
      t.minX = Math.min(t.minX, b.minX);
      t.maxX = Math.max(t.maxX, b.maxX);
      t.minZ = Math.min(t.minZ, b.minZ);
      t.maxZ = Math.max(t.maxZ, b.maxZ);
    }
    return t.path;
  }

  ring(pts, holes = []) {
    if (!pts || pts.length < 3) return;
    const path = this.pathFor(boundsOf(pts));
    addRing(path, pts);
    for (const hole of holes) addRing(path, hole, true);
  }

  line(pts) {
    if (pts && pts.length > 1) addLine(this.pathFor(boundsOf(pts)), pts);
  }

  /** Calls fn(path) for every tile overlapping the view */
  each(v, fn) {
    for (const t of this.tiles.values()) {
      if (t.maxX < v.minX || t.minX > v.maxX || t.maxZ < v.minZ || t.minZ > v.maxZ) continue;
      fn(t.path);
    }
  }
}

// Street name labels: anchors every ~260 m along each straight run of a real centreline (fixed in the world, so labels
// never slide while the map pans), with the direction of the street there (never upside down: vertical names read
// upwards)
// [changed: the body of his ROAD_LABELS loop as a function of one polyline; `spacing` was the constant 260]
export function roadLabelAnchors(pts, spacing = 260) {
  const anchors = [];
  for (let i = 0; i + 1 < pts.length;) {
    // the straight run from pts[i]: consecutive segments within ~5° of its first one (the CSCL has a vertex at every
    // intersection, so an avenue is a chain of 80 m blocks)
    const a = pts[i];
    const dir = Math.atan2(pts[i + 1].z - a.z, pts[i + 1].x - a.x);
    let j = i + 1;
    while (j + 1 < pts.length) {
      const d = Math.atan2(pts[j + 1].z - pts[j].z, pts[j + 1].x - pts[j].x);
      let turn = Math.abs(d - dir);
      if (turn > Math.PI) turn = 2 * Math.PI - turn;
      if (turn > 0.09) break;
      j++;
    }
    const c = pts[j];
    i = j;
    const len = Math.hypot(c.x - a.x, c.z - a.z);
    if (len < 20) continue;
    let ang = Math.atan2(c.z - a.z, c.x - a.x);
    if (ang >= Math.PI * 0.5 - 0.01) ang -= Math.PI;
    else if (ang < -Math.PI * 0.5 - 0.01) ang += Math.PI;
    const k = Math.max(1, Math.round(len / spacing));
    for (let m = 0; m < k; m++) {
      const t = (m + 0.5) / k;
      anchors.push({ x: a.x + (c.x - a.x) * t, z: a.z + (c.z - a.z) * t, ang, len: len / k });
    }
  }
  return anchors;
}

/** A map viewport: centre (cx, cz) in world metres, s pixels per metre, w x h CSS pixels on a canvas of pixel ratio dpr */
export class MapView {
  constructor(cx, cz, s, w, h, dpr = 1) {
    this.cx = cx;
    this.cz = cz;
    this.s = s;
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.minX = cx - w / (2 * s);
    this.maxX = cx + w / (2 * s);
    this.minZ = cz - h / (2 * s);
    this.maxZ = cz + h / (2 * s);
  }

  /** Canvas transform for world metres */
  world(ctx) {
    const { s, dpr } = this;
    ctx.setTransform(s * dpr, 0, 0, s * dpr, dpr * (this.w * 0.5 - this.cx * s), dpr * (this.h * 0.5 - this.cz * s));
  }

  /** Canvas transform for CSS pixels from the canvas centre (what toX / toY return) */
  screen(ctx) {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, this.dpr * this.w * 0.5, this.dpr * this.h * 0.5);
  }

  toX(x) {
    return (x - this.cx) * this.s;
  }

  toY(z) {
    return (z - this.cz) * this.s;
  }

  sees(b) {
    return b && b.maxX >= this.minX && b.minX <= this.maxX && b.maxZ >= this.minZ && b.minZ <= this.maxZ;
  }
}

// Player heading arrow at the (already rotated) origin: white, on a dark halo
// [changed: the halo and fill colours are arguments (were MAP.halo / '#ffffff')]
export function drawPlayerArrow(ctx, tipY, halfWidth, tailY, halo = 'rgba(8, 11, 15, 0.9)', fill = '#ffffff') {
  ctx.beginPath();
  ctx.moveTo(0, tipY);
  ctx.lineTo(halfWidth, tailY);
  ctx.lineTo(0, tailY * 0.45);
  ctx.lineTo(-halfWidth, tailY);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = halo;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
}

export const overlaps = (boxes, b) => boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);

// [changed: his NYCMapSystem.textWidth method as a small class]
export class TextWidths {
  constructor() {
    this.textWidths = new Map();
  }

  textWidth(ctx, text) {
    const key = `${ctx.font}|${ctx.letterSpacing || ''}|${text}`;
    let w = this.textWidths.get(key);
    if (w === undefined) {
      w = ctx.measureText(text).width;
      this.textWidths.set(key, w);
    }
    return w;
  }

  clear() {
    this.textWidths.clear();
  }
}

/**
 * Street names along the streets (screen transform of view v): the best anchor of each street that fits its name,
 * one label per street per `sameNameGap` pixels, none overlapping another (or the boxes already in `placed`)
 * [changed: a free function. `labels` = his ROAD_LABELS entries ({ text, lower, raw, major, highway, anchors, minX..maxZ }),
 *  `q` = his this.searchHighlight, `tw` = a TextWidths, `colors` = { halo, search, highway, major, minor } (were MAP.* and
 *  literals), `font` = the font family (was FONT)]
 */
export function drawRoadLabels(ctx, v, labels, tw, colors, font, { fontPx = 10, maxLabels = 400, sameNameGap = 260, placed = [], majorOnly = false, q = '' } = {}) {
  const s = v.s;
  ctx.font = `600 ${fontPx}px ${font}`;
  const inset = (fontPx * 2.5) / s;
  const minX = v.minX + inset;
  const maxX = v.maxX - inset;
  const minZ = v.minZ + inset;
  const maxZ = v.maxZ - inset;
  const cands = [];
  for (const l of labels) {
    if (l.maxX < minX || l.minX > maxX || l.maxZ < minZ || l.minZ > maxZ) continue;
    const hit = q.length > 0 && (l.lower.includes(q) || l.raw.includes(q));
    if (majorOnly && !l.major && !hit) continue;
    const width = tw.textWidth(ctx, l.text);
    const need = (width + 14) / s;
    for (const a of l.anchors) {
      if (a.len < need || a.x < minX || a.x > maxX || a.z < minZ || a.z > maxZ) continue;
      const d = Math.hypot(a.x - v.cx, a.z - v.cz) * s;
      cands.push({ l, a, width, hit, score: (hit ? 1e6 : 0) + (l.highway ? 3000 : 0) + (l.major ? 2000 : 0) + Math.min(a.len * s, 400) - d * 0.5 });
    }
  }
  cands.sort((a, b) => b.score - a.score);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = colors.halo;
  const byName = new Map();
  let n = 0;
  for (const c of cands) {
    if (n >= maxLabels) break;
    const X = v.toX(c.a.x);
    const Y = v.toY(c.a.z);
    const same = byName.get(c.l.text);
    if (same && same.some(([x, y]) => Math.hypot(x - X, y - Y) < sameNameGap)) continue;
    const hw = c.width * 0.5 + 3;
    const hh = fontPx * 0.5 + 2;
    const ca = Math.abs(Math.cos(c.a.ang));
    const sa = Math.abs(Math.sin(c.a.ang));
    const bx = hw * ca + hh * sa;
    const by = hw * sa + hh * ca;
    const box = [X - bx, Y - by, X + bx, Y + by];
    if (overlaps(placed, box)) continue;
    placed.push(box);
    if (same) same.push([X, Y]);
    else byName.set(c.l.text, [[X, Y]]);
    ctx.save();
    ctx.translate(X, Y);
    ctx.rotate(c.a.ang);
    ctx.fillStyle = c.hit ? colors.search : c.l.highway ? colors.highway : c.l.major ? colors.major : colors.minor;
    ctx.strokeText(c.l.text, 0, 0);
    ctx.fillText(c.l.text, 0, 0);
    ctx.restore();
    n++;
  }
  ctx.textBaseline = 'alphabetic';
}

// [changed: a free function; colours and font are arguments (were MAP.halo, literals, FONT)]
export function drawScaleBar(ctx, v, font, halo = 'rgba(8, 11, 15, 0.9)', ink = 'rgba(236, 239, 244, 0.92)') {
  const target = 120 / v.s; // metres in ~120 px
  const pow = Math.pow(10, Math.floor(Math.log10(target)));
  const step = [1, 2, 5, 10].map((m) => m * pow).filter((m) => m <= target).pop() || pow;
  const len = step * v.s;
  const x0 = -v.w * 0.5 + 24;
  const y0 = v.h * 0.5 - 26;
  const label = step >= 1000 ? `${step / 1000} km` : `${step} m`;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0 - 6);
  ctx.lineTo(x0, y0);
  ctx.lineTo(x0 + len, y0);
  ctx.lineTo(x0 + len, y0 - 6);
  ctx.strokeStyle = halo;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = `650 11px ${font}`;
  ctx.textAlign = 'left';
  ctx.lineWidth = 3;
  ctx.strokeStyle = halo;
  ctx.strokeText(label, x0 + len + 8, y0 + 3);
  ctx.fillStyle = ink;
  ctx.fillText(label, x0 + len + 8, y0 + 3);
}

/**
 * The full map's pointer interaction: pan with pointer capture (a click is a drag under 5 px), wheel zoom about the
 * cursor (the place under it stays put).
 * [changed: his initEvents() canvas handlers as a function. `st` holds his viewCenterX / viewCenterZ / viewZoom /
 *  isPanning / panPointerId / panStart / dragMoved; `opts` = { isOpen(), minZoom, maxZoom, render(), onHover(x, z),
 *  onClick(x, z), wrap } (were this.isFullMapOpen, MIN_ZOOM / MAX_ZOOM, this.renderFullMap(), the hover-info text,
 *  the teleport + waypoint code, this.fullCanvasWrap). Returns { cancelPan, screenToWorld }]
 */
export function attachPanZoom(canvas, st, opts) {
  const screenToWorld = (sx, sy, width, height) => ({
    x: st.viewCenterX + (sx - width * 0.5) / st.viewZoom,
    z: st.viewCenterZ + (sy - height * 0.5) / st.viewZoom
  });
  const cancelPan = () => {
    const id = st.panPointerId;
    st.panPointerId = null;
    st.isPanning = false;
    if (opts.wrap) opts.wrap.classList.remove('is-panning');
    if (id !== null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  };
  st.panPointerId = null;
  st.isPanning = false;
  st.panStart = { x: 0, y: 0, cx: 0, cz: 0 };
  st.dragMoved = false;

  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !opts.isOpen() || st.panPointerId !== null) return;
    e.preventDefault();
    st.panPointerId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    st.isPanning = true;
    st.dragMoved = false;
    st.panStart.x = e.clientX;
    st.panStart.y = e.clientY;
    st.panStart.cx = st.viewCenterX;
    st.panStart.cz = st.viewCenterZ;
    if (opts.wrap) opts.wrap.classList.add('is-panning');
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!opts.isOpen()) return;
    if (st.isPanning ? e.pointerId !== st.panPointerId : e.pointerType !== 'mouse') return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (st.isPanning) {
      e.preventDefault();
      const dx = e.clientX - st.panStart.x;
      const dy = e.clientY - st.panStart.y;
      if (Math.hypot(dx, dy) > 5) st.dragMoved = true;
      st.viewCenterX = st.panStart.cx - dx / st.viewZoom;
      st.viewCenterZ = st.panStart.cz - dy / st.viewZoom;
      opts.render();
      return;
    }

    if (mx >= 0 && mx <= rect.width && my >= 0 && my <= rect.height) {
      const wPos = screenToWorld(mx, my, rect.width, rect.height);
      opts.onHover?.(wPos.x, wPos.z, mx, my);
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    if (e.pointerId !== st.panPointerId) return;
    const clicked = !st.dragMoved && Math.hypot(e.clientX - st.panStart.x, e.clientY - st.panStart.y) <= 5;
    cancelPan();
    if (clicked && opts.isOpen()) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (mx >= 0 && mx <= rect.width && my >= 0 && my <= rect.height) {
        const wPos = screenToWorld(mx, my, rect.width, rect.height);
        opts.onClick?.(wPos.x, wPos.z, mx, my);
      }
    }
  });
  for (const type of ['pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(type, (e) => {
      if (e.pointerId === st.panPointerId) cancelPan();
    });
  }
  window.addEventListener('blur', () => cancelPan());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelPan();
  });

  // Wheel zoom about the cursor (the place under it stays put)
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const before = screenToWorld(mx, my, rect.width, rect.height);
    const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
    st.viewZoom = Math.max(opts.minZoom, Math.min(opts.maxZoom, st.viewZoom * factor));
    st.viewCenterX = before.x - (mx - rect.width * 0.5) / st.viewZoom;
    st.viewCenterZ = before.z - (my - rect.height * 0.5) / st.viewZoom;
    opts.render();
  }, { passive: false });

  return { cancelPan, screenToWorld };
}
