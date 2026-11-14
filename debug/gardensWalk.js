// FRONT-GARDEN WALK TEST (gardens round 2, docs/assets/GARDENS.md "Collisions"): the third-person controller on the
// city's collision world walks (a) from the sidewalk through every OPEN pedestrian gate of a tile into its garden and
// (b) at the middle of wall / railing / hedge stretches from the sidewalk: through a gate it must get in, at a wall it
// must stay out. Load the city with the gardens on, then:
//   const w = await import("/debug/gardensWalk.js"); await w.run("I6", { gates: 40, walls: 40 })
export async function run(tile, { gates = 40, walls = 40, secs = 5 } = {}) {
  const v = window.viewer, G = window.__gardens, world = v.world;
  const { CharacterController } = await import("../viewer/character/controller.js");
  const col = await (await import("../viewer/character/cityHook.js")).cityCollision({ scene: v.scene, world, log: () => {} });
  for (let i = 0; i < 300 && !col.ready(tile); i++) await new Promise((r) => setTimeout(r, 200));
  const make = (x, z) => {
    const c = new CharacterController(col.cw);
    const top = world.walkY(x, z) + 3, t = col.cw.ray(x, top, z, 0, -1, 0, 40);
    c.teleport(x, (t < Infinity ? top - t : world.walkY(x, z)) + 0.05, z); return c;
  };
  const doc = await (await fetch(`/data/gardens/${tile}.json`)).json();
  const b = world.tiles.find((t) => t.name === tile).bounds, inT = (x, z) => x > b.x0 + 5 && x < b.x1 - 5 && z > b.z0 + 5 && z < b.z1 - 5;
  // walk from s to e (x, z) for secs; returns how far past the line (signed along the walk direction) the body got
  const walk = (sx, sz, ex, ez, lx, lz) => {
    const ctl = make(sx, sz), dt = 1 / 60;
    for (let k = 0; k < secs * 60; k++) {
      const dx = ex - ctl.pos[0], dz = ez - ctl.pos[2], l = Math.hypot(dx, dz);
      if (l < 0.3) break;
      ctl.input.x = dx / l; ctl.input.z = dz / l; ctl.input.run = false; ctl.step(dt);
    }
    const ux = ex - sx, uz = ez - sz, ul = Math.hypot(ux, uz);
    return ((ctl.pos[0] - lx) * ux + (ctl.pos[2] - lz) * uz) / ul;
  };
  const out = { tile, gates: { tried: 0, through: 0, failed: [] }, walls: { tried: 0, held: 0, failed: [] } };
  // (a) open pedestrian gates: [x, y, z, yaw, w, kind 0, open, style]; local +x = (cos yaw, -sin yaw), +z = street
  for (const g of doc.gates.filter((q) => q[5] === 0)) {
    if (out.gates.tried >= gates) break;
    const [x, , z, yaw, w] = g, ax = Math.cos(yaw), az = -Math.sin(yaw), nx = Math.sin(yaw), nz = Math.cos(yaw);
    const cx = x + ax * w / 2, cz = z + az * w / 2;
    if (!inT(cx, cz)) continue;
    out.gates.tried++;
    const past = walk(cx + nx * 1.5, cz + nz * 1.5, cx - nx * 2.5, cz - nz * 2.5, cx, cz);
    if (past > 1.0) { out.gates.through++; continue; }
    // why: the garden rising faster than a walker climbs (no front steps drawn), a tree / lamp post in the way, a pillar
    // (of a neighbouring run) in the opening
    const street = world.walkY(cx + nx * 1.0, cz + nz * 1.0);
    let rise = 0; for (const d of [0.25, 0.5, 0.75, 1.0, 1.5]) rise = Math.max(rise, world.walkY(cx - nx * d, cz - nz * d) - street);
    const T = world.tiles.find((t) => t.name === tile).drawn || {};
    const post = [...(T.trees || []), ...(T.lamps || [])].some((q) => Math.hypot(q.x - cx, q.z - cz) < 0.9);
    const pil = doc.pillars.some((p) => Math.hypot(p[0] - cx, p[2] - cz) < 0.45);
    const why = rise > 0.3 ? "garden rises" : post ? "tree / lamp" : pil ? "pillar in opening" : "other";
    out.gates.why = out.gates.why || {}; out.gates.why[why] = (out.gates.why[why] || 0) + 1;
    out.gates.failed.push([+cx.toFixed(1), +cz.toFixed(1), +past.toFixed(2), why, +rise.toFixed(2)]);
  }
  // (b) the middle of segments >= 1 m: [x0, y0, z0, x1, y1, z1, style, wallH]; the street side from the drawn paving
  const segs = doc.segs.filter((s) => Math.hypot(s[3] - s[0], s[5] - s[2]) >= 1.0 && inT(s[0], s[2]));
  const stepK = Math.max(1, Math.floor(segs.length / walls));
  for (let i = 0; i < segs.length && out.walls.tried < walls; i += stepK) {
    const s = segs[i], dx = s[3] - s[0], dz = s[5] - s[2], L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L;
    const cx = (s[0] + s[3]) / 2, cz = (s[2] + s[5]) / 2;
    // which side is the street: the walker's own ground lower / the paving (walkY) nearer the base line
    const a = world.walkY(cx + nx * 1.5, cz + nz * 1.5), c = world.walkY(cx - nx * 1.5, cz - nz * 1.5);
    const sg = Math.abs(a - (s[1] + s[4]) / 2) <= Math.abs(c - (s[1] + s[4]) / 2) ? 1 : -1;
    out.walls.tried++;
    const past = walk(cx + nx * 1.5 * sg, cz + nz * 1.5 * sg, cx - nx * 2.5 * sg, cz - nz * 2.5 * sg, cx, cz);
    if (past < 0.3) out.walls.held++; else out.walls.failed.push([+cx.toFixed(1), +cz.toFixed(1), +past.toFixed(2), doc.styles[s[6]].kind]);
  }
  // (c) hedge stretches (no segment: the hedge runs themselves, 0.45 m behind the line)
  out.hedges = { tried: 0, held: 0, failed: [] };
  for (const h of doc.hedges.filter((q) => q.points.length >= 6).slice(0, walls)) {
    const k = Math.floor(h.points.length / 2), p = h.points[k], q = h.points[k + 1];
    if (!inT(p[0], p[1])) continue;
    const dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
    out.hedges.tried++;
    const past = Math.max(walk(p[0] + nx * 1.6, p[1] + nz * 1.6, p[0] - nx * 2.4, p[1] - nz * 2.4, p[0], p[1]), -9);
    if (past < 0.4) out.hedges.held++; else out.hedges.failed.push([+p[0].toFixed(1), +p[1].toFixed(1), +past.toFixed(2)]);
  }
  out.gates.failed = out.gates.failed.slice(0, 20); out.walls.failed = out.walls.failed.slice(0, 8); out.hedges.failed = out.hedges.failed.slice(0, 8);
  return out;
}
