// node --import ./tools/road_audit/register.mjs tools/audit/roadBends.mjs [--tiles I6,J5] [--worst 20] [--threads N]
//      [--quiet] [--json out.json]
// Road strips at sharp bends (claude/curvedroads, docs/roads/BENDS.md, quality rule 24), over ALL tiles.
// Each tile's road stage runs as the worker runs it up to the engine meshes (viewer/roadBuild.js o.engineOnly, with
// o.roadBend false = as built), then viewer/streets/roadBends.js trimBendFolds; both meshes are measured:
//   folded   engine road-strip triangles whose plan orientation disagrees with their (station, lateral) uv frame
//            (the strip runs backwards: the inner side of a bend tighter than the road is wide), count + m2
//   overlap  m2 of one road's strips lying over themselves (0.25 m lattice, points strictly inside 2+ of its triangles)
//   narrow   strip vertices nearer the road's centre line than their own lateral offset - 0.10 m (the edge lies over
//            the road: the ribbon is narrower than the street there)
//   spike    strip vertices farther from the centre line than their offset + 0.10 m (a long miter / bad join)
//   gap      one row's vertices of a road (same station and offset) more than 1 cm apart (a crack between segments)
//   holes    0.5 m cells with a carriageway sample point (every centre sample, 0.5 m across between the kerbs) no
//            engine asphalt triangle covers; "exposed" when no measured UrbIS surface lies there either (elsewhere the
//            measured base is drawn under the engine layer: only its lane paint is missing, "paint" in the places list)
// and: every vertex the fix changed lies within 15 m of a folding sample (straight roads and the rest bit-identical),
// the kept triangles are the original ones in order, and the default build path (o.roadBend on) gives the same mesh.
// Gate: folded after 0, spike 0, gap 0, exposed holes after <= before per tile, 0 vertices changed away from bends.
import { isMainThread, Worker, parentPort, workerData } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import os from "node:os";

const STEP = 0.25, NARROW = 0.10, SPIKE = 0.10, NEAR_BEND = 15;

