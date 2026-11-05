// The Material Lab's "city sample": a short Uccle street (four terraced houses, sidewalk + blue-stone kerb, asphalt,
// a setts square, a gravel path and a lawn, bollards and a lamp post, an observatory-style dome and a copper cupola),
// built twice on the same footprints:
//   "library"     every surface from viewer/materials/library.js (windows, sills, plinths, cornices as geometry: what
//                 the façade kit would do), mapping "world" on flat parts as the city's UrbIS meshes need, "uv" on curved
//   "city today"  the city's current shaders on the same shapes: facades.js wallMaterial / roofMaterial (windows
//                 painted in the shader, fed the attributes the tile builder gives them), roadPaint asphaltMaterial /
//                 concreteMaterial / vergeMaterial, cobbles.js cobbleMaterial, the lamp-post material of lamps.js.
import * as THREE from "three/webgpu";
import { GeoBuilder, sill } from "./material-lab-scene.js";
import { wallMaterial, roofMaterial } from "../viewer/facades.js";
import { asphaltMaterial, concreteMaterial, vergeMaterial } from "../viewer/roadPaint.js";
import { cobbleMaterial } from "../viewer/cobbles.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const X = V(1, 0, 0), Y = V(0, 1, 0);

/** today's city -> library mapping (shown in the lab's notes and in docs/MATERIALS.md) */
export const CITY_MAP = [
  { today: "facades.js wallMaterial style 0 (red brick)", lib: "brick_red_brussels", note: "world mapping; aBld.w -> varAttr seed" },
  { today: "wallMaterial style 1 (brown brick)", lib: "brick_dark", note: "" },
  { today: "wallMaterial style 2 (yellow brick)", lib: "brick_yellow", note: "" },
  { today: "wallMaterial style 3 / 4 / 5 (white, cream, grey render)", lib: "render_white / render_painted", note: "painted colour per building from the hash" },
  { today: "wallMaterial plinth band, sills", lib: "stone_blue", note: "as geometry in the kit; as masks in the city shader" },
  { today: "wallMaterial cornice band, landmark ashlar (style 6)", lib: "stone_white", note: "" },
  { today: "wallMaterial frames / door", lib: "wood_frame_white / wood_frame_dark", note: "" },
  { today: "wallMaterial glass + interiorRoom()", lib: "glass_window", note: "the interior mapping stays a façade feature: it feeds the glass colour / glow" },
  { today: "roofMaterial clay / slate", lib: "roof_tiles_red / slate", note: "orthophoto roof colour -> color uniform per building (varAttr)" },
  { today: "roadPaint asphaltMaterial", lib: "asphalt", note: "markings stay in roadPaint, on top of the library surface" },
  { today: "roadPaint concreteMaterial slab / kerb / apron", lib: "paving_concrete / stone_blue / cobbles", note: "uv frame along the kerb kept (mapping uv)" },
  { today: "cobbles.js cobbleMaterial, plazas.js settsLook", lib: "cobbles", note: "same algorithm, now with live uniforms" },
  { today: "cobbles.js pitMaterial (edging)", lib: "stone_blue", note: "" },
  { today: "roadPaint vergeMaterial, ground.js grass", lib: "lawn_edge", note: "" },
  { today: "stjobModel masonry / roof / metal", lib: "brick_red_brussels + stone_white + stone_blue / slate / cast_iron_green", note: "uv mapping (Blender metres)" },
  { today: "lamps.js / lampModel.js / furniture.js iron", lib: "cast_iron_green, painted_metal_white", note: "" },
  { today: "(Royal Observatory, claude/observatory)", lib: "painted_metal_white domes, copper_patina, stone_white, brick_*", note: "maps its slots by these names" },
];

