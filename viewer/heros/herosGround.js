// SQUARE DES HEROS: THE DOLOMITE (docs/landmarks/HEROS.md). The square's paths and the open ground round the memorial are
// dolomite (OSM surface=compacted; the photos: pale beige-grey fine gravel with crisp lawn edges, worn into the grass at the
// corners). models/heros/site.json "dolomite" = the OSM park minus its three lawns minus the memorial's round platform
// (tools/heros_measure.py). Drawn as one draped mesh on the DRAWN terrain (world.ground, the tiles' carved heightmap) + 3 cm,
// triangles <= 0.5 m, a 12 cm skirt down along every edge (the JOINS rule: no open lip at the lawn); the land-cover raster
// leaves the park's path lines out (viewer/heros/herosSurface.js withoutLines), so the lawns are lawn up to the edge.
// Material: the ground textures' "gravel" layer (viewer/materials/groundTex.js, the scan the city's paths use) sampled twice
// at different scales / angles and blended by a large noise (no visible repeat), a light bump, the lamp light pool; the
// procedural dolomite of the ground shader when the textures are off.
import * as THREE from "three/webgpu";
import { positionWorld, vec2, vec3, vec4, float, mix, smoothstep, texture, attribute, uniform, clamp, cos, sin } from "three/tsl";
import { groundLook } from "../ground.js";
import { addLampLight } from "../lampLight.js";
import { n3 } from "../roadPaint.js";
import { bumpNormal } from "../tslkit.js";
import { wxMat } from "../weather/cityWeatherize.js";   // the weather (docs/WEATHER.md "City hookup"): gated, ?weather=old none

const LIFT = 0.03, SKIRT = 0.12, EDGE = 0.5;

function subdivide(tris, maxLen) {
  const out = [], stack = [...tris];
  const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  while (stack.length) {
    const [a, b, c] = stack.pop();
    const ab = d(a, b), bc = d(b, c), ca = d(c, a), m = Math.max(ab, bc, ca);
    if (m <= maxLen) { out.push([a, b, c]); continue; }
    if (m === ab) { const k = mid(a, b); stack.push([a, k, c], [k, b, c]); }
    else if (m === bc) { const k = mid(b, c); stack.push([a, b, k], [a, k, c]); }
    else { const k = mid(c, a); stack.push([a, b, k], [k, b, c]); }
  }
  return out;
}

