// THE KIT IN THE SCENE: every loaded tile's kit instances (viewer/facadeKit/placement.js, built in the tile worker)
// drawn by ONE set of InstancedMeshes shared by all tiles: per piece and LOD, one OPAQUE mesh (every named slot in
// one draw: the slot travels per vertex, the building's variant per instance; kitMaterials.js) and one GLASS mesh
// (the painted window's room). At most 15 pieces x 2 LODs x (1 + glass) meshes exist; only those with instances in
// range draw (round 1: one mesh per piece x LOD x slot x variant, ~65 in a busy street).
//   - bucketing: when the eye has moved 2.5 m / turned 8 degrees (or a tile came / went), every instance within reach
//     (+ a 5 m margin) and the widened view cone is written to the meshes of its LOD(s), TIME-SLICED over frames (a
//     0.25 ms budget a frame, into back arrays, committed at the end; finished at once if the eye outruns the margin);
//     the dithered fades in the materials (kitFade.js) do the rest, per pixel, so nothing pops; a fading tile only
//     changes its slot's uniform (kitFades), it never re-buckets;
//   - per instance: instanceMatrix (position, rotation about y to the wall's normal), aKitI = the 9-slice stretch
//     (sx, hsx, sy, dH), aKitJ = (nx, nz, variant + seed, the tile's fade slot), aKitF = the face it sits on (u0, width, base,
//     rnd + 2 door street + 4 French code: the glass's room), aVar = the library's per-instance variation;
//   - LOD0 opaque casts shadows (faded over the LOD band), LOD1 and the glass none.
//   const kit = await loadKitField({ base });  scene.add(kit.group);  kit.addTile(name, data, wallsMesh);
//   kit.update(eye, camera, dt);  kit.removeTile(name);  kit.stats
import * as THREE from "three/webgpu";
import { kitOpaqueMaterial, kitGlassMaterial, loadKitMaterialSource } from "./kitMaterials.js";
import { kitRanges, kitFades } from "./kitFade.js";
import { STRIDE } from "./placement.js";
import { frameBudget } from "../instanceStream.js";

const MOVE = 2.5, MARGIN = 5, BUDGET = 0.25;      // m, m, ms a frame (docs/perf/AUDIT.md, instance pools)
const TURN = (8 * Math.PI) / 180, CONE_MARGIN = (25 * Math.PI) / 180;
const fwd = new THREE.Vector3(), dirTmp = new THREE.Vector3(), dirTmp2 = new THREE.Vector3();
let coneHalf = Math.PI;
const KINDS = ["opaque", "glass"];

