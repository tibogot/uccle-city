// THE KIT IN THE SCENE: every loaded tile's kit instances (viewer/facadeKit/placement.js, built in the tile worker)
// drawn by ONE set of InstancedMeshes shared by all tiles: per piece and LOD, one OPAQUE mesh (every named slot in
// one draw: the slot travels per vertex, the building's variant per instance; kitMaterials.js) and one GLASS mesh
// (the painted window's room). At most 15 pieces x 2 LODs x (1 + glass) meshes exist; only those with instances in
// range draw (round 1: one mesh per piece x LOD x slot x variant, ~65 in a busy street).
//   - bucketing: when the eye has moved 2 m / turned 8 degrees (or a tile came / went / is fading), every instance
//     within reach and the widened view cone is written to the meshes of its LOD(s); the dithered fades in the
//     materials (kitFade.js) do the rest, per pixel, so nothing pops;
//   - per instance: instanceMatrix (position, rotation about y to the wall's normal), aKitI = the 9-slice stretch
//     (sx, hsx, sy, dH), aKitJ = (nx, nz, variant + seed, tile fade), aKitF = the face it sits on (u0, width, base,
//     rnd + 2 door street + 4 French code: the glass's room), aVar = the library's per-instance variation;
//   - LOD0 opaque casts shadows (faded over the LOD band), LOD1 and the glass none.
//   const kit = await loadKitField({ base });  scene.add(kit.group);  kit.addTile(name, data, wallsMesh);
//   kit.update(eye, camera, dt);  kit.removeTile(name);  kit.stats
import * as THREE from "three/webgpu";
import { kitOpaqueMaterial, kitGlassMaterial, loadKitMaterialSource } from "./kitMaterials.js";
import { kitRanges } from "./kitFade.js";
import { STRIDE } from "./placement.js";

