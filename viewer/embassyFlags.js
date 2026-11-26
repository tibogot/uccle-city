// THE EMBASSY FLAGS (TODO 4b, rule docs/rules/embassy-flags.md; ?embassyflags=0 none). The diplomatic places of the
// commune come from OSM (pipeline/fetch_diplomatic.py); which of them really fly a flag, where and how many was looked
// at on street-level imagery (look only) and recorded per place in data/places/embassy_flags.json (`places[].check`);
// tools/embassy/places.mjs turns the "yes" places' mounts into `poles` (city x / z on the drawn building's street
// face). Only those fly a flag: no residence, no place recorded "no" or "unseen".
//   - the POLES: scripted here, a white / steel tapered pole with a ball finial on a concrete footing buried in the
//     drawn ground (joins rule), or a steel bracket pole angled out of the drawn façade with its wall plate. One merged
//     vertex-coloured mesh per tile in the tile's features group (it fades and unloads with the tile); one shared
//     material for every tile;
//   - the FLAGS: cloth (rule flags-are-cloth, viewer/flags/): every free-standing pole's flag is ONE BakedFlags set
//     (one loop recorded in the worker, one draw for all of them), the designs from ONE atlas (flags/flagAtlas.js: the
//     instance's cell); a bracket's angled pole needs its own loop (its axis and its wall), so one set per bracket;
//   - LIVE cloth only for the nearest LIVE_MAX within LIVE_RADIUS (a fixed pool built at start: no allocation, no
//     shader build on a frame; the pool's materials precompiled with the sets through the page's precompile queue);
//     hand-over both ways without a pop (flagField.js); hidden beyond HIDE_DIST; no light.
import * as THREE from "three/webgpu";
import { uniform } from "three/tsl";
import { BakedFlags, LiveFlag, clothMaterial } from "./flags/flagField.js";
import { FABRIC } from "./flags/flagCloth.js";
import { flagAtlas } from "./flags/flagAtlas.js";

export const LIVE_RADIUS = 45, HIDE_DIST = 700, LIVE_MAX = 6;
export const POLE_H = 7.0, BRACKET_LEN = 2.2, BRACKET_TILT = 35;            // m, m, degrees above the horizontal
const FLAG_W = 1.5, FLAG_H = 1.0, BRACKET_FLAG = [1.2, 0.8];
const WHITE = [0.78, 0.78, 0.76], STEEL = [0.55, 0.56, 0.57], CONCRETE = [0.42, 0.41, 0.39], GOLD = [0.6, 0.48, 0.2];

let DATA = null, MAT = null;
const byTile = new Map();              // tile -> [pole]
const built = new Map();               // pole id -> { base, tip, group } once its tile drew it

/** the data (data/places/embassy_flags.json), once */
let loading = null;
export function loadEmbassyFlags() { return (loading ??= loadData()); }
async function loadData() {
  const r = await fetch(new URL("../data/places/embassy_flags.json", import.meta.url));
  DATA = r.ok ? await r.json() : { places: [], poles: [] };
  byTile.clear();
  for (const p of DATA.poles ?? []) { if (!byTile.has(p.tile)) byTile.set(p.tile, []); byTile.get(p.tile).push(p); }
  return DATA;
}

