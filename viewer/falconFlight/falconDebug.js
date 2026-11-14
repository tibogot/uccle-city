// THE FALCON'S COLLIDERS, key G in fly mode (?falcondebug=1 at start), the same idea as the drive mode's G view
// (viewer/drive/debugDraw.js): what the bird's own collision (flightModel.js collide against cityStream.js column)
// stands on round it, so it can be checked against what is drawn.
//   floor lattice   1 m lines over the solid under the bird's height, +-RADIUS m round it, coloured by what made it:
//                   ground (grey-green), a drawn roof (yellow: the roof surface grid, viewer/tileData.js roofSurface), the
//                   church / a landmark's proxy (orange), a road deck (cyan), a tree's dense core or trunk (green)
//   ceilings        an arch / a crown's underside over the bird (blue)
//   trees           each crown's dense core (the hit) and its soft shell (brush only: drag), as wire ellipses
//   the bird        its 0.35 m collision sphere (white; red for 1.5 s after a contact) and the contact normal
// One LineSegments with static buffers written in their used range (no DynamicDrawUsage), refilled every 4th frame,
// added to the scene on the first show. A legend (bottom left) names the colours and counts the trees.
import * as THREE from "three/webgpu";

const MAX = 40000, RADIUS = 18, R = 0.35;
const C = { ground: [0.55, 0.75, 0.55], roof: [1, 0.85, 0.2], hero: [1, 0.55, 0.15], deck: [0.2, 0.9, 1], tree: [0.3, 1, 0.3], ceil: [0.35, 0.55, 1],
  shell: [0.2, 0.55, 0.25], bird: [1, 1, 1], hit: [1, 0.2, 0.2] };
const css = (c) => `rgb(${c.map((v) => Math.round(v * 255)).join(",")})`;

