// THE POLICE STATION'S YARD (Rue Rouge 17): the asphalt between the station and its street wall, with its markings, drawn
// on the city's OWN ground (procedural JS, the owner's rule for flat / boxy parts): a 0.5 m grid following groundAt(x, z)
// lifted 6 cm (the city's terrain and the lab's ground use the same 1 m DTM, so the slab never cuts through), a 15 cm
// skirt round its free edges (the paving's edge), the markings from a small canvas (white bay lines, the pedestrian
// lane to the entrance with its walker pictogram, the hatched no-parking box: read on the 2024 orthophoto, NOTES.md),
// a procedural asphalt (TSL: aggregate grain, patches, faint tyre wear in the bays). Positions in the station's building
// frame (u toward Rue Rouge, w south-east along it; site.json frame).
//   const yard = buildPoliceYard({ site, groundAt });  scene.add(yard.mesh)
import * as THREE from "three/webgpu";
import { uv, texture, vec2, vec3, float, floor, fract, mix, smoothstep, length, fwidth, Fn, dot, positionWorld } from "three/tsl";

// the yard outline in the frame (u, w): the north yard, the strip behind wing A, the south yard, the gate's mouth
const OUTLINE = [[0.3, -18.4], [26.1, -18.4], [26.1, 9.6], [26.6, 9.6], [26.6, 14.9], [26.1, 14.9], [26.1, 16.6], [-4.8, 16.6],
  [-4.8, 12.6], [5.32, 12.6], [5.32, 0.52], [14.59, 0.52], [14.59, -14.0], [0.3, -14.0]];
// markings (frame metres): bay lines, the lane, the hatched box, the walker
const U0 = -5.0, W0 = -19.0, SPAN_U = 32.0, SPAN_W = 36.0, PX = 32;            // canvas 1024 x 1152 (3.1 cm / px)

