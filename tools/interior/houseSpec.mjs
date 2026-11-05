// THE SPEC OF ONE HOUSE for the interior build (tools/blender/interior.py): its UrbIS footprint, base / eaves / top,
// every wall face as the city's façade shader sees it (viewer/facadeGeom.js analyseBuildings: street / party flags,
// width, the per-building hash) with its openings from viewer/interior/facadeWindows.js (the SAME rectangles the shader
// draws), the ground in front of the door (DTM), the neighbours' footprints (for the lab's context).
//   node tools/interior/houseSpec.mjs <BU_ID number> [tile] [out dir]
//   e.g. node tools/interior/houseSpec.mjs 1786120 I6 models/interior/maison1
// Frame: city local metres (x east, z south, y up, m TAW). The house frame (for Blender) is written too:
//   origin = the street face's u = 0 end at base height, ex = along the street face (u), ez = into the house.
import fs from "fs";
import path from "path";
import { analyseBuildings, hash01 } from "../../viewer/facadeGeom.js";
import { faceOpenings, faceBays } from "../../viewer/interior/facadeWindows.js";
import { Heightmap } from "../../viewer/heightmap.js";

const id = process.argv[2] || "1786120", tile = process.argv[3] || "I6", outDir = process.argv[4] || "models/interior/maison1";
const BU = `https://databrussels.be/id/building/${id}`;
const dir = new URL(`../../data/tiles/${tile}/`, import.meta.url);
const rd = (f) => fs.readFileSync(new URL(f, dir));
const doc = JSON.parse(rd("buildings.json"));
const bin = rd("buildings.bin"), buf = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
const roads = JSON.parse(rd("roads.json")), feats = JSON.parse(rd("features.json"));
const hm = new Heightmap(JSON.parse(rd("terrain.json")), rd("terrain.u16").buffer.slice(0));
const a = analyseBuildings(doc, buf, roads, feats);
const b = doc.buildings.find((q) => q.attrs?.BU_ID === BU);
if (!b) throw new Error(`${BU} not in ${tile}`);
const rnd = Math.fround(hash01(BU));

// faces of this building from the analysis output (vertices carry u, width, h, eaves; style, partyH, street, rnd; n)
const W = a.walls, nV = W.position.length / 3, faces = new Map();
for (let i = 0; i < nV; i++) {
  if (W.aBld[i * 4 + 3] !== rnd) continue;
  const nx = W.aFN[i * 4], nz = W.aFN[i * 4 + 1], width = W.aWall[i * 4 + 1];
  const k = `${nx.toFixed(4)}|${nz.toFixed(4)}|${width.toFixed(3)}`;
  if (!faces.has(k)) faces.set(k, { nx, nz, width, eaves: W.aWall[i * 4 + 3], style: W.aBld[i * 4], partyH: W.aBld[i * 4 + 1], street: W.aBld[i * 4 + 2], shopU: W.aFN[i * 4 + 2], shop: W.aFN[i * 4 + 3], o: [0, 0], n: 0, top: -1e9, d: 0 });
  const f = faces.get(k), u = W.aWall[i * 4];
  const tx = -nz, tz = nx, x = W.position[i * 3], z = W.position[i * 3 + 2];
  f.o[0] += x - tx * u; f.o[1] += z - tz * u; f.n++; f.top = Math.max(f.top, W.position[i * 3 + 1]);
}
const list = [...faces.values()].filter((f) => f.width > 0.3).map((f) => {
  const o = [f.o[0] / f.n, f.o[1] / f.n], t = [-f.nz, f.nx];
  const openings = faceOpenings({ ...f, rnd, landmark: !!b.attrs?._landmark });
  const kind = f.partyH >= 999 ? "party" : f.street ? "street" : "free";
  const g = (u) => +hm.ground(o[0] + t[0] * u + f.nx * 1.5, o[1] + t[1] * u + f.nz * 1.5).toFixed(2);   // ground 1.5 m out
  return { kind, width: +f.width.toFixed(3), eaves: +f.eaves.toFixed(3), top: +(f.top - b.base).toFixed(3), style: f.style, partyH: f.partyH, street: f.street,
    origin: o.map((v) => +v.toFixed(3)), t: t.map((v) => +v.toFixed(5)), n: [+f.nx.toFixed(5), +f.nz.toFixed(5)],
    bays: faceBays({ width: f.width, rnd }), ground: [g(0.3), g(f.width / 2), g(f.width - 0.3)], openings };
}).sort((p, q) => (q.street - p.street) || (q.width - p.width));

