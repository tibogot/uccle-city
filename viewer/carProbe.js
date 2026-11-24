// THE CARS' REFLECTION PROBE (claude/cars1, CARS LOOK round 1, docs/rules/car-look.md): the glossy clear coat of every
// car (parked, traffic, the player's, the police yard) reflects the SKY AND THE CITY round the player, not the sky alone.
//
//   - ONE small cube (64 px, half float) rendered from a point near the camera (clamped to 1.2-8 m over the ground),
//     ONE FACE every `every` frames (default 3: a whole cube every 18 frames, ~0.3 s at 60 fps; 128 px / every 2 put
//     the PMREM on 1 frame in 12: police drive GPU p95 +1-1.8 ms)
//   - what it draws is a PROXY of the city, not the scene: the sky's own environment as the background + the FAR TILE
//     (viewer/main.js loadLiteTile: the ortho-textured terrain and the far-look buildings, viewer/farLook.js, one draw
//     each) of every tile within PROBE_R of the probe, in a scene of its own with one directional key light (made
//     once, never added or removed: rule fixed-light-count). So a face is ~2-8 draws at 128 x 128, whatever the city
//     drawing costs, and the materials it builds are the far tiles' shared ones (no pipeline per city material).
//   - TWO cubes, double buffered: the faces go into the back one; when its sixth face is done its PMREM is made once and
//     the cars' environment CROSS-FADES to it over the next cycle (uniform weight, no shader change), while the faces
//     of the other one are drawn. No step, no pop: a reflection slides from one probe position to the next.
//   - carEnv.node = mix(pmrem(A), pmrem(B), w): set as packMaterial's envNode (viewer/drive/carPacks.js) for every car
//     material made after the probe exists; the labs (no probe) keep the scene's sky environment.
//   ?carlook=old: no probe (cars on the sky environment) and the old paint, exactly as before.
import * as THREE from "three/webgpu";
import { texture, equirectUV, pmremTexture, mix, uniform, float, smoothstep } from "three/tsl";

export const CARLOOK_OLD = typeof location !== "undefined" && /[?&]carlook=old(&|$)/.test(location.search);
/** ?carprobe=0: the new paint without the probe (sky environment only: the A/B of the probe alone) */
export const CARPROBE_OFF = CARLOOK_OLD || (typeof location !== "undefined" && /[?&]carprobe=0(&|$)/.test(location.search));
/** the environment node the car materials take (null: none, the scene's environment) + the live probe */
export const carEnv = { node: null, probe: null };

export const PROBE_R = 260;        // m: the far tiles the probe draws (from the tile's edge; a tile is 500 m: 1-4 tiles)
const PROBE_KEEP = 450;            // m: a probe tile is dropped beyond this (hysteresis)

/**
 * renderer, scene (the city's: its environment = the sky's, its fog), sky = () => the sky's environment texture,
 * key = () => ({ dir: Vector3 toward the key light, color: Color (linear, x intensity) }),
 * groundAt(x, z), tiles = { near(x, z, R) -> [entry], load(entry) -> Promise<{ group, dispose }> } (main.js)
 */
