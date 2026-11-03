// Our LiDAR trees drawn with mrdoob/slop-newyork's tree system (vendor/slop-trees, MIT): procedural
// skeletons (trunk, limbs, branches, twigs) with leaf sprays from a generated atlas, three LODs by
// distance, foliage lighting with translucency, wind. This file only maps features.json trees to its
// sites: species by a stable hash (plane / honey locust / elm), scale so the tree is as tall as the
// LiDAR says, crown widened or narrowed to the LiDAR crown radius.
import * as THREE from "three/webgpu";
import { createTreeField, createLeafAtlas, buildTreeGeometries, TREE_SPECIES } from "../vendor/slop-trees/trees.js";

let speciesSize = null;     // [{ h, r }] natural height and crown radius at scale 1, measured once

function measure() {
  const atlas = createLeafAtlas();
  speciesSize = TREE_SPECIES.map((_, s) => {
    const g = buildTreeGeometries(s, 0, atlas.tileMeters)[0];
    g.computeBoundingBox();
    const b = g.boundingBox;
    return { h: b.max.y, r: Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / 2 };
  });
  atlas.texture?.dispose?.();
  return speciesSize;
}

const hash = (x, z, k) => { const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };

/** trees: features.json trees; ground(x, z): surface y; inTile(x, z). Returns { group, update(cameraPos), count, sizes }. */
export function buildTreeField(trees, ground, inTile) {
  const sizes = speciesSize || measure();
  const sites = [];
  for (const t of trees) {
    if (!inTile(t.x, t.z)) continue;
    const h = Math.max(3, t.height ?? 9);
    const r = hash(t.x, t.z, 1);
    const species = r < 0.42 ? 0 : r < 0.62 ? 1 : 2;                // plane / honey locust / elm
    const sz = sizes[species];
    const scale = Math.min(2.2, Math.max(0.22, h / sz.h));
    const crown = t.crown ?? 0.2 * h + 0.8;
    const widen = Math.min(1.4, Math.max(0.7, crown / (sz.r * scale)));
    sites.push({ x: t.x, y: ground(t.x, t.z) - 0.05, z: t.z, scale, species, sx: widen, sz: widen, yaw: hash(t.z, t.x, 2) * Math.PI * 2 });
  }
  const field = createTreeField(null, sites, []);
  return { group: field.group, update: (p) => field.update(p), count: sites.length, sizes };
}
