// BIG ADVERTISING BILLBOARDS on gables and roofs (claude/billboards; data/billboards/billboards.json, rule billboards;
// ?billboards=0: none). The boards Street View shows along the main roads (look only, recorded in our own words) with
// INVENTED posters only (no real brand, logo or ad art: a fake cafe, a fake concert, the city's own fictional brands).
//
//   placement  tools/billboards/billboards.mjs snaps every board to the wall face / roof the city draws (the same
//              analyseBuildings faces), off its windows; the file carries the result (`at`), the gate row `billboards`
//              re-derives and checks it. Here the boards are only drawn where the file says.
//   kit        three static meshes for the whole city (built here from the data, no GLB):
//                frames   steel boxes, lips, brackets, roof legs + braces, lamp arms; the lamp heads and the backlit
//                         boards' LED edge emissive at night (env.uNight), never a light (fixed light count);
//                posters  one quad per board face, the poster atlas (drawn below with Canvas 2D: our own simple ads);
//                         backlit and front-lit posters glow at night;
//                slats    the trivision (rotating prism) boards: one triangular prism per slat, its three faces three
//                         posters' strips; they turn by 120 degrees in steps, a wave across the board, every CYCLE s,
//                         from a TIME uniform in the vertex shader (static buffers, nothing re-uploaded: rule
//                         no-dynamic-draw-usage); the normal turns with them.
//   draws      3 colour draws (+ 2 in the sun's shadow map: the slats do not cast, the box behind them does).
import * as THREE from "three/webgpu";
import { attribute, vec3, vec4, float, clamp, fract, floor, cos, sin, texture, uv, uniform, cameraViewMatrix, normalize } from "three/tsl";
import { env } from "./lighting.js";
import { wxMat } from "./weather/cityWeatherize.js";
import { PRISM, FRAME, ROOF, drawAtlas, buildBoards, prismAngle } from "./billboardsKit.js";
export { PRISM, FRAME, ROOF, drawAtlas, buildBoards, prismAngle };

/** a kit soup (viewer/billboardsKit.js) as a BufferGeometry */
function soupGeometry(S, withEx = false) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(S.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(S.n, 3));
    g.setAttribute("aCR", new THREE.Float32BufferAttribute(S.cr, 4));
    g.setAttribute("aEm", new THREE.Float32BufferAttribute(S.em, 2));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(S.uv, 2));
    if (withEx) { g.setAttribute("aEx", new THREE.Float32BufferAttribute(S.ex, 4)); g.setAttribute("aT", new THREE.Float32BufferAttribute(S.tt, 2)); }
    g.computeBoundingSphere();
    return g;
}


const qs = new URLSearchParams(typeof location !== "undefined" ? location.search : "");
/** ?billboards=0: no billboards (as before) */
export const BILLBOARDS = qs.get("billboards") !== "0";

