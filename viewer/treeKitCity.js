// ?impkit=1: the city's far trees through the IMPOSTOR KIT (viewer/impostorKit/, docs/IMPOSTOR_KIT.md) instead of
// viewer/impostors.js, whose far crowns crawl with dots while the camera moves (the owner, 2026-11-12).
//
// What the lab measured and this keeps (docs/IMPOSTOR_KIT.md §1, docs/CITY_TREES.md §1):
//  - one atlas for the street trees (16 x 16 hemi views x 64 px, 6 variants, 64 MB), baked from the mesh at the
//    hand-over (LOD 2, morph complete), off the long-task budget (a grid row per frame + a worker);
//  - ONE instanced draw per pass (depth pre-pass + EQUAL colour) for every far tree of every loaded tile, full or
//    far-LOD: the vertex shader culls by distance, the CPU never re-buckets while the camera moves;
//  - the hand-over at IMP.start (400 m) over IMP.band (30 m): the mesh LOD 2 keeps n < 1 - t, the impostor n >= 1 - t,
//    the same screen IGN (treesStylized.js farMask is that already); the far end fades the shading into the ground
//    (FAR.ground = the far tiles' mean orthophoto colour) over [IMP.end - IMP.endBand, IMP.end] = 1,200-1,500 m.
// The city's own needs on top of the lab:
//  - tiles stream: the instances are kept per tile (keyed by the tile's tree list; a full tile and its far-LOD copy
//    share one entry) and the instance buffers are rewritten when the set changes, nearest tile first (a coarse
//    front-to-back order: the pre-pass rejects hidden crowns early);
//  - a far-LOD tile with no full tile has no mesh to hand over from: its instances are "solo" (drawn from 0 m);
//  - a tile streamed in while the city runs dithers its far trees in over the tile fade (0.9 s), as its meshes do.
import * as THREE from "three/webgpu";
import { uniform } from "three/tsl";
import * as K from "./impostorKit/index.js";
import { IMP } from "./impostors.js";

const qs = new URLSearchParams(location.search);
export const useTreeKit = qs.get("impkit") === "1";
const SOLO = 32;                      // ikData.w: no full tile (material.js `solo`)
const APPEAR_S = +(qs.get("tilefade") ?? 0.9);

let kit = null;

/**
 * Start the kit for a species (once): its fade distances become the city's IMP uniforms (the dev panel's sliders keep
 * working), the bake runs in the background. shared / leafMask: the species' built trees (treesStylized.js).
 */