function inside(u, w, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > w) !== (yj > w) && u < ((xj - xi) * (w - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function markingsCanvas() {
  const c = document.createElement("canvas"); c.width = SPAN_U * PX; c.height = SPAN_W * PX;
  const x = c.getContext("2d");
  x.fillStyle = "#000"; x.fillRect(0, 0, c.width, c.height);
  const P = (u, w) => [(u - U0) * PX, (w - W0) * PX];
  const line = (a, b, wd = 0.1, col = "#fff") => { x.strokeStyle = col; x.lineWidth = wd * PX; x.lineCap = "butt"; x.beginPath(); x.moveTo(...P(...a)); x.lineTo(...P(...b)); x.stroke(); };
  // the north yard: 7 bays 2.5 m wide along the hedge (u 20.3..25.0), the patrol cars' places
  for (let k = 0; k <= 7; k++) { const w = -10.4 + k * 2.5; line([20.3, w], [25.0, w]); }
  line([20.3, -10.4], [20.3, 7.1]);
  // the line at the north end of the yard (the ortho's white stroke)
  line([21.0, -11.2], [24.9, -11.2]);
  // the south yard: 2 bays by wing B's front (u 6.3..11.7, w 0.9..6.5)
  for (const u of [6.3, 9.0, 11.7]) line([u, 0.9], [u, 6.5]);
  // the pedestrian lane from the gate to the entrance's corner: two lines, the walker pictogram half-way
  line([14.9, 1.3], [24.0, 9.3], 0.12); line([16.1, 0.6], [25.0, 8.3], 0.12);
  {
    const [cx, cy] = P(19.6, 4.9); const s = PX * 0.9;
    x.save(); x.translate(cx, cy); x.rotate(Math.atan2(8.0, 9.1) - Math.PI / 2); x.fillStyle = "#fff"; x.strokeStyle = "#fff"; x.lineWidth = s * 0.12; x.lineCap = "round";
    x.beginPath(); x.arc(0, -s * 0.62, s * 0.11, 0, Math.PI * 2); x.fill();
    const L = (a, b) => { x.beginPath(); x.moveTo(a[0] * s, a[1] * s); x.lineTo(b[0] * s, b[1] * s); x.stroke(); };
    L([0, -0.45], [0, 0.05]); L([0, -0.35], [-0.22, -0.08]); L([0, -0.35], [0.24, -0.15]); L([0, 0.05], [-0.18, 0.5]); L([0, 0.05], [0.2, 0.48]);
    x.restore();
  }
  // the hatched no-parking box before wing B's south corner (u 13..17, w 11..16): a frame and diagonal bands
  x.save();
  const [bx, by] = P(13.0, 11.0); x.beginPath(); x.rect(bx, by, 4 * PX, 5 * PX); x.clip();
  for (let k = -6; k < 14; k++) line([13.0 + k * 0.7, 11.0], [13.0 + k * 0.7 + 5.0, 16.0], 0.25);
  x.restore();
  for (const [a, b] of [[[13, 11], [17, 11]], [[17, 11], [17, 16]], [[17, 16], [13, 16]], [[13, 16], [13, 11]]]) line(a, b, 0.12);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.flipY = false;
  return t;
}

const hash2 = (p) => {
  const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar();
  const q = p3.add(dot(p3, vec3(p3.y, p3.z, p3.x).add(33.33)));
  return fract(q.x.add(q.y).mul(q.z));
};
const vnoise = (p) => {
  const i = floor(p).toVar(), f = fract(p).toVar();
  const u2 = f.mul(f).mul(float(3).sub(f.mul(2))).toVar();
  const a = hash2(i), b = hash2(i.add(vec2(1, 0))), c = hash2(i.add(vec2(0, 1))), d = hash2(i.add(vec2(1, 1)));
  return mix(mix(a, b, u2.x), mix(c, d, u2.x), u2.y);
};
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };

export function buildPoliceYard({ site, groundAt, lift = 0.06, step = 0.5 }) {
  const F = site.frame, ca = Math.cos(F.rotation_rad), sa = Math.sin(F.rotation_rad);
  const toCity = (u, w) => [F.origin_city[0] + u * ca - w * sa, F.origin_city[1] + u * sa + w * ca];
  // a grid over the outline's box; a cell is kept when its centre is inside; vertices shared
  const us = [], ws = [];
  for (let u = -5.0; u <= 26.6 + 1e-6; u += step) us.push(+u.toFixed(3));
  if (us[us.length - 1] < 26.6) us.push(26.6);
  for (let w = -18.5; w <= 16.6 + 1e-6; w += step) ws.push(+w.toFixed(3));
  if (ws[ws.length - 1] < 16.6) ws.push(16.6);
  const snap = (v, lines) => lines.reduce((b, x) => (Math.abs(x - v) < Math.abs(b - v) ? x : b), v);
  const edgeU = [0.3, 26.1, 26.6, -4.8, 5.32, 14.59], edgeW = [-18.4, 9.6, 14.9, 16.6, 12.6, 0.52, -14.0];
  const U = us.map((u) => (edgeU.some((e) => Math.abs(e - u) < step * 0.5) ? snap(u, edgeU) : u));
  const W = ws.map((w) => (edgeW.some((e) => Math.abs(e - w) < step * 0.5) ? snap(w, edgeW) : w));
  const nu = U.length, nw = W.length;
  const keep = (i, j) => U[i + 1] - U[i] > 1e-4 && W[j + 1] - W[j] > 1e-4 && inside((U[i] + U[i + 1]) / 2, (W[j] + W[j + 1]) / 2, OUTLINE);
  const pos = [], uvs = [], idx = [], vid = new Map();
  const V = (i, j, drop = 0) => {
    const key = `${i},${j},${drop}`;
    let k = vid.get(key);
    if (k === undefined) {
      const [x, z] = toCity(U[i], W[j]);
      k = pos.length / 3; vid.set(key, k);
      pos.push(x, groundAt(x, z) + lift - drop, z);
      uvs.push((U[i] - U0) / SPAN_U, (W[j] - W0) / SPAN_W);
    }
    return k;
  };
  for (let i = 0; i < nu - 1; i++) for (let j = 0; j < nw - 1; j++) {
    if (!keep(i, j)) continue;
    const a = V(i, j), b = V(i + 1, j), c = V(i + 1, j + 1), d = V(i, j + 1);
    idx.push(a, d, c, a, c, b);
    // skirts on the free edges (a neighbour cell missing)
    const sk = (p, q, pi, qi) => { const p2 = V(...pi, 0.2), q2 = V(...qi, 0.2); idx.push(p, p2, q2, p, q2, q); };
    if (j === 0 || !keep(i, j - 1)) sk(b, a, [i + 1, j], [i, j]);
    if (j === nw - 2 || !keep(i, j + 1)) sk(d, c, [i, j + 1], [i + 1, j + 1]);
    if (i === 0 || !keep(i - 1, j)) sk(a, d, [i, j], [i, j + 1]);
    if (i === nu - 2 || !keep(i + 1, j)) sk(c, b, [i + 1, j + 1], [i + 1, j]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  const marks = markingsCanvas();
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 1.0, metalness: 0 });
  m.colorNode = Fn(() => {
    const p = positionWorld.xz.toVar();
    const gr = hash2(floor(p.mul(70.0)));
    const g2 = mix(gr, float(0.5), smoothstep(0.4, 1.0, length(fwidth(p.mul(70.0)))));
    const patch = vnoise(p.mul(0.18)).toVar(), patch2 = vnoise(p.mul(0.9).add(5.0)).toVar();
    const asph = mix(lin(0x4d4b47), lin(0x5f5c56), patch.mul(0.7).add(patch2.mul(0.3))).mul(float(0.9).add(g2.mul(0.2)));
    const mk = texture(marks, uv()).r;
    const worn = vnoise(p.mul(3.0)).mul(0.35).add(0.65);
    return mix(asph, lin(0xd9d8d2), mk.mul(worn));
  })();
  m.side = THREE.DoubleSide;           // (the skirts are thin and seen from both sides)
  const mesh = new THREE.Mesh(g, m);
  mesh.name = "police-yard"; mesh.receiveShadow = true; mesh.castShadow = false;
  return { mesh, outline: OUTLINE, tris: idx.length / 3 };
}