// ---- the poles' geometry (merged per tile)
function pushCyl(B, a, b, r0, r1, col, S = 12) {
  // a tapered cylinder from point a to point b (any direction), smooth normals, no caps (the footing / finial close it)
  const ax = b[0] - a[0], ay = b[1] - a[1], az = b[2] - a[2], L = Math.hypot(ax, ay, az), d = [ax / L, ay / L, az / L];
  const t = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let u = [d[1] * t[2] - d[2] * t[1], d[2] * t[0] - d[0] * t[2], d[0] * t[1] - d[1] * t[0]]; const ul = Math.hypot(...u); u = u.map((q) => q / ul);
  const w = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
  const base = B.pos.length / 3;
  for (let k = 0; k <= S; k++) {
    const an = (k / S) * Math.PI * 2, c = Math.cos(an), s = Math.sin(an), n = [u[0] * c + w[0] * s, u[1] * c + w[1] * s, u[2] * c + w[2] * s];
    B.pos.push(a[0] + n[0] * r0, a[1] + n[1] * r0, a[2] + n[2] * r0, b[0] + n[0] * r1, b[1] + n[1] * r1, b[2] + n[2] * r1);
    B.nrm.push(...n, ...n); B.col.push(...col, ...col);
  }
  for (let k = 0; k < S; k++) { const i = base + k * 2; B.idx.push(i, i + 1, i + 3, i, i + 3, i + 2); }
}
function pushBall(B, c, R, col) {
  const b2 = B.pos.length / 3, NU = 10, NV = 6;
  for (let j = 0; j <= NV; j++) for (let k = 0; k <= NU; k++) {
    const v = (j / NV) * Math.PI, u = (k / NU) * Math.PI * 2, nx = Math.sin(v) * Math.cos(u), ny = Math.cos(v), nz = Math.sin(v) * Math.sin(u);
    B.pos.push(c[0] + nx * R, c[1] + ny * R, c[2] + nz * R); B.nrm.push(nx, ny, nz); B.col.push(...col);
  }
  for (let j = 0; j < NV; j++) for (let k = 0; k < NU; k++) { const a = b2 + j * (NU + 1) + k, b = a + NU + 1; B.idx.push(a, a + 1, b + 1, a, b + 1, b); }
}
/** an axis-aligned box (x0..x1, y0..y1, z0..z1) turned by (cx, cz) unit vector about its centre, 5 faces (no bottom) */
function pushBlock(B, cx, cz, hx, hz, y0, y1, ux, uz, col) {
  const vx = -uz, vz = ux, P = (sx, sz, y) => [cx + ux * hx * sx + vx * hz * sz, y, cz + uz * hx * sx + vz * hz * sz];
  const quad = (p, n) => { const i = B.pos.length / 3; for (const q of p) { B.pos.push(...q); B.nrm.push(...n); B.col.push(...col); } B.idx.push(i, i + 1, i + 2, i, i + 2, i + 3); };
  quad([P(-1, -1, y1), P(-1, 1, y1), P(1, 1, y1), P(1, -1, y1)], [0, 1, 0]);
  quad([P(1, -1, y0), P(1, -1, y1), P(1, 1, y1), P(1, 1, y0)], [ux, 0, uz]);
  quad([P(-1, 1, y0), P(-1, 1, y1), P(-1, -1, y1), P(-1, -1, y0)], [-ux, 0, -uz]);
  quad([P(-1, -1, y0), P(-1, -1, y1), P(1, -1, y1), P(1, -1, y0)], [-vx, 0, -vz]);
  quad([P(1, 1, y0), P(1, 1, y1), P(-1, 1, y1), P(-1, 1, y0)], [vx, 0, vz]);
}

/** one pole into B; ground(x, z) = the drawn ground. -> { base, tip, footTop, footLow } (city xyz) */
export function poleGeometry(B, p, ground) {
  if (p.type === "bracket") {
    // the wall point (on the drawn façade), the pole out of the wall (turned `splay` degrees sideways), tilted up
    const [nx, nz] = p.n, g = ground(p.x, p.z), y = g + p.y, ax = bracketAxis(p);
    const a = [p.x + nx * 0.06, y, p.z + nz * 0.06];
    const b = [a[0] + ax[0] * BRACKET_LEN, y + ax[1] * BRACKET_LEN, a[2] + ax[2] * BRACKET_LEN];
    pushBlock(B, p.x + nx * 0.03, p.z + nz * 0.03, 0.03, 0.09, y - 0.14, y + 0.14, nx, nz, STEEL);          // the wall plate
    pushCyl(B, a, b, 0.025, 0.02, p.colour === "white" ? WHITE : STEEL, 10);
    pushBall(B, [b[0] + ax[0] * 0.04, b[1] + ax[1] * 0.04, b[2] + ax[2] * 0.04], 0.04, GOLD);
    return { base: a, tip: b, footTop: null, footLow: null };
  }
  // a free-standing pole on a footing: the footing's top 4 cm over the highest ground under it, its foot 30 cm under
  // the lowest (JOINS: never a floating edge)
  const h = p.h ?? POLE_H, r = 0.2, gs = [[-r, -r], [r, -r], [r, r], [-r, r], [0, 0]].map(([dx, dz]) => ground(p.x + dx, p.z + dz));
  const top = Math.max(...gs) + 0.04, low = Math.min(...gs) - 0.3;
  pushBlock(B, p.x, p.z, r, r, low, top, 1, 0, CONCRETE);
  const col = p.colour === "steel" ? STEEL : WHITE;
  const base = [p.x, top, p.z], tip = [p.x, top + h, p.z];
  pushCyl(B, base, tip, 0.05, 0.035, col);
  pushBall(B, [p.x, tip[1] + 0.06, p.z], 0.07, GOLD);
  return { base, tip, footTop: top, footLow: low };
}