function defects(net, part, bounds, roadMembers, prep) {
  const P = part.position, U = part.uv, I = part.index;
  const inTile = (x, z) => x >= bounds.x0 && x < bounds.x1 && z >= bounds.z0 && z < bounds.z1;
  const road = roadMembers(net, part);
  const R = { folded: 0, foldArea: 0, overlap: 0, narrow: 0, spike: 0, gap: 0, holes: 0, exposed: 0, ok: 0, events: [] };
  // ---- triangles: folded, per-road lists for the overlap
  const perRoad = new Map();
  for (let k = 0; k < I.length; k += 3) {
    const a = I[k], b = I[k + 1], c = I[k + 2], ri = road[a];
    if (ri < 0 || road[b] !== ri || road[c] !== ri) continue;
    const cx = (P[a * 3] + P[b * 3] + P[c * 3]) / 3, cz = (P[a * 3 + 2] + P[b * 3 + 2] + P[c * 3 + 2]) / 3;
    if (!inTile(cx, cz)) continue;
    const ap = (P[b * 3] - P[a * 3]) * (P[c * 3 + 2] - P[a * 3 + 2]) - (P[b * 3 + 2] - P[a * 3 + 2]) * (P[c * 3] - P[a * 3]);
    const au = (U[b * 2] - U[a * 2]) * (U[c * 2 + 1] - U[a * 2 + 1]) - (U[b * 2 + 1] - U[a * 2 + 1]) * (U[c * 2] - U[a * 2]);
    if (Math.abs(ap) < 2e-6 || Math.abs(au) < 2e-6) continue;
    // (s, t) -> (x, z) has Jacobian determinant -(1 + k t): a right-way-round strip triangle has ap * au < 0
    if (ap * au > 0) { R.folded++; R.foldArea += Math.abs(ap) / 2; R.events.push({ ri, x: cx, z: cz, kind: "fold", m: Math.abs(ap) / 2 }); }
    else R.ok++;
    (perRoad.get(ri) || perRoad.set(ri, []).get(ri)).push(k);
  }
  for (const [ri, ks] of perRoad) {
    const cells = new Map();
    for (const k of ks) {
      const a = I[k], b = I[k + 1], c = I[k + 2];
      const ax = P[a * 3], az = P[a * 3 + 2], bx = P[b * 3], bz = P[b * 3 + 2], cx = P[c * 3], cz = P[c * 3 + 2];
      const d = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
      for (let i = Math.ceil(Math.min(ax, bx, cx) / STEP); i <= Math.floor(Math.max(ax, bx, cx) / STEP); i++)
        for (let j = Math.ceil(Math.min(az, bz, cz) / STEP); j <= Math.floor(Math.max(az, bz, cz) / STEP); j++) {
          const x = i * STEP, z = j * STEP;
          const w1 = ((x - ax) * (cz - az) - (z - az) * (cx - ax)) / d, w2 = ((bx - ax) * (z - az) - (bz - az) * (x - ax)) / d;
          if (w1 < 0.02 || w2 < 0.02 || w1 + w2 > 0.98) continue;
          const key = i * 1048576 + j, n = (cells.get(key) || 0) + 1;
          cells.set(key, n);
          if (n === 2) { R.overlap += STEP * STEP; R.events.push({ ri, x, z, kind: "overlap", m: STEP * STEP }); }
        }
    }
  }
  // ---- vertices: narrow / spike against the road's own centre polyline; gaps between a row's copies
  const rows = new Map();
  for (let v = 0; v < road.length; v++) {
    const ri = road[v];
    if (ri < 0) continue;
    const x = P[v * 3], z = P[v * 3 + 2], s = U[v * 2], t = U[v * 2 + 1];
    if (!inTile(x, z)) continue;
    const key = `${ri}|${s}|${t}`, q = rows.get(key);      // (exact: rows of a tight corner lie 0.1-2 mm apart)
    if (!q) rows.set(key, [x, z]);
    else if (q.length === 2 && Math.hypot(q[0] - x, q[1] - z) > 0.01) { R.gap++; q.push(1); R.events.push({ ri, x, z, kind: "gap", m: 1 }); }
    if (Math.abs(t) < 0.3) continue;
    const S = net.roads[ri].smp;
    let d2 = Infinity;
    for (let i = 1; i < S.s.length; i++) {
      const ax = S.x[i - 1], az = S.z[i - 1], bx = S.x[i] - ax, bz = S.z[i] - az, l2 = bx * bx + bz * bz;
      let f = l2 > 0 ? ((x - ax) * bx + (z - az) * bz) / l2 : 0;
      f = f < 0 ? 0 : f > 1 ? 1 : f;
      const ex = ax + bx * f - x, ez = az + bz * f - z, e2 = ex * ex + ez * ez;
      if (e2 < d2) d2 = e2;
    }
    const d = Math.sqrt(d2);
    if (d < Math.abs(t) - NARROW) { R.narrow++; R.events.push({ ri, x, z, kind: "narrow", m: Math.abs(t) - d }); }
    if (d > Math.abs(t) + SPIKE) { R.spike++; R.events.push({ ri, x, z, kind: "spike", m: d - Math.abs(t) }); }
  }
  // ---- holes: carriageway samples no asphalt triangle covers
  const G = 2, grid = new Map();
  for (let k = 0; k < I.length; k += 3) {
    const a = I[k], b = I[k + 1], c = I[k + 2];
    const xs = [P[a * 3], P[b * 3], P[c * 3]], zs = [P[a * 3 + 2], P[b * 3 + 2], P[c * 3 + 2]];
    if (Math.abs((xs[1] - xs[0]) * (zs[2] - zs[0]) - (zs[1] - zs[0]) * (xs[2] - xs[0])) < 1e-9) continue;
    for (let i = Math.floor(Math.min(...xs) / G); i <= Math.floor(Math.max(...xs) / G); i++)
      for (let j = Math.floor(Math.min(...zs) / G); j <= Math.floor(Math.max(...zs) / G); j++) {
        const key = i * 1048576 + j;
        (grid.get(key) || grid.set(key, []).get(key)).push(k);
      }
  }
  const covered = (x, z) => {
    for (const k of grid.get(Math.floor(x / G) * 1048576 + Math.floor(z / G)) || []) {
      const a = I[k], b = I[k + 1], c = I[k + 2];
      const ax = P[a * 3], az = P[a * 3 + 2], bx = P[b * 3], bz = P[b * 3 + 2], cx = P[c * 3], cz = P[c * 3 + 2];
      const d = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
      const w1 = ((x - ax) * (cz - az) - (z - az) * (cx - ax)) / d, w2 = ((bx - ax) * (z - az) - (bz - az) * (x - ax)) / d;
      if (w1 >= -1e-4 && w2 >= -1e-4 && w1 + w2 <= 1 + 1e-4) return true;
    }
    return false;
  };
  const holeCells = new Set();
  net.roads.forEach((rr, ri) => {
    const S = rr.smp, E = rr.edgesPts;
    if (!S || !E) return;
    for (let i = 0; i < S.s.length; i++) {
      if (!inTile(S.x[i], S.z[i])) continue;
      const nx = Math.sin(S.th[i]), nz = -Math.cos(S.th[i]);
      const tl = (E.curbL[i][0] - S.x[i]) * nx + (E.curbL[i][1] - S.z[i]) * nz, tr = (E.curbR[i][0] - S.x[i]) * nx + (E.curbR[i][1] - S.z[i]) * nz;
      if (tl - tr < 0.4) continue;
      for (let t = tr + 0.1; t <= tl - 0.1 + 1e-9; t += Math.min(0.5, (tl - tr - 0.2) / 2)) {
        const x = S.x[i] + nx * t, z = S.z[i] + nz * t;
        // (counted once per 0.5 m cell: a tight corner's rows lie mm apart, its samples would count one spot many times)
        const hk = Math.floor(x / 0.5) * 1048576 + Math.floor(z / 0.5);
        if (inTile(x, z) && !holeCells.has(hk) && !covered(x, z)) {
          holeCells.add(hk); R.holes++;
          // exposed: no measured UrbIS surface under it either (the measured base is drawn under the engine layer)
          const ex = !prep?.baseAt(x, z);
          if (ex) R.exposed++;
          R.events.push({ ri, x, z, kind: ex ? "hole" : "paint", m: 0.25, s: S.s[i], t, hk });
        }
      }
    }
  });
  return R;
}

