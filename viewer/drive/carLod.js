// CAR LODs on plain arrays (no three.js), so the same code runs on the main thread (viewer/drive/carPacks.js: the labs,
// drive mode) and in a worker (viewer/carLodWorker.js: the city's parked-car fleet, no main-thread hitch).
//   mesh = { P: Float32Array xyz, N: normals, C: colour rgb, K: kind, I: Uint32Array index }
//   lodMesh(mesh, { error, welded, prune, free, loose }, MeshoptSimplifier) -> a mesh (flat normals, non-indexed for
//   the welded paths: I is the identity)
//   parseCarGlb(arrayBuffer) -> [{ id, extras, parts: [{ name, pos, mesh }] }]  (the convertPacks / carFaceted contract)

/** Flat-shaded packs split vertices per face (hard normals): nearly every edge is a border and the simplifier can
 *  hardly move. Simplify on an index WELDED by position + colour + kind instead (normals ignored): colour seams stay
 *  borders (kept closed with LockBorder up close), flat faces merge; then flat face normals again. */
function simplifyWelded(m, error, MS, prune = false, free = false) {
  const { P, C, K, I } = m, n = P.length / 3;
  const map = new Map(), weld = new Uint32Array(n), rep = [];
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(P[i * 3] * 1e4)},${Math.round(P[i * 3 + 1] * 1e4)},${Math.round(P[i * 3 + 2] * 1e4)}|${K[i]}|` +
      `${Math.round(C[i * 3] * 500)},${Math.round(C[i * 3 + 1] * 500)},${Math.round(C[i * 3 + 2] * 500)}`;
    let w = map.get(k);
    if (w == null) { w = rep.length; map.set(k, w); rep.push(i); }
    weld[i] = w;
  }
  const wpos = new Float32Array(rep.length * 3);
  rep.forEach((i, w) => wpos.set(P.subarray(i * 3, i * 3 + 3), w * 3));
  const widx = Uint32Array.from(I, (i) => weld[i]);
  const flags = error < 0.02 && !free ? ["ErrorAbsolute", "LockBorder"] : ["ErrorAbsolute"];
  if (prune && error >= 0.02) flags.push("Prune");   // far LODs: drop islands under the error (lug nuts, plate glyphs, wipers)
  const [idx] = MS.simplify(widx, wpos, 3, 0, error, flags);
  return flatten(idx, wpos, (w, o, out) => { const src = rep[w]; out.C.set(C.subarray(src * 3, src * 3 + 3), o * 3); out.K[o] = K[src]; });
}

/** The FAR LOD of a many-coloured mesh (our faceted cars, >= 130 m: 15-25 px): weld on POSITION only, so colour seams
 *  stop being borders, and let simplifyWithAttributes weigh the colour (and a paint flag) so regions keep their place.
 *  Each output triangle gets one kind (paint wins when most of its corners are paint, else the commonest) and the mean
 *  colour of its corners of that kind; flat normals again. */
function simplifyLoose(m, error, MS, prune = false) {
  const { P, C, K, I } = m, n = P.length / 3;
  const map = new Map(), weld = new Uint32Array(n), reps = [];
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(P[i * 3] * 1e4)},${Math.round(P[i * 3 + 1] * 1e4)},${Math.round(P[i * 3 + 2] * 1e4)}`;
    let w = map.get(k);
    if (w == null) { w = reps.length; map.set(k, w); reps.push([]); }
    reps[w].push(i); weld[i] = w;
  }
  const N = reps.length, wpos = new Float32Array(N * 3), attr = new Float32Array(N * 4), vkind = new Uint8Array(N), vcol = new Float32Array(N * 3);
  reps.forEach((list, w) => {
    wpos.set(P.subarray(list[0] * 3, list[0] * 3 + 3), w * 3);
    const cnt = new Map();
    let r = 0, g = 0, b = 0, paint = 0;
    for (const i of list) { r += C[i * 3]; g += C[i * 3 + 1]; b += C[i * 3 + 2]; if (K[i] === 1) paint++; cnt.set(K[i], (cnt.get(K[i]) || 0) + 1); }
    const L = list.length;
    attr.set([r / L, g / L, b / L, paint / L], w * 4);
    vkind[w] = [...cnt].sort((x, y) => y[1] - x[1])[0][0];
    let cr = 0, cg = 0, cb = 0, cm = 0;
    for (const i of list) if (K[i] === vkind[w]) { cr += C[i * 3]; cg += C[i * 3 + 1]; cb += C[i * 3 + 2]; cm++; }
    vcol.set([cr / cm, cg / cm, cb / cm], w * 3);
  });
  const widx = Uint32Array.from(I, (i) => weld[i]);
  const flags = ["ErrorAbsolute"];
  if (prune) flags.push("Prune");
  const [idx] = MS.simplifyWithAttributes(widx, wpos, 3, attr, 4, [0.05, 0.05, 0.05, 0.08], null, 0, error, flags);
  // per triangle: one kind and colour
  const triKind = new Uint8Array(idx.length / 3), triCol = new Float32Array(idx.length);
  for (let t = 0; t < idx.length / 3; t++) {
    const w = [idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]], ks = w.map((x) => vkind[x]);
    const kd = ks.filter((x) => x === 1).length >= 2 ? 1 : ks[0] === ks[1] || ks[0] === ks[2] ? ks[0] : ks[1] === ks[2] ? ks[1] : ks[0];
    let cr = 0, cg = 0, cb = 0, cm = 0;
    for (const x of w) if (vkind[x] === kd) { cr += vcol[x * 3]; cg += vcol[x * 3 + 1]; cb += vcol[x * 3 + 2]; cm++; }
    triKind[t] = kd; triCol[t * 3] = cr / cm; triCol[t * 3 + 1] = cg / cm; triCol[t * 3 + 2] = cb / cm;
  }
  return flatten(idx, wpos, (w, o, out, t) => { out.C.set(triCol.subarray(t * 3, t * 3 + 3), o * 3); out.K[o] = triKind[t]; });
}

