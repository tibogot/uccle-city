// Where nothing may stand next to the railway: (x, z) -> true on a rail bridge (the LiDAR "trees" there are the bridge
// itself: the canopy model is DSM - DTM and the DTM has no deck) or within 3.2 m of a track (the ballast, the masts).
// Used by the city (?trains=1) to drop those tree positions before the trees are built.
export function railKeepClear(doc, bounds) {
  const m = 6;
  const near = (x, z) => x > bounds.x0 - m && x < bounds.x1 + m && z > bounds.z0 - m && z < bounds.z1 + m;
  const rings = doc.bridges.filter((b) => b.type === "RAB" && b.ring.some(([x, z]) => near(x, z))).map((b) => b.ring);
  const cell = new Map(), key = (i, j) => `${i},${j}`;
  for (const t of doc.tracks) {
    if (t.box.x1 < bounds.x0 - m || t.box.x0 > bounds.x1 + m || t.box.z1 < bounds.z0 - m || t.box.z0 > bounds.z1 + m) continue;
    for (let i = 1; i < t.pts.length; i++) {
      const s = [t.pts[i - 1][0], t.pts[i - 1][2], t.pts[i][0], t.pts[i][2]];
      for (let a = Math.floor((Math.min(s[0], s[2]) - 4) / 8); a <= Math.floor((Math.max(s[0], s[2]) + 4) / 8); a++)
        for (let b = Math.floor((Math.min(s[1], s[3]) - 4) / 8); b <= Math.floor((Math.max(s[1], s[3]) + 4) / 8); b++) {
          const k = key(a, b); if (!cell.has(k)) cell.set(k, []); cell.get(k).push(s);
        }
    }
  }
  const inRing = (r, x, z) => {
    let c = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; }
    return c;
  };
  return (x, z) => {
    for (const r of rings) if (inRing(r, x, z)) return true;
    for (const [ax, az, bx, bz] of cell.get(key(Math.floor(x / 8), Math.floor(z / 8))) || []) {
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      if ((x - ax - dx * u) ** 2 + (z - az - dz * u) ** 2 < 3.2 * 3.2) return true;
    }
    return false;
  };
}
