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
export function dolomiteGeometry(site, ground) {
  const pos = [], edge = [];
  let tris = 0;
  for (const piece of site.dolomite || []) {
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
      for (const p of [t[0], t[2], t[1]]) { pos.push(p[0], ground(p[0], p[1]) + LIFT, p[1]); edge.push(Math.min(1, edgeDist(p[0], p[1]) / 0.4)); }
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
          const P0 = [p[0], yp + LIFT, p[1]], Q0 = [q[0], yq + LIFT, q[1]], P1 = [p[0], yp - SKIRT, p[1]], Q1 = [q[0], yq - SKIRT, q[1]];
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
  return m;
}