const MOVE = 2, MARGIN = 3;
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
      const kv = new Uint8Array(bin, o, n * 4);
      const idx = s.i32 ? new Uint32Array(bin, s.iOff, s.iCount) : new Uint16Array(bin, s.iOff, s.iCount);
      return [kind, { attrs: { position: new THREE.BufferAttribute(pos, 3), normal: new THREE.BufferAttribute(nrm, 3), uv: new THREE.BufferAttribute(uv, 2), aKitV: new THREE.BufferAttribute(kv, 4, true) },
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
      geom.setAttribute(a, new THREE.InstancedBufferAttribute(arrays[a], 4).setUsage(THREE.DynamicDrawUsage));
    }
    geom.userData.shared = true;
    const mesh = new THREE.InstancedMesh(geom, matFor(kind, lod), cap);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
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
    const refOf = { window: json.ref.window, door: json.ref.door, french: json.ref.french, frenchX: json.ref.french };
    pieceInfo[name] = { mode, ref: refOf[mode] ?? p.ref, slots: p.slots, run: mode === "run" };
  }
  const stretch = (info, w, h, out) => {
    if (info.mode === "window" || info.mode === "door" || info.mode === "french" || info.mode === "frenchX") {
      const [Wr, Hr] = info.ref;
      out[0] = (w / 2 - SL.x) / (Wr / 2 - SL.x); out[1] = (w - Wr) / 2;
      out[2] = (h - SL.bottom - SL.top) / (Hr - SL.bottom - SL.top); out[3] = h - Hr;
      if (info.mode === "frenchX") { out[2] = 1; out[3] = 0; }
    } else if (info.run) { out[0] = w / info.ref[0]; out[1] = 0; out[2] = 1; out[3] = 0; }
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
        const s = new Float32Array(4); stretch(info, arr[i + 5], arr[i + 6], s);
        c.items.push({ arr, i, r: info.run ? arr[i + 5] / 2 : 1.5, s, t: targetsOf(piece) });
        c.y0 = Math.min(c.y0, arr[i + 1] - 1); c.y1 = Math.max(c.y1, arr[i + 1] + 4);
      }
    }
    return [...cells.values()];
  }

  function rebucket(eye) {
    const t0 = performance.now();
    for (const e of meshes.values()) e.n = 0;
    const R = kitRanges();
    const near0 = R.lod1 + MARGIN, far1lo = R.lod1 - R.lodBand - MARGIN, far1hi = R.far + MARGIN;
    const cellR = CELL * 0.71 + 6;
    // view cone (horizontal), widened by CONE_MARGIN: cells well behind / beside the view are skipped; turning more
    // than TURN re-buckets, so a cell enters long before it reaches the screen's edge (no pop on turning)
    const cosLim = Math.cos(Math.min(Math.PI, coneHalf + CONE_MARGIN));
    let total = 0;
    for (const tile of tiles.values()) {
      const code = tile.code;
      for (const c of tile.cells) {
        total += c.items.length;
        const cdx = c.x - eye.x, cdz = c.z - eye.z, cd = Math.hypot(cdx, cdz);
        if (cd - cellR > far1hi) continue;
        if (fwd.lengthSq() > 0 && cd > cellR) {
          const ang = Math.acos(Math.max(-1, Math.min(1, (cdx * fwd.x + cdz * fwd.z) / cd))) - Math.asin(Math.min(1, cellR / cd));
          if (Math.cos(Math.max(0, ang)) < cosLim) continue;
        }
        for (const it of c.items) {
          const arr = it.arr, i = it.i;
          const x = arr[i], y = arr[i + 1], z = arr[i + 2];
          const d = Math.hypot(x - eye.x, y - eye.y, z - eye.z);
          const dmin = Math.max(0, d - it.r), dmax = d + it.r;
          if (dmin > far1hi) continue;
          const l0 = dmin < near0, l1 = dmax > far1lo;
          if (!l0 && !l1) continue;
          const nx = arr[i + 3], nz = arr[i + 4], seed = arr[i + 8], vs = arr[i + 7] + Math.min(seed, 0.999);
          const st = it.s;
          for (let lod = 0; lod < 2; lod++) {
            if (lod === 0 ? !l0 : !l1) continue;
            for (const e of it.t[lod]) {
              if (e.n >= e.cap) grow(e, e.n + 1);
              const k = e.n++;
              const M = e.M, m = k * 16;
              M[m] = nz; M[m + 1] = 0; M[m + 2] = -nx; M[m + 3] = 0;
              M[m + 4] = 0; M[m + 5] = 1; M[m + 6] = 0; M[m + 7] = 0;
              M[m + 8] = nx; M[m + 9] = 0; M[m + 10] = nz; M[m + 11] = 0;
              M[m + 12] = x; M[m + 13] = y; M[m + 14] = z; M[m + 15] = 1;
              const q = k * 4;
              e.I[q] = st[0]; e.I[q + 1] = st[1]; e.I[q + 2] = st[2]; e.I[q + 3] = st[3];
              e.J[q] = nx; e.J[q + 1] = nz; e.J[q + 2] = vs; e.J[q + 3] = code;
              e.F[q] = arr[i + 10]; e.F[q + 1] = arr[i + 11]; e.F[q + 2] = arr[i + 12]; e.F[q + 3] = arr[i + 13];
              e.V[q] = seed; e.V[q + 1] = 0.35 + 0.3 * ((seed * 7.13) % 1); e.V[q + 2] = 0.35 + 0.3 * ((seed * 3.71) % 1); e.V[q + 3] = 0.5;
            }
          }
        }
      }
    }
    let drawn = 0, used = 0, tris = 0;
    for (const e of meshes.values()) {
      const g = e.mesh.geometry;
      if (e.mesh.count !== e.n || e.n) {
        e.mesh.count = e.n;
        if (e.n) {
          e.mesh.instanceMatrix.clearUpdateRanges(); e.mesh.instanceMatrix.addUpdateRange(0, e.n * 16); e.mesh.instanceMatrix.needsUpdate = true;
          for (const a of ["aKitI", "aKitJ", "aKitF", "aVar"]) { const at = g.attributes[a]; at.clearUpdateRanges(); at.addUpdateRange(0, e.n * 4); at.needsUpdate = true; }
        }
      }
      if (e.n) { used++; drawn += e.n; tris += e.n * geo[e.piece][e.lod][e.kind].tris; }
    }
    const ms = performance.now() - t0;
    Object.assign(stats, { instances: total, drawn, meshes: used, ms: +ms.toFixed(2), msMax: Math.max(stats.msMax, +ms.toFixed(2)), tris });
    stats.rebuckets++;
  }

  /** per frame: re-bucket when the eye moved / tiles changed / a tile fades */
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
    let fading = false;
    for (const t of tiles.values()) {
      if (t.t < 1) {
        t.t = Math.min(1, t.t + dt / 0.9);
        const e = t.t * t.t * (3 - 2 * t.t);
        t.code = t.t >= 1 ? 1 : e;
        if (t.walls) t.walls.userData.kitFade = t.code;
        fading = true;
      }
    }
    if (dirty || fading || turned || eye.distanceToSquared(last) > MOVE * MOVE) {
      last.copy(eye); dirty = false;
      if (camera && dirTmp.lengthSq() > 0) fwd.copy(dirTmp);
      // looking steeply down (aerial), or the LOD eye is not the camera (viewer.stateAt, the pop meter): no cone
      if (camera && (Math.abs(camera.getWorldDirection(dirTmp2).y) > 0.75 || camera.position.distanceTo(eye) > 1)) fwd.set(0, 0, 0);
      rebucket(eye);
      // a tile whose kit is all out of reach: its kit walls draw with the plain wall material (a discard in the
      // shader costs early-z on the whole draw: +0.7 ms in an aerial view with no piece drawn, measured)
      const reach = kitRanges().far + MARGIN + 4;
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
  }
  /** a tile's kit (tileData kit result) and its kit-walls mesh (facades.js); fades in with the tile unless instant */
  function addTile(name, data, walls, { instant = false } = {}) {
    if (!data) return;
    const t0 = performance.now();
    const t = { data, walls, cells: prepare(data), t: instant ? 1 : 0, code: instant ? 1 : 0, box: [1e9, 1e9, -1e9, -1e9, 1e9, -1e9] };
    for (const arr of Object.values(data.pieces)) for (let i = 0; i < arr.length; i += STRIDE) {
      const b = t.box; b[0] = Math.min(b[0], arr[i] - 6); b[1] = Math.min(b[1], arr[i + 2] - 6); b[2] = Math.max(b[2], arr[i] + 6); b[3] = Math.max(b[3], arr[i + 2] + 6);
      b[4] = Math.min(b[4], arr[i + 1] - 2); b[5] = Math.max(b[5], arr[i + 1] + 2);
    }
    stats.prepareMs = Math.max(stats.prepareMs || 0, +(performance.now() - t0).toFixed(2));
    if (walls) walls.userData.kitFade = t.code;
    tiles.set(name, t);
    dirty = true;
  }
  function removeTile(name) { if (tiles.delete(name)) dirty = true; }
  /** triangles per piece and LOD (the report) */
  const pieceTris = Object.fromEntries(Object.entries(json.pieces).map(([k, p]) => [k, p.tris]));
  return { group, meshes, update, addTile, removeTile, stats, json, geo, mats, matFor, pieceInfo, pieceTris, rebucket, forceRebucket: () => { dirty = true; } };
}
