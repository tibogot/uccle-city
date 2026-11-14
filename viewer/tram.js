// Tram infrastructure from OSM (features.json, CONTRACT 0.7):
//   - overhead line: a contact wire 5.8 m above every `tram` line, hung from steel poles every ~32 m
//     standing 3.4 m to the side of the track with a cantilever arm; poles shared by close tracks;
//   - platforms: `platform` lines (railway=platform / public_transport=platform, tram=yes) become a
//     raised island 2.6 m wide, 25 cm high, with a light kerb edge; a STIB glass shelter at its middle
//     where OSM says shelter=yes, its back turned to the nearest track.
// Pole spacing, heights and widths are typical STIB values, not surveyed. Everything is instanced or
// merged: 4 draw calls for the whole tile.
import * as THREE from "three/webgpu";
import { attribute, uv, vec3, color, mix, mx_noise_float } from "three/tsl";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { MODELS } from "./furniture.js";
import { TRAM_PLATFORM, isTramPlatform } from "./drive/colliders.js";

const WIRE_H = 5.8, POLE_STEP = 32, POLE_OFF = 3.4;

function densify(line, step) {
  const out = [];
  for (let k = 1; k < line.length; k++) {
    const [ax, az] = line[k - 1], [bx, bz] = line[k];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let s = k === 1 ? 0 : 1; s <= n; s++) out.push([ax + (bx - ax) * s / n, az + (bz - az) * s / n]);
  }
  return out;
}

