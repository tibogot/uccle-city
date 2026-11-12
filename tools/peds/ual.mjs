// Read a glTF / GLB animation library (Quaternius Universal Animation Library 1, CC0: data/raw/characters/ual1/ual1.glb,
// git-ignored) without a browser: node hierarchy, rest TRS, animation channels (LINEAR / STEP), world transforms of any
// node at any time. Used by bakeGait.mjs to retarget clips (sit, talk) onto Mr.doob's 15-bone crowd skeleton by joint
// POSITIONS (limb IK) and torso / head ORIENTATION deltas from the rest pose (both skeletons face +Z, left = +X).
import { readFileSync } from "node:fs";

export function loadGlb(file, THREE) {
  const buf = readFileSync(file);
  const jlen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.slice(20, 20 + jlen).toString());
  const binStart = 20 + jlen + 8;
  const bin = buf.slice(binStart, binStart + buf.readUInt32LE(20 + jlen));
  const acc = (i) => {
    const a = json.accessors[i], v = json.bufferViews[a.bufferView];
    const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
    if (a.componentType !== 5126) throw new Error("only float accessors");
    const off = (v.byteOffset || 0) + (a.byteOffset || 0), stride = v.byteStride || n * 4;
    const out = new Float32Array(a.count * n);
    for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = bin.readFloatLE(off + k * stride + c * 4);
    return { data: out, n, count: a.count };
  };
  const nodes = json.nodes.map((nd, i) => ({
    i, name: nd.name, children: nd.children || [], parent: -1,
    t: nd.translation ? [...nd.translation] : [0, 0, 0], r: nd.rotation ? [...nd.rotation] : [0, 0, 0, 1], s: nd.scale ? [...nd.scale] : [1, 1, 1],
  }));
  nodes.forEach((nd) => nd.children.forEach((c) => (nodes[c].parent = nd.i)));
  const byName = Object.fromEntries(nodes.map((n) => [n.name, n.i]));
  const clips = Object.fromEntries(json.animations.map((a) => {
    const ch = a.channels.map((c) => {
      const s = a.samplers[c.sampler];
      return { node: c.target.node, path: c.target.path, input: acc(s.input).data, output: acc(s.output), interp: s.interpolation || "LINEAR" };
    });
    const duration = Math.max(...ch.map((c) => c.input[c.input.length - 1]));
    return [a.name, { name: a.name, channels: ch, duration }];
  }));
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  /** Local TRS of every node at time t of a clip (null = rest pose). */
  function pose(clip, t) {
    const L = nodes.map((n) => ({ t: [...n.t], r: [...n.r], s: [...n.s] }));
    if (clip) for (const c of clip.channels) {
      const inp = c.input; let k = 0;
      while (k < inp.length - 2 && inp[k + 1] <= t) k++;
      const f = inp.length < 2 || c.interp === "STEP" ? 0 : Math.min(1, Math.max(0, (t - inp[k]) / (inp[k + 1] - inp[k])));
      const n = c.output.n, d = c.output.data, a = k * n, b = Math.min(inp.length - 1, k + 1) * n;
      const key = { translation: "t", rotation: "r", scale: "s" }[c.path];
      if (!key) continue;
      if (key === "r") { qa.fromArray(d, a); qb.fromArray(d, b); qa.slerp(qb, f); L[c.node].r = qa.toArray(); }
      else L[c.node][key] = [0, 1, 2].map((j) => d[a + j] + (d[b + j] - d[a + j]) * f);
    }
    return L;
  }
  /** World matrices from local TRS. */
  function world(L) {
    const W = new Array(nodes.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const visit = (i, parentM) => {
      const l = L[i];
      m.compose(p.fromArray(l.t), q.fromArray(l.r), s.fromArray(l.s));
      W[i] = parentM ? parentM.clone().multiply(m) : m.clone();
      for (const c of nodes[i].children) visit(c, W[i]);
    };
    nodes.forEach((n) => { if (n.parent < 0) visit(n.i, null); });
    return W;
  }
  return { json, nodes, byName, clips, pose, world };
}