export class FalconDebug {
  constructor(scene) {
    this.scene = scene; this.want = false; this.frame = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX * 3); this.col = new Float32Array(MAX * 3);
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(this.col, 3));
    g.setDrawRange(0, 0);
    this.lines = new THREE.LineSegments(g, new THREE.LineBasicNodeMaterial({ vertexColors: true, depthTest: false, transparent: true }));
    this.lines.frustumCulled = false; this.lines.renderOrder = 999; this.lines.visible = false; this.lines.name = "falcon-debug";
    this.legend = document.createElement("div");
    Object.assign(this.legend.style, { position: "fixed", left: "12px", bottom: "12px", padding: "6px 10px", borderRadius: "6px", background: "rgba(20,24,30,.75)",
      color: "#e8edf2", font: "12px/1.5 ui-monospace, monospace", display: "none", zIndex: 3, pointerEvents: "none" });
    document.body.append(this.legend);
  }
  set visible(v) { this.want = v; this.frame = 0; if (!v) { this.lines.visible = false; this.legend.style.display = "none"; } }
  get visible() { return this.want; }

  /** w: CityFalconWorld; f: the flight (pos, contact, t) */
  update(w, f) {
    if (!this.want || !w || !f) return;
    if (!this.lines.parent) this.scene.add(this.lines);
    if (this.frame++ % 4) return;
    const P = this.pos, Cc = this.col;
    let n = 0;
    const seg = (ax, ay, az, bx, by, bz, rgb) => { if (n + 2 > MAX) return; P[n * 3] = ax; P[n * 3 + 1] = ay; P[n * 3 + 2] = az; P[n * 3 + 3] = bx; P[n * 3 + 4] = by; P[n * 3 + 5] = bz; Cc.set(rgb, n * 3); Cc.set(rgb, n * 3 + 3); n += 2; };
    const bx = f.pos.x, by = f.pos.y, bz = f.pos.z;
    const N = RADIUS * 2 + 1, x0 = Math.floor(bx) - RADIUS, z0 = Math.floor(bz) - RADIUS;
    const F = new Float32Array(N * N), K = new Uint8Array(N * N), CE = new Float32Array(N * N);
    const kinds = [C.ground, C.roof, C.hero, C.deck, C.tree], seen = new Map();
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = x0 + i, z = z0 + j, c = w.column(x, z, by), k = j * N + i;
      F[k] = c.floor; CE[k] = c.ceil;
      const gr = w.ground(x, z), rf = w.roof(x, z), dk = w.city.decks?.length ? w.city.deckY(x, z) : null;
      if (c.tree != null && c.floor > gr + 0.05 && Math.abs(c.floor - rf) > 0.05) { K[k] = 4; if (c.treeTile) seen.set(`${c.treeTile.x0},${c.tree}`, [c.treeTile, c.tree]); }
      else if (rf > 0 && Math.abs(c.floor - rf) < 0.05) K[k] = 1;
      else if (dk != null && Math.abs(c.floor - dk) < 0.05) K[k] = 3;
      else if (c.floor > gr + 0.05) K[k] = 2;
      else K[k] = 0;
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, x = x0 + i, z = z0 + j;
      // a line to the east / south neighbour; a step over 1 m (a facade, an eave) is drawn as a vertical edge
      for (const [di, dj] of [[1, 0], [0, 1]]) {
        if (i + di >= N || j + dj >= N) continue;
        const q = (j + dj) * N + i + di, rgb = kinds[K[k] === K[q] ? K[k] : Math.max(K[k], K[q])];
        if (Math.abs(F[q] - F[k]) > 1) { const hi = F[q] > F[k] ? q : k; seg(x + di * 0.5, F[k] + 0.02, z + dj * 0.5, x + di * 0.5, F[q] + 0.02, z + dj * 0.5, kinds[K[hi]]); seg(x, F[k] + 0.02, z, x + di * 0.5, F[k] + 0.02, z + dj * 0.5, kinds[K[k]]); seg(x + di * 0.5, F[q] + 0.02, z + dj * 0.5, x + di, F[q] + 0.02, z + dj, kinds[K[q]]); }
        else seg(x, F[k] + 0.02, z, x + di, F[q] + 0.02, z + dj, rgb);
        if (CE[k] < 1e8 && CE[q] < 1e8) seg(x, CE[k], z, x + di, CE[q], z + dj, C.ceil);
      }
    }
    // the trees met in the lattice: their dense core (the hit) and soft shell (brush) as three wire ellipses each
    let trees = 0;
    for (const [td, idx] of seen.values()) {
      const T = td.T, b = idx * 8, cx = T[b], cz = T[b + 1], cy = T[b + 2], Rh = T[b + 3], Rv = T[b + 4];
      trees++;
      for (const [rh, rv, rgb] of [[Rh * 0.6, Rv * 0.85, C.tree], [Rh, Rv, C.shell]]) ellipses(seg, cx, cy, cz, rh, rv, rgb);
      seg(T[b + 5], w.ground(T[b + 5], T[b + 6]), T[b + 6], T[b + 5], cy, T[b + 6], C.tree);       // the trunk
    }
    // the bird's sphere and its last contact
    const hit = f.contact && f.t - f.contact.t < 1.5, rgb = hit ? C.hit : C.bird;
    ellipses(seg, bx, by, bz, R, R, rgb, 16);
    if (hit) { const h = f.contact; seg(h.x, h.y, h.z, h.x + h.nx * 2, h.y + h.ny * 2, h.z + h.nz * 2, C.hit); }
    const g = this.lines.geometry;
    g.setDrawRange(0, n);
    for (const a of [g.attributes.position, g.attributes.color]) { a.clearUpdateRanges(); a.addUpdateRange(0, n * 3); a.needsUpdate = true; }
    this.lines.visible = n > 0;
    const c = hit ? f.contact : null;
    this.legend.innerHTML = `<b>falcon colliders within ${RADIUS} m</b><br>` +
      [["ground", C.ground], ["roof (drawn surface)", C.roof], ["church / landmark", C.hero], ["road deck", C.deck], ["tree core (hit)", C.tree], ["tree shell (brush)", C.shell], ["ceiling (arch, crown)", C.ceil]]
        .map(([t, k]) => `<span style="color:${css(k)}">■</span> ${t}`).join("<br>") +
      `<br>trees near: ${trees}<br>floor under the bird: ${(F[RADIUS * N + RADIUS]).toFixed(2)} m, bird ${by.toFixed(2)} m` +
      (c ? `<br><span style="color:${css(C.hit)}">contact</span> ${c.wall ? "wall" : c.under ? "ceiling" : c.land ? "landing" : "ground"}${c.tree != null ? " (tree)" : ""}, ${c.vn.toFixed(1)} m/s` : "");
    this.legend.style.display = "";
  }
  dispose() { this.lines.removeFromParent(); this.lines.geometry.dispose(); this.legend.remove(); }
}

function ellipses(seg, cx, cy, cz, rh, rv, rgb, S = 20) {
  for (let s = 0; s < S; s++) {
    const a0 = s / S * Math.PI * 2, a1 = (s + 1) / S * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    seg(cx + c0 * rh, cy, cz + s0 * rh, cx + c1 * rh, cy, cz + s1 * rh, rgb);              // horizontal
    seg(cx + c0 * rh, cy + s0 * rv, cz, cx + c1 * rh, cy + s1 * rv, cz, rgb);              // x-y
    seg(cx, cy + s0 * rv, cz + c0 * rh, cx, cy + s1 * rv, cz + c1 * rh, rgb);              // z-y
  }
}