export function createCarProbe({ renderer, scene, sky, key, groundAt, tiles, size = 64, every = 3, far = 1600 }) {
  const mk = () => {
    const rt = new THREE.CubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: false });
    rt.texture.name = "carProbe";
    return rt;
  };
  const rts = [mk(), mk()];
  const cube = new THREE.CubeCamera(0.5, far, rts[0]);
  const pscene = new THREE.Scene();
  pscene.name = "car-probe";
  const skyTex = texture(sky() || new THREE.Texture(), equirectUV());   // (.value follows the sky's re-bakes: sync)
  // the probe sky x4 and its key light x0.5: matched by eye to the view (with both at 1 the proxy walls came out brighter
  // than the sky they stand against, and every car in a brick street reflected a flat bronze); live on __carProbe
  const skyGain = uniform(4);
  pscene.backgroundNode = skyTex.mul(skyGain);
  // the key light (sun or moon): ONE light for the probe's own scene, made here once (rule fixed-light-count)
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = false;
  pscene.add(sun, sun.target);
  const w = uniform(0);                       // the weight of cube B
  const pmA = pmremTexture(rts[0].texture), pmB = pmremTexture(rts[1].texture);
  // THE CARS' ENVIRONMENT: the probe for what is a REFLECTION (the coat, the base's specular, chrome, glass), the sky's
  // own environment for the DIFFUSE light (three's irradiance context asks for level 1). The probe's irradiance is the
  // proxy city's walls and ground all round: in a brick street it tinted every grey car bronze (first browser look).
  const pmSky = pmremTexture(sky() || new THREE.Texture());
  class CarEnvNode extends THREE.Node {
    constructor() { super("vec3"); }
    setup(builder) {
      const lvl = builder.context.getTextureLevel ? builder.context.getTextureLevel(this) : float(0);
      return mix(mix(pmA, pmB, w), pmSky, smoothstep(0.45, 0.9, lvl));
    }
  }
  const node = new CarEnvNode();
  const pos = new THREE.Vector3(), held = new Map();   // name -> { group, dispose } | "loading"
  let face = 0, r = 1, frame = 0, fadeFrom = 0, fadeTo = 0, fadeN = 0, primed = false, loading = false;
  const cycle = 6 * every;
  const stats = { faces: 0, cycles: 0, tiles: 0, ms: 0, msMax: 0, cpuLast: 0 };

  const sync = () => {
    const t = sky(); if (t && skyTex.value !== t) skyTex.value = t;
    if (t && pmSky.value !== t) pmSky.value = t;
    pscene.environment = scene.environment; pscene.environmentIntensity = scene.environmentIntensity ?? 1;
    pscene.fogNode = scene.fogNode;
    const k = key();
    sun.color.copy(k.color); sun.intensity = probe.keyGain;
    sun.position.copy(pos).addScaledVector(k.dir, 500); sun.target.position.copy(pos);
    sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
  };
  const drawFace = (rt, f) => {
    if (cube.coordinateSystem !== renderer.coordinateSystem) { cube.coordinateSystem = renderer.coordinateSystem; cube.updateCoordinateSystem(); }
    cube.position.copy(pos); cube.updateMatrixWorld(true);
    renderer.setRenderTarget(rt, f);
    if (!renderer.autoClear) renderer.clear();
    renderer.render(pscene, cube.children[f]);
  };
  const drawAll = (rt) => { for (let f = 0; f < 6; f++) drawFace(rt, f); rt.texture.needsPMREMUpdate = true; };
  /** the far tiles round the probe: load the missing (one at a time), drop the far ones */
  const keepTiles = () => {
    const want = tiles.near(pos.x, pos.z, PROBE_R);
    for (const [n, h] of held) {
      if (h === "loading") continue;
      if (!want.some((e) => e.name === n) && !tiles.near(pos.x, pos.z, PROBE_KEEP).some((e) => e.name === n)) { h.dispose(); held.delete(n); }
    }
    if (loading) return;
    const e = want.find((x) => !held.has(x.name));
    if (!e) return;
    loading = true; held.set(e.name, "loading");
    tiles.load(e).then(async (h) => {
      try { await renderer.compileAsync(h.group, cube.children[0], pscene); } catch (err) { console.warn("[carProbe] compile:", err); }
      pscene.add(h.group); held.set(e.name, h);
    }, (err) => { console.warn(`[carProbe] tile ${e.name}:`, err); held.delete(e.name); })
      .finally(() => { loading = false; stats.tiles = [...held.values()].filter((h) => h !== "loading").length; });
  };
  const where = (camPos) => {
    const g = groundAt(camPos.x, camPos.z);
    const y = Number.isFinite(g) ? THREE.MathUtils.clamp(camPos.y, g + 1.2, g + 8) : camPos.y;
    pos.set(camPos.x, y, camPos.z);
  };

  const probe = {
    rts, scene: pscene, stats, weight: w, every, size, skyGain, sun, keyGain: 0.5,
    /** per frame, before the city's render (main.js updaters) */
    update(camPos) {
      const t0 = performance.now();
      const prevRT = renderer.getRenderTarget(), prevFace = renderer.getActiveCubeFace(), prevMip = renderer.getActiveMipmapLevel(), prevMRT = renderer.getMRT();
      renderer.setMRT(null);
      try {
        if (!primed) {
          where(camPos); sync(); drawAll(rts[0]); drawAll(rts[1]); primed = true; keepTiles();
        } else {
          // the cross-fade: linear over one cycle toward the cube completed last
          if (fadeN < cycle) { fadeN++; w.value = fadeFrom + (fadeTo - fadeFrom) * Math.min(1, fadeN / cycle); }
          if (frame++ % every === 0) {
            if (face === 0) { where(camPos); sync(); keepTiles(); }     // the probe's point for this cycle
            drawFace(rts[r], face); stats.faces++;
            if (++face === 6) {
              face = 0; stats.cycles++;
              rts[r].texture.needsPMREMUpdate = true;                   // its PMREM is made once, at its next use
              fadeFrom = w.value; fadeTo = r; fadeN = 0;
              r = 1 - r;
            }
          }
        }
      } finally {
        renderer.setRenderTarget(prevRT, prevFace, prevMip);
        renderer.setMRT(prevMRT);
      }
      const ms = performance.now() - t0;
      stats.cpuLast = ms; stats.ms = stats.ms * 0.95 + ms * 0.05; stats.msMax = Math.max(stats.msMax, ms);
    },
    dispose() { for (const h of held.values()) if (h !== "loading") h.dispose(); held.clear(); for (const rt of rts) rt.dispose(); },
  };
  carEnv.node = node; carEnv.probe = probe;
  return probe;
}
