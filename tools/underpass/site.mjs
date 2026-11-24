// THE CALEVOET PEDESTRIAN UNDERPASS U1: ITS SITE (claude/underpass1, docs/CALEVOET_UNDERPASS_PLAN.md). The one input of
// tools/blender/underpass.py, made from the city's own data only:
//   - the OSM ways of U1 (data/tiles/D6/features.json lines: the city-frame geometry; data/raw/osm/area.json: the tags),
//   - the two UrbIS kiosk solids the model replaces (data/tiles/D6/buildings.json: 525169 east, 519275 west),
//   - the city's terrain in the underpass frame (the SAME 1 m DTM grid and bilinear lookup the tile draws:
//     viewer/heightmap.js surface), the rail tracks and platforms over it (data/rail/rail.json: the bake's occluders).
//
//   node tools/underpass/site.mjs          -> models/underpass/site.json
//
// THE FRAME (u, w, h): origin = the east stair's foot (OSM 30235696's last node = 640826544's first), u along the
// corridor (OSM 640826544, east -> west, under both tracks), w = three.js local +z (no mirror: city = O + u U + w W),
// h = m TAW. three local (x, y, z) = (u, TAW - OY, w); Blender (X, Y, Z) = (u, -w, TAW - OY).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { Heightmap } from "../../viewer/heightmap.js";

const ROOT = new URL("../../", import.meta.url);
const TILE = "D6", OY = 40;
const read = (p) => JSON.parse(readFileSync(new URL(p, ROOT), "utf8"));
/** U1's ways (docs/CALEVOET_UNDERPASS_PLAN.md §1): the role, the tags the gate keeps checking */
export const WAYS = {
  30235696: { role: "east_stair", want: { highway: "steps", tunnel: "yes", layer: "-1" } },
  640826544: { role: "corridor", want: { highway: "footway", tunnel: "yes", layer: "-1" } },
  640826545: { role: "west_stair", want: { highway: "steps", tunnel: "yes", layer: "-1" } },
  30235699: { role: "west_link", want: { highway: "footway" } },
  1128428859: { role: "east_link", want: { highway: "footway" } },
  30235693: { role: "east_link2", want: { highway: "footway" } },
};
export const KIOSKS = { east: "525169", west: "519275" };