/** the mesh (positions in city metres), ground(x, z) = the drawn terrain */
export function dolomiteGeometry(site, ground, pieces = site.dolomite, lift = LIFT) {
  const LIFT_ = lift;
  const pos = [], edge = [];
  let tris = 0;
  for (const piece of pieces || []) {
    const outer = piece.rings[0].map(([x, z]) => new THREE.Vector2(x, z));
    const holes = piece.rings.slice(1).map((r) => r.map(([x, z]) => new THREE.Vector2(x, z)));
    if (THREE.ShapeUtils.isClockWise(outer)) outer.reverse();
    for (const h of holes) if (!THREE.ShapeUtils.isClockWise(h)) h.reverse();
    const all = [...outer, ...holes.flat()];
    const idx = THREE.ShapeUtils.triangulateShape(outer, holes);
    const fine = subdivide(idx.map((t) => t.map((i) => [all[i].x, all[i].y])), EDGE);
    // distance to the nearest edge (the lawn line): a darker, greener rim where grass creeps in
    const segs = [];
    for (const r of piece.rings) for (let i = 0; i < r.length; i++) segs.push([r[i], r[(i + 1) % r.length]]);
    const edgeDist = (x, z) => {
      let best = 1e9;
      for (const [[ax, az], [bx, bz]] of segs) {
        const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
        best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
      }
      return best;
    };
    for (const t of fine) {
      // wound so the face points up: (x, z) counter-clockwise seen from above is clockwise in three's frame
      for (const p of [t[0], t[2], t[1]]) { pos.push(p[0], ground(p[0], p[1]) + LIFT_, p[1]); edge.push(Math.min(1, edgeDist(p[0], p[1]) / 0.4)); }
      tris++;
    }
    // the skirt: every boundary edge, split to EDGE, down SKIRT under the terrain, facing out of the dolomite
    for (const r of piece.rings) {
      const ccwOuter = r === piece.rings[0];
      const ring = r.map(([x, z]) => [x, z]);
      const sgn = THREE.ShapeUtils.isClockWise(ring.map(([x, z]) => new THREE.Vector2(x, z))) ? -1 : 1;
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / EDGE));
        for (let k = 0; k < n; k++) {
          const p = [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n], q = [a[0] + (b[0] - a[0]) * (k + 1) / n, a[1] + (b[1] - a[1]) * (k + 1) / n];
          const yp = ground(p[0], p[1]), yq = ground(q[0], q[1]);
          const P0 = [p[0], yp + LIFT_, p[1]], Q0 = [q[0], yq + LIFT_, q[1]], P1 = [p[0], yp - SKIRT, p[1]], Q1 = [q[0], yq - SKIRT, q[1]];
          // outward for a ccw (x, z) outer ring = right of the edge direction; holes the other way: the winding picks it
          const quad = (sgn > 0) === ccwOuter ? [P0, P1, Q1, P0, Q1, Q0] : [P0, Q1, P1, P0, Q0, Q1];
          for (const v of quad) { pos.push(...v); edge.push(0); }
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aEdge", new THREE.Float32BufferAttribute(edge, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return { geometry: g, tris };
}

export const dolomiteLook = { tone: uniform(new THREE.Color(0.72, 0.68, 0.6)), rim: uniform(0.45) };

/** the dolomite material: the ground textures' gravel layer, two samples blended, a greener darker rim at the lawn */
export function dolomiteMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const P = positionWorld;
  const S = groundLook();
  const e = attribute("aEdge", "float");
  const blotch = n3(P.x.mul(0.3), P.z.mul(0.3), 3.0);
  const rimK = smoothstep(0.55, 0.0, e).mul(dolomiteLook.rim);
  if (S && S.idx.gravel !== undefined) {
    const L = S.idx.gravel, inv = 1 / S.G.layers.find((l) => l.cover === "gravel").size_m;
    const st = vec2(P.x, P.z);
    const a = 0.7, cs = Math.cos(a), sn = Math.sin(a);
    const st2 = vec2(st.x.mul(cs).sub(st.y.mul(sn)), st.x.mul(sn).add(st.y.mul(cs))).mul(1.37).add(vec2(0.31, 0.77));
    const A1 = texture(S.G.albedo, st.mul(inv)).depth(L), A2 = texture(S.G.albedo, st2.mul(inv)).depth(L);
    const R1 = texture(S.G.nra, st.mul(inv)).depth(L), R2 = texture(S.G.nra, st2.mul(inv)).depth(L);
    const k = smoothstep(0.3, 0.7, n3(P.x.mul(0.11), P.z.mul(0.11), 9.0).mul(0.5).add(0.5));
    const A = mix(A1, A2, k), R = mix(R1, R2, k);
    let col = A.rgb.mul(vec3(dolomiteLook.tone)).mul(blotch.mul(0.07).add(1.0));
    col = mix(col, col.mul(vec3(0.62, 0.68, 0.5)), rimK);
    m.colorNode = col.mul(R.a.mul(0.5).add(0.5));
    m.roughnessNode = R.b.max(0.75);
  } else {
    const fine = n3(P.x.mul(21.0), P.z.mul(21.0), 1.0);
    let col = mix(vec3(0.5, 0.46, 0.38), vec3(0.62, 0.58, 0.49), fine.mul(0.5).add(0.5)).mul(blotch.mul(0.07).add(1.0));
    col = mix(col, col.mul(vec3(0.62, 0.68, 0.5)), rimK);
    m.colorNode = col;
    m.roughnessNode = float(0.92);
    m.normalNode = bumpNormal(fine.mul(0.002));
  }
  m.side = THREE.DoubleSide;            // (the skirts face either way: they are a few cm2 of the screen at most)
  addLampLight(m);
  m.userData.shared = true;
  wxMat(m, { porosity: 0.6, puddles: true, puddleBias: float(-0.05), frost: true, map: true });   // the weather
  return m;
}