// ------------------------------------------------------------------------------------------------ library street
const HOUSES = [
  { x0: -15, x1: -9, H: 9.8, wall: "brick_red_brussels", roof: "slate", frame: "wood_frame_white", style: 0, rnd: 0.13, roofCol: [0.055, 0.06, 0.07] },
  { x0: -9, x1: -3, H: 9.4, wall: "render_painted", roof: "slate", frame: "wood_frame_white", style: 4, rnd: 0.41, roofCol: [0.06, 0.062, 0.068] },
  { x0: -3, x1: 3, H: 9.8, wall: "brick_yellow", roof: "roof_tiles_red", frame: "wood_frame_dark", style: 2, rnd: 0.67, roofCol: [0.24, 0.075, 0.045] },
  { x0: 3, x1: 9, H: 10.4, wall: "stone_white", roof: "zinc_roof", frame: "wood_frame_white", style: 3, rnd: 0.88, roofCol: [0.12, 0.125, 0.13] },
];
const DEPTH = 8, OW = 1.2, REV = 0.13;

/** façade with a grid of openings (columns at fixed x ranges), reveals, frames, glass, sills, plinth, cornice */
function libHouse(h, i, add) {
  const W = h.x1 - h.x0, cols = [h.x0 + W * 0.28, h.x0 + W * 0.72].map((c) => [c - OW / 2, c + OW / 2]);
  const floors = [[1.0, 2.2], [4.3, 1.9], [7.3, 1.7]];                     // [sill, height] per storey
  const door = { col: i % 2, y: 0.15, h: 2.45 };
  const openings = [];
  cols.forEach(([a, b], ci) => floors.forEach(([sy, oh], fi) => {
    if (fi === 0 && ci === door.col) openings.push({ a, b, y: door.y, h: door.h, door: true });
    else openings.push({ a, b, y: sy, h: oh });
  }));
  const mv = [h.rnd, 0.5, 0.5, 0.5];
  const wb = new GeoBuilder(mv), base = -0.1;
  // vertical strips between the columns, full height
  const xs = [h.x0, ...cols.flat(), h.x1];
  for (let k = 0; k < xs.length - 1; k += 2) wb.rect(V(xs[k], base, 0), X, Y, xs[k + 1] - xs[k], h.H - base, [xs[k], base]);
  // in each column: wall between the openings
  cols.forEach(([a, b]) => {
    const os = openings.filter((o) => o.a === a).sort((p, q) => p.y - q.y);
    let y = base;
    for (const o of os) { wb.rect(V(a, y, 0), X, Y, b - a, o.y - y, [a, y]); y = o.y + o.h; }
    wb.rect(V(a, y, 0), X, Y, b - a, h.H - y, [a, y]);
  });
  // reveals (to the frame plane), the end walls of the street, back, top
  for (const o of openings) {
    const t = o.y + o.h;
    wb.rect(V(o.a, o.y, 0), V(0, 0, -1), Y, REV, o.h, [0, o.y]);
    wb.rect(V(o.b, o.y, -REV), V(0, 0, 1), Y, REV, o.h, [0, o.y]);
    wb.rect(V(o.a, t, -REV), X, V(0, 0, 1), o.b - o.a, REV, [o.a, 0]);
    wb.rect(V(o.a, o.y, 0), X, V(0, 0, -1), o.b - o.a, REV, [o.a, 0]);
  }
  if (i === 0) wb.rect(V(h.x0, base, -DEPTH), V(0, 0, 1), Y, DEPTH, h.H - 0.2 - base, [0, base]);   // up to the gable
  if (i === HOUSES.length - 1) wb.rect(V(h.x1, base, 0), V(0, 0, -1), Y, DEPTH, h.H - 0.2 - base, [0, base]);
  add(wb, h.wall, "world");
  // frames (wood, 6 cm, from the frame plane 7 cm in), glass, an interior back
  const fb = new GeoBuilder(mv), gb = new GeoBuilder(mv);
  for (const o of openings) {
    const z0 = -REV - 0.07, z1 = -REV, f = 0.06, t = o.y + o.h;
    fb.box(o.a, o.y, z0, o.a + f, t, z1, { top: false, skip: ["back", "left"] });
    fb.box(o.b - f, o.y, z0, o.b, t, z1, { top: false, skip: ["back", "right"] });
    fb.box(o.a + f, t - f, z0, o.b - f, t, z1, { top: false, bottom: true, skip: ["back", "left", "right"] });
    if (!o.door) fb.box(o.a + f, o.y, z0, o.b - f, o.y + f, z1, { skip: ["back", "left", "right"] });
    const mid = o.door ? null : o.y + o.h * 0.68;                                   // transom
    if (mid) fb.box(o.a + f, mid - 0.03, z0, o.b - f, mid + 0.03, z1, { bottom: true, skip: ["back", "left", "right"] });
    if (o.door) fb.rect(V(o.a + f, o.y, -REV - 0.035), X, Y, o.b - o.a - 2 * f, o.h - f - 0.6, [o.a, o.y]);   // door leaf
    const gy0 = o.door ? t - f - 0.6 : o.y + f;
    gb.rect(V(o.a + f, gy0, -REV - 0.035), X, Y, o.b - o.a - 2 * f, t - f - gy0, [o.a, gy0]);
    if (!o.door) { const sb = new GeoBuilder(mv); sill(sb, o.a - 0.08, o.b + 0.08, o.y - 0.06, o.y, 0.06); add(sb, "stone_blue", "world"); }
  }
  add(fb, h.frame, "world");
  add(gb, "glass_window", "world");
  // plinth (blue stone, 3 cm proud, cut at the door) and cornice (white stone)
  const pb = new GeoBuilder(mv), dc = cols[door.col];
  const segs = [[h.x0, dc[0]], [dc[1], h.x1]];
  for (const [a, b] of segs) if (b - a > 0.01) pb.box(a, base, 0, b, 0.65, 0.03, { skip: ["back"] });
  pb.box(dc[0], base, 0, dc[1], door.y, 0.25, { skip: ["back"] });                          // door step
  add(pb, "stone_blue", "world");
  const cb = new GeoBuilder(mv); cb.box(h.x0, h.H - 0.5, 0, h.x1, h.H - 0.2, 0.15, { bottom: true, skip: ["back"] });
  add(cb, "stone_white", "world");
  // roof: front slope from the cornice line, 45 degrees
  const rb = new GeoBuilder(mv); rb.roof(h.x0, h.x1, -DEPTH, 0.2, h.H - 0.2, 45, { gables: false });
  if (i === 0 || i === HOUSES.length - 1) {
    const zc = (-DEPTH + 0.2) / 2, rh = (DEPTH + 0.2) / 2, y0 = h.H - 0.2, x = i === 0 ? h.x0 : h.x1;
    if (i === 0) rb.tri(V(x, y0, -DEPTH), V(x, y0, 0.2), V(x, y0 + rh, zc), [-DEPTH, y0], [0.2, y0], [zc, y0 + rh]);
    else rb.tri(V(x, y0, 0.2), V(x, y0, -DEPTH), V(x, y0 + rh, zc), [-0.2, y0], [DEPTH, y0], [-zc, y0 + rh]);
  }
  add(rb, h.roof, "world");
}

