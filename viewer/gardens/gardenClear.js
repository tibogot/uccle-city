// GARDEN PIECES CLEARED FROM THE STREET (three-free, shared by viewer/gardens/cityGardens.js and the node collider audit
// tools/audit/colliderAudit.mjs): the plot restyles (data/overrides.json gardenRestyle) and the pieces standing on a
// carriageway / in a cleared yard or gate mouth (blocked(x, z) -> true) left out of a tile's garden doc.

/** the doc without the pieces standing on a carriageway (blocked(x, z) -> true): segments and closed car gates by
 *  points every SEG_STEP m along their axis and both faces of their 0.30 m stand-in, pillars by their base and their
 *  four corners + side middles, pedestrian gates by their base, hedges
 *  split round the blocked points. { doc, segs, pillars, gates, hedgePts }
 *  (claude/collisions 2026-11-17, rule 25; old = true / ?gardenlane=old: segments by their ends and middle, pillars by
 *  their base only: a 6 m wall bending into the road between those three points, or a pillar whose centre sat just
 *  outside the 0.3 m margin with its corner inside, stayed, drawn and solid in the driven lane: 62 pieces city-wide (0 after),
 *  tools/audit/colliderAudit.mjs "lane garden ...") */
export const SEG_STEP = 0.2, SEG_HALF = 0.15, PILLAR_HALF = 0.18;
export function clearRoads(doc, blocked, opts) { const g = clearRoadsGen(doc, blocked, opts); let r; while (!(r = g.next()).done); return r.value; }
/** the same as a generator (claude/falcon2, rule 22: a yield every 16 pieces, every segment / gate with the whole-footprint test (up to ~75 probes each); cityGardens.addTileSliced runs it in <= 3 ms
 *  slices, viewer/slices.js) */