/** the vertices / triangles the fix changed, against the folding samples of their roads */
function identity(net, before, after, roadMembers) {
  const P0 = before.position, P1 = after.position, road = roadMembers(net, before);
  let changed = 0, farChanged = 0, straightChanged = 0;
  const bendPts = new Map();
  for (let v = 0; v < road.length; v++) {
    if (P0[v * 3] === P1[v * 3] && P0[v * 3 + 1] === P1[v * 3 + 1] && P0[v * 3 + 2] === P1[v * 3 + 2]) continue;
    changed++;
    // its road (a wall vertex: the nearest road with folding samples)
    const x = P0[v * 3], z = P0[v * 3 + 2];
    let near = Infinity;
    const roads = road[v] >= 0 ? [road[v]] : net.roads.map((_, i) => i);
    for (const ri of roads) {
      const rr = net.roads[ri];
      if (!rr.smp) continue;
      let pts = bendPts.get(ri);
      if (!pts) {
        pts = [];
        const S = rr.smp, tmax = Math.max(...rr.halfW, 0) + 2;
        for (let i = 0; i < S.s.length; i++) if (Math.abs(S.k[i]) * tmax > 1) pts.push([S.x[i], S.z[i]]);
        bendPts.set(ri, pts);
      }
      for (const [bx, bz] of pts) near = Math.min(near, Math.hypot(bx - x, bz - z));
    }
    if (near === Infinity) straightChanged++;
    else if (near > NEAR_BEND) farChanged++;
  }
  // kept triangles: the original ones, in order
  const I0 = before.index, I1 = after.index;
  let j = 0, order = true;
  for (let k = 0; k < I1.length; k += 3) {
    while (j < I0.length && !(I0[j] === I1[k] && I0[j + 1] === I1[k + 1] && I0[j + 2] === I1[k + 2])) j += 3;
    if (j >= I0.length) { order = false; break; }
    j += 3;
  }
  return { changed, farChanged, straightChanged, order, dropped: (I0.length - I1.length) / 3 };
}

