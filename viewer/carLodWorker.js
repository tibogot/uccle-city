// THE PARKED-CAR LODs off the main thread (viewer/carFleet.js): fetch the faceted GLB, run the meshoptimizer LODs
// (viewer/drive/carLod.js, the same code carPacks.js runs for the labs) and merge each car's body + wheels per LOD into
// one geometry for instancing; the arrays come back transferred. Module worker: no importmap here, so meshoptimizer by
// its full URL (keep the version in step with viewer/index.html).
import { MeshoptSimplifier } from "https://cdn.jsdelivr.net/npm/meshoptimizer@1.2.0/meshopt_simplifier.js";
import { parseCarGlb, lodMesh, lodOpts, mergeMeshes } from "./drive/carLod.js";

onmessage = async (e) => {
  const { id, url, S } = e.data;
  try {
    const t0 = performance.now();
    const [buf] = await Promise.all([fetch(url).then((r) => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.arrayBuffer(); }), MeshoptSimplifier.ready]);
    const cars = parseCarGlb(buf), transfer = [];
    const out = cars.map((car) => ({
      id: car.id, extras: car.extras,
      lods: S.lods.map((L) => {
        const done = new Map();            // the left / right wheels share a mesh: simplify it once per LOD
        const parts = car.parts.map((p) => {
          const o = lodOpts(S, L, p.name), key = `${p.mesh.id}|${o.error}`;
          if (!done.has(key)) done.set(key, lodMesh(p.mesh, o, MeshoptSimplifier));
          return { mesh: done.get(key), pos: p.pos };
        });
        const m = mergeMeshes(parts);
        transfer.push(m.P.buffer, m.N.buffer, m.C.buffer, m.K.buffer, m.I.buffer);
        return m;
      }),
    }));
    postMessage({ id, cars: out, ms: performance.now() - t0 }, transfer);
  } catch (err) { postMessage({ id, error: String(err?.message || err) }); }
};