function ground(add) {
  // sidewalk top (paving) z 0..1.85, kerb top + face (blue stone), road, square / gravel / lawn
  const s = new GeoBuilder([0.21, 0.5, 0.5, 0.5]);
  s.rect(V(-20, 0.13, 1.85), X, V(0, 0, -1), 42, 1.85, [-20, 0]);
  s.rect(V(-20, 0.01, 0), V(0, 0, 1), Y, 1.85, 0.12, [0, 0.01]); s.rect(V(22, 0.01, 1.85), V(0, 0, -1), Y, 1.85, 0.12, [0, 0.01]);
  add(s, "paving_concrete", "world");
  const k = new GeoBuilder([0.3, 0.5, 0.5, 0.5]);
  k.box(-20, 0.01, 1.85, 22, 0.13, 2.0, { skip: ["back"] });
  add(k, "stone_blue", "world");
  add(new GeoBuilder([0.5, 0.5, 0.5, 0.5]).rect(V(-20, 0.01, 9), X, V(0, 0, -1), 42, 7, [-20, 0]), "asphalt", "world");
  add(new GeoBuilder([0.6, 0.5, 0.5, 0.5]).rect(V(-20, 0.01, 16), X, V(0, 0, -1), 24, 7, [-20, 0]), "cobbles", "world");
  add(new GeoBuilder([0.7, 0.5, 0.5, 0.5]).rect(V(4, 0.01, 16), X, V(0, 0, -1), 8, 7, [4, 0]), "gravel_path", "world");
  add(new GeoBuilder([0.8, 0.5, 0.5, 0.5]).rect(V(12, 0.01, 9), V(0, 0, 1), X, 7, 10, [0, 0]), "lawn_edge", "uv");   // v = m from the gravel
}