async function runTile(T, integrate) {
  const { loadTile } = await import("../road_audit/tile.mjs");
  const { roadMembers, trimBendFolds } = await import("../../viewer/streets/roadBends.js");
  const t0 = performance.now();
  const L = loadTile(T, { build: { engineOnly: true, roadBend: false } });
  const { net, built } = L.rd;
  const tb = performance.now();
  const before = defects(net, built.asphalt, L.bounds, roadMembers, L.rd.prep);
  const fx = trimBendFolds(net, built.asphalt);
  const after = defects(net, fx.part, L.bounds, roadMembers, L.rd.prep);
  const id = identity(net, built.asphalt, fx.part, roadMembers);
  let integration = null;
  if (integrate) {   // the default build path (o.roadBend on) gives the same mesh
    const L2 = loadTile(T, { build: { engineOnly: true } });
    const a = L2.rd.built.asphalt, b = fx.part;
    integration = a.position.length === b.position.length && a.index.length === b.index.length && a.position.every((v, i) => v === b.position[i]) && a.index.every((v, i) => v === b.index[i]);
  }
  const info = (ri) => {
    const rr = net.roads[ri];
    return { id: rr.id, name: (rr.src.meta?.name || "").split(" - ")[0] || "(unnamed)", halfW: Math.max(...rr.halfW) };
  };
  const pis = (ri, x, z) => {
    let best = null;
    for (const v of net.roads[ri].al.vertices) { const d = Math.hypot(v.x - x, v.z - z); if (!best || d < best.d) best = { d, R: v.R, req: v.requestedR, deg: Math.abs(v.delta) * 180 / Math.PI, x: v.x, z: v.z }; }
    return best;
  };
  // places: the before-events of a road clustered within 12 m, with the after-events at the same place
  const places = [];
  for (const e of before.events) {
    let p = places.find((q) => q.ri === e.ri && Math.hypot(q.x - e.x, q.z - e.z) < 12);
    if (!p) places.push((p = { ri: e.ri, x: e.x, z: e.z, n: 0, b: {}, a: {} }));
    p.b[e.kind] = (p.b[e.kind] || 0) + e.m;
  }
  for (const e of after.events) {
    const p = places.find((q) => q.ri === e.ri && Math.hypot(q.x - e.x, q.z - e.z) < 12);
    if (p) p.a[e.kind] = (p.a[e.kind] || 0) + e.m;
    else places.push({ ri: e.ri, x: e.x, z: e.z, b: {}, a: { [e.kind]: e.m }, onlyAfter: true });
  }
  const out = places.map((p) => ({ T, ...info(p.ri), x: +p.x.toFixed(1), z: +p.z.toFixed(1), before: p.b, after: p.a, onlyAfter: !!p.onlyAfter, pi: pis(p.ri, p.x, p.z),
    sev: (p.b.fold || 0) + (p.b.overlap || 0) + 0.2 * (p.b.narrow || 0) }));
  const strip = (r) => { const { events, ...rest } = r; return rest; };
  const isHole = (e) => e.kind === "hole" || e.kind === "paint";
  const hb = new Set(before.events.filter(isHole).map((e) => e.hk));
  const newHoles = after.events.filter((e) => isHole(e) && !hb.has(e.hk)).map((e) => ({ road: net.roads[e.ri].id, exposed: e.kind === "hole", x: e.x, z: e.z, s: +e.s.toFixed(3), t: +e.t.toFixed(2) }));
  return { T, before: strip(before), after: strip(after), newHoles, fix: fx.stats, id, integration, places: out, ms: Math.round(performance.now() - t0), engineMs: Math.round(tb - t0) };
}

