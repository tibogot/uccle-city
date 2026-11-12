// The character's per-tile collider build, OFF the main thread (no hitch while tiles stream in): the roads BVH from
// the triangle positions the main thread gathered from the tile's meshes, and the footprint prisms from the tile's
// buildings.json (fetched and parsed here), plus the props / posts lists. Results go back as transferable arrays
// (TriBVH / PrismSet toData), the main thread wraps them (fromData) without any build work.
// A module worker of its own (viewer/character/cityHook.js), so the shared tile worker bundle is untouched.
import { TriBVH } from "./bvh.js";
import { PrismSet } from "./prisms.js";

onmessage = async (e) => {
  const { id, positions, buildingsUrl, posts, props, hide = [], only } = e.data;
  try {
    const t0 = performance.now();
    const bvh = new TriBVH(positions).toData();
    const t1 = performance.now();
    if (only === "bvh") { postMessage({ id, bvh, ms: { bvh: +(t1 - t0).toFixed(1) } }, TriBVH.transferList(bvh)); return; }
    const hidden = new Set(hide);          // the UrbIS solids a landmark replaces: it collides by its own triangles
    const doc = await (await fetch(buildingsUrl)).json();
    const polys = [];
    for (const b of doc.buildings) {
      if (hidden.has(b.attrs?.BU_ID) || hidden.has(b.id)) continue;
      const rings = (b.footprint || []).filter((r) => r.length >= 3);
      if (rings.length) polys.push({ rings, base: (+b.base || 0) - 3, top: +b.top || 1e4, id: b.attrs?.BU_ID || b.id });
    }
    const buildings = new PrismSet(polys, []).toData();
    const propSet = new PrismSet(props.polys, props.circles).toData();
    const postSet = new PrismSet(posts.polys, posts.circles).toData();
    const out = { id, bvh, buildings, props: propSet, posts: postSet, counts: { tris: bvh.count, buildings: polys.length, props: props.polys.length + props.circles.length, posts: posts.polys.length + posts.circles.length },
      ms: { bvh: +(t1 - t0).toFixed(1), prisms: +(performance.now() - t1).toFixed(1) } };
    postMessage(out, [...TriBVH.transferList(bvh), ...PrismSet.transferList(buildings), ...PrismSet.transferList(propSet), ...PrismSet.transferList(postSet)]);
  } catch (err) { postMessage({ id, error: String(err?.message || err) }); }
};