const front = list.find((f) => f.kind === "street");
if (!front) throw new Error("no street face");
// house frame: origin at the front's u = 0, ex along u, ez into the house (= -n)
const ex = front.t, ez = [-front.n[0], -front.n[1]], O = front.origin;
const toLocal = ([x, z]) => { const dx = x - O[0], dz = z - O[1]; return [+(dx * ex[0] + dz * ex[1]).toFixed(3), +(dx * ez[0] + dz * ez[1]).toFixed(3)]; };
const ring = b.footprint[0];
// neighbours within 25 m (for the lab: their façades and solids around the house)
const near = doc.buildings.filter((q) => q !== b && q.footprint[0].some(([x, z]) => Math.hypot(x - O[0], z - O[1]) < 25)).map((q) => q.attrs?.BU_ID || q.id);

const spec = {
  BU_ID: BU, solid: b.id, tile, rnd, base: b.base, eaves: b.eaves, top: b.top, height: b.height, roofColor: b.roofColor,
  frame: { origin: O, ex, ez, note: "house local (x along the street face from its u = 0 end, z into the house, y up from base); world = origin + x * ex + z * ez" },
  footprint: ring, footprintLocal: ring.map(toLocal),
  faces: list.map((f) => ({ ...f, originLocal: toLocal(f.origin), tLocal: [+(f.t[0] * ex[0] + f.t[1] * ex[1]).toFixed(5), +(f.t[0] * ez[0] + f.t[1] * ez[1]).toFixed(5)] })),
  doorGround: front.ground, neighbours: near,
  // the bake's surroundings: buildings within 45 m (footprints extruded base -> mid-roof), the ground on a 2 m grid
  context: doc.buildings.filter((q) => q !== b && q.footprint[0].some(([x, z]) => Math.hypot(x - O[0], z - O[1]) < 45))
    .map((q) => ({ id: q.attrs?.BU_ID || q.id, base: q.base, top: +(((q.eaves ?? q.top) + q.top) / 2).toFixed(2), rings: q.footprint.map((r) => r.map(toLocal)) })),
  groundGrid: (() => {
    const n = 41, st = 2, out = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const lx = (i - 20) * st + 3, lz = (j - 20) * st + 5;          // around the house centre, house-local
      const x = O[0] + lx * ex[0] + lz * ez[0], z = O[1] + lx * ex[1] + lz * ez[1];
      out.push(+(hm.surface(x, z) - b.base).toFixed(3));
    }
    return { n, step: st, x0: -37, z0: -35, y: out, note: "house local; y above base; row-major in z" };
  })(),
  roof: (() => {            // roof triangles in house local (x, y above base, z), for the attic / occluder
    const dv = new DataView(buf), V = dv.getUint32(0, true);
    const P = new Float32Array(buf, 8, V * 3), I = new Uint32Array(buf, 8 + V * 12, dv.getUint32(4, true) * 3), out = [];
    for (let t = b.roof.first; t < b.roof.first + b.roof.count; t++) for (let k = 0; k < 3; k++) {
      const v = I[t * 3 + k] * 3, [lx, lz] = toLocal([P[v], P[v + 2]]); out.push([lx, +(P[v + 1] - b.base).toFixed(3), lz]);
    }
    return out;
  })(),
};
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "house.json"), JSON.stringify(spec, null, 1));
console.log(`${BU}: base ${b.base} eaves ${b.eaves} top ${b.top}; footprint local ${JSON.stringify(spec.footprintLocal)}`);
for (const f of spec.faces) console.log(`  ${f.kind.padEnd(6)} w ${f.width} eaves ${f.eaves} o ${f.originLocal} t ${f.tLocal} bays ${JSON.stringify(f.bays)} ground ${f.ground}\n` +
  f.openings.map((o) => `      ${o.kind} fl ${o.floor} u ${o.u0.toFixed(2)}..${o.u1.toFixed(2)} h ${o.h0.toFixed(2)}..${o.h1.toFixed(2)}`).join("\n"));
