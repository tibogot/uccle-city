// HARD GROUNDS the land cover draws as lawn: school yards (asphalt with their painted games), sports courts (coloured
// acrylic with their lines). data/overrides.json "grounds" (hand corrections with a why and a source, read on the 2024
// orthophoto): the Lycée Français Jean Monnet's playground with its running track, its east yard, its four courts
// (docs/CORTENBOSCH.md). OSM maps them as landuse=recreation_ground (a lawn here) and leisure=pitch (no surface).
//
// Per tile, ONE mesh and ONE material for all of them (one draw):
//   - each ground's ring is clipped to the tile, triangulated, subdivided to <= 1.2 m and draped on the drawn terrain
//     (hm.surface) LIFT above it, with a skirt SKIRT down round its free edges (JOINS: no floating rim, no gap);
//   - the paint is one small canvas atlas (built once): each painted ground has a rectangle of it in its own frame
//     (origin, u / v axes, metres): R = white paint, G = court green, B = court red; a vertex carries (u, v) in that
//     rectangle and the rectangle itself (aRect): outside it, no paint (the plain asphalt of the yard round the track);
//   - the asphalt is procedural (TSL: aggregate grain, metre-scale patches), as viewer/policeYard.js.
// The rings are also the "plants clear" rings (no generated shrub / garden piece on a yard) and solids for the grass.
//   const g = buildGrounds(list, bounds, (x, z) => hm.surface(x, z));  if (g.mesh) group.add(g.mesh)
import * as THREE from "three/webgpu";
import { uv, attribute, texture, vec2, vec3, float, floor, fract, mix, smoothstep, length, fwidth, Fn, dot, positionWorld, mrt, roughness, select, normalize, normalView, abs, min } from "three/tsl";
import { addLampLight } from "./lampLight.js";
import { pavingTextures, pavingSample, pavingNormal, regrade, LAYER } from "./streets/paving.js";
import { wxMat } from "./weather/cityWeatherize.js";
import { bumpNormal } from "./tslkit.js";

const LIFT = 0.04, SKIRT = 0.22, MAX_EDGE = 1.2, PX = 1 / 0.06;      // atlas: 6 cm per pixel

/** Sutherland-Hodgman: the ring clipped to the rectangle (as plazas.js). */
function clipRing(ring, b) {
  let out = ring;
  const inside = [(p) => p[0] >= b.x0, (p) => p[0] <= b.x1, (p) => p[1] >= b.z0, (p) => p[1] <= b.z1];
  const at = [(p, q) => lerpAt(p, q, 0, b.x0), (p, q) => lerpAt(p, q, 0, b.x1), (p, q) => lerpAt(p, q, 1, b.z0), (p, q) => lerpAt(p, q, 1, b.z1)];
  for (let e = 0; e < 4 && out.length; e++) {
    const inp = out; out = [];
    for (let i = 0; i < inp.length; i++) {
      const p = inp[i], q = inp[(i + 1) % inp.length], pin = inside[e](p), qin = inside[e](q);
      if (pin) out.push(p);
      if (pin !== qin) out.push(at[e](p, q));
    }
  }
  return out;
}
const lerpAt = (p, q, k, v) => { const t = (v - p[k]) / (q[k] - p[k]); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };

/** triangles split at their longest edge until every edge is <= maxLen (the mesh follows the 1 m terrain) */
function subdivide(tris, maxLen) {
  const out = [], stack = [...tris];
  const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]), mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
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

