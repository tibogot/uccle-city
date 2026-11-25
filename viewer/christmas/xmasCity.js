// THE CHRISTMAS LAYER IN THE CITY (docs/CHRISTMAS.md). Seasonal: on from 1 December to 6 January (the real date, or the
// simulated ?day=), ?xmas=1 forces it on, ?xmas=0 off. Data-driven: models/christmas/site.json
// (tools/christmas/build_site.py) says where everything goes; the kit (xmasKit.js) holds the models and materials.
//   - the two squares' firs (Place de Saint-Job, Parvis Saint-Pierre): set on the drawn ground (world.walkY) once their
//     tile is in; casting shadows; the planter is a drive collider;
//   - the Christmas market's chalets on Place de Saint-Job (?xmaschalets=0: without), instanced, shadows, colliders;
//   - garlands ACROSS the shopping streets: procedural (a catenary wire between the two facades + warm LEDs every 33 cm +
//     a wall plate at each end): ONE merged mesh for all wires, ONE for all bulbs; a hanging star motif at the middle of
//     the spans that do not cross a tram's contact wire;
//   - shopfront garlands (swag modules sized to each front), door wreaths, a snowflake on the street lamps along the
//     decorated streets (the city's own lamp sites, viewer/lamps.js);
//   - every kit piece INSTANCED: one InstancedMesh per piece, level and slot, re-bucketed when the camera has moved 4 m;
//     the levels cross-fade per pixel (xmasKit.js bandMask): shared materials, no pop.
// Lights are emissive only (no new light: the fixed light count). Cost and checks: docs/CHRISTMAS.md.
import * as THREE from "three/webgpu";
import { loadXmasKit, spanMaterial, xmasLook, FIR, XMAS_SHADOW_LAYER, XMAS_FETCH, XMAS_LIGHT } from "./xmasKit.js";
import { lampSiteSets, lampSitesVersion } from "../lamps.js";
import * as lampsMod from "../lamps.js";
import { swagRun } from "./xmasSwag.js";
import { hash01 as slHash01 } from "../streetlife/layout.js";

// ------------------------------------------------------------------------------------------------ the season
// (claude/xmas4) the date switch lives in xmasDate.js (three-free: the facade shader's December windows ask it too)
import { xmasActive } from "./xmasDate.js";
import { XMAS_WIN, xmasWin } from "./xmasWindows.js";
export { xmasActive };

const hash01 = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };

