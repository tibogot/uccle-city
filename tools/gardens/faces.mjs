// THE STREET FACES AND FRONT DOORS of a tile's buildings, exactly as the city's façade code sees them
// (viewer/facadeGeom.js analyseBuildings: street / party flags, the widest street face carries the front door;
// viewer/interior/facadeWindows.js faceOpenings: the door bay). Read by tools/gardens/build_gardens.py.
//   node tools/gardens/faces.mjs <tile>   -> JSON on stdout: { tile, faces: [{ bu, bi, street, partyH, doorFace, width,
//                                            u0, tx, tz, nx, nz, cx, cz, base, eaves, door: { x, z, u, w } | null }] }
// The analysis gets a stub façade-kit collector that only records the faces (it draws nothing: k.on = false).
import fs from "fs";
import { analyseBuildings, hash01 } from "../../viewer/facadeGeom.js";
import { faceOpenings } from "../../viewer/interior/facadeWindows.js";

const tile = process.argv[2];
if (!tile) throw new Error("usage: node tools/gardens/faces.mjs <tile>");
const dir = new URL(`../../data/tiles/${tile}/`, import.meta.url);
const rd = (f) => fs.readFileSync(new URL(f, dir));
const doc = JSON.parse(rd("buildings.json"));
const bin = rd("buildings.bin"), buf = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
const roads = JSON.parse(rd("roads.json")), feats = JSON.parse(rd("features.json"));
const bi = new Map(doc.buildings.map((b, i) => [b, i]));
const faces = [];
const kit = {
  finish() { return null; },
  face(f) {
    if (f.width < 0.5) return { on: false };
    const b = f.building, BU = b.attrs?.BU_ID || b.id;
    const rnd = Math.fround(hash01(BU));
    // the painted wall's own centre: u along t from u0 (u = x * tx + z * tz)
    let cx = 0, cz = 0, n = 0;
    for (const { p } of f.tris) for (const q of p) { cx += q[0]; cz += q[2]; n++; }
    cx /= n; cz /= n;
    const off = (cx * f.nx + cz * f.nz);                              // the wall plane: x * nx + z * nz = off
    const at = (u) => { const uu = f.u0 + u; return [f.tx * uu + f.nx * off, f.tz * uu + f.nz * off]; };
    let door = null;
    if (f.street && f.doorFace) {
      const o = faceOpenings({ width: f.width, eaves: f.eaves, partyH: f.partyH, street: 1, rnd, landmark: f.landmark, shop: f.shopW, shopU: f.shopU }).find((q) => q.kind === "door");
      if (o) { const u = (o.u0 + o.u1) / 2, [x, z] = at(u); door = { x: +x.toFixed(2), z: +z.toFixed(2), u: +u.toFixed(2), w: +(o.u1 - o.u0).toFixed(2) }; }
    }
    const [ax, az] = at(0), [bx, bz] = at(f.width);
    faces.push({ bu: String(BU), bi: bi.get(b), street: f.street, partyH: +f.partyH.toFixed(2), doorFace: !!f.doorFace, landmark: !!f.landmark,
      width: +f.width.toFixed(3), a: [+ax.toFixed(3), +az.toFixed(3)], b: [+bx.toFixed(3), +bz.toFixed(3)], nx: +f.nx.toFixed(5), nz: +f.nz.toFixed(5),
      base: +f.base.toFixed(2), eaves: +f.eaves.toFixed(2), top: +f.top.toFixed(2), style: f.wallStyle, shopW: f.shopW, door });
    return { on: false };
  },
};
analyseBuildings(doc, buf, roads, feats, { kit });
process.stdout.write(JSON.stringify({ tile, faces }));