// ------------------------------------------------------------------ the paint atlas (built once, shared by every tile)
/** a ground's paint frame: origin o, unit axes u, v (city x, z), size [lu, lv] metres */
function frameOf(p) {
  const f = p.frame, a = (f.angleDeg * Math.PI) / 180;
  return { o: f.origin, u: [Math.cos(a), Math.sin(a)], v: [-Math.sin(a), Math.cos(a)], size: f.size };
}
/** draw a ground's paint into ctx (frame metres -> pixels at (ox, oy)): marks = [{ kind, ... }] */
function drawPaint(x, p, F, ox, oy) {
  const P = (u, v) => [ox + u * PX, oy + v * PX];
  const lw = (w) => Math.max(1, w * PX);
  for (const m of p.marks || []) {
    if (m.kind === "courts") {
      // the court block: red acrylic all over (B), each court green (G) with its basketball lines (R): sidelines,
      // centre line and circle, the keys and the 3-point arcs, scaled to the court as laid (school courts are short)
      x.fillStyle = "rgb(0,0,255)"; x.fillRect(ox, oy, F.size[0] * PX, F.size[1] * PX);
      const { n, border, band, sideBorder } = m;
      const L = (F.size[0] - 2 * border - (n - 1) * band) / n, W = F.size[1] - 2 * sideBorder;
      for (let k = 0; k < n; k++) {
        const u0 = border + k * (L + band), v0 = sideBorder;
        x.fillStyle = "rgb(0,255,0)"; x.fillRect(...P(u0, v0), L * PX, W * PX);
        // the court's long axis runs along v (W, across the block), its width along u (L)
        x.strokeStyle = "rgb(255,255,0)"; x.lineWidth = lw(0.06);
        const line = (a, b) => { x.beginPath(); x.moveTo(...P(...a)); x.lineTo(...P(...b)); x.stroke(); };
        const arc = (cu, cv, r, a0, a1) => { x.beginPath(); x.arc(...P(cu, cv), r * PX, a0, a1); x.stroke(); };
        const i = 0.35, U0 = u0 + i, U1 = u0 + L - i, V0 = v0 + i, V1 = v0 + W - i, cu = (U0 + U1) / 2, cv = (V0 + V1) / 2;
        x.strokeRect(...P(U0, V0), (U1 - U0) * PX, (V1 - V0) * PX);
        line([U0, cv], [U1, cv]);
        arc(cu, cv, 1.8, 0, Math.PI * 2);
        const key = 4.9 / 2, deep = Math.min(5.8, (V1 - V0) * 0.24), r3 = Math.min(6.75, (U1 - U0) / 2 - 0.4);
        for (const [vb, s] of [[V0, 1], [V1, -1]]) {
          x.strokeRect(...P(cu - key, Math.min(vb, vb + s * deep)), key * 2 * PX, deep * PX);
          arc(cu, vb + s * deep, 1.8, s > 0 ? 0 : Math.PI, s > 0 ? Math.PI : Math.PI * 2);
          const bv = vb + s * 1.575;                                 // the basket's spot
          arc(cu, bv, r3, s > 0 ? 0 : Math.PI, s > 0 ? Math.PI : Math.PI * 2);
          line([cu - r3, vb], [cu - r3, bv]); line([cu + r3, vb], [cu + r3, bv]);
        }
      }
    } else if (m.kind === "track") {
      // a school running track: the stadium of `lanes` lines round two centres on the frame's u axis (u0, u1 at v = c),
      // radii r0 + k * lane; a halfway line and a centre circle inside (read on the orthophoto)
      x.strokeStyle = "rgb(255,0,0)"; x.lineWidth = lw(0.07);
      const { u0, u1, c, r0, lane, lanes } = m;
      for (let k = 0; k < lanes; k++) {
        const r = r0 + k * lane;
        x.beginPath();
        x.moveTo(...P(u0, c - r)); x.lineTo(...P(u1, c - r));
        x.arc(...P(u1, c), r * PX, -Math.PI / 2, Math.PI / 2);
        x.lineTo(...P(u0, c + r));
        x.arc(...P(u0, c), r * PX, Math.PI / 2, Math.PI * 1.5);
        x.closePath(); x.stroke();
      }
      const um = (u0 + u1) / 2;
      x.beginPath(); x.moveTo(...P(um, c - r0)); x.lineTo(...P(um, c + r0)); x.stroke();
      if (m.circle) { x.beginPath(); x.arc(...P(um + (m.circle.du || 0), c + (m.circle.dv || 0)), m.circle.r * PX, 0, Math.PI * 2); x.stroke(); }
    } else if (m.kind === "bays") {
      // (claude/places1) a row of painted parking bays: n + 1 white separators `w` m apart, `depth` m long, from `at`
      // ([u, v] in the frame) along the direction `deg` (degrees from the frame's u axis toward its v axis); the bays
      // open toward the row's left-hand normal (+v when deg = 0): Brico Sint-Job's lot (UrbIS orthophoto 2024)
      x.strokeStyle = "rgb(255,0,0)"; x.lineWidth = lw(m.line ?? 0.1);
      const a = ((m.deg || 0) * Math.PI) / 180, du = [Math.cos(a), Math.sin(a)], dv = [-Math.sin(a), Math.cos(a)];
      for (let k = 0; k <= m.n; k++) {
        const s = k * m.w, p0 = [m.at[0] + du[0] * s, m.at[1] + du[1] * s];
        x.beginPath(); x.moveTo(...P(...p0)); x.lineTo(...P(p0[0] + dv[0] * m.depth, p0[1] + dv[1] * m.depth)); x.stroke();
      }
    }
  }
}