// ------------------------------------------------------------------------------------------------ THE LAWNS
/** the park's three OSM lawns (site.json "grass") as a layer ON the drawn terrain: the city's lawn reads darker and duller
 *  than every photo of the square (the owner's, Commons C2: a bright, fresh, mown green). Built from the DRAWN terrain's
 *  own triangles (the tile's terrain mesh: the 1 m grid simplified, so its triangles are larger than the grid), each clipped
 *  exactly to the lawn polygon: every piece lies in its terrain triangle's plane (+1 cm) with the terrain's normals, so
 *  nothing dips under the ground anywhere and it shades as the ground (a free 0.5 m drape needed 77 k triangles and still
 *  cut through on the convex banks; a grid-based one sank under the simplified terrain in polygonal patches).
 *  terrainTris(x0, z0, x1, z1) -> [{ p: [[x, y, z] x 3], n: [[nx, ny, nz] x 3] }] the drawn triangles over that box. */
export function lawnGeometry(site, terrainTris) {
  const pos = [], edge = [], nrm = [];
  let tris = 0;
  const LIFT_L = 0.01;
  for (const ring of Object.values(site.grass || {})) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of ring) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const segs = ring.map((p, i) => [p, ring[(i + 1) % ring.length]]);
    const edgeDist = (x, z) => {
      let best = 1e9;
      for (const [[ax, az], [bx, bz]] of segs) {
        const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
        best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
      }
      return best;
    };
    for (const { p: tri, n: tn } of terrainTris(x0, z0, x1, z1)) {
      // the lawn polygon clipped by the (convex) terrain triangle
      let poly = ring.map(([x, z]) => [x, z]);
      for (let e = 0; e < 3 && poly.length; e++) {
        const p = tri[e], q = tri[(e + 1) % 3], o = tri[(e + 2) % 3];
        const side = (x, z) => (q[0] - p[0]) * (z - p[2]) - (q[2] - p[2]) * (x - p[0]);
        const sg = Math.sign(side(o[0], o[2]));
        if (!sg) { poly = []; break; }
        const inn = (v) => side(v[0], v[1]) * sg >= -1e-9;
        const out = [];
        for (let i = 0; i < poly.length; i++) {
          const u = poly[i], v = poly[(i + 1) % poly.length], ui = inn(u), vi = inn(v);
          if (ui) out.push(u);
          if (ui !== vi) {
            const su = side(u[0], u[1]), sv = side(v[0], v[1]), t = su / (su - sv);
            out.push([u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t]);
          }
        }
        poly = out;
      }
      if (poly.length < 3) continue;
      const [P0, P1, P2] = tri;
      const det = (P1[2] - P2[2]) * (P0[0] - P2[0]) + (P2[0] - P1[0]) * (P0[2] - P2[2]);
      const bary = (x, z) => {
        const l1 = ((P1[2] - P2[2]) * (x - P2[0]) + (P2[0] - P1[0]) * (z - P2[2])) / det;
        const l2 = ((P2[2] - P0[2]) * (x - P2[0]) + (P0[0] - P2[0]) * (z - P2[2])) / det;
        return [l1, l2, 1 - l1 - l2];
      };
      const v2 = poly.map(([x, z]) => new THREE.Vector2(x, z));
      if (THREE.ShapeUtils.isClockWise(v2)) { v2.reverse(); poly.reverse(); }
      for (const t of THREE.ShapeUtils.triangulateShape(v2, [])) {
        const ps = [poly[t[0]], poly[t[2]], poly[t[1]]];
        const ar = (ps[1][0] - ps[0][0]) * (ps[2][1] - ps[0][1]) - (ps[2][0] - ps[0][0]) * (ps[1][1] - ps[0][1]);
        if (Math.abs(ar) < 1e-6) continue;
        for (const [x, z] of ps) {
          const l = bary(x, z);
          pos.push(x, l[0] * P0[1] + l[1] * P1[1] + l[2] * P2[1] + LIFT_L, z);
          const nn = [0, 1, 2].map((i) => l[0] * tn[0][i] + l[1] * tn[1][i] + l[2] * tn[2][i]), L = Math.hypot(...nn) || 1;
          nrm.push(nn[0] / L, nn[1] / L, nn[2] / L);
          edge.push(Math.min(1, edgeDist(x, z) / 0.4));
        }
        tris++;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aEdge", new THREE.Float32BufferAttribute(edge, 1));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.computeBoundingSphere();
  return { geometry: g, tris };
}

/** the drawn terrain triangles over a box (city x, z), from the loaded tiles' terrain meshes (their world matrices applied) */
export function terrainTrianglesIn(scene, tileNames) {
  const meshes = [];
  scene.traverse((o) => { if (o.isMesh && o.name === "terrain" && tileNames.some((n) => o.parent?.name === `${n}-terrain`)) meshes.push(o); });
  return (x0, z0, x1, z1) => {
    const out = [], v = new THREE.Vector3();
    for (const m of meshes) {
      m.updateMatrixWorld();
      const P = m.geometry.attributes.position, N = m.geometry.attributes.normal, I = m.geometry.index;
      const nm = new THREE.Matrix3().getNormalMatrix(m.matrixWorld);
      const cnt = I ? I.count : P.count;
      for (let t = 0; t < cnt; t += 3) {
        const ids = [0, 1, 2].map((k) => (I ? I.getX(t + k) : t + k));
        const xs = ids.map((i) => P.getX(i)), zs = ids.map((i) => P.getZ(i));
        if (Math.max(...xs) < x0 || Math.min(...xs) > x1 || Math.max(...zs) < z0 || Math.min(...zs) > z1) continue;
        const p = ids.map((i) => v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld).toArray());
        const n = ids.map((i) => (N ? v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize().toArray() : [0, 1, 0]));
        out.push({ p, n });
      }
    }
    return out;
  };
}