export function* clearRoadsGen(doc, blocked, { old = false } = {}) {
  let c = 0;
  const out = { ...doc }, n = { segs: 0, pillars: 0, gates: 0, hedgePts: 0 };
  const segBad = old ? (g) => blocked(g[0], g[2]) || blocked(g[3], g[5]) || blocked((g[0] + g[3]) / 2, (g[2] + g[5]) / 2)
    : (g) => lineBad(g[0], g[2], g[3], g[5]);
  // a line piece (a wall's 0.30 m stand-in, a closed car gate): points every SEG_STEP along both its faces and its axis
  function lineBad(x0, z0, x1, z1) {
    const L = Math.hypot(x1 - x0, z1 - z0) || 1e-6, nx = -(z1 - z0) / L * SEG_HALF, nz = (x1 - x0) / L * SEG_HALF, k = Math.max(2, Math.ceil(L / SEG_STEP));
    for (let i = 0; i <= k; i++) { const x = x0 + (x1 - x0) * i / k, z = z0 + (z1 - z0) * i / k; if (blocked(x, z) || blocked(x + nx, z + nz) || blocked(x - nx, z - nz)) return true; }
    return false;
  }
  const pillarBad = old ? (p) => blocked(p[0], p[2])
    : (p) => { if (blocked(p[0], p[2])) return true; const c = Math.cos(p[3] || 0), s = Math.sin(p[3] || 0), r = PILLAR_HALF;
      return [[-r, -r], [0, -r], [r, -r], [r, 0], [r, r], [0, r], [-r, r], [-r, 0]].some(([u, v]) => blocked(p[0] + u * c + v * s, p[2] - u * s + v * c)); };
  out.segs = [];
  for (const g of doc.segs || []) { if (!old || (++c & 15) === 0) yield; if (segBad(g)) n.segs++; else out.segs.push(g); }
  out.pillars = [];
  for (const p of doc.pillars || []) { if ((++c & 15) === 0) yield; if (pillarBad(p)) n.pillars++; else out.pillars.push(p); }
  // (a closed car gate spans its driveway mouth (w along yaw): the whole leaf, as a wall; an open pedestrian gate by its base)
  const gateBad = (g) => blocked(g[0], g[2]) || (!old && g[5] !== 0 && lineBad(g[0], g[2], g[0] + Math.cos(g[3]) * g[4], g[2] - Math.sin(g[3]) * g[4]));
  out.gates = [];
  for (const g of doc.gates || []) { if (!old || (++c & 15) === 0) yield; if (gateBad(g)) n.gates++; else out.gates.push(g); }
  out.hedges = [];
  for (const h of doc.hedges || []) {
    let run = [];
    const flush = () => { if (run.length >= 2) out.hedges.push({ ...h, points: run }); run = []; };
    for (const q of h.points) { if ((++c & 31) === 0) yield; if (blocked(q[0], q[1])) { n.hedgePts++; flush(); } else run.push(q); }
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

/** The plan footprints of a garden doc's collision stand-ins, as viewer/gardens/gardenKit.js gardenInstances makes them
 *  (pure data, for the node collider audit): each wall / railing segment one box 0.30 m thick over its whole height
 *  (wall + coping + railing), each pillar a PILLAR_W square (h + 0.12), each CLOSED driveway gate a box across its width
 *  (the pedestrian gates are drawn open: not solid), each hedge a band of its width (soft for the car: KIND.hedge).
 *  -> [{ rings: [[x, z] x 4], kind, base, top, what }] (the doc's baked y, before the kit settles it on the drawn ground) */
export function gardenPieces(doc, { CAP_T = 0.08, PILLAR_W = 0.36, T = 0.3 } = {}) {
  const out = [], styles = doc.styles || [];
  const band = (x0, z0, x1, z1, hw) => {
    const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz) || 1e-6, nx = -dz / L * hw, nz = dx / L * hw;
    return [[x0 + nx, z0 + nz], [x1 + nx, z1 + nz], [x1 - nx, z1 - nz], [x0 - nx, z0 - nz]];
  };
  for (const g of doc.segs || []) {
    const st = styles[g[6]] || {}, h = g[7], top = h > 0.01 ? h + CAP_T : 0, H = top + (st.rail >= 0 ? st.railH || 0 : 0);
    if (H <= 0.05 || Math.hypot(g[3] - g[0], g[5] - g[2]) < 0.05) continue;
    out.push({ rings: [band(g[0], g[2], g[3], g[5], T / 2)], kind: 7, base: Math.min(g[1], g[4]), top: Math.max(g[1], g[4]) + H, what: "garden wall" });
  }
  for (const [x, y, z, yaw, h] of doc.pillars || []) {
    const c = Math.cos(yaw), s = Math.sin(yaw), r = PILLAR_W / 2;
    out.push({ rings: [[[-r, -r], [r, -r], [r, r], [-r, r]].map(([u, v]) => [x + u * c + v * s, z - u * s + v * c])], kind: 7, base: y, top: y + h + 0.12, what: "garden pillar" });
  }
  for (const [x, y, z, yaw, w, kind, , s] of doc.gates || []) {
    if (kind === 0) continue;                                            // a pedestrian gate: drawn open
    const st = styles[s] || {}, H = st.kind === "rail" ? Math.max(1.0, (st.wallH || 0) + CAP_T + (st.railH || 0)) : st.kind === "wall" ? Math.max(1.0, Math.min(1.8, (st.wallH || 0) + CAP_T + 0.1)) : 1.1;
    const c = Math.cos(yaw), sn = Math.sin(yaw);
    out.push({ rings: [band(x, z, x + c * w, z - sn * w, T / 2)], kind: 7, base: y, top: y + H, what: "garden car gate (closed)" });
  }
  for (const hd of doc.hedges || []) {
    const P = hd.points || [];
    for (let i = 1; i < P.length; i++) out.push({ rings: [band(P[i - 1][0], P[i - 1][1], P[i][0], P[i][1], (hd.width || 0.6) / 2)], kind: 8, base: -1e4, top: 1e4, what: "hedge" });
  }
  return out;
}
