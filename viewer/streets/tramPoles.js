// TRAM POLE SITES (no three.js: viewer/tram.js draws them, tools/audit/streetAudit.mjs checks them in node).
export const POLE_STEP = 32, POLE_OFF = 3.4;

export function densify(line, step) {
  const out = [];
  for (let k = 1; k < line.length; k++) {
    const [ax, az] = line[k - 1], [bx, bz] = line[k];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let s = k === 1 ? 0 : 1; s <= n; s++) out.push([ax + (bx - ax) * s / n, az + (bz - az) * s / n]);
  }
  return out;
}

// TRAM POLES OFF THE CARRIAGEWAY (citydefects 2026-11-16, owner playtest: "tram/catenary poles in the road"). A pole
// stood POLE_OFF m beside its track whatever was there: in a street with the tracks in the carriageway that is the other
// lane or the parking lane. Now (opts.driven, viewer/streets/carriageway.js) a pole that would stand in a carriageway
// moves to the nearest measured kerb on either side (0.5 m onto the sidewalk; a median or tram reserve is fine as is),
// its arm reaching back over the track (any length up to ARM_MAX); none within reach: no pole (the wire hangs on). ?tramPoles=old.
export const POLES_OLD = typeof location !== "undefined" && /[?&]trampoles=old/.test(location.search);
const ARM_MAX = 9;
export function poleSite(tx, tz, nx, nz, opts) {
  const px = tx + nx * POLE_OFF, pz = tz + nz * POLE_OFF;
  if (opts.old ?? POLES_OLD) return { x: px, z: pz, nx, nz, arm: POLE_OFF };
  if ( !opts.driven || !opts.driven.inside(px, pz, 0.15)) return { x: px, z: pz, nx, nz, arm: POLE_OFF };
  let best = null;
  for (const sg of [1, -1]) {
    const k = opts.fit?.nearKerb?.(tx + nx * sg * POLE_OFF, tz + nz * sg * POLE_OFF, 6);
    if (!k) continue;
    for (const back of [0.5, 0.35, 0.8]) {
      const x = k.x + k.lx * back, z = k.z + k.lz * back;
      if (!(opts.fit.lift(x, z) > 0) || opts.driven.inside(x, z, 0.1)) continue;
      const dx = x - tx, dz = z - tz, d = Math.hypot(dx, dz);
      if (d < 1.6 || d > ARM_MAX) continue;
      if (!best || d < best.arm) best = { x, z, nx: dx / d, nz: dz / d, arm: d };
      break;
    }
  }
  return best;
}

/** the poles of a tile's tram lines (feats.lines kind "tram"): [{ x, z, yaw, arm, tx, tz (the track point it serves) }] */
export function tramPoleSites(tram, inB, opts = {}) {
  const poles = [];
  for (const l of tram) {
    const onBridge = l.tags?.bridge === "yes";                      // no poles on the bridge deck (they stand at its ends)
    const d = densify(l.line, 4);
    let acc = 0;
    for (let i = 1; i < d.length; i++) {
      const [ax, az] = d[i - 1], [bx, bz] = d[i];
      const L = Math.hypot(bx - ax, bz - az);
      acc += L;
      if (acc < POLE_STEP) continue;
      acc = 0;
      const nx = -(bz - az) / L, nz = (bx - ax) / L;
      let site = poleSite(bx, bz, nx, nz, opts);
      // (claude/parkfence round 2) a pole in a park entrance's approach (opts.keepOut, viewer/parkFence.js: a tram pole
      // stood 6 m in front of Wolvendael's main gate, in the walk through it) slides along its track, 2 m steps to 10 m
      if (site && opts.keepOut?.(site.x, site.z)) {
        site = null;
        for (const sh of [2, -2, 4, -4, 6, -6, 8, -8, 10, -10]) {
          const tx = bx + ((bx - ax) / L) * sh, tz = bz + ((bz - az) / L) * sh, q = poleSite(tx, tz, nx, nz, opts);
          if (q && !opts.keepOut(q.x, q.z)) { site = q; break; }
        }
      }
      if (!site) continue;
      const { x: px, z: pz } = site;
      if (!onBridge && inB(px, pz) && !poles.some((p) => (p.x - px) ** 2 + (p.z - pz) ** 2 < 64)) poles.push({ x: px, z: pz, yaw: Math.atan2(site.nx, site.nz), arm: site.arm, tx: bx, tz: bz });
    }
  }
  return poles;
}