/** Non-indexed output with flat normals; attr(w, corner, out, tri) fills colour + kind per corner. */
function flatten(idx, wpos, attr) {
  const T = idx.length / 3, out = { P: new Float32Array(T * 9), N: new Float32Array(T * 9), C: new Float32Array(T * 9), K: new Float32Array(T * 3) };
  for (let t = 0; t < T; t++) {
    const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
    const ux = wpos[b] - wpos[a], uy = wpos[b + 1] - wpos[a + 1], uz = wpos[b + 2] - wpos[a + 2];
    const vx = wpos[c] - wpos[a], vy = wpos[c + 1] - wpos[a + 1], vz = wpos[c + 2] - wpos[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (let k = 0; k < 3; k++) {
      const o = t * 3 + k, w = idx[o];
      out.P[o * 3] = wpos[w * 3]; out.P[o * 3 + 1] = wpos[w * 3 + 1]; out.P[o * 3 + 2] = wpos[w * 3 + 2];
      out.N[o * 3] = nx; out.N[o * 3 + 1] = ny; out.N[o * 3 + 2] = nz;
      attr(w, o, out, t);
    }
  }
  out.I = Uint32Array.from({ length: T * 3 }, (_, i) => i);
  return out;
}

/** One LOD of a mesh. opts: { error, welded (always weld), prune, free (no locked borders), loose (position-only weld) } */
export function lodMesh(m, { error, welded = false, prune = false, free = false, loose = false }, MS) {
  if (!error) return m;
  if (loose) return simplifyLoose(m, error, MS, prune);
  if (welded) return simplifyWelded(m, error, MS, prune, free);
  const [idx] = MS.simplify(new Uint32Array(m.I), m.P, 3, 0, error, ["ErrorAbsolute"]);
  if (idx.length < m.I.length * 0.85) return { ...m, I: idx };
  return simplifyWelded(m, error, MS);
}

/** The LOD error / flags of part `name` at LOD level `L` of a pack source spec S (carPacks.js PACK_SOURCES). */
export function lodOpts(S, L, name) {
  const body = name === "Body", e = body ? L.error : L.wheel ?? L.error * 0.6;
  return { error: e, welded: !!S.welded, prune: !!S.prune, free: !body && L.wheel != null, loose: !!L.loose };
}

// ---------------------------------------------------------------------------------------------- GLB (our contract)
const COMP = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
/** Parse a car GLB of the convertPacks / carFaceted contract: root nodes = cars (extras), children Body / Wheel_* with
 *  one primitive each (POSITION, NORMAL, COLOR_0, _KIND, indices). Meshes shared between nodes stay shared. */
export function parseCarGlb(buf) {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error("not a GLB");
  let o = 12, json = null, bin = null;
  while (o < buf.byteLength) {
    const len = dv.getUint32(o, true), type = dv.getUint32(o + 4, true);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, o + 8, len)));
    else if (type === 0x004e4942) bin = o + 8;
    o += 8 + len;
  }
  const acc = (i) => {
    const a = json.accessors[i], v = json.bufferViews[a.bufferView], T = COMP[a.componentType], n = a.count * NC[a.type];
    const off = bin + (v.byteOffset || 0) + (a.byteOffset || 0);
    if (off % T.BYTES_PER_ELEMENT === 0) return new T(buf.slice(off, off + n * T.BYTES_PER_ELEMENT));
    return new T(buf.slice(off, off + n * T.BYTES_PER_ELEMENT));
  };
  const meshes = new Map();
  const meshOf = (mi) => {
    if (!meshes.has(mi)) {
      const p = json.meshes[mi].primitives[0], A = p.attributes;
      const I = acc(p.indices);
      meshes.set(mi, { P: acc(A.POSITION), N: acc(A.NORMAL), C: acc(A.COLOR_0), K: acc(A._KIND), I: I instanceof Uint32Array ? I : Uint32Array.from(I), id: mi });
    }
    return meshes.get(mi);
  };
  const roots = json.scenes[json.scene || 0].nodes;
  return roots.map((ri) => {
    const n = json.nodes[ri];
    return { id: n.name, extras: n.extras || {}, parts: (n.children || []).map((ci) => {
      const c = json.nodes[ci];
      return { name: c.name, pos: c.translation || [0, 0, 0], mesh: meshOf(c.mesh) };
    }) };
  });
}

