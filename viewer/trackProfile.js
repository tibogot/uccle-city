// THE TRAM TRACKS' RAIL-TOP HEIGHTS (data/transit/tram_profile.json, tools/build_tram_profile.mjs): one smooth
// vertical profile per track strand (vertical curves: crest radius >= 500 m, sag >= 300 m, through the switches too;
// bridge decks interpolated between their ends, they are not in the DTM), for all of Uccle at once. The rails, the
// contact wire, the tram bridge deck and the trams all read their heights here, so the wheels stay on the rails across
// tile seams. Pure JS (main thread or worker).
//
//   const prof = await loadTrackProfile(url);
//   prof.y(x, z, reach = 2.5) -> the profile (bare-earth DTM, smoothed) at the nearest track centreline within `reach`
//   prof.railTop(x, z, roadOff, reach) -> the drawn rail top: the profile + the road's own lift over the DTM there
//   (both Catmull-Rom through the strand's samples every ~4 m: the grade is continuous, no pitch steps)
const CELL = 8, LIFT_REACH = 8;

export async function loadTrackProfile(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return makeTrackProfile(await r.json());
}

export function makeTrackProfile(doc) {
  // samples of every strand in flat arrays; a segment = two consecutive samples of one strand
  const PX = [], PZ = [], PY = [], TX = [], TZ = [], first = [], last = [];
  for (const st of doc.strands) {
    const g0 = PX.length;
    st.forEach((p, k) => {
      const a = st[Math.max(0, k - 1)], b = st[Math.min(st.length - 1, k + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      PX.push(p[0]); PZ.push(p[1]); PY.push(p[2]); TX.push((b[0] - a[0]) / L); TZ.push((b[1] - a[1]) / L);
      first.push(g0); last.push(g0 + st.length - 1);
    });
  }
  const LIFT = new Float32Array(PX.length).fill(NaN);
  const grid = new Map(), key = (i, j) => i * 100003 + j, segs = [];
  for (let g = 0; g + 1 < PX.length; g++) {
    if (last[g] === g) continue;                          // strand end
    const si = segs.length;
    segs.push(g);
    for (let i = Math.floor((Math.min(PX[g], PX[g + 1]) - 4) / CELL); i <= Math.floor((Math.max(PX[g], PX[g + 1]) + 4) / CELL); i++)
      for (let j = Math.floor((Math.min(PZ[g], PZ[g + 1]) - 4) / CELL); j <= Math.floor((Math.max(PZ[g], PZ[g + 1]) + 4) / CELL); j++) {
        const kk = key(i, j);
        if (!grid.has(kk)) grid.set(kk, []);
        grid.get(kk).push(si);
      }
  }
  const hit = { g: 0, t: 0, d2: 0 };
  const nearest = (x, z, reach) => {
    const list = grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!list) return null;
    let best = reach * reach, found = false;
    for (const si of list) {
      const g = segs[si], ax = PX[g], az = PZ[g], dx = PX[g + 1] - ax, dz = PZ[g + 1] - az, L2 = dx * dx + dz * dz || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      const d2 = (ax + dx * t - x) ** 2 + (az + dz * t - z) ** 2;
      if (d2 < best) { best = d2; found = true; hit.g = g; hit.t = t; hit.d2 = d2; }
    }
    return found ? hit : null;
  };
  /** Catmull-Rom of v(sample) on segment g (strand ends: linear extrapolation) */
  const cr = (g, t, v) => {
    const p1 = v(g), p2 = v(g + 1), p0 = g > first[g] ? v(g - 1) : 2 * p1 - p2, p3 = g + 1 < last[g] ? v(g + 2) : 2 * p2 - p1, t2 = t * t;
    return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t2 * t);
  };
  const yOf = (g) => PY[g];
  /** the road's lift over the DTM at sample g: road top - DTM averaged along the track over +-LIFT_REACH m every 1 m
   *  (triangle weights), clamped to [-2, 12] cm, 0 on a bridge deck. Kept once every tap had its tile loaded. */
  const liftOf = (g, roadOff) => {
    let v = LIFT[g];
    if (v === v) return v;                                   // not NaN: cached
    let s = 0, w = 0, miss = 0;
    for (let k = -LIFT_REACH; k <= LIFT_REACH; k++) {
      const o = roadOff(PX[g] + TX[g] * k, PZ[g] + TZ[g] * k), wk = LIFT_REACH + 1 - Math.abs(k);
      if (o == null) { miss++; continue; }
      s += wk * (o.bridge ? 0 : Math.max(-0.02, Math.min(0.12, o.off))); w += wk;
    }
    v = w ? s / w : 0;
    if (!miss) LIFT[g] = v;                                  // a partial average (a tap in a tile not loaded yet) is not kept
    return v;
  };
  return {
    doc,
    y(x, z, reach = 2.5) { const h = nearest(x, z, reach); return h ? cr(h.g, h.t, yOf) : null; },
    /** THE RAIL TOP the city draws and the trams stand on: the profile (bare-earth DTM, smoothed) + the road's own lift
     *  over the DTM where the track is set in a street (the road surfaces sit 0-10 cm over the DTM: crown, height tiers;
     *  median 3.4 cm on line 92), that lift averaged along the track (liftOf). roadOff(x, z) -> { off: road top - DTM,
     *  bridge: on a deck } or null. Null when no track centreline within `reach`. */
    railTop(x, z, roadOff, reach = 2.5) {
      const h = nearest(x, z, reach);
      if (!h) return null;
      return cr(h.g, h.t, (g) => PY[g] + liftOf(g, roadOff));
    },
    /** the nearest centreline point's height and its squared distance */
    near(x, z, reach = 2.5) { const h = nearest(x, z, reach); return h ? { y: cr(h.g, h.t, yOf), d2: h.d2 } : null; },
  };
}
