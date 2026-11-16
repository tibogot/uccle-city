// THE LYCÉE FRANÇAIS JEAN MONNET'S FRONT (Avenue du Lycée Français 9; docs/CORTENBOSCH.md), the curated details a pupil
// or a neighbour knows, procedural JS (the owner's rule for flat / boxy parts), all from Street View Apr 2024 (look only)
// and the 2024 orthophoto:
//   - the white railing along the avenue's sidewalk (vertical bars on a low concrete plinth, posts every 2.5 m), from the
//     gatehouse along the roundabout and up the avenue (the sidewalk's back edge, UrbIS street surface 135976, 0.3 m in);
//   - the black sliding gate across the service road's mouth beside the gatehouse (OSM way 16293784);
//   - three flag poles before the white block's north-east end: Belgium, the EU, France (left to right from the avenue),
//     the flags themselves flown by viewer/flagsCity.js flyFlags (baked loops, live cloth near);
//   - the "Lycée Français / Jean Monnet" lettering on that end, by the round stair tower.
// One merged vertex-coloured mesh (the railing, gate, poles) + the lettering's quad: 2 draws, in tile F7's features
// group (it fades and unloads with the tile). ?cortenbosch=old: none.
import * as THREE from "three/webgpu";

const TILE = "F7";
// the sidewalk's back edge (UrbIS 135976), from the gatehouse to the avenue's east side (city x, z)
const RAIL = [[-309.9, 1154.5], [-293.8, 1142.6], [-285.1, 1136.2], [-277.5, 1121.7], [-277.1, 1112.0]];
const RAIL_IN = [-275, 1160];                    // a point inside the campus: the railing stands 0.3 m toward it
// the vehicle gate: from the gatehouse (UrbIS 533140, the stone-clad booth with the "9") across the road into the campus
// (Street View Jul 2013 shows the two pillars; Apr 2024 a black sliding gate)
const GATE = { c: [-315.95, 1153.65], dir: [-0.707, -0.707], w: 5.6, h: 2.0 };
// the poles: on the forecourt beside the brown pyramid canopy, read on the 2024 orthophoto (their lines at 20 cm) and the
// Street View bearings; from the avenue (north-east) left to right = Belgium, the EU, France (Apr 2024)
const POLES = [[-323.4, 1162.4, "belgium"], [-325.8, 1163.0, "eu"], [-328.0, 1163.5, "france"]];
const POLE_H = 8.0;
// the lettering: on the north-east end of 533155 (N corner -> the tower), outward normal (0.65, -0.759), in the band
// between the top floor's windows and the next row of the painted grid (5 storeys of 3.1 m from 68.1)
const SIGN = { a: [-335.34, 1192.86], b: [-324.87, 1201.83], at: 0.6, n: [0.65, -0.759], y: 80.62, w: 5.25, h: 1.45, lines: ["Lycée Français", "Jean Monnet"] };

const WHITE = [0.74, 0.74, 0.72], CONCRETE = [0.4, 0.39, 0.37], BLACK = [0.018, 0.018, 0.02], POLE = [0.62, 0.63, 0.64];

/** a box between two ground points: (x0, z0) -> (x1, z1) along, thickness t across, from y0 to y1 at each end (sheared
 *  with the ground), 5 faces (no bottom), flat normals */
function pushBox(B, x0, z0, x1, z1, t, y0a, y1a, y0b, y1b, col) {
  const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz) || 1, nx = (-dz / L) * t / 2, nz = (dx / L) * t / 2;
  const P = [
    [x0 - nx, y0a, z0 - nz], [x1 - nx, y0b, z1 - nz], [x1 + nx, y0b, z1 + nz], [x0 + nx, y0a, z0 + nz],
    [x0 - nx, y1a, z0 - nz], [x1 - nx, y1b, z1 - nz], [x1 + nx, y1b, z1 + nz], [x0 + nx, y1a, z0 + nz],
  ];
  const quad = (a, b, c, d) => {
    const pa = P[a], pb = P[b], pc = P[c];
    const ux = pb[0] - pa[0], uy = pb[1] - pa[1], uz = pb[2] - pa[2], vx = pc[0] - pa[0], vy = pc[1] - pa[1], vz = pc[2] - pa[2];
    let n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]; const l = Math.hypot(...n) || 1; n = n.map((v) => v / l);
    const base = B.pos.length / 3;
    for (const k of [a, b, c, d]) { B.pos.push(...P[k]); B.nrm.push(...n); B.col.push(...col); }
    B.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  quad(4, 7, 6, 5);                                // top
  quad(0, 1, 5, 4); quad(2, 3, 7, 6);              // the long sides
  quad(3, 0, 4, 7); quad(1, 2, 6, 5);              // the ends
}
/** a vertical tapered cylinder with smooth normals + a ball on top */
function pushPole(B, x, y, z, h, r0, r1, col) {
  const S = 14, base = B.pos.length / 3;
  for (let k = 0; k <= S; k++) {
    const a = (k / S) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    B.pos.push(x + c * r0, y, z + s * r0, x + c * r1, y + h, z + s * r1);
    B.nrm.push(c, 0, s, c, 0, s); B.col.push(...col, ...col);
  }
  for (let k = 0; k < S; k++) { const i = base + k * 2; B.idx.push(i, i + 1, i + 3, i, i + 3, i + 2); }
  // the ball (r 0.07) on top
  const R = 0.07, cy = y + h + R * 0.8, b2 = B.pos.length / 3, NU = 10, NV = 6;
  for (let j = 0; j <= NV; j++) for (let k = 0; k <= NU; k++) {
    const v = (j / NV) * Math.PI, u = (k / NU) * Math.PI * 2, nx = Math.sin(v) * Math.cos(u), ny = Math.cos(v), nz = Math.sin(v) * Math.sin(u);
    B.pos.push(x + nx * R, cy + ny * R, z + nz * R); B.nrm.push(nx, ny, nz); B.col.push(0.55, 0.45, 0.2);
  }
  for (let j = 0; j < NV; j++) for (let k = 0; k < NU; k++) { const a = b2 + j * (NU + 1) + k, b = a + NU + 1; B.idx.push(a, a + 1, b + 1, a, b + 1, b); }
}