// ------------------------------------------------------------------------------------------------ the instanced field
/** every instance of every piece; per piece and level ONE instance-matrix buffer and ONE band buffer shared by the slots' meshes */
const SHADOW_SLOTS = new Set(["fir_needles", "fir_cards", "fir_bark", "chalet_wood", "chalet_trim", "roof_felt"]);
/** FIR ROUND 3 (docs/CHRISTMAS.md, rule 19): the tree's level whose solid fronds cast the shadow of every level */
export const FIR_SHADOW_LEVEL = 2;
export class XmasField {
  /** prepass: the needle cards as a depth twin + an EQUAL-depth lit pass (xmasKit.js FIR); firShadow: "far" = the tree's
   *  shadow from its FAR level's solid fronds + trunk for all three levels, "cards" = each level its own (before). The
   *  tree's casters are then shadow-only copies on XMAS_SHADOW_LAYER (the sun's shadow camera draws that layer; the view
   *  camera does not): the drawn meshes cast nothing (an EQUAL-depth lit pass must never draw into the sun's map). */
  constructor(kit, { shadows = {}, prepass = FIR.prepass, firShadow = FIR.shadow } = {}) {
    this.prepass = prepass; this.firShadow = firShadow;
    this.kit = kit; this.group = new THREE.Group(); this.group.name = "christmas";
    this.list = {};                    // piece -> [{ m, p, h }]
    this.levels = {};                  // piece -> [{ mat, band, meshes, sphere, n }]
    this.last = new THREE.Vector3(Infinity, 0, 0); this.dirty = true;
    this.stats = { instances: 0, drawn: [0, 0, 0], draws: 0, tris: 0 };
    for (const [name, P] of Object.entries(kit.pieces)) {
      this.list[name] = [];
      // per level TWO sets of meshes: "solid" (no mask: early depth test kept, no discard) for the instances well inside
      // their band, "fade" (the per-pixel dithered band mask) for those near a switch; the fade set shares the
      // geometry's buffers (its own band attribute)
      this.levels[name] = P.lods.map((prims, k) => {
        const cap = name === "tree" ? 8 : name === "chalet" ? 32 : 2048;
        const set = (fade) => {
          const mat = new THREE.InstancedBufferAttribute(new Float32Array(cap * 16), 16);
          const band = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
          const sphere = new THREE.Sphere();
          const meshes = prims.map(({ slot, geometry }) => {
            const g = new THREE.BufferGeometry();
            for (const [an, at] of Object.entries(geometry.attributes)) if (an !== "xlod") g.setAttribute(an, at);
            g.setIndex(geometry.index); g.boundingSphere = geometry.boundingSphere; g.userData.shared = true;
            g.setAttribute("xlod", band);
            const cards = slot === "fir_cards" && prepass;
            const im = new THREE.InstancedMesh(g, kit.slotMaterial(slot, { uvs: !!geometry.attributes.uv, instanced: true, mask: fade, pass: cards ? "colour" : null }), cap);
            im.instanceMatrix = mat;                      // (static usage: uploaded on needsUpdate, the used range only)
            im.count = 0; im.visible = false; im.boundingSphere = sphere; im.frustumCulled = true;
            // (shadows: the big parts only: a bulb, bauble, hook or sign adds a shadow draw for a few texels; the chalets'
            // garland and the fir's planter are inside other shadows; measured 2026-11-17: 27 -> 6 shadow draws)
            im.castShadow = !!shadows[name] && SHADOW_SLOTS.has(slot) && name !== "tree"; im.receiveShadow = true;
            im.name = `xmas ${name} lod${k} ${slot}${fade ? " fade" : ""}${cards ? " lit" : ""}`; im.userData.slot = slot;
            im.userData.matArgs = { uvs: !!geometry.attributes.uv, instanced: true, mask: fade, pass: cards ? "colour" : null };
            this.group.add(im);
            return im;
          });
          // the cards' depth pre-pass twins: the same geometry wrapper and instances, drawn before the opaque city
          for (const im of meshes.filter((x) => x.userData.slot === "fir_cards" && prepass)) {
            const tw = new THREE.InstancedMesh(im.geometry, kit.slotMaterial("fir_cards", { uvs: true, instanced: true, mask: fade, pass: "depth" }), cap);
            tw.instanceMatrix = mat; tw.count = 0; tw.visible = false; tw.boundingSphere = sphere; tw.frustumCulled = true;
            tw.castShadow = tw.receiveShadow = false; tw.renderOrder = -1; tw.userData.depthPrepass = true; tw.userData.slot = "fir_cards";
            tw.name = `xmas ${name} lod${k} fir_cards${fade ? " fade" : ""} depth`; tw.userData.matArgs = { uvs: true, instanced: true, mask: fade, pass: "depth" };
            this.group.add(tw); meshes.push(tw);
          }
          // the tree's shadow: shadow-only copies (this level's instances and band) of the FAR level's solid fronds +
          // trunk ("far") or of this level's own casters ("cards"), on XMAS_SHADOW_LAYER
          if (name === "tree" && shadows[name]) {
            const src = firShadow === "far" ? P.lods[Math.min(FIR_SHADOW_LEVEL, P.lods.length - 1)] : prims;
            for (const { slot, geometry } of src.filter((x) => SHADOW_SLOTS.has(x.slot))) {
              const g = new THREE.BufferGeometry();
              for (const [an, at] of Object.entries(geometry.attributes)) if (an !== "xlod") g.setAttribute(an, at);
              g.setIndex(geometry.index); g.boundingSphere = geometry.boundingSphere; g.userData.shared = true;
              g.setAttribute("xlod", band);
              const sh = new THREE.InstancedMesh(g, kit.slotMaterial(slot, { uvs: !!geometry.attributes.uv, instanced: true, mask: fade }), cap);
              sh.instanceMatrix = mat; sh.count = 0; sh.visible = false; sh.boundingSphere = sphere; sh.frustumCulled = true;
              sh.castShadow = true; sh.receiveShadow = false; sh.layers.set(XMAS_SHADOW_LAYER); sh.userData.slot = slot; sh.userData.shadowOnly = true;
              sh.userData.matArgs = { uvs: !!geometry.attributes.uv, instanced: true, mask: fade };
              sh.name = `xmas ${name} lod${k} ${slot}${fade ? " fade" : ""} shadow (${firShadow === "far" ? `lod${FIR_SHADOW_LEVEL}` : "own"})`;
              this.group.add(sh); meshes.push(sh);
            }
          }
          return { cap, mat, band, meshes, sphere, n: 0, box: null };
        };
        return { solid: set(false), fade: set(true) };
      });
    }
  }
  set(piece, items) { this.list[piece] = items; this.dirty = true; }
  /** v: the instance's variant (xlod.w: the chalets' wood tone) */
  add(piece, m, id, v = 0) { this.list[piece].push({ m: m.clone(), p: new THREE.Vector3().setFromMatrixPosition(m), h: hash01(id), v }); this.dirty = true; }
  update(eye) {
    if (!this.dirty && eye.distanceToSquared(this.last) < 16) return;
    this.dirty = false; this.last.copy(eye);
    const st = this.stats; st.instances = 0; st.drawn = [0, 0, 0]; st.draws = 0; st.tris = 0;
    for (const [name, list] of Object.entries(this.list)) {
      const R = this.kit.pieces[name].range, L = this.levels[name];
      const sets = L.flatMap((lv) => [lv.solid, lv.fade]);
      for (const S of sets) { S.n = 0; S.box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; }
      st.instances += list.length;
      for (const it of list) {
        const d = eye.distanceTo(it.p);
        for (let k = 0; k < L.length; k++) {
          const lo = k ? R[k - 1] : 0, hi = R[k];
          // (5 m of slack: the camera moves up to 4 m between re-buckets; the shader's band decides the pixels)
          if (d >= hi + 5 || (k && d < lo * 0.88 - 5)) continue;
          const solid = d < hi * 0.88 - 5 && (!k || d >= lo + 5);
          const S = solid ? L[k].solid : L[k].fade; if (S.n >= S.cap) continue;
          it.m.toArray(S.mat.array, S.n * 16);
          S.band.array.set([lo, hi, it.h, it.v ?? 0], S.n * 4);
          const b = S.box; b[0] = Math.min(b[0], it.p.x); b[1] = Math.min(b[1], it.p.y); b[2] = Math.min(b[2], it.p.z); b[3] = Math.max(b[3], it.p.x); b[4] = Math.max(b[4], it.p.y); b[5] = Math.max(b[5], it.p.z);
          S.n++; st.drawn[k]++;
        }
      }
      for (const S of sets) {
        const b = S.box, rad = name === "tree" ? 8 : name === "chalet" ? 4 : 2;
        if (S.n) {
          S.sphere.center.set((b[0] + b[3]) / 2, (b[1] + b[4]) / 2 + (name === "tree" ? 5 : 0), (b[2] + b[5]) / 2);
          S.sphere.radius = Math.hypot(b[3] - b[0], b[4] - b[1], b[5] - b[2]) / 2 + rad;
          S.mat.clearUpdateRanges(); S.mat.addUpdateRange(0, S.n * 16); S.mat.needsUpdate = true;
          S.band.clearUpdateRanges(); S.band.addUpdateRange(0, S.n * 4); S.band.needsUpdate = true;
        }
        for (const im of S.meshes) {
          im.count = S.n; im.visible = S.n > 0;          // (an empty instanced mesh still costs a draw per pass)
          if (S.n) { st.draws++; st.tris += S.n * im.geometry.index.count / 3; }
        }
      }
    }
  }
}