export function buildSite() {
  const feats = read(`data/tiles/${TILE}/features.json`);
  const osm = read("data/raw/osm/area.json");
  const tags = new Map(osm.elements.filter((e) => e.type === "way" && WAYS[e.id]).map((e) => [e.id, e.tags]));
  const ways = {};
  for (const [id, w] of Object.entries(WAYS)) {
    const l = (feats.lines || []).find((x) => x.id === `osm:w${id}`);
    ways[w.role] = { osm: +id, line: l?.line ?? null, tags: tags.get(+id) ?? null };
  }
  const C = ways.corridor.line, FE = C[0], FW = C[C.length - 1];
  const L = Math.hypot(FW[0] - FE[0], FW[1] - FE[1]);
  const U = [(FW[0] - FE[0]) / L, (FW[1] - FE[1]) / L];
  const rotY = Math.atan2(-U[1], U[0]);
  const W = [Math.sin(rotY), Math.cos(rotY)];
  const O = FE;
  const local = ([x, z]) => [(x - O[0]) * U[0] + (z - O[1]) * U[1], (x - O[0]) * W[0] + (z - O[1]) * W[1]];
  const world = (u, w) => [O[0] + U[0] * u + W[0] * w, O[1] + U[1] * u + W[1] * w];
  const r3 = (v) => Math.round(v * 1000) / 1000;

  const hdr = read(`data/tiles/${TILE}/terrain.json`);
  const hm = new Heightmap(hdr, readFileSync(new URL(`data/tiles/${TILE}/terrain.u16`, ROOT)).buffer.slice(0));
  const ground = (x, z) => hm.surface(x, z);

  const bj = read(`data/tiles/${TILE}/buildings.json`);
  const kiosks = {};
  for (const [side, sid] of Object.entries(KIOSKS)) {
    const b = bj.buildings.find((q) => String(q.id).endsWith(`/${sid}`));
    if (!b) throw new Error(`UrbIS solid ${sid} not in ${TILE}`);
    kiosks[side] = { solid: b.id, bu: b.attrs?.BU_ID ?? null, base: b.base, eaves: b.eaves ?? null, top: b.top, ring_city: b.footprint[0], ring_uw: b.footprint[0].map((p) => local(p).map(r3)) };
  }
  // the neighbours within 40 m (bake occluders: the crossing keeper's house 524832, the station's annexes)
  const neighbours = [];
  for (const b of bj.buildings) {
    const id = String(b.id).split("/").pop();
    if (Object.values(KIOSKS).includes(id)) continue;
    const ring = b.footprint[0].map((p) => local(p).map(r3));
    if (ring.some(([u, w]) => u > -40 && u < 62 && w > -40 && w < 40)) neighbours.push({ id: b.id, ring, base: b.base, top: b.top ?? b.base + b.height });
  }
  const rail = read("data/rail/rail.json");
  const tracks = [];
  for (const t of rail.tracks) {
    const P = t.pts.map(([x, y, z]) => [...local([x, z]), y]);
    if (P.some(([u, w]) => u > -30 && u < 52 && Math.abs(w) < 30)) tracks.push({ id: t.id ?? t.osm ?? null, pts: P.filter(([u, w]) => u > -40 && u < 62 && Math.abs(w) < 40).map((p) => p.map(r3)) });
  }
  const platforms = rail.platforms.filter((p) => p.ring.some(([x, z]) => { const [u, w] = local([x, z]); return u > -30 && u < 52 && Math.abs(w) < 40; }))
    .map((p) => ({ top: p.top, ring: p.ring.map((q) => local(q).map(r3)) }));
  // the ground grid (0.25 m) over the site (u -14 .. 36, w -16 .. 16)
  const G = { u0: -14, u1: 36, w0: -16, w1: 16, step: 0.25 };
  G.nu = Math.round((G.u1 - G.u0) / G.step) + 1; G.nw = Math.round((G.w1 - G.w0) / G.step) + 1;
  const h = [];
  for (let j = 0; j < G.nw; j++) for (let i = 0; i < G.nu; i++) h.push(Math.round(ground(...world(G.u0 + i * G.step, G.w0 + j * G.step)) * 1000) / 1000);
  const ends = {};
  for (const role of ["east_stair", "west_stair", "corridor", "west_link", "east_link"]) {
    const l = ways[role].line;
    if (l) ends[role] = { a_uw: local(l[0]).map(r3), b_uw: local(l[l.length - 1]).map(r3), a_ground: r3(ground(...l[0])), b_ground: r3(ground(...l[l.length - 1])) };
  }
  return {
    about: "tools/underpass/site.mjs (claude/underpass1): U1's frame, OSM ways, the kiosks' UrbIS solids, the city's terrain (heightmap.js surface, tile D6), tracks + platforms + neighbours (bake occluders)",
    tile: TILE,
    frame: { origin_city: O.map(r3), u: U.map((v) => +v.toFixed(6)), w: W.map((v) => +v.toFixed(6)), rotation_y_rad: +rotY.toFixed(6), oy: OY, corridor_length: r3(L),
      note: "three local (x, y, z) = (u, TAW - oy, w); city = origin + u * U + w * W; Blender (X, Y, Z) = (u, -w, TAW - oy)" },
    ways, ends, kiosks, neighbours, tracks, platforms,
    ground: { ...G, h },
  };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("site.mjs")) {
  const s = buildSite();
  mkdirSync(new URL("models/underpass/", ROOT), { recursive: true });
  writeFileSync(new URL("models/underpass/site.json", ROOT), JSON.stringify(s));
  console.log(`models/underpass/site.json: origin ${s.frame.origin_city}, rotY ${s.frame.rotation_y_rad}, corridor ${s.frame.corridor_length} m`);
  for (const [k, e] of Object.entries(s.ends)) console.log(`  ${k}: ${e.a_uw} (${e.a_ground}) -> ${e.b_uw} (${e.b_ground})`);
  for (const [k, q] of Object.entries(s.kiosks)) console.log(`  kiosk ${k}: ${q.solid} base ${q.base} eaves ${q.eaves} top ${q.top} ring ${JSON.stringify(q.ring_uw)}`);
  console.log(`  ${s.neighbours.length} neighbours, ${s.tracks.length} tracks, ${s.platforms.length} platforms`);
}