/** a railing of vertical bars between two ground points: plinth (concrete) + bottom / top rails + bars; posts at the ends */
function pushRailPanel(B, ground, x0, z0, x1, z1, { plinth = 0.35, barH = 1.9, railTop = 1.62, gap = 0.12, col = WHITE, post = true, gate = false }) {
  const g0 = ground(x0, z0), g1 = ground(x1, z1), L = Math.hypot(x1 - x0, z1 - z0);
  const lo = Math.min(g0, g1, ground((x0 + x1) / 2, (z0 + z1) / 2)) - 0.3;                 // (JOINS: the plinth's foot buried)
  if (plinth > 0) pushBox(B, x0, z0, x1, z1, 0.24, lo, g0 + plinth, lo, g1 + plinth, CONCRETE);
  const t0 = g0 + plinth, t1 = g1 + plinth;
  const at = (f) => [x0 + (x1 - x0) * f, z0 + (z1 - z0) * f, t0 + (t1 - t0) * f];
  // rails: a flat bar near the foot and one under the bars' tops
  pushBox(B, x0, z0, x1, z1, 0.03, t0 + 0.06, t0 + 0.12, t1 + 0.06, t1 + 0.12, col);
  pushBox(B, x0, z0, x1, z1, 0.03, t0 + railTop, t0 + railTop + 0.06, t1 + railTop, t1 + railTop + 0.06, col);
  if (gate) pushBox(B, x0, z0, x1, z1, 0.035, t0 + barH - 0.05, t0 + barH, t1 + barH - 0.05, t1 + barH, col);
  const n = Math.max(1, Math.round(L / gap));
  const ux = (x1 - x0) / L, uz = (z1 - z0) / L, hw = 0.0125;
  for (let k = 1; k < n; k++) {
    const [x, z, y] = at(k / n);
    pushBox(B, x - ux * hw, z - uz * hw, x + ux * hw, z + uz * hw, 0.025, y + 0.06, y + barH, y + 0.06, y + barH, col);
  }
  if (post) {
    const pw = 0.03;
    pushBox(B, x0 - ux * pw, z0 - uz * pw, x0 + ux * pw, z0 + uz * pw, 0.06, t0, t0 + barH + 0.05, t0, t0 + barH + 0.05, col);
  }
}

