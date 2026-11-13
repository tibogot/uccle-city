// CONTACT AUDIT in the city (tools/mesh_audit/contact.js): a scripted model against the generated ground of its tile,
// as the city places them (the owner's JOINS rule; docs/collisions/README.md).
//   await viewer.contactAudit("bridge-verrewinkel")     a hero / bridge root (its LOD0 child), against the loaded tiles'
//                                                       terrain, roads (asphalt, concrete = sidewalks / kerbs / plazas,
//                                                       grass, pits) and rail ballast
//   await viewer.contactAudit("roads:F7")               a tile's road meshes against its terrain (+ the heroes there)
// Returns { summary, items } (items: kind floating / overhang, at [x, y, z] in city metres, length, gapMax, part).
import { partFromBufferGeometry } from "../tools/mesh_audit/audit.js";
import { auditContact } from "../tools/mesh_audit/contact.js";

export const HEROES = ["stjob", "townhall", "stalle", "vanbuuren", "wolvendael", "police", "calevoet", "stpierre", "observatory",
  "bridge-verrewinkel", "bridge-stjob", "bridge-calevoet"];

const meshParts = (root, name, filter = null) => {
  const out = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.geometry?.attributes?.position) return;
    if (filter && !filter(o)) return;
    out.push(partFromBufferGeometry(o.geometry, { name, slot: o.material?.name || o.name || "", matrixWorld: o.matrixWorld.elements }));
  });
  return out;
};

/** The LOD0 node of a hero / bridge root (its "<name>_lod0" / "-lod0" child), else the root. */
export function lod0Of(root) {
  return root.children.find((c) => /[-_]lod0$/.test(c.name)) || root;
}

/** Ground parts of the loaded tiles near a box: terrain, road meshes, rail ballast. */
export function groundParts(scene, tiles, { roads = true, terrain = true, rail = true } = {}) {
  const out = [];
  for (const t of tiles) {
    if (terrain) { const g = scene.getObjectByName(`${t.name}-terrain`); if (g) out.push(...meshParts(g, `${t.name}-terrain`)); }
    if (roads) { const g = scene.getObjectByName(`${t.name}-roads`); if (g) out.push(...meshParts(g, `${t.name}-roads`)); }
    if (rail) { const g = scene.getObjectByName(`${t.name}-features`); if (g) out.push(...meshParts(g, `${t.name}-rail`, (o) => /^rail-ballast/.test(o.name))); }
  }
  return out;
}

export function contactAudit({ scene, world }, what, options = {}) {
  if (what.startsWith("roads:")) {
    const name = what.slice(6), t = world.tiles.find((w) => w.name === name);
    if (!t) throw new Error(`tile ${name} not loaded`);
    const model = meshParts(scene.getObjectByName(`${name}-roads`), `${name}-roads`);
    const heroes = HEROES.map((h) => scene.getObjectByName(h)).filter(Boolean).flatMap((r) => meshParts(lod0Of(r), r.name));
    const ground = [...groundParts(scene, world.tiles, { roads: false }), ...heroes];
    return auditContact(model, ground, options);
  }
  const root = scene.getObjectByName(what);
  if (!root) throw new Error(`${what}: not in the scene`);
  const model = meshParts(lod0Of(root), what);
  return auditContact(model, groundParts(scene, world.tiles), options);
}