export function startTreeKit(renderer, shared, leafMask, variants) {
  if (kit) return kit;
  // the lab's distances, unless the URL sets them (?impstart= / ?impband= / ?impend=)
  if (!qs.has("impband")) IMP.band.value = K.TYPES.tree.fade.band;
  if (!qs.has("impend")) IMP.end.value = K.TYPES.tree.fade.end;
  IMP.endBand.value = K.TYPES.tree.fade.endBand;
  const H = K.makeFade(K.TYPES.tree.fade);
  H.start = IMP.start; H.band = IMP.band; H.end = IMP.end; H.endBand = IMP.endBand;
  const view = K.makeView();
  const now = uniform(performance.now() / 1000);
  const group = new THREE.Group();
  group.name = "tree-kit";
  const entries = new Map();          // key -> { placements (kit format), refs: Set, born, cx, cz }
  let field = null, cap = 0, dirty = false, lastSortEye = new THREE.Vector3(Infinity, 0, 0), mats = null, n = 0;
  kit = {
    group, H, view, entries, atlas: null, ready: null, stats: { instances: 0, rebuilds: 0, lastRebuildMs: 0, bakeMs: 0 },
    /** hold = true while the boot cover is up: tiles registered then appear at once (no fade) */
    hold: true,
  };
  kit.ready = (async () => {
    const t0 = performance.now();
    const src = K.stylizedTreeSource(shared, leafMask, { variants, lod: 2, handover: IMP.start.value });
    const atlas = await K.bakeAtlas(renderer, src, K.TYPES.tree);
    src.dispose?.();
    kit.atlas = atlas;
    kit.stats.bakeMs = performance.now() - t0;
    mats = K.impostorMaterials(atlas, { ...K.TYPES.tree.material, fade: H, view, shade: K.treeShade(shared.U), name: "tree-kit", solo: true, appear: { now, seconds: APPEAR_S } });
    dirty = true;
    rebuild(lastSortEye.x === Infinity ? new THREE.Vector3() : lastSortEye);
    console.log(`[tree kit] atlas ${atlas.grid}x${atlas.grid} x ${atlas.cell} px, ${atlas.layers} layers, ${(atlas.bytes / 1048576).toFixed(1)} MB, bake ${kit.stats.bakeMs.toFixed(0)} ms`);
    return kit;
  })();

  function ensureField(need) {
    if (field && need <= cap) return;
    cap = Math.max(131072, Math.ceil(need * 1.25));
    if (field) { group.remove(field.group); field.dispose(); }
    // a field of `cap` instances (its instance matrices are identities the kit's card ignores, but the instanced
    // draw reads them: they must cover the count), filled in place below
    const zero = { x: 0, y: -1e4, z: 0, yaw: 0, scale: 1, variant: 0 };
    field = K.impostorField(mats, new Array(cap).fill(zero), { name: "tree-kit" });
    group.add(field.group);
  }
  function rebuild(eye) {
    if (!mats) return;
    const t0 = performance.now();
    let need = 0;
    for (const e of entries.values()) need += e.placements.length;
    ensureField(need);
    const geo = field.colour.geometry, P = geo.attributes.ikPos, D = geo.attributes.ikData, T = geo.attributes.ikTint;
    // nearest tile first
    const list = [...entries.values()].sort((a, b) => ((a.cx - eye.x) ** 2 + (a.cz - eye.z) ** 2) - ((b.cx - eye.x) ** 2 + (b.cz - eye.z) ** 2));
    let k = 0;
    for (const e of list) {
      const solo = e.refs.has("full") ? 0 : SOLO;
      for (const p of e.placements) {
        P.array[k * 3] = p.x; P.array[k * 3 + 1] = p.y; P.array[k * 3 + 2] = p.z;
        D.array[k * 4] = p.yaw; D.array[k * 4 + 1] = p.scale; D.array[k * 4 + 2] = p.variant; D.array[k * 4 + 3] = solo;
        T.array[k * 3] = e.born; T.array[k * 3 + 1] = 1; T.array[k * 3 + 2] = 1;
        k++;
      }
    }
    n = k;
    for (const [a, s] of [[P, 3], [D, 4], [T, 3]]) { a.clearUpdateRanges(); a.addUpdateRange(0, Math.max(1, k) * s); a.needsUpdate = true; }
    field.colour.count = field.depth.count = k;
    field.group.visible = k > 0;
    lastSortEye.copy(eye);
    dirty = false;
    kit.stats.instances = k; kit.stats.rebuilds++; kit.stats.lastRebuildMs = performance.now() - t0;
  }

  /** A tile's trees (treesStylized.js treePlacements: [x, z, y, turn, scale]) with their variants; role "full" | "lite".
   *  Returns the release function. */
  kit.register = (placements, variantOf, role) => {
    if (!placements.length) return () => {};
    const f = placements[0], l = placements[placements.length - 1];
    const key = `${placements.length}:${f[0]},${f[1]}:${l[0]},${l[1]}`;
    let e = entries.get(key);
    if (!e) {
      let cx = 0, cz = 0;
      for (const p of placements) { cx += p[0]; cz += p[1]; }
      e = { refs: new Set(), born: kit.hold ? -1e4 : performance.now() / 1000, cx: cx / placements.length, cz: cz / placements.length,
        placements: placements.map((p, i) => ({ x: p[0], y: p[2] - 0.25, z: p[1], yaw: p[3], scale: p[4], variant: variantOf(i) })) };
      entries.set(key, e);
    }
    const had = e.refs.has("full");
    e.refs.add(role);
    if (e.refs.size === 1 || had !== e.refs.has("full")) dirty = true;
    return () => {
      e.refs.delete(role);
      if (!e.refs.size) entries.delete(key);
      dirty = true;
    };
  };
  /** Every frame (main.js updaters): the view uniforms, the time, a rewrite when the tile set changed or the camera
   *  moved 250 m (the nearest-first order). */
  kit.update = (pos, camera) => {
    now.value = performance.now() / 1000;
    if (camera && renderer) K.updateView(view, camera, renderer);
    if (dirty || (n && pos.distanceToSquared(lastSortEye) > 250 * 250)) rebuild(pos);
  };
  /** The far fade's target: the mean colour of the far tiles' orthophotos (linear), a running mean over the tiles. */
  let groundN = 0;
  const acc = [0, 0, 0];
  kit.noteGround = (image) => {
    try {
      const c = new OffscreenCanvas(16, 16), x = c.getContext("2d");
      x.drawImage(image, 0, 0, 16, 16);
      const d = x.getImageData(0, 0, 16, 16).data, lin = (v) => Math.pow(v / 255, 2.2);
      const m = [0, 0, 0];
      for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) m[k] += lin(d[i + k]) / 256;
      groundN++;
      for (let k = 0; k < 3; k++) acc[k] += (m[k] - acc[k]) / groundN;
      K.FAR.ground.value.setRGB(acc[0], acc[1], acc[2]);
    } catch { /* (no OffscreenCanvas: keep the default) */ }
  };
  return kit;
}
export const treeKit = () => kit;