/** Concatenate meshes, each translated by its offset: one geometry per car per LOD (instancing). W (per vertex: the
 *  wheel centre xyz + 1 front wheel / 2 rear wheel / 0 body, from the part names Wheel_F* / Wheel_R*): the moving
 *  traffic (viewer/traffic/trafficFleet.js) rolls and steers the wheels in the vertex shader. */
export function mergeMeshes(list) {
  let nv = 0, ni = 0;
  for (const { mesh } of list) { nv += mesh.P.length / 3; ni += mesh.I.length; }
  const out = { P: new Float32Array(nv * 3), N: new Float32Array(nv * 3), C: new Float32Array(nv * 3), K: new Float32Array(nv), I: new Uint32Array(ni), W: new Float32Array(nv * 4) };
  let v = 0, i = 0;
  for (const { mesh: m, pos, name = "" } of list) {
    const n = m.P.length / 3;
    const wf = /^Wheel_F/.test(name) ? 1 : /^Wheel_R/.test(name) ? 2 : 0;
    if (wf) for (let k = 0; k < n; k++) { out.W[(v + k) * 4] = pos[0]; out.W[(v + k) * 4 + 1] = pos[1]; out.W[(v + k) * 4 + 2] = pos[2]; out.W[(v + k) * 4 + 3] = wf; }
    for (let k = 0; k < n; k++) { out.P[(v + k) * 3] = m.P[k * 3] + pos[0]; out.P[(v + k) * 3 + 1] = m.P[k * 3 + 1] + pos[1]; out.P[(v + k) * 3 + 2] = m.P[k * 3 + 2] + pos[2]; }
    out.N.set(m.N, v * 3); out.C.set(m.C, v * 3); out.K.set(m.K, v);
    for (let k = 0; k < m.I.length; k++) out.I[i + k] = m.I[k] + v;
    v += n; i += m.I.length;
  }
  return out;
}