// ------------------------------------------------------------------------------------------------ the garlands across the streets
const SPAN_STEP = 0.33;
/** one merged mesh for every wire (+ the wall plates), one for every bulb */
export function buildSpans(spans) {
  const wire = { P: [], N: [], C: [], I: [] }, bulbs = { P: [], N: [], C: [], I: [] };
  const v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), mid = [];
  const quad = (G, p0, p1, p2, p3, n, col) => {
    const o = G.P.length / 3;
    for (const p of [p0, p1, p2, p3]) { G.P.push(p.x, p.y, p.z); G.N.push(n.x, n.y, n.z); G.C.push(...col); }
    G.I.push(o, o + 1, o + 2, o, o + 2, o + 3);
  };
  const at = (t, s, out) => out.copy(a).lerp(b, t).setY(a.y + (b.y - a.y) * t - s.sag * 4 * t * (1 - t));
  for (const s of spans) {
    a.fromArray(s.a); b.fromArray(s.b);
    const span = Math.hypot(b.x - a.x, b.z - a.z);
    const dir = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize(), side = new THREE.Vector3(-dir.z, 0, dir.x);
    // the wire: a 4-sided tube (6 mm) over 28 segments
    const n = 28, r = 0.006, ring = [];
    for (let i = 0; i <= n; i++) {
      const p = at(i / n, s, new THREE.Vector3());
      ring.push([0, 1, 2, 3].map((k) => { const ang = (k / 4) * Math.PI * 2 + Math.PI / 4; return p.clone().addScaledVector(side, Math.cos(ang) * r).add(new THREE.Vector3(0, Math.sin(ang) * r, 0)); }));
    }
    for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) {
      const k1 = (k + 1) % 4, ang = ((k + 0.5) / 4) * Math.PI * 2 + Math.PI / 4;
      const nn = side.clone().multiplyScalar(Math.cos(ang)).add(new THREE.Vector3(0, Math.sin(ang), 0));
      quad(wire, ring[i][k], ring[i + 1][k], ring[i + 1][k1], ring[i][k1], nn, [0.5, 0, 1, 1]);
    }
    // wall plates (12 x 12 x 3 cm) where the wire meets each facade (JOINS: on the wall, not floating)
    for (const [p, out] of [[a, dir], [b, dir.clone().negate()]]) {
      const u = new THREE.Vector3(-out.z, 0, out.x), up = new THREE.Vector3(0, 1, 0), h = 0.06, t = 0.03;
      const c = (su, sv, sw) => p.clone().addScaledVector(u, su * h).addScaledVector(up, sv * h).addScaledVector(out, sw);
      quad(wire, c(-1, -1, t), c(1, -1, t), c(1, 1, t), c(-1, 1, t), out, [0.5, 0, 1, 1]);
      quad(wire, c(-1, 1, 0), c(1, 1, 0), c(1, 1, t), c(-1, 1, t), up, [0.5, 0, 1, 1]);
      quad(wire, c(-1, -1, t), c(1, -1, t), c(1, -1, 0), c(-1, -1, 0), up.clone().negate(), [0.5, 0, 1, 1]);
      quad(wire, c(-1, -1, 0), c(-1, -1, t), c(-1, 1, t), c(-1, 1, 0), u.clone().negate(), [0.5, 0, 1, 1]);
      quad(wire, c(1, 1, 0), c(1, 1, t), c(1, -1, t), c(1, -1, 0), u, [0.5, 0, 1, 1]);
    }
    // the bulbs: a small octahedron (2.6 cm) every 33 cm, hanging 4 cm under the wire; ~14 % flash bulbs
    const count = Math.max(2, Math.floor(span / SPAN_STEP));
    for (let i = 1; i < count; i++) {
      const p = at(i / count, s, v).clone(); p.y -= 0.04;
      const h = hash01(`${s.a}|${i}`), col = [h, hash01(`${s.b}|${i}`) < 0.14 ? 1 : 0, 1, 1], R = 0.026;
      const o = bulbs.P.length / 3;
      const V = [[1, 0, 0], [-1, 0, 0], [0, 1.3, 0], [0, -1.3, 0], [0, 0, 1], [0, 0, -1]];
      for (const [x, y, z] of V) { bulbs.P.push(p.x + x * R, p.y + y * R, p.z + z * R); const l = Math.hypot(x, y, z); bulbs.N.push(x / l, y / l, z / l); bulbs.C.push(...col); }
      for (const [i0, i1, i2] of [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]]) bulbs.I.push(o + i0, o + i1, o + i2);
    }
    if (s.motif) mid.push({ p: at(0.5, s, new THREE.Vector3()), dir, id: `${s.a}` });
  }
  const geo = (G) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(G.P, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(G.N, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(G.C, 4));
    g.setIndex(G.P.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(G.I, 1) : new THREE.Uint16BufferAttribute(G.I, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  };
  return { wire: geo(wire), bulbs: geo(bulbs), mid, counts: { spans: spans.length, bulbs: bulbs.P.length / 18 } };
}

// ------------------------------------------------------------------------------------------------ the garlands on poles (Saint-Job)
/** (claude/xmas4, plan job 5, rule xmas-pole-garlands) a Christmas pole the garland hangs from where neither a wall nor a
 *  drawn lamp / tram pole holds it (models/christmas/poles.json, tools/christmas/xmasPoles.mjs): a slim painted-steel
 *  tube (7.5 cm at the foot, 6 cm at the top) on a 0.35 m base collar, a clamp ring at the hook, a small cap. ONE merged
 *  static mesh for all of them (as the street garlands' wires). p: { x, y (the foot, on the drawn ground), z, h (the hook
 *  over the foot) } */
export const POLE_TOP = 0.25;
export function buildPoleGeometry(poles) {
  const parts = [];
  for (const p of poles) {
    const H = p.h + POLE_TOP;
    const add = (g, y) => { g.deleteAttribute("uv"); g.translate(p.x, p.y + y, p.z); parts.push(g); };
    add(new THREE.CylinderGeometry(0.11, 0.125, 0.35, 12), 0.175);                // the base collar (sunk 1 cm: joins rule)
    add(new THREE.CylinderGeometry(0.06, 0.075, H - 0.3, 12, 1, true), 0.3 + (H - 0.3) / 2);
    add(new THREE.CylinderGeometry(0.085, 0.085, 0.06, 12), p.h);                  // the clamp ring at the hook
    add(new THREE.CylinderGeometry(0.02, 0.07, 0.12, 12), H + 0.06);               // the cap
  }
  if (!parts.length) return null;
  const merged = new THREE.BufferGeometry();
  let nv = 0, ni = 0;
  for (const g of parts) { nv += g.attributes.position.count; ni += g.index.count; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), C = new Float32Array(nv * 4), I = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of parts) {
    P.set(g.attributes.position.array, ov * 3); N.set(g.attributes.normal.array, ov * 3);
    for (let k = 0; k < g.attributes.position.count; k++) C.set([0.5, 0, 1, 1], (ov + k) * 4);
    for (let k = 0; k < g.index.count; k++) I[oi + k] = g.index.array[k] + ov;
    ov += g.attributes.position.count; oi += g.index.count; g.dispose();
  }
  merged.setAttribute("position", new THREE.BufferAttribute(P, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(N, 3));
  merged.setAttribute("color", new THREE.BufferAttribute(C, 4));
  merged.setIndex(new THREE.BufferAttribute(I, 1));
  merged.computeBoundingSphere(); merged.computeBoundingBox();
  return merged;
}
/** the hook on a pole's surface toward the other end (the wire meets the tube, not its axis): r = 0.08 m */
export function hookPoint(h, y, other) {
  const dx = other.x - h.x, dz = other.z - h.z, L = Math.hypot(dx, dz) || 1;
  return [h.x + (dx / L) * 0.08, y, h.z + (dz / L) * 0.08];
}
/** a stand-in geometry (one degenerate triangle, the spans' attributes): the pole meshes exist and compile with the
 *  layer's warm-up before their tiles are in */
function emptySpanGeometry() {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([0, -1e4, 0, 0, -1e4, 0, 0, -1e4, 0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute([0.5, 0, 1, 1, 0.5, 0, 1, 1, 0.5, 0, 1, 1], 4));
  g.setIndex(new THREE.Uint16BufferAttribute([0, 1, 2], 1));
  g.computeBoundingSphere();
  return g;
}
/** (claude/xmasreview, rule joins) the fir's foot: the LOWEST drawn ground under its planter (the octagon's corners and
 *  edge midpoints at 1.4 m x scale, and the centre), so the planter's skirt meets the paving all round. The centre alone
 *  left the Place de Saint-Job planter 1.7 cm in the air on its downhill side (browser review 2026-11-26) */
export const PLANTER_R = 1.4;
export function treeFootY(t, walkY) {
  let y = walkY(t.x, t.z);
  for (let k = 0; k < 16; k++) { const a = (k * Math.PI) / 8, r = PLANTER_R * t.scale; y = Math.min(y, walkY(t.x + Math.cos(a) * r, t.z + Math.sin(a) * r)); }
  return y;
}
export const HOOK_TOL = 0.25;      // m: a listed lamp / tram-pole hook vs the pole the city draws (tools/christmas/xmasPoles.mjs)

// ------------------------------------------------------------------------------------------------ the city layer
export async function addChristmas({ scene, updaters, world, manifest, log, compiler, renderer = null, params = new URLSearchParams(location.search) }) {
  if (!xmasActive(params)) return null;
  const t0 = performance.now();
  const site = await fetch(new URL("../../models/christmas/site.json", import.meta.url), XMAS_FETCH).then((r) => r.json()).catch(() => null);
  if (!site) { log("christmas: models/christmas/site.json missing, no decorations"); return null; }
  const kit = await loadXmasKit(renderer).catch((e) => { log(`christmas: the kit failed to load (${e.message})`); return null; });
  if (!kit) return null;
  const tLoad = performance.now() - t0;
  const field = new XmasField(kit, { shadows: { tree: true, chalet: true } });
  scene.add(field.group);
  // the tree's shadow-only casters (XMAS_SHADOW_LAYER): the sun's shadow camera draws that layer too (re-asserted below:
  // the interior portal sets the camera's layers back to 0 on the way out; while it is sealed (layer 0 off) left alone)
  const suns = [];
  scene.traverse((o) => { if (o.isDirectionalLight && o.castShadow) suns.push(o); });
  const sunLayer = () => { for (const L of suns) if (L.shadow.camera.layers.isEnabled(0) && !L.shadow.camera.layers.isEnabled(XMAS_SHADOW_LAYER)) L.shadow.camera.layers.enable(XMAS_SHADOW_LAYER); };
  sunLayer();
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), S = new THREE.Vector3();
  const place = (x, y, z, yaw, sx = 1, sy = 1, sz = 1) => M.compose(new THREE.Vector3(x, y, z), Q.setFromAxisAngle(Y, yaw), S.set(sx, sy, sz));

  // ---- per-street switches (site.json config: tune there, no code); a street absent there = everything on
  const on = (street, what) => site.config?.streets?.[street]?.[what] ?? true;
  // ---- shopfront swags: on each front's own top (viewer/shops/shopLayout.js frontFamily, the rule the shop kit draws
  // with): a classic front's cornice (corona 0.365 m out, its top 0.94 m over the fascia's bottom): the garland hangs
  // from the corona's edge; a modern front's fascia box (0.27 m out, 0.65 m high): from the box's face under its top.
  // Modules of 1.6 m (scaled 0.6-1.45 to the front), 0.7 high (a shallower sag over the name board). Door wreaths.
  const curated = await fetch(new URL("../../data/shops/terraces.json", import.meta.url), XMAS_FETCH).then((r) => (r.ok ? r.json() : {})).then((j) => j.terraces || {}).catch(() => ({}));
  let nSwag = 0;
  for (const f of site.fronts ?? []) {
    if (!on(f.street, "swags")) continue;
    // (claude/xmas1) the width and centre of the DRAWN front (xmasSwag.js swagRun: shopLayout.js frontFace / frontWidth,
    // the curated front.w / front.du; a curated canopy: along its band), never site.json's own slot width
    const run = swagRun(f, curated[f.id], slHash01);
    for (const [k, m] of run.modules.entries()) {
      field.add("swag", place(m.x, m.y, m.z, run.yaw, run.sx, 0.7, 1), `swag ${f.id} ${k}`);
      nSwag++;
    }
  }
  for (const w of site.wreaths) if (on(w.street, "wreaths")) field.add("wreath", place(w.x, w.y, w.z, Math.atan2(w.nx, w.nz)), `wreath ${w.x},${w.z}`);

  // ---- the garlands across the streets (+ their star motifs: local X along the span, hook on the wire)
  const spans = buildSpans(site.spans.filter((s) => on(s.street, "spans")));
  const wireMesh = new THREE.Mesh(spans.wire, spanMaterial("wire_dark", kit));
  const bulbMesh = new THREE.Mesh(spans.bulbs, spanMaterial("bulb_warm", kit));
  for (const m of [wireMesh, bulbMesh]) { m.castShadow = false; m.receiveShadow = false; m.name = `xmas spans ${m === wireMesh ? "wires" : "bulbs"}`; field.group.add(m); }
  for (const s of spans.mid) field.add("spanmotif", place(s.p.x, s.p.y, s.p.z, Math.atan2(-s.dir.z, s.dir.x), 0.75, 0.75, 0.75), s.id);

  // ---- the square trees: on the drawn ground once their tile is in
  const tileOf = (x, z) => manifest.tiles.find((t) => x >= t.bounds.x[0] && x < t.bounds.x[1] && z >= t.bounds.z[0] && z < t.bounds.z[1])?.name;

  // ---- (claude/xmas4) the garlands on poles at Saint-Job (models/christmas/poles.json; ?xmaspoles=0 / config.poles =
  // false: without): shown once BOTH hooks are drawn: a Christmas pole on the drawn ground (world.walkY), a lamp / tram
  // pole only where the city draws it (lampSiteSets / the "tram-poles" instances, within HOOK_TOL; a pole the city moved
  // or dropped: its garland is dropped, never hung in the air). The wires, LEDs and poles are three merged static meshes
  // (rebuilt when a set of garlands comes in: a few times per visit), the stars instanced with the street garlands'.
  const polesDoc = params.get("xmaspoles") === "0" || site.config?.poles === false ? null
    : await fetch(new URL("../../models/christmas/poles.json", import.meta.url), XMAS_FETCH).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const pg = (polesDoc?.spans ?? []).filter((s) => on(s.street, "spans")).map((s) => ({ ...s, state: "wait", seen: 0, tiles: [tileOf(s.a.x, s.a.z), tileOf(s.b.x, s.b.z)] }));
  const pgWire = new THREE.Mesh(emptySpanGeometry(), spanMaterial("wire_dark", kit));
  const pgBulb = new THREE.Mesh(emptySpanGeometry(), spanMaterial("bulb_warm", kit));
  const pgPole = new THREE.Mesh(emptySpanGeometry(), spanMaterial("pole_steel", kit));
  for (const [m, nm] of [[pgWire, "wires"], [pgBulb, "bulbs"], [pgPole, "poles"]]) { m.castShadow = false; m.receiveShadow = true; m.name = `xmas pole garlands ${nm}`; m.userData.poleGarland = true; field.group.add(m); }
  const pgStats = { listed: pg.length, shown: 0, dropped: [], poles: 0, rebuilds: 0 };
  const drawnTramPoles = () => {
    const out = [], Mi = new THREE.Matrix4(), v = new THREE.Vector3();
    scene.traverse((o) => { if (o.isInstancedMesh && o.name === "tram-poles") for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, Mi); out.push(v.setFromMatrixPosition(Mi).applyMatrix4(o.matrixWorld).clone()); } });
    return out;
  };
  const rebuildPoles = () => {
    const ok = pg.filter((s) => s.state === "ok");
    const sp = buildSpans(ok.map((s) => ({ a: hookPoint(s.a, s.ya, s.b), b: hookPoint(s.b, s.yb, s.a), sag: s.sag, motif: false })));
    for (const [m, g] of [[pgWire, sp.wire], [pgBulb, sp.bulbs]]) { m.geometry.dispose(); m.geometry = g; }
    const poles = ok.flatMap((s) => [[s.a, s.footA], [s.b, s.footB]]).filter(([h]) => h.kind === "pole").map(([h, y]) => ({ x: h.x, y: y - 0.01, z: h.z, h: h.h }));
    const pgeo = buildPoleGeometry(poles);
    if (pgeo) { pgPole.geometry.dispose(); pgPole.geometry = pgeo; }
    pgWire.visible = pgBulb.visible = ok.length > 0; pgPole.visible = !!pgeo;
    pgStats.shown = ok.length; pgStats.poles = poles.length; pgStats.rebuilds++;
  };
  const resolvePoles = () => {
    if (!pg.some((s) => s.state === "wait")) return;
    let lamps = null, trams = null, changed = false;
    for (const s of pg) {
      if (s.state !== "wait" || !s.tiles.every((T) => world.tiles.some((W) => W.name === T))) continue;
      s.seen++;
      const foot = [s.a, s.b].map((h) => {
        if (h.kind === "pole") return world.walkY(h.x, h.z);
        if (h.kind === "lamp") {
          lamps ??= [...lampSiteSets()].flat();
          const q = lamps.find((p) => p.y != null && Math.hypot(p.x - h.x, p.z - h.z) < HOOK_TOL);
          return q ? q.y : null;
        }
        trams ??= drawnTramPoles();
        const q = trams.find((p) => Math.hypot(p.x - h.x, p.z - h.z) < HOOK_TOL);
        return q ? q.y : null;
      });
      if (foot.every((y) => y != null && Number.isFinite(y))) {
        s.state = "ok"; s.footA = foot[0]; s.footB = foot[1]; s.ya = foot[0] + s.a.h; s.yb = foot[1] + s.b.h; changed = true;
        if (s.motif) {
          const mid = [(s.a.x + s.b.x) / 2, (s.ya + s.yb) / 2 - s.sag, (s.a.z + s.b.z) / 2], dx = s.b.x - s.a.x, dz = s.b.z - s.a.z;
          field.add("spanmotif", place(mid[0], mid[1], mid[2], Math.atan2(-dz, dx), 0.75, 0.75, 0.75), `pole ${s.id}`);
        }
        // a Christmas pole blocks the car as a lamp does (drive colliders: an octagon of 0.1 m)
        for (const h of [s.a, s.b].filter((q) => q.kind === "pole")) {
          const ring = Array.from({ length: 8 }, (_, k) => [h.x + Math.cos((k * Math.PI) / 4) * 0.1, h.z + Math.sin((k * Math.PI) / 4) * 0.1]);
          const cols = [{ rings: [ring] }];
          if (window.__driver) window.__driver.addStatic(cols); else (window.__pendingStatics ??= []).push(cols);
        }
      } else if (s.seen > 20) {                 // (~10 s after both tiles are in: the lamps are placed with their tile)
        s.state = "dropped"; pgStats.dropped.push(`${s.id} ${foot[0] == null ? s.a.kind : s.b.kind}`);
        log(`christmas: pole garland ${s.id} dropped: its ${foot[0] == null ? s.a.kind : s.b.kind} is not drawn within ${HOOK_TOL} m of the listed hook`);
      }
    }
    if (changed) rebuildPoles();
  };
  const trees = site.trees.map((t) => ({ ...t, tile: tileOf(t.x, t.z), placed: false }));
  // ---- the Christmas market on Place de Saint-Job (?xmaschalets=0 / config.chalets = false: without): each chalet on the
  // drawn ground at its centre once the tile is in, its wood tone per instance, a drive collider (3.1 x 2.1 m)
  const chalets = (params.get("xmaschalets") === "0" || site.config?.chalets === false || !kit.pieces.chalet ? [] : site.chalets ?? []).map((c) => ({ ...c, tile: tileOf(c.x, c.z), placed: false }));
  const placeChalets = () => {
    let changed = false;
    for (const c of chalets) {
      if (c.placed || !world.tiles.some((T) => T.name === c.tile)) continue;
      // the lowest of the footprint's corners: the deck's skirt reaches the ground everywhere (JOINS: sunk, never floating)
      const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), ux = fz, uz = -fx;
      const corner = (a, b) => [c.x + ux * a * 1.56 + fx * b * 1.06, c.z + uz * a * 1.56 + fz * b * 1.06];
      const ring = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
      c.y = Math.min(...ring.map(([x, z]) => world.walkY(x, z))) - 0.01; c.placed = true; changed = true;
      field.add("chalet", place(c.x, c.y, c.z, c.yaw), `chalet ${c.x},${c.z}`, c.tone);
      const cols = [{ rings: [ring] }];
      if (window.__driver) window.__driver.addStatic(cols); else (window.__pendingStatics ??= []).push(cols);
    }
    return changed;
  };
  const placeTrees = () => {
    let changed = placeChalets();
    for (const t of trees) {
      if (t.placed || !world.tiles.some((T) => T.name === t.tile)) continue;
      t.y = treeFootY(t, world.walkY) - 0.02; t.placed = true; changed = true;
      field.add("tree", place(t.x, t.y, t.z, t.yaw, t.scale, t.scale, t.scale), `tree ${t.id}`);
      // the octagonal planter (1.38 m) blocks the car (drive colliders, viewer/drive/driveMode.js addStatic)
      const ring = Array.from({ length: 8 }, (_, k) => { const a = Math.PI / 8 + (k * Math.PI) / 4, r = 1.4 * t.scale; return [t.x + Math.cos(a) * r, t.z + Math.sin(a) * r]; });
      const cols = [{ rings: [ring] }];
      if (window.__driver) window.__driver.addStatic(cols); else (window.__pendingStatics ??= []).push(cols);
    }
    return changed;
  };

  // ---- the lamp-post snowflakes: the lamps within 9 m of a decorated street, two in three
  const segs = [];
  for (const st of site.streets) if (on(st.name, "lamps")) for (let i = 1; i < st.pts.length; i++) segs.push([...st.pts[i - 1], ...st.pts[i]]);
  const segBox = segs.reduce((b, [x0, z0, x1, z1]) => [Math.min(b[0], x0, x1), Math.min(b[1], z0, z1), Math.max(b[2], x0, x1), Math.max(b[3], z0, z1)], [Infinity, Infinity, -Infinity, -Infinity]);
  const nearStreet = (x, z) => {
    if (x < segBox[0] - 10 || x > segBox[2] + 10 || z < segBox[1] - 10 || z > segBox[3] + 10) return false;
    for (const [x0, z0, x1, z1] of segs) {
      const dx = x1 - x0, dz = z1 - z0, L = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / L));
      if (Math.hypot(x0 + t * dx - x, z0 + t * dz - z) < 9) return true;
    }
    return false;
  };
  let lampVer = -1;
  const decorateLamps = () => {
    if (lampsMod.lampSitesVersion === lampVer) return;
    lampVer = lampsMod.lampSitesVersion;
    const items = [];
    for (const sites of lampSiteSets()) for (const s of sites) {
      if (s.y == null || !nearStreet(s.x, s.z)) continue;
      const id = `lamp ${s.x.toFixed(1)},${s.z.toFixed(1)}`;
      if (hash01(id) > 0.67) continue;
      const m = place(s.x, s.y + 3.9, s.z, s.yaw).clone();
      items.push({ m, p: new THREE.Vector3().setFromMatrixPosition(m), h: hash01(id + "h") });
    }
    field.set("lampmotif", items);
  };
  void lampSitesVersion;

  // ---- shaders before anything shows (every piece, level and slot once), then the per-frame update
  const tc = performance.now();
  const allMeshes = Object.values(field.levels).flatMap((L) => L.flatMap((lv) => [...lv.solid.meshes, ...lv.fade.meshes]));
  for (const im of allMeshes) { im.count = 1; im.visible = true; im.frustumCulled = false; }
  try { let c = compiler?.(); for (let i = 0; !c && i < 40; i++) { await new Promise((r) => setTimeout(r, 250)); c = compiler?.(); } if (c) await c([field.group]); } catch (e) { log(`christmas: shader warm-up skipped (${e.message})`); }
  for (const im of allMeshes) { im.count = 0; im.visible = false; im.frustumCulled = true; }
  for (const m of [pgWire, pgBulb, pgPole]) m.visible = false;      // (compiled above; shown when their garlands come in)
  const tComp = performance.now() - tc;
  // (claude/xmas4) the December windows (xmasWindows.js; compiled into the facade shader at boot with the layer on)
  xmasWin.value = XMAS_WIN.on ? 1 : 0;

  let frame = 0;
  updaters.push((eye) => {
    if (frame++ % 30 === 0) { if (placeTrees()) field.dirty = true; decorateLamps(); sunLayer(); resolvePoles(); }
    field.update(eye);
  });
  log(`christmas: ${trees.length} trees, ${site.spans.length} street garlands (${spans.counts.bulbs} LEDs, ${spans.mid.length} stars), ${chalets.length} market chalets, ${nSwag} shopfront swags, ${site.wreaths.length} wreaths, lamp snowflakes along ${site.streets.length} street lines, ${pg.length} pole garlands listed (Saint-Job), December windows ${XMAS_WIN.on ? "on" : "off"}; loaded ${tLoad.toFixed(0)} ms, shaders ${tComp.toFixed(0)} ms (?xmas=0: without)`);
  /** (claude/xmas3, debug/xmasPerf.js) the live A/B of the light path (xmasKit.js XMAS_LIGHT): every mesh of the layer
   *  takes its slot's material built for `light` ({ cards }; null = the URL's); both sets compile once, then swap */
  const setLight = (light = null) => {
    const L = light ?? XMAS_LIGHT;
    field.group.traverse((o) => { const a = o.userData.matArgs; if (a && o.userData.slot) o.material = kit.slotMaterial(o.userData.slot, { ...a, light: L }); });
    wireMesh.material = spanMaterial("wire_dark", kit, 650, L); bulbMesh.material = spanMaterial("bulb_warm", kit, 650, L);
  };
  // (claude/xmas4) the extras, each switchable live for debug/xmasPerf.js (on = true: as the layer draws it)
  const pgMeshes = [pgWire, pgBulb, pgPole], pgMask = pgMeshes.map((m) => m.layers.mask);
  const extras = {
    poles: (onOff) => pgMeshes.forEach((m, i) => { m.layers.mask = onOff ? pgMask[i] : 0; }),
    windows: (onOff) => { xmasWin.value = onOff && XMAS_WIN.on ? 1 : 0; },
  };
  if (!pg.length) delete extras.poles;
  if (!XMAS_WIN.on) delete extras.windows;
  const api = { extras, poles: { list: pg, stats: pgStats, meshes: pgMeshes, doc: polesDoc }, windows: XMAS_WIN, setLight, light: XMAS_LIGHT, fir: { ...FIR, shadowLevel: FIR_SHADOW_LEVEL, suns: suns.length }, site, kit, field, spans, trees, chalets, look: xmasLook, group: field.group, tLoad, tComp, stats: () => field.stats };
  window.xmas = api;
  return api;
}
