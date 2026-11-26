// TIMBER POST-AND-RAIL FENCES (claude/reality1 round 3, class C4 leftover; rule timber-fence, docs/rules/timber-fence.md).
// Station and park edges in Uccle have low wooden post-and-rail fences; data/fences/timber.json (tools/fences/
// build_timber.py, OSM barrier=fence with a wooden fence_type) is their plan. Here, per tile when main.js builds it:
//   - posts (0.12 m square, 0.45 m footing into the drawn ground: welded, never a floating foot) and two rails between
//     neighbour posts (0.07 x 0.10 m, following the ground's slope), seated on the ground the city DRAWS (gardenGround);
//   - ONE shared material and ONE shared box geometry for the whole city: two InstancedMeshes a tile (posts, rails),
//     static buffers (rule no-dynamic-draw-usage); a weathered timber tone with a world-space grain;
//   - no shimmer when moving: the rails are 7-10 cm (>= 1 px to ~120 m at 1080p), and they fade out by a per-pixel hashed
//     alpha between 110 and 160 m (TAA resolves it: no pop, no crawl);
//   - colliders: an invisible box soup per tile (`timberfence-<T>`, a hero root: viewer/heroColliders.js), like the park
//     fences: the car stops at a fence, the walker cannot walk through it.
// ?timberfence=0: none.
import * as THREE from "three/webgpu";
import { positionWorld, cameraPosition, smoothstep, float, vec3, mix, fract, sin, dot, length } from "three/tsl";
import { boxSoup } from "../parkFenceLayout.js";

const qs = new URLSearchParams(typeof location !== "undefined" ? location.search : "");
export const TIMBER = qs.get("timberfence") !== "0";
const FAR0 = 110, FAR1 = 160;

let docP = null, mat = null, geo = null;
const loadDoc = (base) => (docP ??= fetch(new URL("data/fences/timber.json", base)).then((r) => (r.ok ? r.json() : null)).catch(() => null));

function material() {
  if (mat) return mat;
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.88, metalness: 0 });
  // weathered timber: a grey-brown, a fine grain along the world (the rails run any way: two directions blended)
  const p = positionWorld;
  const grain = fract(sin(dot(p.xz, vec3(12.9898, 78.233, 0).xy).add(p.y.mul(41.0))).mul(43758.5453));
  const g2 = sin(p.x.add(p.z).mul(37.0)).mul(0.5).add(0.5);
  m.colorNode = mix(vec3(0.16, 0.12, 0.085), vec3(0.25, 0.2, 0.15), grain.mul(0.35).add(g2.mul(0.65)));
  m.alphaHash = true;
  m.opacityNode = smoothstep(float(FAR1), float(FAR0), length(p.sub(cameraPosition)));
  m.userData.shared = true;
  return (mat = m);
}
function box() {
  if (geo) return geo;
  geo = new THREE.BoxGeometry(1, 1, 1);
  geo.userData.shared = true;
  return geo;
}

/** a tile's posts and rails as instance matrices + collider boxes, on the drawn ground g(x, z) (pure: the gate uses it) */
export function timberItems(doc, T, g) {
  const [pw, foot] = doc.post, rails = doc.rail;
  const posts = [], railM = [], boxes = [];
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler();
  for (const run of doc.runs) {
    const ps = run.posts, H = run.h || 1.0;
    for (let i = 0; i < ps.length; i++) {
      const [x, z, t] = ps[i];
      const y = g(x, z);
      if (t === T) {
        const h = H + 0.05 + foot;                        // the post: 5 cm over the top rail, footing in the ground
        M.compose(P.set(x, y - foot + h / 2, z), Q.identity(), S.set(pw, h, pw)); posts.push(M.clone());
        boxes.push({ a: [x - pw / 2, y, z], b: [x + pw / 2, y, z], t: pw, h: H + 0.05 });
      }
      if (i + 1 >= ps.length || t !== T) continue;
      const [bx, bz] = ps[i + 1], by = g(bx, bz);
      const dx = bx - x, dz = bz - z, L = Math.hypot(dx, dz);
      if (L < 0.05) continue;
      const yaw = Math.atan2(-dz, dx), pitch = Math.atan2(by - y, L), len = Math.hypot(L, by - y);
      for (const rh of rails) {
        const hh = rh * H;
        E.set(0, yaw, pitch, "YXZ"); Q.setFromEuler(E);
        M.compose(P.set((x + bx) / 2, (y + by) / 2 + hh, (z + bz) / 2), Q, S.set(len, 0.1, 0.07)); railM.push(M.clone());
      }
      boxes.push({ a: [x, Math.min(y, by), z], b: [bx, Math.min(y, by), bz], t: 0.1, h: H });
    }
  }
  return { posts, rails: railM, boxes };
}

export const timberFence = {
  scene: null, roots: new Map(), pending: [], stats: { tiles: 0, posts: 0, rails: 0 },
  /** the collider roots' names (viewer/heroColliders.js HERO_ROOTS), one per tile with a fence */
  async rootNames(base = new URL("../../", import.meta.url)) {
    const doc = await loadDoc(base); if (!doc) return [];
    return [...new Set(doc.runs.flatMap((r) => r.posts.map((p) => p[2])))].filter(Boolean).map((t) => `timberfence-${t}`);
  },
  /** main.js, when tile T is built: its posts and rails into the tile's group (they fade and unload with it) */
  async tile(T, group, g, base = new URL("../../", import.meta.url)) {
    if (!TIMBER) return null;
    const doc = await loadDoc(base); if (!doc) return null;
    const r = timberItems(doc, T, g);
    if (!r.posts.length && !r.rails.length) return null;
    const make = (list, name) => {
      if (!list.length) return null;
      const im = new THREE.InstancedMesh(box(), material(), list.length);
      list.forEach((m, i) => im.setMatrixAt(i, m));
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
      im.castShadow = true; im.receiveShadow = true; im.name = name;
      group.add(im); return im;
    };
    make(r.posts, `timberfence-posts-${T}`); make(r.rails, `timberfence-rails-${T}`);
    this.colliderRoot(T, r.boxes);
    this.stats.tiles++; this.stats.posts += r.posts.length; this.stats.rails += r.rails.length;
    return { posts: r.posts.length, rails: r.rails.length };
  },
  colliderRoot(T, boxes) {
    if (!this.scene) { this.pending.push([T, boxes]); return; }
    const name = `timberfence-${T}`;
    const old = this.roots.get(name);
    if (old) { this.scene.remove(old); old.traverse((o) => o.geometry?.dispose?.()); }
    const root = new THREE.Group(); root.name = name; root.userData.tile = T;
    const l0 = new THREE.Group(); l0.name = `${name}-lod0`; root.add(l0);
    const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.BufferAttribute(boxSoup(boxes), 3)); gg.computeBoundingSphere();
    const mesh = new THREE.Mesh(gg, (this.colMat ??= new THREE.MeshBasicMaterial({ visible: false })));
    mesh.visible = false; mesh.name = `${name}-boxes`; mesh.userData.collider = true; l0.add(mesh);
    this.scene.add(root); this.roots.set(name, root);
  },
  start(scene) { this.scene = scene; for (const [T, b] of this.pending) this.colliderRoot(T, b); this.pending = []; },
};