export const lawnLook = { tone: uniform(new THREE.Color(1.2, 1.38, 0.88)), rim: uniform(0.25) };

/** the lawn: the ground textures' "lawn" scan sampled twice (no repeat), lifted to the photos' fresh mown green, a
 *  little darker and yellower in large patches, a slightly worn rim at the paths; procedural when the textures are off */
export function lawnMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const P = positionWorld;
  const S = groundLook();
  const e = attribute("aEdge", "float");
  const blotch = n3(P.x.mul(0.08), P.z.mul(0.08), 5.0);
  const rimK = smoothstep(0.5, 0.0, e).mul(lawnLook.rim);
  const L = S?.idx?.lawn;
  let col;
  if (S && L !== undefined) {
    const inv = 1 / S.G.layers.find((l) => l.cover === "lawn").size_m;
    const st = vec2(P.x, P.z);
    const a = 1.1, cs = Math.cos(a), sn = Math.sin(a);
    const st2 = vec2(st.x.mul(cs).sub(st.y.mul(sn)), st.x.mul(sn).add(st.y.mul(cs))).mul(1.29).add(vec2(0.53, 0.21));
    const A1 = texture(S.G.albedo, st.mul(inv)).depth(L), A2 = texture(S.G.albedo, st2.mul(inv)).depth(L);
    const R1 = texture(S.G.nra, st.mul(inv)).depth(L), R2 = texture(S.G.nra, st2.mul(inv)).depth(L);
    const k = smoothstep(0.3, 0.7, n3(P.x.mul(0.13), P.z.mul(0.13), 4.0).mul(0.5).add(0.5));
    const A = mix(A1, A2, k), R = mix(R1, R2, k);
    col = A.rgb.mul(vec3(lawnLook.tone)).mul(R.a.mul(0.4).add(0.6));
    m.roughnessNode = R.b.max(0.8);
  } else {
    const fine = n3(P.x.mul(23.0), P.z.mul(23.0), 2.0);
    col = mix(vec3(0.16, 0.3, 0.07), vec3(0.24, 0.38, 0.1), fine.mul(0.5).add(0.5));
    m.roughnessNode = float(0.9);
    m.normalNode = bumpNormal(fine.mul(0.003));
  }
  col = mix(col, col.mul(vec3(1.08, 1.0, 0.8)), smoothstep(0.2, 0.8, blotch).mul(0.35));    // drier, yellower patches
  col = mix(col, col.mul(vec3(0.85, 0.8, 0.7)), rimK);
  m.colorNode = col;
  m.side = THREE.DoubleSide;
  addLampLight(m);
  m.userData.shared = true;
  wxMat(m, { porosity: 0.85, frost: true, map: true });   // the weather
  return m;
}
