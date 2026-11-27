// THE UPRIGHT THINGS A VILLO ROW MUST KEEP OUT OF (claude/fixes4 2026-11-27, rule villo-row-clear): every pole, trunk
// and furniture piece the city draws on a tile's sidewalks, where main.js draws it (the load-time moves out of the lanes:
// viewer/streets/carriageway.js offLane, as docOffLanes). tools/streetkit/snapProps.mjs lays the rows out clear of them;
// tools/streetkit/villoCheck.mjs re-checks the built rows against the same list + the lamps (placed at load, AFTER the
// rows: they keep out of the rows themselves, viewer/streetkit/villoFootprint.js lampKeepClear).
import { join } from "node:path";
import { json, ROOT, imp } from "../audit/census/lib_street.mjs";

/** S = lib_street streetTile(T); sk = the tile's data/streetkit doc (its posts as now placed); -> [{ x, z, r, kind }] */
export async function villoThings(S, sk) {
  const { offLane, trackIndex } = await imp("viewer/streets/carriageway.js");
  const { tramPoleSites } = await imp("viewer/streets/tramPoles.js");
  const { T, fit, lanes, tram, feats, rd, driven, inB } = S;
  const OPT = { tram: trackIndex(tram.map((l) => l.line)), osm: true };
  const furn = json(join(ROOT, "data/furniture", `${T}.json`)) || {};
  const stops = json(join(ROOT, "data/stops", `${T}.json`)) || {};
  const moved = (p) => { const r = offLane(p.x, p.z, lanes, fit, OPT); return r.moved ? { x: r.x, z: r.z } : p; };
  const things = [];
  for (const s of sk.signs || []) { const p = moved(s); things.push({ x: p.x, z: p.z, r: 0.05, kind: "sign pole" }); }
  for (const p of sk.posts || []) things.push({ x: p.x, z: p.z, r: 0.05, kind: "plate post" });
  for (const s of stops.stops || []) if (s.pole) { const p = s.pole.platform ? s.pole : moved(s.pole); things.push({ x: p.x, z: p.z, r: 0.08, kind: "stop pole" }); }
  for (const s of stops.stops || []) if (s.shelter) { const p = moved(s.shelter); things.push({ x: p.x, z: p.z, r: 1.0, kind: "shelter" }); }
  for (const p of furn.hoops || []) { const q = moved(p); things.push({ x: q.x, z: q.z, r: 0.35, kind: "bike hoop" }); }
  for (const p of furn.benches || []) { const q = moved(p); things.push({ x: q.x, z: q.z, r: 0.7, kind: "bench" }); }
  for (const p of furn.bins || []) { const q = moved(p); things.push({ x: q.x, z: q.z, r: 0.25, kind: "bin" }); }
  const bx = rd.surfaceData?.bollards || [];
  for (let i = 0; i < bx.length; i += 3) things.push({ x: bx[i], z: bx[i + 2], r: 0.1, kind: "bollard" });
  for (const t of feats.trees || []) if (!driven.inside(t.x, t.z, 0)) things.push({ x: t.x, z: t.z, r: 0.3, kind: "tree" });
  for (const p of tramPoleSites(tram, inB, { fit, driven })) things.push({ x: p.x, z: p.z, r: 0.15, kind: "tram pole" });
  return things;
}