function props(add) {
  const iron = new GeoBuilder([0.4, 0.5, 0.5, 0.5]);
  for (let x = -19; x <= 21; x += 2.5) { iron.cylinder(x, 1.72, 0.09, 0.13, 0.95, 20, false); iron.dome(x, 1.72, 0.09, 0.95, 20, 6); }
  iron.cylinder(-6, 1.55, 0.08, 0.13, 5.0, 20, true);
  add(iron, "cast_iron_green", "uv");
  // observatory-style dome on a drum, a copper cupola on a stone kiosk
  const drum = new GeoBuilder([0.52, 0.5, 0.5, 0.5]); drum.cylinder(16, -5, 3, -0.1, 6, 64, false); add(drum, "render_white", "uv");
  const dome = new GeoBuilder([0.52, 0.5, 0.5, 0.5]); dome.dome(16, -5, 3, 6, 64, 20); add(dome, "painted_metal_white", "uv");
  const kiosk = new GeoBuilder([0.61, 0.5, 0.5, 0.5]); kiosk.cylinder(21, -2.5, 1.3, -0.1, 3.2, 48, false); add(kiosk, "stone_white", "uv");
  const cup = new GeoBuilder([0.61, 0.5, 0.5, 0.5]); cup.dome(21, -2.5, 1.3, 3.2, 48, 14); add(cup, "copper_patina", "uv");
}