if (!isMainThread) {
  parentPort.on("message", async (m) => {
    if (m === null) { process.exit(0); }
    try { parentPort.postMessage({ ok: true, r: await runTile(m.T, m.integrate) }); }
    catch (e) { parentPort.postMessage({ ok: false, T: m.T, err: String(e?.stack || e) }); }
  });
} else {
  const args = process.argv.slice(2);
  const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const quiet = args.includes("--quiet");
  const { allTiles } = await import("../road_audit/tile.mjs");
  const tiles = arg("--tiles", null)?.split(",") ?? allTiles();
  const threads = Math.max(1, Math.min(tiles.length, +arg("--threads", Math.max(1, Math.min(12, os.cpus().length - 2)))));
  const t0 = Date.now();
  const results = [], queue = tiles.map((T, i) => ({ T, integrate: i === 0 }));
  let errors = 0;
  await new Promise((done) => {
    let live = 0;
    for (let w = 0; w < threads; w++) {
      const wk = new Worker(fileURLToPath(import.meta.url), { execArgv: process.execArgv });
      live++;
      const next = () => { const job = queue.shift(); if (job) wk.postMessage(job); else wk.postMessage(null); };
      wk.on("message", (m) => { if (m.ok) results.push(m.r); else { errors++; console.log(`FAIL ${m.T}: ${m.err}`); } next(); });
      wk.on("exit", () => { if (--live === 0) done(); });
      wk.on("error", (e) => { errors++; console.log(`FAIL worker: ${e?.stack || e}`); });
      next();
    }
  });
  results.sort((a, b) => a.T.localeCompare(b.T));
  const K = ["folded", "foldArea", "overlap", "narrow", "spike", "gap", "holes", "exposed"];
  const sum = (w) => Object.fromEntries(K.map((k) => [k, results.reduce((s, r) => s + r[w][k], 0)]));
  const B = sum("before"), A = sum("after");
  const f1 = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  if (!quiet) {
    console.log("tile  | folded b->a | fold m2 b->a | overlap m2 b->a | narrow b->a | spike | gap | holes b->a | moved | roads | unres | ms");
    for (const r of results) {
      if (!r.before.folded && !r.before.overlap && !r.before.narrow && !r.after.narrow && r.before.holes === r.after.holes) continue;
      console.log(`${r.T.padEnd(5)} | ${r.before.folded} -> ${r.after.folded} | ${f1(r.before.foldArea)} -> ${f1(r.after.foldArea)} | ${f1(r.before.overlap)} -> ${f1(r.after.overlap)} | ${r.before.narrow} -> ${r.after.narrow} | ${r.before.spike}/${r.after.spike} | ${r.before.gap}/${r.after.gap} | ${r.before.holes} -> ${r.after.holes} (exposed ${r.before.exposed} -> ${r.after.exposed}) | ${r.fix.moved} | ${r.fix.roads} | ${r.fix.unresolved} | ${r.ms}`);
    }
  }
  const places = results.flatMap((r) => r.places).sort((a, b) => b.sev - a.sev);
  const W = +arg("--worst", 20);
  if (!quiet) {
    console.log(`\nworst ${W} places (before -> after; x, z = viewer metres, ?at=x,z):`);
    for (const p of places.slice(0, W)) {
      const fmt = (o) => ["fold", "overlap", "narrow", "hole", "paint"].filter((k) => o[k]).map((k) => `${k} ${f1(+o[k].toFixed(1))}`).join(", ") || "clean";
      console.log(`  ${p.T} ${p.x}, ${p.z}  ${p.name} (${p.id}, half width ${p.halfW.toFixed(1)} m; PI R ${p.pi.R.toFixed(2)} m of ${p.pi.req.toFixed(0)}, ${p.pi.deg.toFixed(0)} deg)  ${fmt(p.before)}  ->  ${fmt(p.after)}`);
    }
  }
  const after = places.filter((p) => Object.keys(p.after).some((k) => k !== "hole" && k !== "paint"));
  const fixTot = results.reduce((s, r) => ({ moved: s.moved + r.fix.moved, roads: s.roads + r.fix.roads, unresolved: s.unresolved + r.fix.unresolved, dropped: s.dropped + r.fix.dropped, ms: s.ms + r.fix.ms }), { moved: 0, roads: 0, unresolved: 0, dropped: 0, ms: 0 });
  const idTot = results.reduce((s, r) => ({ changed: s.changed + r.id.changed, far: s.far + r.id.farChanged, straight: s.straight + r.id.straightChanged, order: s.order && r.id.order }), { changed: 0, far: 0, straight: 0, order: true });
  const holesUp = results.filter((r) => r.after.exposed > r.before.exposed);
  const integ = results.find((r) => r.integration !== null);
  console.log(`\n${results.length} tiles, ${((Date.now() - t0) / 1000).toFixed(1)} s (${threads} threads)`);
  console.log(`TOTAL before: folded ${B.folded} (${B.foldArea.toFixed(1)} m2), overlap ${B.overlap.toFixed(1)} m2, narrow ${B.narrow}, spike ${B.spike}, gap ${B.gap}, holes ${B.holes} (${B.exposed} with no measured surface either)`);
  console.log(`TOTAL after:  folded ${A.folded} (${A.foldArea.toFixed(1)} m2), overlap ${A.overlap.toFixed(1)} m2, narrow ${A.narrow}, spike ${A.spike}, gap ${A.gap}, holes ${A.holes} (${A.exposed} with no measured surface either)`);
  console.log(`fix: ${fixTot.roads} road(s) trimmed, ${fixTot.moved} vertices moved, ${fixTot.dropped} triangles dropped, ${fixTot.unresolved} fold run(s) unresolved, ${fixTot.ms} ms in all`);
  console.log(`identity: ${idTot.changed} vertices changed, ${idTot.far} more than ${NEAR_BEND} m from a folding bend, ${idTot.straight} on roads with no bend; kept triangles in order: ${idTot.order}; default path = audit fix (${integ?.T}): ${integ?.integration}`);
  if (after.length && !quiet) console.log(`places still flagged after: ${after.length}` + after.slice(0, 8).map((p) => `\n  ${p.T} ${p.x}, ${p.z} ${p.name} ${JSON.stringify(p.after)}`).join(""));
  if (arg("--json", null)) writeFileSync(arg("--json"), JSON.stringify({ results, places }, null, 1));
  const fails = [];
  if (errors) fails.push(`${errors} tile(s) failed`);
  if (A.folded) fails.push(`${A.folded} folded triangles after the fix`);
  if (A.spike) fails.push(`${A.spike} spikes`);
  if (A.gap) fails.push(`${A.gap} gaps`);
  if (holesUp.length) fails.push(`exposed holes up on ${holesUp.map((r) => `${r.T} ${r.before.exposed}->${r.after.exposed}`).join(" ")}`);
  if (idTot.far || idTot.straight || !idTot.order) fails.push(`geometry changed away from bends (${idTot.far} far, ${idTot.straight} straight, order ${idTot.order})`);
  if (integ && integ.integration !== true) fails.push("the default build path differs from the audited fix");
  console.log(fails.length ? `FAIL roadbends: ${fails.join("; ")}` : "PASS roadbends");
  process.exitCode = fails.length ? 1 : 0;
}