/** a bracket pole's unit axis: out of the wall (n), turned `splay` degrees towards t (the right seen from outside),
 *  tilted `tilt` degrees above the horizontal */
export function bracketAxis(p) {
  const tl = ((p.tilt ?? BRACKET_TILT) * Math.PI) / 180, sp = ((p.splay ?? 0) * Math.PI) / 180, t = p.t ?? [p.n[1], -p.n[0]];
  const hx = p.n[0] * Math.cos(sp) + t[0] * Math.sin(sp), hz = p.n[1] * Math.cos(sp) + t[1] * Math.sin(sp);
  return [hx * Math.cos(tl), Math.sin(tl), hz * Math.cos(tl)];
}

const geometryOf = (B) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(B.pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(B.nrm, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(B.col, 3));
  g.setIndex(B.idx); g.computeBoundingSphere();
  return g;
};

export const embassyFlags = {
  /** the tiles' pole groups' names (main.js: they collide like the landmarks, viewer/heroColliders.js) */
  async rootNames() { await loadEmbassyFlags(); return [...byTile.keys()].map((t) => `embassy-poles-${t}`); },
  /** tile `name`'s poles: a Group added to `parent` (the tile's features group), or null. Needs loadEmbassyFlags first. */
  tile(name, parent, ground) {
    const list = byTile.get(name);
    if (!list?.length) return null;
    const B = { pos: [], nrm: [], col: [], idx: [] }, grp = new THREE.Group();
    grp.name = `embassy-poles-${name}`;                 // (a hero-collider root: heroColliders.js HERO_ROOTS, main.js)
    for (const p of list) built.set(p.id, { ...poleGeometry(B, p, ground), group: grp });
    MAT ||= new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.3 });
    MAT.name = "embassy-poles";
    const mesh = new THREE.Mesh(geometryOf(B), MAT);
    mesh.name = "embassy-poles"; mesh.castShadow = true; mesh.receiveShadow = true;
    grp.add(mesh);
    parent.add(grp);
    return { group: grp, poles: list.length, tris: B.idx.length / 3 };
  },

  /** the flags (in the background once the boot is done): every pole of the data, shown while its tile's poles are */
  async start({ scene, updaters, renderer, compiler, params, log }) {
    const t0 = performance.now();
    const data = await loadEmbassyFlags();
    const poles = data.poles ?? [];
    if (!poles.length) { log?.("embassy flags: no pole in data/places/embassy_flags.json"); return null; }
    const [ws, wd] = (params.get("wind") ?? "5,70").split(",").map(Number);
    const wind = { speed: Number.isFinite(ws) ? ws : 5, deg: Number.isFinite(wd) ? wd : 70 };
    const dirOf = (deg) => { const a = THREE.MathUtils.degToRad(deg); return [Math.cos(a), 0, -Math.sin(a)]; };
    const keys = [...new Set(poles.map((p) => p.design))];
    const atlas = flagAtlas(keys, renderer);
    // the free-standing poles: one set; each bracket: its own set (its axis, its wall)
    // (a free pole within the cloth's reach of a wall, p.wall, flies its own loop kept clear of that wall, as a bracket)
    const free = poles.filter((p) => p.type !== "bracket" && !p.wall), brackets = poles.filter((p) => p.type === "bracket" || p.wall);
    const freeCloth = { width: FLAG_W, height: FLAG_H, axis: [0, 1, 0], out: dirOf(wind.deg), windDir: dirOf(wind.deg), fabric: FABRIC.polyester, planes: [] };
    const sets = [], flags = [];
    if (free.length) {
      const set = await BakedFlags.create({ cloth: freeCloth, map: null, atlas, capacity: free.length, speed: wind.speed });
      sets.push(set);
      for (const p of free) flags.push({ p, set, i: set.add(0, -1e4, 0, { phase: Math.random(), scale: 0, cell: atlas.cellOf(p.design) }), cloth: freeCloth, top: new THREE.Vector3(), on: false, live: null, state: "baked", d: Infinity });
    }
    for (const p of brackets) {
      const wallPole = p.type !== "bracket", axis = wallPole ? [0, 1, 0] : bracketAxis(p);
      // the wall as a half-space in the sim frame (relative to the hoist top)
      const size = wallPole ? [FLAG_W, FLAG_H] : BRACKET_FLAG;
      const cloth = { width: size[0], height: size[1], axis, out: dirOf(wind.deg), windDir: dirOf(wind.deg), fabric: FABRIC.polyester, planes: [wallPole ? [p.wall.n[0], 0, p.wall.n[1], -p.wall.d + 0.04] : bracketPlane(p, axis)] };
      const set = await BakedFlags.create({ cloth, map: null, atlas, capacity: 1, speed: wind.speed });
      sets.push(set);
      flags.push({ p, set, i: set.add(0, -1e4, 0, { phase: Math.random(), scale: 0, cell: atlas.cellOf(p.design) }), cloth, top: new THREE.Vector3(), on: false, live: null, state: "baked", d: Infinity });
    }
    for (const s of sets) { s.mesh.visible = false; s.mesh.userData.nightMover = 2; s.mesh.name = "flags_baked_embassy"; scene.add(s.mesh); }
    // the live pool: LIVE_MAX cloths for the free poles + one per bracket, each with its own material (its cell a
    // uniform), all built and precompiled now
    const pool = [];
    const liveOf = (cloth) => {
      const cell = uniform(0), material = clothMaterial(null, { atlas, cell });
      const lf = new LiveFlag({ cloth: { ...cloth, windDir: undefined }, map: null, material });
      lf.mesh.visible = false; lf.mesh.userData.nightMover = 2; lf.mesh.name = "flag_live_embassy"; lf.mesh.frustumCulled = false;
      lf.cell = cell; lf.busy = null;
      scene.add(lf.mesh);
      return lf;
    };
    for (let k = 0; k < Math.min(LIVE_MAX, free.length); k++) pool.push(liveOf(freeCloth));
    for (const f of flags) if (f.set !== sets[0] || !free.length) f.own = liveOf(f.cloth);
    let compile = compiler();
    while (!compile) { await new Promise((r) => setTimeout(r, 250)); compile = compiler(); }
    const probes = [...pool, ...flags.filter((f) => f.own).map((f) => f.own)];
    for (const lf of probes) lf.mesh.visible = true;
    await compile([...sets.map((s) => s.mesh), ...probes.map((lf) => lf.mesh)]);
    for (const lf of probes) lf.mesh.visible = false;

    const order = flags.map((_, k) => k);
    let last = performance.now(), t = 0, simMs = 0, liveNow = 0;
    const takeLive = (f) => {
      const lf = f.own ?? pool.find((q) => !q.busy);
      if (!lf) return false;
      lf.busy = f; f.live = lf; lf.cell.value = f.set.extra[f.i * 4 + 2];
      Object.assign(lf.cloth.wind, { speed: wind.speed, dir: dirOf(wind.deg) });
      lf.startFrom(f.set.stateAt(f.i, t), 0);
      lf.mesh.position.copy(f.top); lf.mesh.visible = true;
      f.set.setVisible(f.i, false); f.state = "live";
      return true;
    };
    const dropLive = (f) => { const lf = f.live; lf.mesh.visible = false; lf.busy = null; lf.blend = null; f.live = null; f.set.setVisible(f.i, f.on); f.state = "baked"; };
    const isShown = (g) => { for (let o = g; o; o = o.parent) if (!o.visible) return false; return !!g?.parent; };
    updaters.push((camPos) => {
      const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now; t += dt;
      // place / show each flag while its tile's pole is drawn; hidden beyond HIDE_DIST
      for (const f of flags) {
        const b = built.get(f.p.id), shown = !!b && isShown(b.group);
        if (shown && !f.placed) { f.placed = true; f.top.set(b.tip[0], b.tip[1], b.tip[2]); placeHoist(f); f.set.setPlace(f.i, f.top.x, f.top.y, f.top.z); }
        f.d = shown ? camPos.distanceTo(f.top) : Infinity;
        const on = shown && f.d < HIDE_DIST;
        if (on !== f.on) { f.on = on; if (!f.live) f.set.setVisible(f.i, on); }
        if (!on && f.live) dropLive(f);
      }
      for (const s of sets) { s.mesh.visible = false; s.setWind(wind.speed); s.update(t, dt); }
      for (const f of flags) if (f.on) f.set.mesh.visible = true;
      // the nearest LIVE_MAX within LIVE_RADIUS run the cloth (insertion sort in place: no allocation)
      for (let a = 1; a < order.length; a++) { const k = order[a]; let b = a - 1; while (b >= 0 && flags[order[b]].d > flags[k].d) { order[b + 1] = order[b]; b--; } order[b + 1] = k; }
      let sim = 0, n = 0;
      for (let r = 0; r < order.length; r++) {
        const f = flags[order[r]], want = f.on && r < LIVE_MAX && f.d < LIVE_RADIUS + (f.live ? 5 : 0);
        if (want && f.state === "baked") takeLive(f);
        else if (want && f.state === "handback") { f.live.blend = null; f.state = "live"; }
        else if (!want && f.state === "live") { f.live.handBack(() => f.set.stateAt(f.i, t), 0); f.state = "handback"; }
        if (f.live) {
          Object.assign(f.live.cloth.wind, { speed: wind.speed });
          const going = f.live.update(dt); sim += f.live.simMs; n++;
          if (f.state === "handback" && !going) dropLive(f);
        }
      }
      liveNow = n;
      simMs += (sim - simMs) * 0.05;
    });
    const r = { flags, sets, pool, atlas, wind, LIVE_MAX, get liveNow() { return liveNow; }, get simMs() { return simMs; }, ms: Math.round(performance.now() - t0) };
    window.embassyFlags = r;
    log?.(`embassy flags: ${flags.length} on ${free.length} pole(s) + ${brackets.length} bracket(s), ${keys.length} design(s) in one atlas, ${sets.length} draw(s), live cloth <= ${LIVE_MAX} within ${LIVE_RADIUS} m, ${r.ms} ms (viewer/embassyFlags.js, ?embassyflags=0)`);
    return r;
  },
};

/** the hoist top: 12 cm under the pole's tip along its axis */
function placeHoist(f) {
  const a = f.cloth.axis;
  f.top.x -= a[0] * 0.12; f.top.y -= a[1] * 0.12; f.top.z -= a[2] * 0.12;
}
/** a bracket's wall as a half-space of the sim frame (relative to the hoist top): n . q >= d keeps the cloth 4 cm in
 *  front of the façade. The top is BRACKET_LEN - 0.12 m out along the axis from the wall point (0.06 m out) */
function bracketPlane(p, axis) {
  const [nx, nz] = p.n, along = BRACKET_LEN - 0.12;
  // the wall point relative to the top: -(0.06 n + along * axis); n . that = -(0.06 + along * (n . axis))
  const out = 0.06 + along * (nx * axis[0] + nz * axis[2]);
  return [nx, 0, nz, -out + 0.04];
}