// ------------------------------------------------------------------------------------------------ "city today"
/** the same street as UrbIS-like solids with today's shaders and the attributes the tile builder computes */
function todayStreet(group) {
  const mats = { wall: wallMaterial(), roof: roofMaterial() };
  for (const h of HOUSES) {
    const P = [], N = [], AW = [], AB = [], AF = [];
    const W = h.x1 - h.x0;
    const face = (o, U, w, nx, nz, street) => {
      const c = [o.clone(), o.clone().addScaledVector(U, w), o.clone().addScaledVector(U, w).add(V(0, h.H + 0.1, 0)), o.clone().add(V(0, h.H + 0.1, 0))];
      for (const k of [0, 1, 2, 0, 2, 3]) {
        const p = c[k], u = p.clone().sub(o).dot(U);
        P.push(p.x, p.y, p.z); N.push(nx, 0, nz);
        AW.push(u, w, p.y + 0.1, h.H + 0.1); AB.push(h.style, 0, street, h.rnd); AF.push(nx, nz, 0, 0);
      }
    };
    face(V(h.x0, -0.1, 0), X, W, 0, 1, 1);
    if (h === HOUSES[0]) face(V(h.x0, -0.1, -DEPTH), V(0, 0, 1), DEPTH, -1, 0, 0);
    if (h === HOUSES[HOUSES.length - 1]) face(V(h.x1, -0.1, 0), V(0, 0, -1), DEPTH, 1, 0, 0);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
    g.setAttribute("aWall", new THREE.Float32BufferAttribute(AW, 4)); g.setAttribute("aBld", new THREE.Float32BufferAttribute(AB, 4)); g.setAttribute("aFN", new THREE.Float32BufferAttribute(AF, 4));
    const m = new THREE.Mesh(g, mats.wall); m.castShadow = m.receiveShadow = true; group.add(m);
    // roof: front slope, aRoof = (u along the eaves, v down the slope, flat, style), aRoofCol = the orthophoto colour
    const rb = new GeoBuilder(); rb.roof(h.x0, h.x1, -DEPTH, 0.0, h.H, 45, { gables: false });
    const rg = rb.geometry(), rp = rg.attributes.position, n = rp.count;
    const ar = new Float32Array(n * 4), ac = new Float32Array(n * 3), ridgeY = h.H + DEPTH / 2;
    for (let k = 0; k < n; k++) { ar.set([rp.getX(k) - h.x0, (ridgeY - rp.getY(k)) * Math.SQRT2, 0, h.style], k * 4); ac.set(h.roofCol, k * 3); }
    rg.setAttribute("aRoof", new THREE.BufferAttribute(ar, 4)); rg.setAttribute("aRoofCol", new THREE.BufferAttribute(ac, 3));
    const rm = new THREE.Mesh(rg, mats.roof); rm.castShadow = rm.receiveShadow = true; group.add(rm);
  }
  // sidewalk + kerb (concreteMaterial aKind 0 / 1), road (asphaltMaterial without an atlas), square (cobbles), lawn
  const flat = (b, attrs, material) => {
    const g = b.geometry();
    for (const [name, size, fn] of attrs) { const n = g.attributes.position.count, a = new Float32Array(n * size); for (let k = 0; k < n; k++) a.set(fn(g, k), k * size); g.setAttribute(name, new THREE.BufferAttribute(a, size)); }
    const m = new THREE.Mesh(g, material); m.receiveShadow = true; group.add(m);
  };
  const sw = new GeoBuilder(); sw.rect(V(-20, 0.13, 1.85), X, V(0, 0, -1), 42, 1.85, [-20, 0]);
  flat(sw, [["aKind", 1, () => [0]]], concreteMaterial());
  const kb = new GeoBuilder(); kb.box(-20, 0.01, 1.85, 22, 0.13, 2.0, { skip: ["back"] });
  flat(kb, [["aKind", 1, () => [1]]], concreteMaterial());
  const rd = new GeoBuilder(); rd.rect(V(-20, 0.01, 9), X, V(0, 0, -1), 42, 7, [-20, 0]);
  flat(rd, [["aLateral", 1, (g, k) => [((g.attributes.position.getZ(k) - 5.5) / 1.75) % 1]], ["aPiece", 2, () => [0.37, 0]],
    ["aEdges", 4, () => [-50, 50, 0, 0]], ["aMark", 4, () => [0, 0, 0, 0]], ["aSurf", 1, () => [0]]], asphaltMaterial(null));
  const sq = new GeoBuilder(); sq.rect(V(-20, 0.01, 16), X, V(0, 0, -1), 32, 7, [-20, 0]);
  flat(sq, [], cobbleMaterial());
  const lw = new GeoBuilder(); lw.rect(V(12, 0.01, 9), V(0, 0, 1), X, 7, 10, [0, 0]);
  flat(lw, [], vergeMaterial());
  // iron (lamps.js postMat), the dome shapes in a plain grey (no city material yet)
  const postMat = new THREE.MeshStandardNodeMaterial({ color: 0x1d2420, roughness: 0.45, metalness: 0.6 });
  const iron = new GeoBuilder(); for (let x = -19; x <= 21; x += 2.5) { iron.cylinder(x, 1.72, 0.09, 0.13, 0.95, 20, true); } iron.cylinder(-6, 1.55, 0.08, 0.13, 5.0, 20, true);
  group.add(new THREE.Mesh(iron.geometry(), postMat));
  const grey = new THREE.MeshStandardNodeMaterial({ color: 0x8a8a86, roughness: 0.8 });
  const d = new GeoBuilder(); d.cylinder(16, -5, 3, -0.1, 6, 64, false); d.dome(16, -5, 3, 6, 64, 20); d.cylinder(21, -2.5, 1.3, -0.1, 3.2, 48, false); d.dome(21, -2.5, 1.3, 3.2, 48, 14);
  const dm = new THREE.Mesh(d.geometry(), grey); dm.castShadow = true; group.add(dm);
}

/** matFn(name, mapping) -> material. Returns { group, show(mode) }. */
export function buildCitySample(matFn) {
  const group = new THREE.Group(), lib = new THREE.Group(), today = new THREE.Group();
  const add = (b, name, mapping) => { const m = new THREE.Mesh(b.geometry(), matFn(name, mapping)); m.castShadow = m.receiveShadow = true; lib.add(m); };
  HOUSES.forEach((h, i) => libHouse(h, i, add));
  ground(add); props(add);
  try { todayStreet(today); } catch (e) { console.warn("[material lab] city-today street failed:", e); }
  group.add(lib, today);
  return { group, show: (mode) => { lib.visible = mode !== "city today"; today.visible = mode === "city today"; } };
}
