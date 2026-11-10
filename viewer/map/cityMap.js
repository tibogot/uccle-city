// The map system for a host page (the city viewer behind ?map=1, the Map Lab): one worker, the minimap, the full map
// and the teleport "loading" note. The host gives:
//   getPlayer() -> { x, z, heading, bear, mode, alt, fov }   (bearings in radians clockwise from north)
//   teleport({ x, z, yaw, name }) -> Promise<{ ms, ... }>     (resolves once the target is streamed in and the player stands there)
// and calls update(dt) once per frame. ?maplang=nl: Dutch street names.
import { MapClient } from './mapClient.js';
import { Minimap } from './minimap.js';
import { FullMap } from './fullMap.js';
import { injectMapCSS } from './mapCSS.js';

export async function startCityMap({ getPlayer, teleport, getTrams, log = console.log, lang } = {}) {
  injectMapCSS();
  const qlang = new URLSearchParams(location.search).get('maplang');
  lang = lang || (qlang === 'nl' ? 'nl' : 'fr');
  const client = new MapClient();
  const info = await client.ready;
  log(`map: ${info.roads} roads, ${info.names} street names, ${info.landmarks.length} landmarks; worker fetch ${info.ms.fetch} ms + decode ${info.ms.decode} ms`);
  const veil = document.createElement('div');
  veil.className = 'umap-veil';
  document.body.append(veil);
  let last = { x: 0, z: 0, heading: 0, bear: 0, mode: 'orbit' };
  const motion = { x: null, z: null, speed: 0, travel: null };
  let busy = false;
  const teleports = [];
  // live trams: the host's own simulation read 4 times a second (no simulation here), drawn interpolated
  let tramsOn = false, tramT = 0;
  const tramStats = { calls: 0, ms: 0, max: 0 };
  const mini = new Minimap(client, { lang, onOpen: () => full.toggle(true) });
  const full = new FullMap(client, {
    lang,
    getPlayer: () => ({ ...last, whereText: mini.whereState.text }),
    getTrams: () => (tramsOn ? mini.interpTrams() : null),
    onLang: (l) => mini.setLang(l),
    onToggle: (open) => { mini.paused = open; },
    onTeleport: async (t) => {
      if (busy || !teleport) return;
      busy = true;
      full.toggle(false);
      veil.innerHTML = `<span class="spin"></span>Going to ${t.name || 'the street'}${t.cross ? ` (by ${t.cross})` : ''}… loading the area`;
      veil.classList.add('on');
      try {
        const r = await teleport(t);
        teleports.push({ name: t.name, x: +t.x.toFixed(1), z: +t.z.toFixed(1), ...r });
        log(`map: teleport to ${t.name} (${t.x.toFixed(0)}, ${t.z.toFixed(0)}) ready in ${(r.ms / 1000).toFixed(2)} s${r.tile ? ` (tile ${r.tile}${r.loaded ? ', streamed in' : ', already loaded'})` : ''}`);
        veil.textContent = `${t.name || 'Here'} · ready in ${(r.ms / 1000).toFixed(1)} s`;
        motion.x = null;
        setTimeout(() => veil.classList.remove('on'), 1600);
      } catch (e) {
        veil.textContent = `Cannot go there: ${e.message}`;
        setTimeout(() => veil.classList.remove('on'), 2500);
      } finally { busy = false; }
    },
  });
  return {
    client, mini, full, teleports,
    update(dt = 1 / 60) {
      const p = getPlayer();
      // speed and direction of motion from the positions (all modes alike)
      if (motion.x != null && dt > 0) {
        const dx = p.x - motion.x, dz = p.z - motion.z, v = Math.hypot(dx, dz) / dt;
        if (v < 120) {
          motion.speed += (v - motion.speed) * (1 - Math.exp(-dt * 3));
          if (Math.hypot(dx, dz) > 0.02) motion.travel = Math.atan2(dx, -dz);
        }
      }
      motion.x = p.x; motion.z = p.z;
      p.speed = p.speed ?? motion.speed;
      p.travel = motion.speed > 0.6 ? motion.travel : null;
      last = p;
      const now = performance.now();
      if (getTrams && now - tramT > 250) {
        tramT = now;
        const t0 = now, list = getTrams();
        const ms = performance.now() - t0;
        tramStats.calls++; tramStats.ms += ms; tramStats.max = Math.max(tramStats.max, ms);
        if (list) { tramsOn = true; mini.setTrams(list.map((q) => ({ trip: q.trip, x: q.x, z: q.z })), now); }
      }
      mini.update(p, dt);
    },
    stats: () => ({ minimap: mini.summary(), fullMapFrames: full.stats, teleports, trams: { ...tramStats, avgMs: tramStats.calls ? +(tramStats.ms / tramStats.calls).toFixed(3) : null } }),
    resetStats: () => mini.resetStats(),
  };
}
