// THE LANDMARKS' TRIANGLE BVHs, built once and shared (docs/ORBITCAM.md): the orbit / inspection camera picks and
// collides with them, the third-person character walks on them (viewer/character/cityHook.js). Each landmark's LOD0
// triangles come from viewer/heroColliders.js (window.__heroCols.onTriangles); the BVH is built OFF the main thread in
// the character's collider worker (viewer/character/colliderWorker.js, `only: "bvh"`), so nothing hitches and the
// arrays exist once in memory whoever asks first.
import { TriBVH } from "./character/bvh.js";

const bvhs = new Map();            // name -> TriBVH (built)
const jobs = new Map();            // name -> Promise<TriBVH | null>
let worker = null, reqId = 0, listening = false;
const pending = new Map();
const TRANSFER = typeof location === "undefined" || !/[?&]heropoll=old(&|$)/.test(location.search);

function post(tris) {
  if (!worker) {
    worker = new Worker(new URL("./character/colliderWorker.js", import.meta.url), { type: "module" });
    worker.onmessage = (e) => { const p = pending.get(e.data.id); pending.delete(e.data.id); if (e.data.error) p.reject(new Error(e.data.error)); else p.resolve(e.data); };
  }
  const id = ++reqId;
  // (falcon2, ?heropoll=old: copied twice, as before): the copy is TRANSFERRED (postMessage cloned the slice again: a
  // second landmark-sized array of garbage on the main thread, round 2's GC leftover)
  const positions = tris.slice();
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); worker.postMessage({ id, positions, only: "bvh" }, TRANSFER ? [positions.buffer] : []); });
}

/** The BVH of a landmark's triangle soup (built once; later callers get the same object). */
export function heroBVH(name, tris, log = () => {}) {
  if (!jobs.has(name)) {
    jobs.set(name, post(tris).then((r) => {
      const b = TriBVH.fromData(r.bvh);
      bvhs.set(name, b);
      log(`landmark BVH ${name}: ${r.bvh.count} triangles (worker ${r.ms.bvh} ms)`);
      return b;
    }).catch((e) => { log(`landmark BVH ${name}: ${e.message}`); jobs.delete(name); return null; }));
  }
  return jobs.get(name);
}

/** Every built landmark BVH (name -> TriBVH); the first call starts listening to the hero colliders. */
export function heroBVHs(log) {
  if (!listening) {
    listening = true;
    (async () => {
      for (let i = 0; i < 600 && !window.__heroCols; i++) await new Promise((r) => setTimeout(r, 200));
      window.__heroCols?.onTriangles((name, tris) => heroBVH(name, tris, log));
    })();
  }
  return bvhs;
}
