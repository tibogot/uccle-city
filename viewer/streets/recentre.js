// OSM CENTRE LINES ON THE MEASURED STREET (citydefects 2026-11-16, owner playtest: "lane markings that don't follow the
// road's curves and run into walls"). OSM draws a curved street with few nodes: its centre line is a chord, up to several
// metres off the real street on a bend. The road engine lays its lanes, lane paint and the traffic lanes along that
// chord, then the measured street (UrbIS) is drawn under it: the paint and the cars cut across the bend toward the kerb
// and the houses (road checker C8 "road leaves the measured street": 71 on I6 / E4 / J5; C4 lane / centre / edge paint
// on the sidewalk). Here, before the width fit and the network, each road's line is moved onto the middle of its measured
// carriageway: every STEP m the kerb-to-kerb rays of fitRoadWidths, the mid-point offset, gaps filled, a median over 5
// samples, a 7-sample mean, clamped to MAX_SHIFT, tapered to 0 over TAPER m at both ends (the junction nodes do not move). A road whose
// shift stays under MIN_SHIFT keeps its points. OPT-IN: ?recentre=1 (entry.recentre true); see roadBuild.js for the numbers.
//
//   recentreRoads(roads, prep) -> { moved, maxShift }     prep: viewer/surfaces.js prepareSurfaces (classAt)
const STEP = 3, MAX_SHIFT = 4, MIN_SHIFT = 0.8, TAPER = 12, RAY = 14, SIMPLIFY = 0.35;
const CARRIAGE = new Set([0, 1, 2, 3]);       // viewer/surfaces.js classes: roadway, tram road, tram site, parking

export function recentreRoads(roads, prep) {
  const N = new Map(roads.nodes.map((n) => [n.id, n]));
  const st = { moved: 0, maxShift: 0, samples: 0 };
  const carr = (x, z) => CARRIAGE.has(prep.classAt(x, z));
  const ray = (x, z, sx, sz) => { for (let d = 0.25; d < RAY; d += 0.25) if (!carr(x + sx * d, z + sz * d)) return d; return null; };
  for (const r of roads.roads) {
    if (r.meta?.bridge && r.meta.bridge !== "no") continue;          // decks: their own geometry (bridgeDecks.js)
    const pts = [N.get(r.a), ...(r.pts || []), N.get(r.b)].filter(Boolean);
    if (pts.length < 2) continue;
    const segL = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); segL.push(L); total += L; }
    if (total < 2 * TAPER) continue;
    const n = Math.max(2, Math.round(total / STEP)), S = [];
    let seg = 0, acc = 0;
    for (let k = 0; k <= n; k++) {
      const s = (total * k) / n;
      while (seg < segL.length - 1 && acc + segL[seg] < s) acc += segL[seg++];
      const a = pts[seg], b = pts[seg + 1], L = segL[seg] || 1, t = Math.min(1, Math.max(0, (s - acc) / L));
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, dx = (b.x - a.x) / L, dz = (b.z - a.z) / L;
      const lx = dz, lz = -dx;                                        // the left normal (as fitRoadWidths)
      let off = null, w = null;
      if (carr(x, z)) {
        const l = ray(x, z, lx, lz), rr = ray(x, z, -lx, -lz);
        if (l != null && rr != null) { off = (l - rr) / 2; w = l + rr; }
      } else {
        // off the carriageway (the chord crossed a kerb): look for it on either side within MAX_SHIFT + 2
        for (let d = 0.5; d <= MAX_SHIFT + 2 && off == null; d += 0.5) for (const sg of [1, -1]) {
          const qx = x + lx * d * sg, qz = z + lz * d * sg;
          if (!carr(qx, qz)) continue;
          const l = ray(qx, qz, lx, lz), rr = ray(qx, qz, -lx, -lz);
          if (l != null && rr != null) { off = d * sg + (l - rr) / 2; w = l + rr; }
          break;
        }
      }
      S.push({ s, x, z, lx, lz, off, w });
    }
    st.samples += S.length;
    // samples whose width is far from the road's own (a junction, a square, a lay-by): no evidence
    const ws = S.filter((q) => q.w != null).map((q) => q.w).sort((p, q) => p - q);
    if (ws.length < 4) continue;
    const wMed = ws[ws.length >> 1];
    for (const q of S) if (q.w != null && (q.w > wMed * 1.4 || q.w < wMed * 0.6)) q.off = null;
    const have = S.filter((q) => q.off != null);
    if (have.length < Math.max(3, S.length * 0.4)) continue;
    // fill the gaps linearly, then a running median over 5
    for (let i = 0; i < S.length; i++) {
      if (S[i].off != null) continue;
      let a = i - 1, b = i + 1;
      while (a >= 0 && S[a].off == null) a--;
      while (b < S.length && S[b].off == null) b++;
      S[i].fill = a < 0 ? S[b].off : b >= S.length ? S[a].off : S[a].off + (S[b].off - S[a].off) * ((i - a) / (b - a));
    }
    const raw = S.map((q) => q.off ?? q.fill);
    const med = raw.map((_, i) => { const w = raw.slice(Math.max(0, i - 2), i + 3).sort((p, q) => p - q); return w[w.length >> 1]; });
    // then a 7-sample mean (21 m): the shift varies slowly, the engine's fillets stay wide (no folds, no overlaps)
    const sm = med.map((_, i) => { const w = med.slice(Math.max(0, i - 3), i + 4); return w.reduce((a, b) => a + b, 0) / w.length; });
    let peak = 0;
    const out = S.map((q, i) => {
      const taper = Math.max(0, Math.min(1, q.s / TAPER, (total - q.s) / TAPER));
      const o = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, sm[i])) * taper;
      peak = Math.max(peak, Math.abs(o));
      return { x: q.x + q.lx * o, z: q.z + q.lz * o };
    });
    if (peak < MIN_SHIFT) continue;
    // fewer intersection points (Douglas-Peucker SIMPLIFY m): the engine fillets each with its type's radius, clamped to fit
    r.pts = simplify(out, SIMPLIFY).slice(1, -1).map((p) => ({ x: Math.round(p.x * 100) / 100, z: Math.round(p.z * 100) / 100 }));
    (r.meta ??= {}).recentred = Math.round(peak * 100) / 100;
    st.moved++;
    st.maxShift = Math.max(st.maxShift, peak);
  }
  st.maxShift = Math.round(st.maxShift * 100) / 100;
  return st;
}

function simplify(P, tol) {
  if (P.length < 3) return P;
  const keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1;
  const stack = [[0, P.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop(), a = P[i], b = P[j], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1e-9;
    let best = -1, bd = tol;
    for (let k = i + 1; k < j; k++) { const d = Math.abs((P[k].x - a.x) * dz - (P[k].z - a.z) * dx) / L; if (d > bd) { bd = d; best = k; } }
    if (best >= 0) { keep[best] = 1; stack.push([i, best], [best, j]); }
  }
  return P.filter((_, k) => keep[k]);
}