const uTime = uniform(0);
function frameMaterial() {
  const m = new THREE.MeshStandardNodeMaterial();
  const cr = attribute("aCR", "vec4"), em = attribute("aEm", "vec2");
  m.colorNode = cr.xyz;
  m.roughnessNode = cr.w;
  m.metalnessNode = float(0.35);
  m.emissiveNode = vec3(1.0, 0.93, 0.8).mul(em.x.add(em.y.mul(env.uNight)));
  m.name = "billboards-frames";
  wxMat(m);
  return m;
}
function posterMaterial(tex, rotating) {
  const m = new THREE.MeshStandardNodeMaterial();
  const cr = attribute("aCR", "vec4"), em = attribute("aEm", "vec2");
  const t = texture(tex, uv()).rgb;
  m.colorNode = t.mul(0.92);
  m.roughnessNode = cr.w;
  m.metalnessNode = float(0);
  // the night glow: a backlit box evenly, a front-lit board brighter under its lamps (the top) than at its foot
  m.emissiveNode = t.mul(em.x.mul(env.uNight).mul(0.9));
  if (rotating) {
    const ex = attribute("aEx", "vec4"), nrm = attribute("normal", "vec3");
    const q = uTime.sub(ex.w).div(PRISM.cycle), k = floor(q), f = clamp(fract(q).mul(PRISM.cycle / PRISM.turn), 0, 1);
    const ang = k.add(f.mul(f).mul(float(3).sub(f.mul(2)))).mul((2 * Math.PI) / 3);
    const c = cos(ang), s = sin(ang);
    // rotate the local (t, n) offset round the slat's axis (the vertex position is the axis foot, world)
    const bt = attribute("aT", "vec2"), tx = bt.x, tz = bt.y;                   // the board's t = (tx, 0, tz), n = (-tz, 0, tx)
    const lt = ex.x.mul(c).add(ex.z.mul(s)), ln = ex.z.mul(c).sub(ex.x.mul(s));
    const off = vec3(tx.mul(lt).sub(tz.mul(ln)), ex.y, tz.mul(lt).add(tx.mul(ln)));
    m.positionNode = attribute("position", "vec3").add(off);
    const nt = nrm.x.mul(c).add(nrm.z.mul(s)), nn = nrm.z.mul(c).sub(nrm.x.mul(s));
    const nw = vec3(tx.mul(nt).sub(tz.mul(nn)), 0, tz.mul(nt).add(tx.mul(nn)));
    m.normalNode = normalize(cameraViewMatrix.mul(vec4(nw, 0)).xyz);
  }
  m.name = rotating ? "billboards-slats" : "billboards-posters";
  return m;
}

// ------------------------------------------------------------------------------------------------ the city hook
export const billboards = {
  stats: null, group: null,
  async start({ scene, updaters, compiler, log = () => {}, base = new URL("../", import.meta.url) }) {
    if (!BILLBOARDS) return;
    const t0 = performance.now();
    const doc = await fetch(new URL("data/billboards/billboards.json", base).href, { priority: "low" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (!doc) { log("billboards: data/billboards/billboards.json missing"); return; }
    const boards = doc.boards.filter((b) => b.at);
    const A = drawAtlas(doc.posters);
    const tex = new THREE.CanvasTexture(A.canvas);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.name = "billboard posters";
    const K = buildBoards({ ...doc, boards }, A.cells);
    const group = this.group = new THREE.Group(); group.name = "billboards";
    const mk = (geo, mat, cast, name) => { const o = new THREE.Mesh(geo, mat); o.name = name; o.castShadow = cast; o.receiveShadow = true; o.matrixAutoUpdate = false; o.frustumCulled = !/slats/.test(name); group.add(o); return o; };
    mk(soupGeometry(K.frames), frameMaterial(), true, "billboards-frames");
    mk(soupGeometry(K.posters), posterMaterial(tex, false), true, "billboards-posters");
    if (K.slats.p.length) {
      const g = soupGeometry(K.slats, true);
      g.boundingSphere = new THREE.Sphere(g.boundingSphere.center, g.boundingSphere.radius + 12);
      mk(g, posterMaterial(tex, true), false, "billboards-slats");
    }
    scene.add(group);
    const c = compiler?.();
    if (c) await c([group]).catch(() => {});
    const t00 = performance.now();
    updaters.push(() => { uTime.value = (performance.now() - t00) / 1000; });
    let tris = 0; group.traverse((o) => { if (o.isMesh) tris += o.geometry.attributes.position.count / 3; });
    this.stats = { ...K.stats, draws: group.children.length, tris, atlas: `${A.width}x${A.height}`, ms: Math.round(performance.now() - t0) };
    log(`billboards: ${K.stats.boards} boards (${K.stats.prisms} trivision, ${K.stats.slats} slats), ${this.stats.draws} draws, ${tris} tris, atlas ${this.stats.atlas}, ${this.stats.ms} ms (viewer/billboards.js)`);
    if (typeof window !== "undefined") window.__billboards = this;
  },
};
