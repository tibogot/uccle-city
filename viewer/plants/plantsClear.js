// NO PLANT ON THE CARRIAGEWAY (claude/roads, class R, rule 38, docs/ROADS_R.md). Plain JS (main thread + node census).
//
// WHY. tools/plants/build_plants.py keeps its shrubs off the UrbIS street SURFACES only, and tests a plant's centre
// cell: where the city DRAWS a carriageway UrbIS does not survey (the OSM band of an unmeasured street, the region's
// edge on the Chaussée de Waterloo, a private clos) a LiDAR shrub blob stood in the road, and a big laurel centred
// 0.5 m behind a kerb hung its crown over the lane (owner playtest 2026-11-18: bush clumps on the Chaussée de Waterloo).
// RULE. A plant stands where the city's carriageway test (viewer/streets/carriageway.js, the same one the garden kit,
// the signals and the tram poles obey) says no car drives: its foot off the carriageway and its crown (CROWN x its
// height round the foot) reaching at most REACH m into it; a bed's strip (centre, both ends) off it. Else it is not
// drawn (its spot is a road: there is nothing to move it to that the data knows).
export const H_MODEL = [0.72, 1.44, 1.29, 0.92, 0.93, 0.61, 0.48, 0.37];   // build_plants.py H_MODEL, by type index
export const CROWN = 0.4, REACH = 0.15;

/** doc: data/plants/<T>.json ({ plants: [x, z, type, yaw, scale x 100, zone, ...], beds: [cx, cz, angle x 1000,
 *  length x 100, width x 100, zone, ...] }); test: carriageway(...) ({ inside(x, z, margin) }).
 *  -> { doc (a shallow copy with the kept plants / beds), plants, beds (dropped counts) } */
export function plantsOffCarriageway(doc, test) {
  if (!doc || !test) return { doc, plants: 0, beds: 0 };
  const P = doc.plants || [], B = doc.beds || [], keepP = [], keepB = [];
  let dp = 0, db = 0;
  for (let o = 0; o < P.length; o += 6) {
    const x = P[o], z = P[o + 1], r = CROWN * (P[o + 4] / 100) * (H_MODEL[P[o + 2]] ?? 1) - REACH;
    let bad = test.inside(x, z, 0);
    for (let a = 0; a < 8 && !bad && r > 0; a++) { const th = (a / 8) * Math.PI * 2; bad = test.inside(x + Math.cos(th) * r, z + Math.sin(th) * r, 0); }
    if (bad) { dp++; continue; }
    for (let k = 0; k < 6; k++) keepP.push(P[o + k]);
  }
  for (let o = 0; o < B.length; o += 6) {
    const x = B[o], z = B[o + 1], th = B[o + 2] / 1000, h = B[o + 3] / 200, ux = Math.cos(th) * h, uz = Math.sin(th) * h;
    if (test.inside(x, z, 0) || test.inside(x + ux, z + uz, 0) || test.inside(x - ux, z - uz, 0)) { db++; continue; }
    for (let k = 0; k < 6; k++) keepB.push(B[o + k]);
  }
  if (!dp && !db) return { doc, plants: 0, beds: 0 };
  return { doc: { ...doc, plants: keepP, beds: keepB }, plants: dp, beds: db };
}