function signTexture(lines) {
  const cv = document.createElement("canvas"); cv.width = 2048; cv.height = 566;
  const x = cv.getContext("2d");
  x.clearRect(0, 0, cv.width, cv.height);
  x.fillStyle = "#4b5460"; x.textAlign = "center"; x.textBaseline = "middle";
  x.font = "200px Georgia, 'Times New Roman', serif";
  x.fillText(lines[0], cv.width / 2, cv.height * 0.28);
  x.fillText(lines[1], cv.width / 2, cv.height * 0.74);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

let MAT = null, SIGN_MAT = null;
export const lyceeFront = {
  group: null, poles: null,
  /** the strip along the railing where no generated garden piece / plant stands (main.js plantsClear rings) */
  clearRings() {
    const out = [];
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [ax, az] = RAIL[i], [bx, bz] = RAIL[i + 1], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux, w = 1.3, e = 0.6;
      out.push([[ax - ux * e + nx * w, az - uz * e + nz * w], [bx + ux * e + nx * w, bz + uz * e + nz * w], [bx + ux * e - nx * w, bz + uz * e - nz * w], [ax - ux * e - nx * w, az - uz * e - nz * w]]);
    }
    return out;
  },
  /** tile `name`'s details (F7 only): a Group for its features group, or null. ground(x, z) = the drawn terrain. */
  tile(name, parent, ground) {
    if (name !== TILE) return null;
    const B = { pos: [], nrm: [], col: [], idx: [] };
    // the railing: 2.5 m panels along the back edge, 0.3 m toward the campus
    const off = RAIL.map((p, i) => {
      const a = RAIL[Math.max(0, i - 1)], b = RAIL[Math.min(RAIL.length - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      let nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
      if (nx * (RAIL_IN[0] - p[0]) + nz * (RAIL_IN[1] - p[1]) < 0) { nx = -nx; nz = -nz; }
      return [p[0] + nx * 0.3, p[1] + nz * 0.3];
    });
    let panels = 0;
    for (let i = 0; i < off.length - 1; i++) {
      const [ax, az] = off[i], [bx, bz] = off[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 2.5));
      for (let k = 0; k < n; k++) {
        const f0 = k / n, f1 = (k + 1) / n;
        pushRailPanel(B, ground, ax + (bx - ax) * f0, az + (bz - az) * f0, ax + (bx - ax) * f1, az + (bz - az) * f1, {});
        panels++;
      }
    }
    { const [x, z] = off[off.length - 1], y = ground(x, z) + 0.35; pushBox(B, x - 0.03, z, x + 0.03, z, 0.06, y, y + 1.95, y, y + 1.95, WHITE); }
    // the sliding gate: black bars, a frame, between two dark posts
    {
      const { c, dir, w, h } = GATE, x0 = c[0] - dir[0] * w / 2, z0 = c[1] - dir[1] * w / 2, x1 = c[0] + dir[0] * w / 2, z1 = c[1] + dir[1] * w / 2;
      pushRailPanel(B, ground, x0, z0, x1, z1, { plinth: 0.0, barH: h, railTop: h * 0.5, gap: 0.11, col: BLACK, gate: true });
      for (const [x, z] of [[x0, z0], [x1, z1]]) {
        const y = ground(x, z);
        pushBox(B, x - dir[0] * 0.08, z - dir[1] * 0.08, x + dir[0] * 0.08, z + dir[1] * 0.08, 0.16, y - 0.3, y + h + 0.2, y - 0.3, y + h + 0.2, [0.06, 0.06, 0.065]);
      }
    }
    // the flag poles
    this.poles = POLES.map(([x, z, design]) => {
      const y = ground(x, z);
      pushBox(B, x - 0.18, z, x + 0.18, z, 0.36, y - 0.3, y + 0.06, y - 0.3, y + 0.06, CONCRETE);        // the footing slab
      pushPole(B, x, y + 0.06, z, POLE_H, 0.05, 0.035, POLE);
      return { name: design, design, base: [x, y, z], tip: [x, y + 0.06 + POLE_H, z] };
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(B.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(B.nrm, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(B.col, 3));
    g.setIndex(B.idx); g.computeBoundingSphere();
    MAT ||= new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.0 });
    const mesh = new THREE.Mesh(g, MAT);
    mesh.name = "lycee-front"; mesh.castShadow = true; mesh.receiveShadow = true;
    // the lettering
    const { a, b, at, n, y, w, h, lines } = SIGN;
    const cx = a[0] + (b[0] - a[0]) * at + n[0] * 0.05, cz = a[1] + (b[1] - a[1]) * at + n[1] * 0.05;
    const rgt = [n[1], -n[0]];                                          // right as seen from outside: (-n) x up = (n.z, 0, -n.x)
    const sp = new Float32Array([
      cx - rgt[0] * w / 2, y - h / 2, cz - rgt[1] * w / 2, cx + rgt[0] * w / 2, y - h / 2, cz + rgt[1] * w / 2,
      cx + rgt[0] * w / 2, y + h / 2, cz + rgt[1] * w / 2, cx - rgt[0] * w / 2, y + h / 2, cz - rgt[1] * w / 2]);
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    sg.setAttribute("normal", new THREE.BufferAttribute(new Float32Array([n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1]]), 3));
    sg.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
    sg.setIndex([0, 1, 2, 0, 2, 3]); sg.computeBoundingSphere();
    SIGN_MAT ||= new THREE.MeshStandardNodeMaterial({ map: signTexture(lines), alphaTest: 0.45, roughness: 0.6, metalness: 0.2 });
    const sign = new THREE.Mesh(sg, SIGN_MAT);
    sign.name = "lycee-lettering"; sign.receiveShadow = true;
    const grp = new THREE.Group(); grp.name = "lycee-front"; grp.add(mesh, sign);
    parent.add(grp);
    this.group = grp;
    return { group: grp, panels, tris: B.idx.length / 3 + 2 };
  },
  /** the flags on the poles (viewer/flagsCity.js flyFlags), once the tile has built them; shown while the tile is */
  async flags({ scene, updaters, renderer, compiler, params, log }) {
    const { flyFlags } = await import("./flagsCity.js");
    for (let i = 0; !this.poles; i++) await new Promise((r) => setTimeout(r, i < 60 ? 500 : 3000));
    const shown = () => { let o = this.group; if (!o) return false; for (; o; o = o.parent) if (!o.visible) return false; return true; };
    const r = await flyFlags({ scene, updaters, renderer, compiler, params, poles: this.poles.map((p) => ({ ...p, width: 1.5, height: 1.0 })), shown });
    window.lyceeFlags = r;
    log(`lycée flags: ${r.flags.map((f) => f.design).join(" / ")} (viewer/lyceeFront.js), ${r.ms} ms`);
    return r;
  },
};
