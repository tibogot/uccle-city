// What paint a tile's road stage draws, as plain records with their source: the Road Checker (tools/road_audit/) and
// the Road Lab (labs/road-lab.js) read the same list. Plain JS, no three.js.
//
// Engine paint (paint "v1", and junctions UrbIS does not map in "v2") is read back from the engine's own records: a
// zebra per arm with `a.crosswalk`, a stop / yield line per arm with a control (vendor/roads/roadJunction.js
// armMouthMarkings), the ring entry teeth of a roundabout. Measured paint ("v2") comes from viewer/streets/
// measuredPaint.js (rd.inventory). Lane lines come from the engine's own boundary rules (roadMarkings.js
// buildRoadMarkings: the same rules as the shader), minus what measuredPaint suppressed.
import { armPoint } from "../../vendor/roads/roadJunction.js";
import { buildRoadMarkings } from "../../vendor/roads/roadMarkings.js";

const rect = (arm, s0, s1, t0, t1) => [armPoint(arm, s0, t0), armPoint(arm, s1, t0), armPoint(arm, s1, t1), armPoint(arm, s0, t1)];
const mid = (pts) => { let x = 0, z = 0; for (const p of pts) { x += p[0]; z += p[1]; } return [x / pts.length, z / pts.length]; };

/** The arm's incoming lane span [tIn, tOut] (as armMouthMarkings computes it). */
export function approachSpan(arm) {
  const tIn = Math.max(arm.cw / 2, 0);
  let tOut = tIn;
  for (const l of arm.lanesL || []) if ((l.drive || l.type === "bike") && l.w > 0.3) tOut = Math.max(tOut, l.tOut);
  return [tIn, tOut];
}

/** Engine crossings and stop / give-way lines of the nodes in `nodeIds` (all when null). */
export function enginePaint(net, nodeIds = null) {
  const crossings = [], stops = [];
  for (const n of net.nodes) {
    if (nodeIds && !nodeIds.has(n.id)) continue;
    for (const a of n.arms || []) {
      const e = a.edges;
      if (a.crosswalk && a.walkStation != null) {
        const s0 = a.walkStation - 1.5;
        const poly = rect(a, s0, s0 + 3, e.curbR + 0.3, e.curbL - 0.3);
        crossings.push({ id: `eng:${n.id}:${a.road.id}:${a.end}`, src: "rule", engine: true, poly, c: mid(poly), axis: a.th,
          along: 3, across: e.curbL - e.curbR - 0.6, node: n.id, road: a.road.id, end: a.end });
      }
      if (!a.approach?.length || a.stopStation == null) continue;
      const ctrl = a.control;
      if (ctrl !== "stop" && ctrl !== "signal" && ctrl !== "yield") continue;
      const [tIn, tOut] = approachSpan(a);
      const osm = !!n.src.control && n.src.control !== "auto";
      if (n.kind === "roundabout") {
        stops.push({ id: `eng:${n.id}:${a.road.id}:${a.end}`, src: "rule", engine: true, kind: "giveway", ring: true, line: [armPoint(a, a.trim, tIn), armPoint(a, a.trim, tOut)],
          node: n.id, road: a.road.id, end: a.end, controller: "ring" });
        continue;
      }
      if (n.kind !== "junction") continue;
      const w = ctrl === "stop" ? 0.5 : ctrl === "signal" ? 0.35 : 0.9;
      const s = a.stopStation + w / 2;
      stops.push({ id: `eng:${n.id}:${a.road.id}:${a.end}`, src: osm ? "osm" : "rule", engine: true, kind: ctrl === "yield" ? "giveway" : "stop",
        line: [armPoint(a, s, tIn), armPoint(a, s, tOut)], width: w, node: n.id, road: a.road.id, end: a.end,
        controller: osm ? `osm:${n.src.control}` : `guess:${ctrl}` });
    }
  }
  return { crossings, stops };
}

/** Lane-boundary paint of every road (the shader's rules), as polylines { road, kind, pts, width, dash }. */
export function laneMarks(net, suppressed = null) {
  const out = [];
  for (const rr of net.roads) {
    if (!rr.smp) continue;
    const { lines } = buildRoadMarkings(rr, rr.smp, rr.lays, net.style || "eu", rr.markRange, rr.walkRange);
    for (const l of lines) {
      const kind = l.mark || (l.pts.length === 2 && l.width === 0.1 ? "parkingTick" : "line");
      if (suppressed?.has(`${rr.id}|${kind}`)) continue;
      out.push({ road: rr.id, type: rr.src.type, kind, pts: l.pts, width: l.width, dash: l.dash });
    }
  }
  return out;
}

/** Everything painted: { crossings, stops, lanes, extra } with sources. `rd` = buildRoadData(..., keep) output. */
export function paintInventory(rd) {
  const inv = rd.inventory;
  if (!inv) {
    const e = enginePaint(rd.net);
    return { paint: "v1", crossings: e.crossings, stops: e.stops, lanes: laneMarks(rd.net), symbols: [] };
  }
  const e = enginePaint(rd.net, new Set(inv.engineNodes));
  return { paint: "v2", crossings: [...inv.crossings, ...e.crossings], stops: [...inv.stops, ...e.stops],
    lanes: laneMarks(rd.net, new Set(inv.suppressed)), symbols: inv.symbols || [] };
}
