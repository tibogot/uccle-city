// STATIC SUBTREES (perf pass 3, docs/perf/AUDIT.md step 13): three re-walks every object's world matrix every frame
// (scene.updateMatrixWorld: 0.13 ms for ~1,350 objects at the Place). The tile layers (terrain, buildings, roads,
// features: everything in them is placed once, in city coordinates) are FROZEN: matrixWorldAutoUpdate = false, their
// world matrices computed once; an object added anywhere under a frozen group gets its world matrix computed once
// at the add (Object3D.add hook). Moving things live elsewhere (traffic, cars fleet, falcons, weather, landmarks).
//   freeze(group)        checkFrozen() -> objects whose stored world matrix is stale (debug: should be 0)
// OPT-IN (?freeze=1): measured at the Place (1,355 objects) the walk is 0.13 ms in all; freezing the tile layers
// (200-270 objects) or 44 more static roots (landmarks, kits) changed it by less than the noise (0.134 vs 0.129 ms,
// 0.184 vs 0.191 ms): not worth a global Object3D.add hook by default.
import * as THREE from "three/webgpu";

const qs = new URLSearchParams(typeof location === "undefined" ? "" : location.search);
export const FREEZE = qs.get("freeze") === "1";
const frozen = new Set();

function frozenUnder(o) {
  for (let p = o; p; p = p.parent) if (p.userData?.frozen && p.matrixWorldAutoUpdate === false) return true;
  return false;
}
if (FREEZE && !THREE.Object3D.prototype.add.__frozenHook) {
  const add0 = THREE.Object3D.prototype.add;
  const add = function (...objs) {
    const r = add0.apply(this, objs);
    if (frozen.size && frozenUnder(this)) for (const o of objs) if (o?.isObject3D) o.updateMatrixWorld(true);
    return r;
  };
  add.__frozenHook = true;
  THREE.Object3D.prototype.add = add;
}

/** compute the group's world matrices once and stop the per-frame walk below it */
export function freeze(g) {
  if (!FREEZE || !g) return g;
  g.updateMatrixWorld(true);
  g.matrixWorldAutoUpdate = false;
  g.userData.frozen = true;
  frozen.add(g);
  return g;
}

const _m = new THREE.Matrix4(), _l = new THREE.Matrix4();
/** debug: objects under frozen groups whose world matrix is not parent x local (stale), with a few names */
export function checkFrozen() {
  let n = 0, stale = 0;
  const names = [];
  for (const g of frozen) g.traverse((o) => {
    if (o === g) return;
    n++;
    if (o.matrixAutoUpdate) _l.compose(o.position, o.quaternion, o.scale); else _l.copy(o.matrix);
    _m.multiplyMatrices(o.parent.matrixWorld, _l);
    const a = _m.elements, b = o.matrixWorld.elements;
    for (let i = 0; i < 16; i++) if (Math.abs(a[i] - b[i]) > 1e-4) { stale++; if (names.length < 8) names.push(o.name || o.type); break; }
  });
  return { groups: frozen.size, objects: n, stale, names };
}