// ---- the tram BRIDGE decks (OSM tram ways with bridge=yes; the only one in Uccle: over the L26 cutting next to
// Saint-Job station). The DTM is bare earth, so before 2026-11-13 the tram dived 8 m into the railway cutting there.
// The deck follows the tracks' profile (viewer/trackProfile.js: interpolated between the bridge's ends, vertical
// curves); one closed slab per track (top, soffit, both sides, end caps) reaching the midline to the other track of the
// bridge, a solid parapet on the free sides. Flat faces, uv in metres, one shared material.
const DECK = { half: 2.15, depth: 0.95, parapetW: 0.32, parapetH: 1.05 };
let deckMat = null;
function deckMaterial() {
  if (deckMat) return deckMat;
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.88, metalness: 0 });
  const p = uv();
  const n = mx_noise_float(vec3(p.x.mul(0.7), p.y.mul(0.7), 0)).mul(0.5).add(0.5), fine = mx_noise_float(vec3(p.x.mul(9), p.y.mul(9), 3));
  m.colorNode = mix(color(0x8a867f), color(0x9d988f), n).mul(fine.mul(0.04).add(1));
  m.name = "tram-bridge-concrete"; m.userData.shared = true;
  return (deckMat = m);
}
function buildDecks(tram, prof, surface, inB, onRoadDeck = null) {
  // a tram bridge that is also a ROAD bridge (Carsoel at Saint-Job station): the road's full-width deck carries the tracks
  // (viewer/streets/bridgeDecks.js, drawn by main.js); a second, track-wide deck here would only fight it
  const mid = (l) => l.line[Math.floor(l.line.length / 2)];
  const bridges = tram.filter((l) => l.tags?.bridge === "yes" && !(onRoadDeck && l.line?.length && onRoadDeck(mid(l)[0], mid(l)[1])));
  if (!bridges.length || !prof) return null;                     // (?trackprofile=0: the old city, no deck)
  const lines = bridges.map((l) => densify(l.line, 1));
  const P = [], N = [], U = [];
  const tri = (a, b, c, ua, ub, uc) => {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
    const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
    P.push(...a, ...b, ...c); N.push(nx, ny, nz, nx, ny, nz, nx, ny, nz); U.push(...ua, ...ub, ...uc);
  };
  let n = 0;
  lines.forEach((d, li) => {
    if (d.length < 2) return;
    // per point: centre, tangent, left normal, top, half-widths [left, right] (to the midline of a neighbouring track)
    const S = d.map(([x, z], i) => {
      const a = d[Math.max(0, i - 1)], b = d[Math.min(d.length - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L, nx = tz, nz = -tx;      // side 0 = +n, side 1 = -n
      const hw = [DECK.half, DECK.half];
      lines.forEach((o, lo) => {
        if (lo === li) return;
        for (const [qx, qz] of o) {
          const along = (qx - x) * tx + (qz - z) * tz, across = (qx - x) * nx + (qz - z) * nz;
          if (Math.abs(along) > 1.5 || Math.abs(across) > 2 * DECK.half + 0.5) continue;
          const k = across > 0 ? 0 : 1;
          hw[k] = Math.min(hw[k], Math.abs(across) / 2);
        }
      });
      const y = prof?.y(x, z, 1.5) ?? surface(x, z);
      return { x, z, tx, tz, nx, nz, y, hw, s: 0 };
    });
    for (let i = 1; i < S.length; i++) S[i].s = S[i - 1].s + Math.hypot(S[i].x - S[i - 1].x, S[i].z - S[i - 1].z);
    // a point on the left (side 0) / right (side 1) edge, dy above the top, `inset` m in from the edge
    const edge = (q, side, dy = 0, inset = 0) => { const w = side === 0 ? q.hw[0] - inset : -(q.hw[1] - inset); return [q.x + q.nx * w, q.y + dy, q.z + q.nz * w]; };
    const par = (q, side) => q.hw[side] >= DECK.half - 1e-6;          // a free side carries a parapet
    for (let i = 1; i < S.length; i++) {
      const A = S[i - 1], B = S[i];
      if (!inB((A.x + B.x) / 2, (A.z + B.z) / 2)) continue;
      n++;
      const sa = A.s, sb = B.s, D = DECK.depth;
      // top faces up, soffit down (orientation fixed below by the expected normal)
      face(edge(A, 0), edge(B, 0), edge(B, 1), edge(A, 1), [0, 1, 0], [sa, A.hw[0]], [sb, B.hw[0]], [sb, -B.hw[1]], [sa, -A.hw[1]]);
      face(edge(A, 0, -D), edge(B, 0, -D), edge(B, 1, -D), edge(A, 1, -D), [0, -1, 0], [sa, A.hw[0]], [sb, B.hw[0]], [sb, -B.hw[1]], [sa, -A.hw[1]]);
      for (const side of [0, 1]) {
        const top = par(A, side) && par(B, side) ? DECK.parapetH : 0, sg = side === 0 ? 1 : -1;
        const out = [A.nx * sg, 0, A.nz * sg], inn = [-out[0], 0, -out[2]];
        // the side face, from the soffit to the top (or to the parapet's top)
        face(edge(A, side, -D), edge(B, side, -D), edge(B, side, top), edge(A, side, top), out, [sa, -D], [sb, -D], [sb, top], [sa, top]);
        if (!top) continue;
        // the parapet: its top and its inner face (it stands on the deck: no bottom)
        const W = DECK.parapetW;
        face(edge(A, side, top), edge(B, side, top), edge(B, side, top, W), edge(A, side, top, W), [0, 1, 0], [sa, 0], [sb, 0], [sb, W], [sa, W]);
        face(edge(A, side, 0, W), edge(B, side, 0, W), edge(B, side, top, W), edge(A, side, top, W), inn, [sa, 0], [sb, 0], [sb, top], [sa, top]);
      }
    }
    // end caps (closed slab: no slit to see the cutting through), facing out of the deck
    for (const [q, dir] of [[S[0], -1], [S[S.length - 1], 1]]) {
      if (!inB(q.x, q.z)) continue;
      const D = DECK.depth, W = DECK.parapetW, o = [q.tx * dir, 0, q.tz * dir];
      const uvOf = (p) => [(p[0] - q.x) * q.nx + (p[2] - q.z) * q.nz, p[1] - q.y];
      const cap = (a, b, c, e) => face(a, b, c, e, o, uvOf(a), uvOf(b), uvOf(c), uvOf(e));
      cap(edge(q, 0, -D), edge(q, 1, -D), edge(q, 1, 0), edge(q, 0, 0));                 // the slab
      for (const side of [0, 1]) if (par(q, side)) cap(edge(q, side, 0), edge(q, side, 0, W), edge(q, side, DECK.parapetH, W), edge(q, side, DECK.parapetH));
    }
  });
  if (!P.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  const m = new THREE.Mesh(g, deckMaterial());
  m.castShadow = m.receiveShadow = true; m.name = "tram-bridge-deck";
  return { mesh: m, segments: n };
  /** a quad wound so its geometric normal faces `want` (flat normal), uv per corner */
  function face(p0, p1, p2, p3, want, u0, u1, u2, u3) {
    const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    const c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    if (c[0] * want[0] + c[1] * want[1] + c[2] * want[2] >= 0) { tri(p0, p1, p2, u0, u1, u2); tri(p0, p2, p3, u0, u2, u3); }
    else { tri(p0, p2, p1, u0, u2, u1); tri(p0, p3, p2, u0, u3, u2); }
  }
}

/** surface(x, z): the road top; prof (viewer/trackProfile.js, optional): the tracks' smooth rail-top profile (the wire
 *  hangs WIRE_H over it, the bridge deck carries it) */
/** opts.shelterSites: the platform shelters are NOT drawn here but returned as sites ({x, y, z, yaw}, +z toward the
 *  track) for the STIB stops kit (viewer/stops/cityStops.js); false: the placeholder shelter mesh (?stops=old) */
export function buildTram(feats, surface, bounds, prof = null, onRoadDeck = null, opts = {}) {
  const group = new THREE.Group();
  group.name = "tram";
  const inB = (x, z) => x >= bounds.x0 && x <= bounds.x1 && z >= bounds.z0 && z <= bounds.z1;
  const tram = (feats.lines || []).filter((l) => l.kind === "tram");
  const trackY = (x, z) => prof?.y(x, z, 2.5) ?? surface(x, z);
  const deck = buildDecks(tram, prof, surface, inB, onRoadDeck);
  if (deck) group.add(deck.mesh);
  const steel = new THREE.MeshStandardNodeMaterial({ color: 0x3b4044, roughness: 0.5, metalness: 0.7 });

  // ---- contact wire: thin instanced cylinders, one per 4 m segment
  const segs = [], poles = [];
  for (const l of tram) {
    const onBridge = l.tags?.bridge === "yes";                      // no poles on the bridge deck (they stand at its ends)
    const d = densify(l.line, 4);
    let acc = 0;
    for (let i = 1; i < d.length; i++) {
      const [ax, az] = d[i - 1], [bx, bz] = d[i];
      const L = Math.hypot(bx - ax, bz - az);
      if (inB((ax + bx) / 2, (az + bz) / 2)) segs.push([ax, trackY(ax, az) + WIRE_H, az, bx, trackY(bx, bz) + WIRE_H, bz]);
      acc += L;
      if (acc >= POLE_STEP) {
        acc = 0;
        const nx = -(bz - az) / L, nz = (bx - ax) / L;
        const px = bx + nx * POLE_OFF, pz = bz + nz * POLE_OFF;
        if (!onBridge && inB(px, pz) && !poles.some((p) => (p.x - px) ** 2 + (p.z - pz) ** 2 < 64)) poles.push({ x: px, z: pz, yaw: Math.atan2(nx, nz) });
      }
    }
  }
  const up = new THREE.Vector3(0, 1, 0), M = new THREE.Matrix4(), q = new THREE.Quaternion();
  if (segs.length) {
    const wire = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 4), steel, segs.length);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), dir = new THREE.Vector3(), mid = new THREE.Vector3();
    segs.forEach(([ax, ay, az, bx, by, bz], i) => {
      a.set(ax, ay, az); b.set(bx, by, bz); dir.subVectors(b, a);
      const L = dir.length();
      q.setFromUnitVectors(up, dir.normalize());
      M.compose(mid.addVectors(a, b).multiplyScalar(0.5), q, new THREE.Vector3(1, L, 1));
      wire.setMatrixAt(i, M);
    });
    wire.computeBoundingSphere();
    wire.name = "tram-wire";
    group.add(wire);
  }
  if (poles.length) {
    // pole + cantilever arm reaching back over the track (local -z points to the track)
    const parts = [
      new THREE.CylinderGeometry(0.11, 0.14, 7.0, 8).translate(0, 3.5, 0),
      new THREE.CylinderGeometry(0.035, 0.035, POLE_OFF + 0.4, 6).rotateX(Math.PI / 2).translate(0, WIRE_H + 0.35, -(POLE_OFF + 0.4) / 2),
      new THREE.CylinderGeometry(0.02, 0.02, Math.hypot(POLE_OFF, 0.9), 5).rotateX(Math.PI / 2 - Math.atan2(0.9, POLE_OFF)).translate(0, WIRE_H + 0.8, -POLE_OFF / 2),   // stay
      new THREE.CylinderGeometry(0.015, 0.015, 0.4, 4).translate(0, WIRE_H + 0.15, -POLE_OFF),                                            // dropper
      new THREE.CylinderGeometry(0.16, 0.16, 0.12, 8).translate(0, 7.0, 0),
    ].map((g) => { const n = g.toNonIndexed(); n.deleteAttribute("uv"); return n; });
    const pm = new THREE.InstancedMesh(mergeGeometries(parts), steel, poles.length);
    poles.forEach((p, i) => {
      // turn the arm toward the track: yaw makes local -z point along (-nx, -nz)
      q.setFromAxisAngle(up, p.yaw);
      M.compose(new THREE.Vector3(p.x, surface(p.x, p.z), p.z), q, new THREE.Vector3(1, 1, 1));
      pm.setMatrixAt(i, M);
    });
    pm.castShadow = true;
    pm.computeBoundingSphere();
    pm.name = "tram-poles";
    group.add(pm);
  }

  // ---- platforms
  // bus platforms are the sidewalk; the same slabs are in the car's drive surface (drive/colliders.js tramPlatformSurface)
  const plat = (feats.lines || []).filter(isTramPlatform);
  const slab = [], edge = [], shelters = [];
  const { W, H } = TRAM_PLATFORM;
  const nearestTrackSide = (x, z, nx, nz) => {
    let best = Infinity, side = 1;
    for (const l of tram) for (const [tx, tz] of densify(l.line, 3)) {
      const d = (tx - x) ** 2 + (tz - z) ** 2;
      if (d < best) { best = d; side = (tx - x) * nx + (tz - z) * nz >= 0 ? 1 : -1; }
    }
    return side;
  };
  const quad = (out, p0, p1, p2, p3) => out.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
  for (const l of plat) {
    const d = densify(l.line, TRAM_PLATFORM.step);
    if (d.length < 2) continue;
    let total = 0;
    for (let i = 1; i < d.length; i++) total += Math.hypot(d[i][0] - d[i - 1][0], d[i][1] - d[i - 1][1]);
    for (let i = 1; i < d.length; i++) {
      const [ax, az] = d[i - 1], [bx, bz] = d[i], L = Math.hypot(bx - ax, bz - az) || 1;
      if (!inB((ax + bx) / 2, (az + bz) / 2)) continue;
      const nx = -(bz - az) / L * W / 2, nz = (bx - ax) / L * W / 2;
      const ya = surface(ax, az) + H, yb = surface(bx, bz) + H, ya0 = ya - H - 0.1, yb0 = yb - H - 0.1;
      quad(slab, [ax - nx, ya, az - nz], [ax + nx, ya, az + nz], [bx + nx, yb, bz + nz], [bx - nx, yb, bz - nz]);
      for (const s of [1, -1]) {
        quad(edge, [ax + nx * s, ya0, az + nz * s], [bx + nx * s, yb0, bz + nz * s], [bx + nx * s, yb + 0.01, bz + nz * s], [ax + nx * s, ya + 0.01, az + nz * s]);
        // 30 cm light kerb strip on top of each edge (tactile / white line)
        const k = 0.88;
        quad(edge, [ax + nx * s * k, ya + 0.004, az + nz * s * k], [bx + nx * s * k, yb + 0.004, bz + nz * s * k], [bx + nx * s, yb + 0.004, bz + nz * s], [ax + nx * s, ya + 0.004, az + nz * s]);
      }
    }
    if (l.tags?.shelter === "yes") {
      const m = d[Math.floor(d.length / 2)], m2 = d[Math.min(d.length - 1, Math.floor(d.length / 2) + 1)];
      const L = Math.hypot(m2[0] - m[0], m2[1] - m[1]) || 1, nx = -(m2[1] - m[1]) / L, nz = (m2[0] - m[0]) / L;
      const side = nearestTrackSide(m[0], m[1], nx, nz);                          // the track is on this side
      if (inB(m[0], m[1])) shelters.push({ x: m[0], z: m[1], y: surface(m[0], m[1]) + H, yaw: Math.atan2(nx * side, nz * side) + Math.PI });
    }
  }
  const mkMesh = (arr, mat, name) => {
    if (!arr.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true; m.castShadow = true; m.name = name;
    group.add(m);
  };
  mkMesh(slab, new THREE.MeshStandardNodeMaterial({ color: 0x8d8c88, roughness: 0.85, side: THREE.DoubleSide }), "tram-platforms");
  mkMesh(edge, new THREE.MeshStandardNodeMaterial({ color: 0xc9c6bd, roughness: 0.7, side: THREE.DoubleSide }), "tram-platform-edges");
  const shelterSites = opts.shelterSites ? shelters.map((s, i) => ({ x: s.x, y: s.y, z: s.z, yaw: s.yaw - Math.PI, posters: [(i * 3 + 2) % 8, (i * 5 + 4) % 8] })) : null;
  if (shelters.length && !shelterSites) {
    const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.4, metalness: 0.2 });
    mat.colorNode = attribute("aCol", "vec3");
    const sm = new THREE.InstancedMesh(MODELS.shelter(), mat, shelters.length);
    shelters.forEach((s, i) => { q.setFromAxisAngle(up, s.yaw); M.compose(new THREE.Vector3(s.x, s.y, s.z), q, new THREE.Vector3(1, 1, 1)); sm.setMatrixAt(i, M); });
    sm.castShadow = sm.receiveShadow = true;
    sm.computeBoundingSphere();
    group.add(sm);
  }
  return { group, shelterSites, counts: { deckSegments: deck?.segments || 0, wireSegments: segs.length, poles: poles.length, platforms: plat.length, shelters: shelters.length } };
}
