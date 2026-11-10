// Map Lab: the minimap and the full map (viewer/map/) over a fake player that walks, drives or flies along the real
// street graph of Uccle (data/map/map.json): a route follows one street (same name through every junction, the
// straightest road when it ends), the camera turns like the city's modes (walk: the player's eyes; drive / fly: a
// chase camera that lags). Readable on a day, dusk and night sky. Teleport (click the full map) puts the player on
// the clicked street. Perf: minimap CPU per frame, worker cache rebuilds, label passes.
//   ?route=alsemberg|brugmann|stjob|free  ?mode=walk|drive|fly  ?speed=1  ?sky=day|dusk|night  ?lang=fr|nl  ?paused=1
//   window.__lab: { step(seconds), setRoute(id), setMode(m), player, map, stats() }
import { Panel } from '../viewer/panelUI.js';
import { loadMap } from '../viewer/map/mapData.js';
import { startCityMap } from '../viewer/map/cityMap.js';

const qp = new URLSearchParams(location.search);
const ROUTES = {
  alsemberg: { label: "Chaussée d'Alsemberg", key: "chaussee d alsemberg", hint: [-900, -200] },
  brugmann: { label: 'Avenue Brugmann', key: 'avenue brugmann', hint: [-500, -1000] },
  stjob: { label: 'Place de Saint-Job (around)', key: 'place de saint job', hint: [1160, 535] },
  free: { label: 'free (straight on)', key: null, hint: [1153, 540] },
};
const SPEED = { walk: 1.45, drive: 13.9, fly: 22 };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

const M = await loadMap(new URL('../data/map/', import.meta.url), { paths: false });

// ------------------------------------------------------------------ the fake player on the road graph
const P = { x: 0, z: 0, heading: 0, bear: 0, road: null, k: 1, t: 0, fwd: true, key: null, route: qp.get('route') || 'alsemberg', mode: qp.get('mode') || 'walk', paused: qp.get('paused') === '1', speedX: +(qp.get('speed') || 1), look: 0 };
function placeOn(road, k, t, fwd) {
  Object.assign(P, { road, k, t, fwd });
  const a = road.pts[k - 1], b = road.pts[k];
  P.x = a.x + (b.x - a.x) * t; P.z = a.z + (b.z - a.z) * t;
  const dx = (b.x - a.x) * (fwd ? 1 : -1), dz = (b.z - a.z) * (fwd ? 1 : -1);
  P.heading = Math.atan2(dx, -dz);
}
function setRoute(id) {
  const R = ROUTES[id] || ROUTES.alsemberg;
  P.route = id; P.key = R.key;
  const hits = M.near(R.hint[0], R.hint[1], 400).filter((h) => !R.key || M.keyOf(h.r.nid) === R.key);
  const h = hits[0] || M.near(R.hint[0], R.hint[1], 400)[0];
  if (!h) return;
  if (!R.key) P.key = M.keyOf(h.r.nid);
  placeOn(h.r, h.k, h.t, true);
  P.bear = P.heading;
}
/** Advance along the graph by d metres (same street first, else the straightest road on; U-turn at dead ends). */
function advance(d) {
  let { road, k, t, fwd } = P;
  while (d > 0) {
    const a = road.pts[k - 1], b = road.pts[k], L = Math.hypot(b.x - a.x, b.z - a.z) || 0.01;
    const left = fwd ? (1 - t) * L : t * L;
    if (d < left) { t += (fwd ? 1 : -1) * d / L; d = 0; break; }
    d -= left;
    if (fwd && k < road.pts.length - 1) { k++; t = 0; continue; }
    if (!fwd && k > 1) { k--; t = 1; continue; }
    // at a node
    const node = fwd ? road.b : road.a;
    const din = fwd ? Math.atan2(b.z - a.z, b.x - a.x) : Math.atan2(a.z - b.z, a.x - b.x);
    const others = (M.nodeRoads.get(node) || []).filter((i) => i !== road.i).map((i) => M.roads[i]).filter((r) => r.cls < 5 || P.mode === 'walk');
    const dirOut = (r) => { const p = r.a === node ? [r.pts[0], r.pts[1]] : [r.pts[r.pts.length - 1], r.pts[r.pts.length - 2]]; return Math.atan2(p[1].z - p[0].z, p[1].x - p[0].x); };
    const turn = (r) => Math.abs(wrap(dirOut(r) - din));
    const same = others.filter((r) => P.key && M.keyOf(r.nid) === P.key && turn(r) < 2.2);
    const pool = (same.length ? same : others.filter((r) => turn(r) < 1.4)).sort((x, y) => turn(x) - turn(y));
    if (!pool.length) { fwd = !fwd; t = fwd ? 0 : 1; continue; }     // dead end: turn back
    road = pool[0];
    fwd = road.a === node;
    k = fwd ? 1 : road.pts.length - 1; t = fwd ? 0 : 1;
    if (!same.length && P.route !== 'free') P.key = M.keyOf(road.nid);      // the street ended: follow the new one
  }
  placeOn(road, k, t, fwd);
}
setRoute(P.route);