let ATLAS = null;          // { tex, rects: Map(id -> [u0, v0, u1, v1] in atlas uv), frames: Map(id -> frame) }
function paintAtlas(list) {
  if (ATLAS) return ATLAS;
  const painted = list.filter((p) => p.frame && p.marks?.length);
  const pad = 4, rects = new Map(), frames = new Map();
  let W = 0, H = pad;
  const place = painted.map((p) => { const F = frameOf(p); const w = Math.ceil(F.size[0] * PX), h = Math.ceil(F.size[1] * PX); const at = [pad, H]; H += h + pad; W = Math.max(W, w + 2 * pad); return { p, F, at, w, h }; });
  const cv = document.createElement("canvas"); cv.width = Math.max(4, W); cv.height = Math.max(4, H);
  const x = cv.getContext("2d");
  x.fillStyle = "#000"; x.fillRect(0, 0, cv.width, cv.height);
  x.globalCompositeOperation = "lighter";                          // the channels add up (paint over the court colours)
  for (const { p, F, at, w, h } of place) {
    x.save(); x.beginPath(); x.rect(at[0], at[1], w, h); x.clip();
    drawPaint(x, p, F, at[0], at[1]);
    x.restore();
    rects.set(p.id, [at[0] / cv.width, at[1] / cv.height, (at[0] + w) / cv.width, (at[1] + h) / cv.height]);
    frames.set(p.id, F);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace; tex.flipY = false; tex.anisotropy = 8;
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return (ATLAS = { tex, rects, frames });
}

// ------------------------------------------------------------------ the material
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

let MAT = null;
function groundMaterial(tex) {
  if (MAT) return MAT;
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });   // (as plazas.js: the lift + an offset, no fight with the terrain far away)
  const rect = attribute("aRect", "vec4");
  const st = uv();
  const inR = st.x.greaterThanEqual(rect.x).and(st.x.lessThanEqual(rect.z)).and(st.y.greaterThanEqual(rect.y)).and(st.y.lessThanEqual(rect.w));
  const T = texture(tex, st);
  const paint = select(inR, T.r, float(0)), green = select(inR, T.g, float(0)), red = select(inR, T.b, float(0));
  // (claude/snow2: church forecourts) a ground with surface "pavers" (aSurf 1): concrete pavers in rows along its
  // courseDeg (aCourse = cos, sin), the street texture array's pavers layer as the sidewalks / squares, a procedural
  // stretcher bond without it (?paving=old)
  const surf = attribute("aSurf", "float"), dir = attribute("aCourse", "vec2");
  const isPav = smoothstep(0.4, 0.6, surf);
  const Pw = positionWorld;
  const pa = Pw.x.mul(dir.x).add(Pw.z.mul(dir.y)), pb = Pw.z.mul(dir.x).sub(Pw.x.mul(dir.y));
  let pav;
  if (pavingTextures()) {
    const S = pavingSample(pa, pb, float(LAYER.pavers), float(1.8));
    pav = { col: regrade(S.col, "pavers", [0.2, 0.182, 0.165], 0.55).mul(mix(float(1), S.ao, 0.5)), rough: S.rough, n: pavingNormal(S.n, pa, pb, float(1)) };
  } else {
    const row = floor(pb.div(0.11)), u = pa.div(0.22).add(row.mul(0.5)), cell = floor(u);
    const e = min(min(fract(u), float(1).sub(fract(u))).mul(0.22), min(fract(pb.div(0.11)), float(1).sub(fract(pb.div(0.11)))).mul(0.11));
    const joint = float(1).sub(smoothstep(0.003, 0.006, e)).mul(float(1).sub(smoothstep(0.004, 0.02, fwidth(pa))));
    const tone = hash2(vec2(cell, row)).mul(0.12).add(0.94);
    pav = { col: mix(lin(0x8a8279).mul(tone), lin(0x5f5a54), joint), rough: mix(float(0.85), float(0.95), joint), n: bumpNormal(float(1).sub(joint).mul(0.003)) };
  }
  m.colorNode = Fn(() => {
    const p = positionWorld.xz.toVar();
    const gr = hash2(floor(p.mul(70.0)));
    const g2 = mix(gr, float(0.5), smoothstep(0.4, 1.0, length(fwidth(p.mul(70.0)))));
    const patch = vnoise(p.mul(0.16)).toVar(), patch2 = vnoise(p.mul(0.9).add(5.0)).toVar();
    // the playground's asphalt: dark grey, metre-scale patches (old repairs), the aggregate's grain
    const asph = mix(lin(0x4a4844), lin(0x5c5952), patch.mul(0.7).add(patch2.mul(0.3))).mul(float(0.9).add(g2.mul(0.2)));
    // the courts' acrylic: pale sage green, brick red bands, a little sun-faded unevenness, the grain under it
    const fade = patch.mul(0.12).add(0.94).mul(float(0.96).add(g2.mul(0.08)));
    let col = mix(asph, lin(0x7d9a86).mul(fade), green.clamp(0, 1));
    col = mix(col, lin(0xa4513f).mul(fade), red.mul(float(1).sub(green)).clamp(0, 1));
    const worn = vnoise(p.mul(2.5)).mul(0.3).add(0.7);
    return mix(mix(col, lin(0xdcdbd4), paint.clamp(0, 1).mul(worn)), pav.col, isPav);
  })();
  m.roughnessNode = mix(mix(float(0.93), float(0.82), green.max(red).clamp(0, 1)), pav.rough, isPav);
  m.normalNode = normalize(mix(normalView, pav.n, isPav));
  // (claude/snow2) the weather on the hard grounds too: they stayed dry asphalt under snow past the layer's window
  wxMat(m, { porosity: 0.55, puddles: true, slush: true, frost: true, map: true });
  // (no screen-space reflection on the rough ground, as the police yard: it read navy in the shade with it)
  m.mrtNode = mrt({ metalRough: vec3(0, roughness, float(1)) });
  m.side = THREE.DoubleSide;                       // (the skirts are seen from both sides)
  addLampLight(m);
  m.userData.shared = true;
  return (MAT = m);
}