export async function loadKitField({ base = new URL("../../models/facadekit/", import.meta.url).href, lab = false } = {}) {
  const [json, bin] = await Promise.all([fetch(base + "kit.json").then((r) => r.json()), fetch(base + "kit.bin").then((r) => r.arrayBuffer()), loadKitMaterialSource()]);
  const SL = json.slice;
  // geometry per piece / lod / kind (views straight over the fetched buffer)
  const geo = {};
  for (const [name, p] of Object.entries(json.pieces)) {
    geo[name] = p.lods.map((lod) => Object.fromEntries(Object.entries(lod).map(([kind, s]) => {
      const n = s.vCount;
      let o = s.vOff;
      const pos = new Float32Array(bin, o, n * 3); o += n * 12;
      const nrm = new Float32Array(bin, o, n * 3); o += n * 12;
      const uv = new Float32Array(bin, o, n * 2); o += n * 8;
      const kv = new Uint8Array(bin, o, n * 4); o += n * 4;
      const kw = new Uint8Array(bin, o, n * 4);                   // (round 3) region width, run end flag, arch rise
      const idx = s.i32 ? new Uint32Array(bin, s.iOff, s.iCount) : new Uint16Array(bin, s.iOff, s.iCount);
      return [kind, { attrs: { position: new THREE.BufferAttribute(pos, 3), normal: new THREE.BufferAttribute(nrm, 3), uv: new THREE.BufferAttribute(uv, 2), aKitV: new THREE.BufferAttribute(kv, 4, true), aKitW: new THREE.BufferAttribute(kw, 4, true) },
        index: new THREE.BufferAttribute(idx, 1), tris: s.iCount / 3 }];
    })));
  }
  // materials: opaque + glass per LOD (4), shared by every piece and tile
  const mats = {};
  const matFor = (kind, lod) => (mats[`${kind}|${lod}`] ??= kind === "glass" ? kitGlassMaterial(lod, { lab }) : kitOpaqueMaterial(lod, { lab }));
  const group = new THREE.Group();
  group.name = "facade-kit";
  const meshes = new Map();           // key piece|lod|kind -> { mesh, piece, lod, kind, n, cap, arrays }
  function makeMesh(piece, lod, kind, cap) {
    const g = geo[piece][lod][kind];
    const geom = new THREE.BufferGeometry();
    for (const [k, a] of Object.entries(g.attrs)) geom.setAttribute(k, a);
    geom.setIndex(g.index);
    const arrays = {};
    for (const a of ["aKitI", "aKitJ", "aKitF", "aVar"]) {
      arrays[a] = new Float32Array(cap * 4);
      geom.setAttribute(a, new THREE.InstancedBufferAttribute(arrays[a], 4));
    }
    geom.userData.shared = true;
    const mesh = new THREE.InstancedMesh(geom, matFor(kind, lod), cap);
    // static usage: uploaded on needsUpdate only (three r187 re-uploads a DynamicDrawUsage buffer WHOLE in every render pass)
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.castShadow = lod === 0 && kind === "opaque";
    mesh.receiveShadow = true;
    mesh.name = `kit ${piece} lod${lod} ${kind}`;
    return { mesh, piece, lod, kind, n: 0, cap, I: arrays.aKitI, J: arrays.aKitJ, F: arrays.aKitF, V: arrays.aVar, M: mesh.instanceMatrix.array };
  }
  // every mesh that can occur, made now (empty): the boot warm-up compiles them all, nothing builds later
  for (const [name] of Object.entries(json.pieces)) for (let lod = 0; lod < json.lods; lod++) for (const kind of KINDS) {
    if (!geo[name][lod][kind]) continue;
    const e = makeMesh(name, lod, kind, 256);
    meshes.set(`${name}|${lod}|${kind}`, e);
    group.add(e.mesh);
  }
  function grow(e, need) {
    let cap = e.cap; while (cap < need) cap *= 2;
    const ne = makeMesh(e.piece, e.lod, e.kind, cap);
    ne.M.set(e.M.subarray(0, e.n * 16));
    for (const k of ["I", "J", "F", "V"]) ne[k].set(e[k].subarray(0, e.n * 4));
    ne.n = e.n;
    group.remove(e.mesh); e.mesh.dispose();
    group.add(ne.mesh);
    Object.assign(e, ne);
  }

  // per piece: how its instances stretch
  const pieceInfo = {};
  for (const [name, p] of Object.entries(json.pieces)) {
    const mode = p.slice || p.kind;
    const refOf = { window: json.ref.window, door: json.ref.door, french: json.ref.french, frenchX: json.ref.french, garage: json.ref.garage };
    pieceInfo[name] = { mode, ref: refOf[mode] ?? p.ref, slots: p.slots, run: mode === "run" };
  }
  const stretch = (info, w, h, out, arr = null, i = 0) => {
    if (info.mode === "window" || info.mode === "door" || info.mode === "french" || info.mode === "frenchX" || info.mode === "garage") {
      const [Wr, Hr] = info.ref;
      out[0] = (w / 2 - SL.x) / (Wr / 2 - SL.x); out[1] = (w - Wr) / 2;
      out[2] = (h - SL.bottom - SL.top) / (Hr - SL.bottom - SL.top); out[3] = h - Hr;
      if (info.mode === "frenchX") { out[2] = 1; out[3] = 0; }
    } else if (info.run) {
      // a run: x scales, its END rings (slice class +-1) move with the ends and take the MITRES (aKitI.z / .w = tan of half
      // the turn to the next run at the left / right end: + outside corner, - inside; placement.js puts them in the
      // instance's spare (left) and its F[0] (right))
      out[0] = w / info.ref[0]; out[1] = (w - info.ref[0]) / 2; out[2] = arr ? arr[i + 9] : 0; out[3] = arr ? arr[i + 10] : 0;
    }
    else { out[0] = 1; out[1] = 0; out[2] = 1; out[3] = 0; }
  };

  const tiles = new Map();            // name -> { data, walls, fade, t }
  const last = new THREE.Vector3(1e9, 1e9, 1e9);
  let dirty = true;
  const stats = { instances: 0, drawn: 0, meshes: 0, ms: 0, msMax: 0, rebuckets: 0, tris: 0 };

  // the meshes an instance of a piece writes to, per LOD
  const targetCache = new Map();
  const targetsOf = (piece) => {
    let t = targetCache.get(piece);
    if (!t) {
      t = [0, 1].map((lod) => KINDS.map((k) => meshes.get(`${piece}|${lod}|${k}`)).filter(Boolean));
      targetCache.set(piece, t);
    }
    return t;
  };
  /** a tile's instances in 24 m cells, each with its stretch and mesh targets precomputed (the per-frame loop only
   *  reads numbers) */
  const CELL = 24;
  function prepare(data) {
    const cells = new Map();
    for (const [piece, arr] of Object.entries(data.pieces)) {
      const info = pieceInfo[piece];
      if (!info) continue;
      for (let i = 0; i < arr.length; i += STRIDE) {
        const x = arr[i], z = arr[i + 2];
        const key = Math.floor(x / CELL) * 100003 + Math.floor(z / CELL);
        let c = cells.get(key);
        if (!c) { c = { x: (Math.floor(x / CELL) + 0.5) * CELL, z: (Math.floor(z / CELL) + 0.5) * CELL, items: [], y0: 1e9, y1: -1e9 }; cells.set(key, c); }
        const s = new Float32Array(4); stretch(info, arr[i + 5], arr[i + 6], s, arr, i);
        c.items.push({ arr, i, r: info.run ? arr[i + 5] / 2 : 1.5, s, t: targetsOf(piece) });
        c.y0 = Math.min(c.y0, arr[i + 1] - 1); c.y1 = Math.max(c.y1, arr[i + 1] + 4);
      }
    }
    return [...cells.values()];
  }

  // the back arrays the sliced re-bucket writes (per mesh: bM, bI, bJ, bF, bV, bn), committed at its end
  const backGrow = (e, need) => {
    if (e.bcap >= need) return;
    const cap = Math.max(need, (e.bcap || 0) * 2, 64);
    const g = (a, w) => { const b = new Float32Array(cap * w); if (a) b.set(a.subarray(0, e.bn * w)); return b; };
    e.bM = g(e.bM, 16); e.bI = g(e.bI, 4); e.bJ = g(e.bJ, 4); e.bF = g(e.bF, 4); e.bV = g(e.bV, 4); e.bcap = cap;
  };
  /** the re-bucket as a generator: yields (between cells) once performance.now() passes `deadline` */
  let deadline = Infinity;
  function* rebucketJob(eye, list) {
    const t0 = performance.now();
    for (const e of meshes.values()) e.bn = 0;
    const R = kitRanges();
    const near0 = R.lod1 + MARGIN, far1lo = R.lod1 - R.lodBand - MARGIN, far1hi = R.far + MARGIN;
    const cellR = CELL * 0.71 + 6;
    const ex = eye.x, ey = eye.y, ez = eye.z, fx = fwd.x, fz = fwd.z, cone = fwd.lengthSq() > 0;
    // view cone (horizontal), widened by CONE_MARGIN: cells well behind / beside the view are skipped; turning more
    // than TURN re-buckets, so a cell enters long before it reaches the screen's edge (no pop on turning)
    const cosLim = Math.cos(Math.min(Math.PI, coneHalf + CONE_MARGIN));
    let total = 0;
    for (const tile of list) {
      const code = tile.slot;
      for (const c of tile.cells) {
        total += c.items.length;
        const cdx = c.x - ex, cdz = c.z - ez, cd = Math.sqrt(cdx * cdx + cdz * cdz);
        if (cd - cellR > far1hi) continue;
        if (cone && cd > cellR) {
          const ang = Math.acos(Math.max(-1, Math.min(1, (cdx * fx + cdz * fz) / cd))) - Math.asin(Math.min(1, cellR / cd));
          if (Math.cos(Math.max(0, ang)) < cosLim) continue;
        }
        for (const it of c.items) {
          const arr = it.arr, i = it.i;
          const x = arr[i], y = arr[i + 1], z = arr[i + 2];
          const d = Math.sqrt((x - ex) ** 2 + (y - ey) ** 2 + (z - ez) ** 2);
          const dmin = Math.max(0, d - it.r), dmax = d + it.r;
          if (dmin > far1hi) continue;
          const l0 = dmin < near0, l1 = dmax > far1lo;
          if (!l0 && !l1) continue;
          const nx = arr[i + 3], nz = arr[i + 4], seed = arr[i + 8], vs = arr[i + 7] + Math.min(seed, 0.999);
          const st = it.s;
          for (let lod = 0; lod < 2; lod++) {
            if (lod === 0 ? !l0 : !l1) continue;
            for (const e of it.t[lod]) {
              if (!(e.bn < e.bcap)) backGrow(e, e.bn + 1);
              const k = e.bn++;
              const M = e.bM, m = k * 16;
              M[m] = nz; M[m + 1] = 0; M[m + 2] = -nx; M[m + 3] = 0;
              M[m + 4] = 0; M[m + 5] = 1; M[m + 6] = 0; M[m + 7] = 0;
              M[m + 8] = nx; M[m + 9] = 0; M[m + 10] = nz; M[m + 11] = 0;
              M[m + 12] = x; M[m + 13] = y; M[m + 14] = z; M[m + 15] = 1;
              const q = k * 4, I = e.bI, J = e.bJ, F = e.bF, V = e.bV;
              I[q] = st[0]; I[q + 1] = st[1]; I[q + 2] = st[2]; I[q + 3] = st[3];
              J[q] = nx; J[q + 1] = nz; J[q + 2] = vs; J[q + 3] = code;
              F[q] = arr[i + 10]; F[q + 1] = arr[i + 11]; F[q + 2] = arr[i + 12]; F[q + 3] = arr[i + 13];
              V[q] = seed; V[q + 1] = 0.35 + 0.3 * ((seed * 7.13) % 1); V[q + 2] = 0.35 + 0.3 * ((seed * 3.71) % 1); V[q + 3] = 0.5;
            }
          }
        }
        if (performance.now() > deadline) yield;
      }
    }
    // the commit: every mesh's live instances into its static buffers (update range over the live count)
    let drawn = 0, used = 0, tris = 0;
    for (const e of meshes.values()) {
      const n = e.bn;
      if (n > e.cap) grow(e, n);
      const g = e.mesh.geometry;
      e.mesh.visible = n > 0;                       // (an empty instanced mesh still costs a draw per pass)
      if (e.mesh.count !== n || n) {
        e.mesh.count = n; e.n = n;
        if (n) {
          e.M.set(e.bM.subarray(0, n * 16)); e.I.set(e.bI.subarray(0, n * 4)); e.J.set(e.bJ.subarray(0, n * 4)); e.F.set(e.bF.subarray(0, n * 4)); e.V.set(e.bV.subarray(0, n * 4));
          e.mesh.instanceMatrix.clearUpdateRanges(); e.mesh.instanceMatrix.addUpdateRange(0, n * 16); e.mesh.instanceMatrix.needsUpdate = true;
          for (const a of ["aKitI", "aKitJ", "aKitF", "aVar"]) { const at = g.attributes[a]; at.clearUpdateRanges(); at.addUpdateRange(0, n * 4); at.needsUpdate = true; }
        }
      }
      if (n) { used++; drawn += n; tris += n * geo[e.piece][e.lod][e.kind].tris; }
    }
    Object.assign(stats, { instances: total, drawn, meshes: used, tris, jobMs: +(performance.now() - t0).toFixed(1) });
    stats.rebuckets++;
  }
  /** a whole re-bucket at once (the labs) */
  function rebucket(eye) { deadline = Infinity; const it = rebucketJob(eye, [...tiles.values()]); while (!it.next().done); last.copy(eye); }

  // the job in flight and its eye; the fade slots of removed tiles wait in quarantine ([slot, seq]: freed once a
  // re-bucket that started after the removal is committed)
  let job = null, seq = 0;
  const jobEye = new THREE.Vector3(), quarantine = [];
  function pump(budget) {
    const t0 = performance.now();
    deadline = t0 + budget;
    const r = job.next();
    const ms = performance.now() - t0;
    stats.ms = +ms.toFixed(2); stats.msMax = Math.max(stats.msMax, stats.ms);
    if (!r.done) return;
    const done = job.seq;
    job = null;
    last.copy(jobEye);
    for (let k = quarantine.length - 1; k >= 0; k--) if (quarantine[k][1] < done) { kitFades.release(quarantine[k][0]); quarantine.splice(k, 1); }
    // a tile whose kit is all out of reach: its kit walls draw with the plain wall material (a discard in the
    // shader costs early-z on the whole draw: +0.7 ms in an aerial view with no piece drawn, measured)
    const eye = jobEye, reach = kitRanges().far + MARGIN + 4;
    for (const t of tiles.values()) {
      const w = t.walls;
      if (!w?.userData.plainMat || w.userData.fadeOrig) continue;            // (a tile fading: lodFade.js owns its material)
      let inReach = false;
      for (const c of t.cells) {
        const dx = Math.max(Math.abs(c.x - eye.x) - CELL / 2, 0), dz = Math.max(Math.abs(c.z - eye.z) - CELL / 2, 0);
        const dy = Math.max(c.y0 - eye.y, 0, eye.y - c.y1);
        if (dx * dx + dy * dy + dz * dz < reach * reach) { inReach = true; break; }
      }
      const want = inReach ? w.userData.cutMat : w.userData.plainMat;
      if (w.material !== want) w.material = want;
    }
  }

  /** per frame: the tile fades (uniforms), and a re-bucket when the eye moved / turned or tiles changed (sliced) */
  function update(eye, camera = null, dt = 1 / 60) {
    let turned = false;
    if (camera) {
      camera.getWorldDirection(dirTmp); dirTmp.y = 0;
      if (dirTmp.lengthSq() > 1e-6) {
        dirTmp.normalize();
        // half the horizontal field of view (camera.fov is vertical) + the cone's own margin
        coneHalf = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect) * 1.15;
        if (fwd.lengthSq() === 0 || fwd.dot(dirTmp) < Math.cos(TURN)) turned = true;
      }
    }
    for (const t of tiles.values()) {
      if (t.t < 1) {
        t.t = Math.min(1, t.t + dt / 0.9);
        const e = t.t * t.t * (3 - 2 * t.t);
        t.code = t.t >= 1 ? 1 : e;
        if (t.walls) t.walls.userData.kitFade = t.code;
        kitFades.set(t.slot, t.code);
      }
    }
    if (!job && (dirty || turned || eye.distanceToSquared(last) > MOVE * MOVE)) {
      dirty = false;
      jobEye.copy(eye);
      if (camera && dirTmp.lengthSq() > 0) fwd.copy(dirTmp);
      // looking steeply down (aerial), or the LOD eye is not the camera (viewer.stateAt, the pop meter): no cone
      if (camera && (Math.abs(camera.getWorldDirection(dirTmp2).y) > 0.75 || camera.position.distanceTo(eye) > 1)) fwd.set(0, 0, 0);
      job = rebucketJob(jobEye, [...tiles.values()]); job.seq = ++seq;
    }
    const left = frameBudget.left(group);              // (the city's streaming budget a frame, viewer/instanceStream.js)
    if (!job) return;
    // outrun (a teleport, a fast turn): what is drawn no longer covers the view; finish at once
    let force = eye.distanceTo(last) > MARGIN * 0.9 || eye.distanceTo(jobEye) > MARGIN * 0.9;
    if (!force && fwd.lengthSq() > 0 && dirTmp.lengthSq() > 0 && fwd.dot(dirTmp) < Math.cos(CONE_MARGIN * 0.8)) force = true;
    if (force) stats.forced = (stats.forced || 0) + 1;
    if (!force && left < 0.05) return;
    const t0 = performance.now();
    pump(force ? Infinity : Math.min(BUDGET, left));
    frameBudget.spend(performance.now() - t0);
  }
  /** a tile's kit (tileData kit result) and its kit-walls mesh (facades.js); fades in with the tile unless instant */
  function addTile(name, data, walls, { instant = false } = {}) {
    if (!data) return;
    const t0 = performance.now();
    const t = { data, walls, cells: prepare(data), t: instant ? 1 : 0, code: instant ? 1 : 0, slot: kitFades.alloc(), box: [1e9, 1e9, -1e9, -1e9, 1e9, -1e9] };
    kitFades.set(t.slot, t.code);
    for (const arr of Object.values(data.pieces)) for (let i = 0; i < arr.length; i += STRIDE) {
      const b = t.box; b[0] = Math.min(b[0], arr[i] - 6); b[1] = Math.min(b[1], arr[i + 2] - 6); b[2] = Math.max(b[2], arr[i] + 6); b[3] = Math.max(b[3], arr[i + 2] + 6);
      b[4] = Math.min(b[4], arr[i + 1] - 2); b[5] = Math.max(b[5], arr[i + 1] + 2);
    }
    stats.prepareMs = Math.max(stats.prepareMs || 0, +(performance.now() - t0).toFixed(2));
    if (walls) walls.userData.kitFade = t.code;
    tiles.set(name, t);
    dirty = true;
  }
  function removeTile(name) {
    const t = tiles.get(name); if (!t) return;
    kitFades.set(t.slot, 0); quarantine.push([t.slot, seq]);
    tiles.delete(name); dirty = true;
  }
  /** triangles per piece and LOD (the report) */
  const pieceTris = Object.fromEntries(Object.entries(json.pieces).map(([k, p]) => [k, p.tris]));
  return { group, meshes, update, addTile, removeTile, stats, json, geo, mats, matFor, pieceInfo, pieceTris, rebucket, forceRebucket: () => { dirty = true; } };
}