// ------------------------------------------------------------------ the map system (the same module the city uses)
const readout = { street: '', next: '', pos: '', cpu: '', rebuild: '', labels: '', log: '' };
const params = { sky: qp.get('sky') || 'day', lang: qp.get('lang') === 'nl' ? 'nl' : 'fr' };
document.body.className = params.sky === 'day' ? '' : params.sky;
const map = await startCityMap({
  lang: params.lang,
  getPlayer: () => ({ x: P.x, z: P.z, heading: P.heading, bear: P.bear, mode: P.mode, alt: P.mode === 'fly' ? 120 : 1.7, fov: 1.25 }),
  teleport: async (t) => {           // the lab has no tiles to stream: the player stands there at once
    const t0 = performance.now();
    const h = M.near(t.x, t.z, 40)[0];
    if (!h) throw new Error('no street there');
    P.key = M.keyOf(h.r.nid);
    placeOn(h.r, h.k, h.t, true);
    P.bear = P.heading;
    return { ms: performance.now() - t0, lab: true };
  },
  log: (s) => { console.log(s); readout.log = s.slice(0, 60); },
});

// ------------------------------------------------------------------ panel (our own UI)
const ui = new Panel({ title: 'Map Lab' });
const f1 = ui.addFolder('Player');
f1.add(P, 'route', Object.keys(ROUTES)).name('route').onChange((v) => setRoute(v));
f1.add(P, 'mode', ['walk', 'drive', 'fly']).name('mode');
f1.add(P, 'speedX', 0, 6, 0.05).name('speed ×');
f1.add(P, 'look', -180, 180, 1).name('look around (°)');
f1.add(P, 'paused').name('paused');
const f2 = ui.addFolder('Map');
f2.add(params, 'sky', ['day', 'dusk', 'night']).onChange((v) => { document.body.className = v === 'day' ? '' : v; });
f2.add(params, 'lang', ['fr', 'nl']).name('street names').onChange((v) => { map.mini.setLang(v); map.full.setLang(v); });
f2.add({ 'open full map (M)': () => map.full.toggle(true) }, 'open full map (M)');
const f3 = ui.addFolder('Read-outs');
for (const k of ['street', 'next', 'pos', 'cpu', 'rebuild', 'labels', 'log']) f3.add(readout, k).listen();
const f4 = ui.addFolder('Benchmark');
const bench = { result: '' };
f4.add({ 'reset stats': () => map.resetStats() }, 'reset stats');
f4.add({ 'run 20 s (drive, all routes)': () => runBench(20) }, 'run 20 s (drive, all routes)');
f4.add(bench, 'result').listen();

async function runBench(sec) {
  const old = { mode: P.mode, speedX: P.speedX, route: P.route };
  P.mode = 'drive'; P.speedX = 2; P.paused = false;
  map.resetStats();
  const routes = ['alsemberg', 'brugmann', 'stjob'];
  for (let i = 0; i < routes.length; i++) { setRoute(routes[i]); bench.result = `running ${routes[i]}…`; await new Promise((r) => setTimeout(r, sec * 1000 / routes.length)); }
  const s = map.stats().minimap;
  bench.result = `avg ${s.avgMs} p99 ${s.p99} max ${s.max} ms · ${s.rebuilds} rebuilds (worker avg ${s.workerRebuildMs.avg} max ${s.workerRebuildMs.max} ms)`;
  console.log('map bench', JSON.stringify(s));
  Object.assign(P, old); setRoute(old.route);
  return s;
}

// ------------------------------------------------------------------ loop
const view = document.getElementById('view');
let last = performance.now(), frame = 0;
function step(dt) {
  if (!P.paused) advance(SPEED[P.mode] * P.speedX * dt);
  // camera: walking = the player's eyes; drive / fly = a chase camera that lags behind the turns
  const want = P.heading + P.look * Math.PI / 180;
  const lag = P.mode === 'walk' ? 14 : P.mode === 'drive' ? 2.5 : 1.2;
  P.bear += wrap(want - P.bear) * (1 - Math.exp(-dt * lag));
  map.update(dt);
}
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  step(dt);
  if (++frame % 10 === 0) {
    const W = map.mini.whereState, s = map.stats().minimap;
    readout.street = W.text || '—'; readout.next = W.next || '—';
    readout.pos = `${P.x.toFixed(0)}, ${P.z.toFixed(0)} · ${P.mode} · ${(map.mini.scale ? 110 / map.mini.scale : 0).toFixed(0)} m to the rim`;
    readout.cpu = `avg ${s.avgMs} · p99 ${s.p99} · max ${s.max} ms`;
    readout.rebuild = `${s.rebuilds} · worker avg ${s.workerRebuildMs.avg} max ${s.workerRebuildMs.max} ms`;
    readout.labels = `worker avg ${s.workerLabelMs.avg} max ${s.workerLabelMs.max} ms`;
    view.innerHTML = `${P.mode === 'walk' ? 'walking' : P.mode === 'drive' ? 'driving' : 'flying'} along ${ROUTES[P.route].label}<small>(a fake player on the real street graph; the camera looks ${P.look ? `${P.look}° off` : 'ahead'})</small>`;
  }
}
loop();
window.__lab = { step: (sec, n = Math.round(sec * 60)) => { for (let i = 0; i < n; i++) step(sec / n); }, setRoute, setMode: (m) => { P.mode = m; }, player: P, map, M, stats: () => map.stats(), runBench };