// ------------------------------------------------------------------ per tile
const inRing = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };

/** list: overrides.grounds; bounds {x0, x1, z0, z1}; ground(x, z) = the drawn terrain. -> { mesh | null, rings, tris } */
export function buildGrounds(list, bounds, ground) {
  list = (list || []).filter((p) => p && p.ring?.length >= 3);
  const rings = list.map((p) => p.ring);
  if (!list.length) return { mesh: null, rings, tris: 0 };
  const A = paintAtlas(list);
  const pos = [], uvs = [], rect = [], idx = [], surfA = [], courseA = [];
  const NONE = [2, 2, 2, 2];                          // (a rectangle no uv falls in: no paint)
  for (const p of list) {
    const ring = clipRing(p.ring, bounds);
    if (ring.length < 3) continue;
    const F = A.frames.get(p.id), R = A.rects.get(p.id) || NONE;
    const SURF = p.surface === "pavers" ? 1 : 0, ang = ((p.courseDeg || 0) * Math.PI) / 180, cs = Math.cos(ang), sn = Math.sin(ang);
    const uvOf = (x, z) => {
      if (!F) return [-1, -1];
      const dx = x - F.o[0], dz = z - F.o[1], fu = dx * F.u[0] + dz * F.u[1], fv = dx * F.v[0] + dz * F.v[1];
      return [R[0] + (fu / F.size[0]) * (R[2] - R[0]), R[1] + (fv / F.size[1]) * (R[3] - R[1])];
    };
    const contour = ring.map(([x, z]) => new THREE.Vector2(x, z));
    if (THREE.ShapeUtils.isClockWise(contour)) contour.reverse();
    const tri = THREE.ShapeUtils.triangulateShape(contour, []);
    // (claude/places1) a ground over a bumpy lawn DTM (a garden turned car park: Brico's lot) needs finer triangles and
    // a little more lift, else the 1 m terrain pokes through between the 1.2 m vertices: p.edge / p.lift (m)
    const EDGE = p.edge ?? MAX_EDGE, UP = p.lift ?? LIFT;
    const tris = subdivide(tri.map((t) => t.map((i) => [contour[i].x, contour[i].y])), EDGE);
    const vid = new Map();
    const V = (x, z, drop = 0, tag = 0) => {        // (tag 1: the skirt's own top vertices, so the top keeps its normals)
      const key = `${Math.round(x * 1000)},${Math.round(z * 1000)},${drop},${tag}`;
      let k = vid.get(key);
      if (k === undefined) {
        k = pos.length / 3; vid.set(key, k);
        pos.push(x, ground(x, z) + UP - drop, z);
        uvs.push(...uvOf(x, z)); rect.push(...R); surfA.push(SURF); courseA.push(cs, sn);
      }
      return k;
    };
    for (const [a, b, c] of tris) idx.push(V(...a), V(...c), V(...b));      // (x, z) ccw from above = facing +y
    // the skirt: down SKIRT along the clipped ring's edges that are the ground's own (not the tile's cut)
    const cut = (p, q) => (Math.abs(p[0] - q[0]) < 1e-6 && (Math.abs(p[0] - bounds.x0) < 1e-6 || Math.abs(p[0] - bounds.x1) < 1e-6))
      || (Math.abs(p[1] - q[1]) < 1e-6 && (Math.abs(p[1] - bounds.z0) < 1e-6 || Math.abs(p[1] - bounds.z1) < 1e-6));
    const C = contour.map((v) => [v.x, v.y]);
    for (let i = 0; i < C.length; i++) {
      const p0 = C[i], p1 = C[(i + 1) % C.length];
      if (cut(p0, p1)) continue;
      const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), n = Math.max(1, Math.ceil(L / EDGE));
      for (let k = 0; k < n; k++) {
        const a = [p0[0] + ((p1[0] - p0[0]) * k) / n, p0[1] + ((p1[1] - p0[1]) * k) / n], b = [p0[0] + ((p1[0] - p0[0]) * (k + 1)) / n, p0[1] + ((p1[1] - p0[1]) * (k + 1)) / n];
        const ta = V(...a, 0, 1), tb = V(...b, 0, 1), da = V(...a, SKIRT, 1), db = V(...b, SKIRT, 1);
        idx.push(ta, da, db, ta, db, tb);
      }
    }
  }
  if (!idx.length) return { mesh: null, rings, tris: 0 };
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute("aRect", new THREE.Float32BufferAttribute(rect, 4));
  g.setAttribute("aSurf", new THREE.Float32BufferAttribute(surfA, 1));
  g.setAttribute("aCourse", new THREE.Float32BufferAttribute(courseA, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, groundMaterial(A.tex));
  mesh.name = "grounds"; mesh.receiveShadow = true; mesh.castShadow = false;
  return { mesh, rings, tris: idx.length / 3, inside: (x, z) => rings.some((r) => inRing(r, x, z)) };
}
