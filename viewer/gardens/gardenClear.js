// GARDEN PIECES CLEARED / RESTYLED (pure, no three: viewer/gardens/cityGardens.js addTile and the offline gates
// tools/audit/lyceeCheck.mjs read the same code): clearRoads drops the pieces standing where blocked(x, z) answers (a
// carriageway, a yard, a gate mouth), restyleHedges turns the walls inside data/overrides.json gardenRestyle polygons
// into clipped hedges.
/** the doc without the pieces standing on a carriageway (blocked(x, z) -> true): segments by their ends and middle,
 *  pillars / gates by their base, hedges split round the blocked points. { doc, segs, pillars, gates, hedgePts } */
export function clearRoads(doc, blocked) {
  const out = { ...doc }, n = { segs: 0, pillars: 0, gates: 0, hedgePts: 0 };
  out.segs = (doc.segs || []).filter((g) => { const bad = blocked(g[0], g[2]) || blocked(g[3], g[5]) || blocked((g[0] + g[3]) / 2, (g[2] + g[5]) / 2); if (bad) n.segs++; return !bad; });
  out.pillars = (doc.pillars || []).filter((p) => { const bad = blocked(p[0], p[2]); if (bad) n.pillars++; return !bad; });
  out.gates = (doc.gates || []).filter((g) => { const bad = blocked(g[0], g[2]); if (bad) n.gates++; return !bad; });
  out.hedges = [];
  for (const h of doc.hedges || []) {
    let run = [];
    const flush = () => { if (run.length >= 2) out.hedges.push({ ...h, points: run }); run = []; };
    for (const q of h.points) { if (blocked(q[0], q[1])) { n.hedgePts++; flush(); } else run.push(q); }
    flush();
  }
  const total = n.segs + n.pillars + n.gates + n.hedgePts;
  return total ? { doc: out, ...n } : 0;
}
/** (cortenbosch) data/overrides.json gardenRestyle: inside each polygon the walls / railings become clipped hedges of the
 *  polygon's species (consecutive segments chained into one run, set back half the hedge's width + 5 cm from the street:
 *  the side where blocked(x, z) answers, else the run's left), the pillars and gates go (the driveways stay open), the
 *  kit's own hedges there take the species. -> { doc, segs, hedges } | 0 */
export function restyleHedges(doc, restyle, blocked) {
  const polys = Object.entries(restyle || {}).filter(([k, v]) => !k.startsWith("_") && v?.ring?.length >= 3).map(([, v]) => v);
  if (!polys.length) return 0;
  const inR = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const polyAt = (x, z) => polys.find((p) => inR(p.ring, x, z));
  const out = { ...doc, segs: [], pillars: [], gates: [], hedges: [] };
  let nSeg = 0, nHedge = 0;
  // chains of consecutive segments in one polygon (end of one = start of the next within 2 cm)
  const chains = [];
  let cur = null;
  for (const g of doc.segs || []) {
    const P = polyAt((g[0] + g[3]) / 2, (g[2] + g[5]) / 2);
    if (!P) { out.segs.push(g); cur = null; continue; }
    nSeg++;
    if (cur && cur.P === P && Math.hypot(cur.pts[cur.pts.length - 1][0] - g[0], cur.pts[cur.pts.length - 1][1] - g[2]) < 0.02) cur.pts.push([g[3], g[5]]);
    else { cur = { P, pts: [[g[0], g[2]], [g[3], g[5]]] }; chains.push(cur); }
  }
  for (const { P, pts } of chains) {
    const w = P.width ?? 0.6, off = w / 2 + 0.05;
    // the street side: probe 0.8 m both ways from the chain's middle segment
    const m = Math.floor((pts.length - 1) / 2), a = pts[m], b = pts[m + 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const left = blocked?.(mx + nx * 0.8, mz + nz * 0.8), right = blocked?.(mx - nx * 0.8, mz - nz * 0.8);
    const s = left && !right ? -1 : 1;                                   // away from the street
    // offset the polyline (per-vertex normal: the average of its segments')
    const q = pts.map((p, i) => {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(pts.length - 1, i + 1)];
      const l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
      return [p[0] - ((p1[1] - p0[1]) / l) * off * s, p[1] + ((p1[0] - p0[0]) / l) * off * s];
    });
    out.hedges.push({ points: q, species: P.hedge || "beech", height: P.height ?? 1.4, width: w });
    nHedge++;
  }
  for (const p of doc.pillars || []) if (!polyAt(p[0], p[2])) out.pillars.push(p);
  for (const g of doc.gates || []) if (!polyAt(g[0], g[2])) out.gates.push(g);
  for (const h of doc.hedges || []) {
    const c = h.points[Math.floor(h.points.length / 2)], P = c && polyAt(c[0], c[1]);
    out.hedges.push(P ? { ...h, species: P.hedge || h.species } : h);
  }
  return { doc: out, segs: nSeg, hedges: nHedge };
}
