// node --import ./tools/christmas/hook.mjs tools/christmas/xmasTest.mjs
// The Christmas layer's offline checks (no browser): the date switch, the kit (GLB pieces, levels, slots, attributes),
// every slot material builds (TSL graphs), the procedural street garlands, the instanced field's level buckets, and the
// placement data (models/christmas/site.json). Prints PASS / FAIL lines; exit 1 on a FAIL.
globalThis.location ??= { search: "?xmas=1", href: "http://localhost/viewer/index.html?xmas=1" };
import fs from "node:fs";
let fails = 0;
const ok = (c, msg) => { console.log(`${c ? "PASS" : "FAIL"} ${msg}`); if (!c) fails++; };

const { xmasActive, buildSpans, XmasField } = await import("../../viewer/christmas/xmasCity.js");
const THREE_ = await import("three/webgpu");
const P = (s) => new URLSearchParams(s);
ok(xmasActive(P(""), new Date(2026, 11, 1, 12)) === true, "1 Dec: on");
ok(xmasActive(P(""), new Date(2026, 10, 30, 12)) === false, "30 Nov: off");
ok(xmasActive(P(""), new Date(2027, 0, 6, 12)) === true, "6 Jan: on");
ok(xmasActive(P(""), new Date(2027, 0, 7, 12)) === false, "7 Jan: off");
ok(xmasActive(P("xmas=1"), new Date(2026, 6, 1)) === true && xmasActive(P("xmas=0"), new Date(2026, 11, 24)) === false, "?xmas=1 / ?xmas=0 force");
ok(xmasActive(P("day=350"), new Date(2026, 6, 1)) === true && xmasActive(P("day=200"), new Date(2026, 11, 24)) === false, "?day= decides when given");
// (claude/xmasreview) the season follows BRUSSELS' calendar, whatever the visitor's time zone (instants in UTC)
{
  const U = (y, mo, d, h, mi = 0) => new Date(Date.UTC(y, mo, d, h, mi));
  ok(xmasActive(P(""), U(2026, 10, 30, 23, 30)) === true, "30 Nov 23:30 UTC = 1 Dec 00:30 in Brussels: on");
  ok(xmasActive(P(""), U(2026, 10, 30, 22, 30)) === false, "30 Nov 22:30 UTC = 23:30 in Brussels: still off");
  ok(xmasActive(P(""), U(2027, 0, 6, 22, 30)) === true && xmasActive(P(""), U(2027, 0, 6, 23, 30)) === false, "6 Jan 23:30 Brussels on, 7 Jan 00:30 Brussels off");
  ok(xmasActive(P("xmas=0"), U(2026, 11, 24, 12)) === false && xmasActive(P("xmas=1"), U(2026, 6, 1, 12)) === true, "?xmas=0 / ?xmas=1 still force it under the Brussels date");
  const { brusselsDate } = await import("../../viewer/christmas/xmasDate.js");
  const b = brusselsDate(U(2026, 11, 31, 23, 30));
  ok(b.month === 0 && b.day === 1, `brusselsDate: 31 Dec 23:30 UTC is 1 Jan in Brussels (${b.month + 1}/${b.day})`);
}
// (claude/xmasreview, rule joins) the fir's foot is the lowest ground under its planter, not the centre's
{
  const { treeFootY, PLANTER_R } = await import("../../viewer/christmas/xmasCity.js");
  const slope = (x, z) => 70 + 0.012 * x + 0.004 * z;              // a 1.3 % slope, as Place de Saint-Job's paving
  const t = { x: 0, z: 0, scale: 1 }, y = treeFootY(t, slope);
  let lo = Infinity; for (let k = 0; k < 64; k++) { const a = (k * Math.PI) / 32; lo = Math.min(lo, slope(Math.cos(a) * PLANTER_R, Math.sin(a) * PLANTER_R)); }
  ok(y <= lo + 0.002 && y < slope(0, 0), `fir foot: the planter's lowest rim point on a slope (${y.toFixed(3)} vs rim min ${lo.toFixed(3)}, centre ${slope(0, 0).toFixed(3)})`);
  ok(/t\.y = treeFootY\(t, \(x, z\) => world\.walkY\(x, z\)\) - 0\.02/.test(fs.readFileSync(new URL("../../viewer/christmas/xmasCity.js", import.meta.url), "utf8")), "the city sets each fir on treeFootY (the planter's lowest ground)");
}

// ---- the kit
const { loadXmasKit } = await import("../../viewer/christmas/xmasKit.js");
const kit = await loadXmasKit();
const want = ["tree", "wreath", "swag", "lampmotif", "spanmotif", "chalet"].filter((p) => kit.pieces[p]);
ok(want.length >= 5 && want.every((p) => kit.pieces[p]?.lods.length === 3), `${want.length} pieces x 3 levels (${Object.keys(kit.pieces).join(", ")})`);
for (const p of want) {
  const P_ = kit.pieces[p];
  const colour = P_.lods.every((l) => l.every((x) => x.geometry.attributes.color?.itemSize === 4));
  // (the fir's middle-level card shell keeps its atlas UVs: fir round 3)
  const uv0 = P_.lods[0].every((x) => x.geometry.attributes.uv), noUvFar = P_.lods.slice(1).every((l) => l.every((x) => !x.geometry.attributes.uv || x.slot === "fir_cards"));
  const falling = P_.tris[0] >= P_.tris[1] && P_.tris[1] >= P_.tris[2];
  ok(colour && uv0 && noUvFar && falling, `${p}: tris ${P_.tris.join(" / ")}, range ${P_.range.join(" / ")} m, COLOR_0 everywhere, UV on LOD0 only (+ the fir's middle-level cards)`);
}
const slots = new Set(Object.values(kit.pieces).flatMap((p) => p.lods.flatMap((l) => l.map((x) => x.slot))));
let built = 0;
const EXTRA = ["wire_dark", ...["chalet_wood", "chalet_trim", "roof_felt", "snow_fake", "chalet_interior", "sign_board"].filter((x) => !slots.has(x))];
for (const s of [...slots, ...EXTRA]) for (const uvs of [true, false]) for (const instanced of [true, false]) { const m = kit.slotMaterial(s, { uvs, instanced }); if (m?.isNodeMaterial) built++; }
ok(built === (slots.size + EXTRA.length) * 4, `${built} materials built for ${slots.size} slots + ${EXTRA.join(", ")}: ${[...slots].join(", ")}`);
const emissive = ["bulb_warm", "led_rope", "star_glow"].every((s) => kit.slotMaterial(s, { instanced: true }).emissiveNode);
ok(emissive, "LEDs, LED rope and the star glow (emissive only: no light added)");
// (claude/xmasreview, rule xmas-night-glow) the LEDs' glow on the foliage and baubles: an emissive term x env.uNight
// (0 by day) on the needle cards' LIT pass (single and colour), the solid fronds and the baubles; never on the depth twin
{
  const { FIR_GLOW, xmasLook: LK } = await import("../../viewer/christmas/xmasKit.js");
  const { env } = await import("../../viewer/lighting.js");
  const uses = (node, target, seen = new Set(), depth = 0) => {
    if (!node || typeof node !== "object" || seen.has(node) || depth > 40) return false;
    if (node === target) return true;
    seen.add(node);
    for (const v of Object.values(node)) if (v && typeof v === "object" && (v.isNode || Array.isArray(v)) && uses(v, target, seen, depth + 1)) return true;
    return false;
  };
  const glowM = [kit.slotMaterial("fir_cards", { uvs: true, instanced: true, mask: false, pass: "colour" }), kit.slotMaterial("fir_cards", { uvs: true, instanced: true, mask: true }),
    kit.slotMaterial("fir_needles", { uvs: true, instanced: true }), kit.slotMaterial("fir_needles", { uvs: false, instanced: true }), kit.slotMaterial("bauble", { instanced: true }),
    kit.slotMaterial("chalet_wood", { instanced: true }), kit.slotMaterial("chalet_trim", { instanced: true }), kit.slotMaterial("sign_board", { instanced: true })];
  ok(FIR_GLOW && glowM.every((m) => m.userData.ledGlow && m.emissiveNode && uses(m.emissiveNode, env.uNight) && (uses(m.emissiveNode, LK.glow) || uses(m.emissiveNode, LK.glint) || uses(m.emissiveNode, LK.stall))),
    "LED glow: the needle cards (lit passes), the solid fronds (near + far), the baubles and the chalets' fronts take albedo x LED warm x glow / glint / stall x env.uNight");
  ok(!kit.slotMaterial("fir_cards", { uvs: true, instanced: true, mask: false, pass: "depth" }).emissiveNode, "LED glow: never on the cards' depth twin");
  ok(/export const FIR_GLOW = QS\.get\("firglow"\) !== "0";/.test(fs.readFileSync(new URL("../../viewer/christmas/xmasKit.js", import.meta.url), "utf8")) && /on\("firglow"/.test(fs.readFileSync(new URL("../../viewer/features.js", import.meta.url), "utf8")),
    "LED glow: ?firglow=0 = the shader of before (xmasKit.js FIR_GLOW, features row firglow)");
}

// ---- RULE 19 (needle cards): the fir's near level is alpha-tested needle cards with CANOPY normals; the far levels
// have none. Why: the first fir was solid lumpy sleeves with a stroke pattern: lit by their own surface, they read as
// flat leaves / cards up close (docs/CHRISTMAS.md "needle cards"). On the decoded GLB (what the viewer gets).
{
  const T = kit.pieces.tree, cards = T.lods.map((l) => l.find((x) => x.slot === "fir_cards"));
  const ct = cards.map((c) => (c ? c.geometry.index.count / 3 : 0));
  // (fir round 3: the MIDDLE level carries a shell of big cards of the same atlas, the FAR level none; budgets: near
  // <= 80 k card triangles, middle 5-16 k (the shell: ~3.3 k cards), far 0)
  ok(!!cards[0]?.geometry.attributes.uv && !!cards[1]?.geometry.attributes.uv && !cards[2] && ct[0] <= 80000 && ct[1] >= 5000 && ct[1] <= 16000,
    `fir: needle cards on the near level and the middle level's shell, none on the far level (${ct.join(" / ")} card triangles per level; budgets <= 80 k / 5-16 k / 0)`);
  for (const [k, c] of cards.entries()) {
    if (!c) continue;
    const g = c.geometry;
    const P = g.attributes.position, N = g.attributes.normal, I = g.index.array, n = P.count;
    // the kit's canopy direction (glTF: Y up): out from the trunk, 35.5 deg up, straight up round the leader
    let good = 0;
    for (let i = 0; i < n; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), rl = Math.hypot(x, z), kk = Math.min(1, rl / 0.35);
      let cx = rl > 1e-5 ? (x / rl) * Math.cos(0.62) * kk : 0, cz = rl > 1e-5 ? (z / rl) * Math.cos(0.62) * kk : 0, cy = Math.sin(0.62) * kk + (1 - kk);
      const l = Math.hypot(cx, cy, cz); cx /= l; cy /= l; cz /= l;
      if (N.getX(i) * cx + N.getY(i) * cy + N.getZ(i) * cz > 0.8) good++;
    }
    // ... and not the card's own flat normal: triangles whose 3 corner normals all sit within 3 deg of the face's (+-)
    let flat = 0;
    const v = (i) => [P.getX(i), P.getY(i), P.getZ(i)];
    for (let t = 0; t < I.length; t += 3) {
      const [a, b, cc] = [v(I[t]), v(I[t + 1]), v(I[t + 2])];
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [cc[0] - a[0], cc[1] - a[1], cc[2] - a[2]];
      const fn = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], fl = Math.hypot(...fn) || 1;
      if ([0, 1, 2].every((q) => Math.abs((N.getX(I[t + q]) * fn[0] + N.getY(I[t + q]) * fn[1] + N.getZ(I[t + q]) * fn[2]) / fl) > Math.cos(3 * Math.PI / 180))) flat++;
    }
    const nt = I.length / 3;
    ok(good / n >= 0.98 && flat / nt < 0.05, `fir cards (LOD${k}) shade as a volume: ${(100 * good / n).toFixed(1)} % of ${n} vertices within 37 deg of the canopy normal (>= 98 %), ${(100 * flat / nt).toFixed(1)} % of ${nt} triangles flat-shaded (< 5 %)`);
  }
  const m = kit.slotMaterial("fir_cards", { uvs: true, instanced: true, mask: true }), s = kit.slotMaterial("fir_cards", { uvs: true, instanced: true, mask: false });
  ok([m, s].every((x) => x.maskNode && !x.transparent && x.side === 2 && x.normalNode && x.depthWrite !== false), "fir cards (one pass, ?firprepass=0): alpha TESTED (a mask, never blended), two-sided, own (canopy) normal node, depth written");
  // FIR ROUND 3 (rule 19): the depth PRE-PASS: a twin writes the depth (the atlas' alpha + the band; no colour), the lit
  // pass runs with depth EQUAL and no discard (the lit shader once per visible pixel), both @invariant; the lit pass's
  // shadow mask = the twin's (if it ever casts)
  const { FIR, XMAS_SHADOW_LAYER, LOD_FADE } = await import("../../viewer/christmas/xmasKit.js");
  for (const fade of [true, false]) {
    const d = kit.slotMaterial("fir_cards", { uvs: true, instanced: true, mask: fade, pass: "depth" }), c = kit.slotMaterial("fir_cards", { uvs: true, instanced: true, mask: fade, pass: "colour" });
    ok(d.maskNode && d.colorWrite === false && d.depthWrite !== false && d.side === 2 && d.contextNode?.value?.invariant === true && !d.transparent
      && !c.maskNode && c.maskShadowNode && c.depthFunc === THREE_.EqualDepth && c.depthWrite === false && c.side === 2 && c.normalNode && c.contextNode?.value?.invariant === true && !c.transparent,
      `fir cards pre-pass (${fade ? "fade" : "solid"} set): twin = depth only (alpha + band mask, no colour, @invariant), lit = EQUAL depth, no discard, no depth write, @invariant, shadow mask kept`);
  }
  // FIR ROUND 4 (claude/xmas3): the cards' lit materials (solid, fade, one-pass) take the foliage light path (sun / moon +
  // sky: foliageLights), the depth twin and every other slot do not; the ?firlight=old variant is its own material
  {
    const { XMAS_LIGHT } = await import("../../viewer/christmas/xmasKit.js");
    const lit = [true, false].flatMap((fade) => [kit.slotMaterial("fir_cards", { uvs: true, instanced: true, mask: fade, pass: "colour" }), kit.slotMaterial("fir_cards", { uvs: true, instanced: true, mask: fade })]);
    const twin = kit.slotMaterial("fir_cards", { uvs: true, instanced: true, mask: false, pass: "depth" });
    const others = ["fir_needles", "fir_bark", "bauble", "bulb_warm", "gold_metal", "star_glow", "chalet_wood"].map((s) => kit.slotMaterial(s, { instanced: true }));
    const oldM = kit.slotMaterial("fir_cards", { uvs: true, instanced: true, mask: false, pass: "colour", light: { cards: false } });
    ok(XMAS_LIGHT.cards === true && lit.every((m) => m.userData.foliageLights === true) && !twin.userData.foliageLights && others.every((m) => !m.userData.foliageLights) && oldM !== lit[2] && !oldM.userData.foliageLights,
      "fir light: the cards' lit materials take the sun / moon + sky only (?firlight=old: every light, its own material); the twin and the other slots unchanged");
  }
  ok(FIR.prepass === true && FIR.shadow === "far" && XMAS_SHADOW_LAYER > 0 && XMAS_SHADOW_LAYER < 32, `fir switches default: pre-pass on (?firprepass=0: one pass), shadow from the far level (?firshadow=cards: each level its own), shadow layer ${XMAS_SHADOW_LAYER}`);
  // the 45 m switch: a dithered cross-fade over the band's last LOD_FADE (39.6-45 m), card crown on BOTH sides
  ok(LOD_FADE === 0.12 && T.range[0] === 45 && T.range[1] === 150 && !!cards[1], `fir 45 m switch: dithered over ${(T.range[0] * (1 - LOD_FADE)).toFixed(1)}-${T.range[0]} m, needle cards on both sides (the near crown -> the middle shell: one material)`);
  const nd = kit.info.needles;
  ok(!!nd && fs.existsSync(new URL(`../../models/christmas/${nd.file}`, import.meta.url)) && nd.levels >= 10, `needle atlas ${nd?.file} ${nd?.px?.join(" x ")}, ${nd?.levels} coverage-preserving mip levels, ${((nd?.ktx2_bytes ?? 0) / 1024).toFixed(0)} KB`);
}

// ---- FIR ROUND 3: the fir in the field: the pre-pass twins and the shadow-only casters
{
  const { XMAS_SHADOW_LAYER } = await import("../../viewer/christmas/xmasKit.js");
  const { FIR_SHADOW_LEVEL } = await import("../../viewer/christmas/xmasCity.js");
  const T = kit.pieces.tree, far = T.lods[FIR_SHADOW_LEVEL];
  for (const firShadow of ["far", "cards"]) {
    const f = new XmasField(kit, { shadows: { tree: true }, prepass: true, firShadow });
    f.add("tree", new THREE_.Matrix4(), "t0");
    const bad = [];
    for (const [k, lv] of f.levels.tree.entries()) for (const S of [lv.solid, lv.fade]) {
      const lit = S.meshes.filter((m) => m.userData.slot === "fir_cards" && !m.userData.depthPrepass && !m.userData.shadowOnly);
      const tw = S.meshes.filter((m) => m.userData.depthPrepass);
      if (k < 2 && (lit.length !== 1 || tw.length !== 1 || tw[0].geometry !== lit[0].geometry || tw[0].instanceMatrix !== lit[0].instanceMatrix || tw[0].renderOrder >= lit[0].renderOrder || tw[0].castShadow)) bad.push(`lod${k}: twin`);
      if (S.meshes.some((m) => !m.userData.shadowOnly && m.castShadow)) bad.push(`lod${k}: a drawn mesh casts`);
      const sh = S.meshes.filter((m) => m.userData.shadowOnly);
      const want = firShadow === "far" ? far.filter((x) => ["fir_needles", "fir_bark"].includes(x.slot)) : T.lods[k].filter((x) => ["fir_needles", "fir_cards", "fir_bark"].includes(x.slot));
      if (sh.length !== want.length || !sh.every((m) => m.castShadow && !m.receiveShadow && m.layers.mask === 1 << XMAS_SHADOW_LAYER && want.some((w) => w.geometry.index === m.geometry.index) && m.geometry.attributes.xlod === S.band && m.instanceMatrix === S.mat)) bad.push(`lod${k}: shadow copies`);
      if (firShadow === "far" && sh.some((m) => m.userData.slot === "fir_cards")) bad.push(`lod${k}: cards cast`);
    }
    ok(!bad.length, `fir field (${firShadow}): every level's cards drawn as a depth twin (first) + the lit pass; the drawn meshes cast nothing; the shadow from ${firShadow === "far" ? `the far level's (LOD${FIR_SHADOW_LEVEL}) solid fronds + trunk` : "each level's own casters"} (shadow layer only, the level's band and instances)${bad.length ? " :: " + bad.join(", ") : ""}`);
  }
  // the 45 m switch while walking 30 -> 70 m: inside 39.6 - 45 m both levels' fade sets hold the tree (the dither splits
  // the pixels), outside one level's solid set ("solid fade" per level)
  const f = new XmasField(kit, { shadows: { tree: true } }); f.add("tree", new THREE_.Matrix4(), "t0");
  const at = (d) => { f.update(new THREE_.Vector3(0, 1.7, d)); return f.levels.tree.map((lv) => `${lv.solid.n}${lv.fade.n}`).join(" "); };
  const walk = [30, 38, 42, 46, 52, 70].map((d) => `${d} m: ${at(d)}`);
  ok(/^30 m: 10 00/.test(walk[0]) && /01 01/.test(walk[2]) && / 10 /.test(walk[5]), `fir walk 30 -> 70 m (solid|fade per level): ${walk.join("; ")}`);
}

// ---- the site
const site = JSON.parse(fs.readFileSync(new URL("../../models/christmas/site.json", import.meta.url)));
ok(site.trees.length === 2, `trees: ${site.trees.map((t) => `${t.id} (${t.x}, ${t.z})`).join(", ")}`);
const badSpan = site.spans.filter((s) => { const w = Math.hypot(s.b[0] - s.a[0], s.b[2] - s.a[2]); return w < 6.9 || w > 26.1 || Math.abs(s.a[1] - s.b[1]) > 4; });
ok(site.spans.length > 20 && !badSpan.length, `${site.spans.length} spans 7-26 m wide, both ends within 4 m of height (${badSpan.length} off)`);
ok(site.spans.every((s) => !s.tram || !s.motif), `no star motif over a tram line (${site.spans.filter((s) => s.tram).length} tram spans at 7.3 m)`);
ok(site.fronts.every((w) => Math.abs(Math.hypot(w.nx, w.nz) - 1) < 0.02 && w.w > 0 && w.eaves > w.y), `${site.fronts.length} shopfronts for swags: unit normals, widths, eaves over the ground`);
const { frontFamily } = await import("../../viewer/shops/shopLayout.js");
const { hash01 } = await import("../../viewer/streetlife/layout.js");
const fams = site.fronts.map((f) => frontFamily({ id: f.id, kind: f.kind, cat: f.cat }, f, null, hash01));
ok(fams.every((x) => x.fasciaY === 2.55 || x.fasciaY === 3.0), `front families from the shop kit's rule: ${fams.filter((x) => x.classic).length} classic (cornice), ${fams.filter((x) => !x.classic).length} modern (fascia box)`);
const ch = site.chalets;
const sep = ch.every((a, i) => ch.every((b, j) => i === j || Math.hypot(a.x - b.x, a.z - b.z) >= 3.0));
const fir = site.trees.find((t) => t.id === "stjob");
ok(ch.length >= 4 && ch.length <= 8 && sep && ch.every((c) => Math.hypot(c.x - fir.x, c.z - fir.z) > 4.4), `${ch.length} market chalets on Place de Saint-Job, >= 3 m apart, off the fir's planter`);
ok(site.config?.streets && Object.values(site.config.streets).every((v) => ["spans", "swags", "wreaths", "lamps"].every((k) => k in v)), `per-street switches for ${Object.keys(site.config.streets).length} streets (+ chalets: ${site.config.chalets})`);
ok(site.wreaths.length > 20, `${site.wreaths.length} door wreaths`);

// ---- the garlands' geometry
const sp = buildSpans(site.spans);
const nb = sp.bulbs.attributes.position.count / 6;
ok(nb > 1000 && sp.bulbs.index.count === nb * 24, `${nb} span LEDs (8 triangles each), ${sp.wire.index.count / 3} wire / plate triangles, ${sp.mid.length} star motifs`);
let lowest = Infinity;
for (const s of site.spans) { const H = s.tram ? 7.3 : 6.8, ground = (s.a[1] + s.b[1]) / 2 - H; lowest = Math.min(lowest, (s.a[1] + s.b[1]) / 2 - s.sag - 0.04 - ground - (s.motif ? 0.75 * 1.76 : 0)); }
ok(lowest > 4.4, `the lowest point (sag, the bulbs, the star motif) stays > 4.4 m over the street (the walls' mean ground) (${lowest.toFixed(2)} m)`);

// ---- the field's level buckets
const THREE = THREE_;
const field = new XmasField(kit, { shadows: { tree: true } });
const m = new THREE.Matrix4();
for (let i = 0; i < 50; i++) field.add("swag", m.makeTranslation(i * 4, 0, 0), `s${i}`);
field.update(new THREE.Vector3(0, 1.7, 0));
const R = kit.pieces.swag.range;
const expect = [0, 1, 2].map((k) => { let n = 0; for (let i = 0; i < 50; i++) { const d = Math.hypot(i * 4, 1.7); const lo = k ? R[k - 1] : 0; if (!(d >= R[k] + 5 || (k && d < lo * 0.88 - 5))) n++; } return n; });
ok(field.stats.drawn.join() === expect.join(), `swags bucketed per level ${field.stats.drawn.join(" / ")} (expected ${expect.join(" / ")}), ${field.stats.draws} draws`);
const empty = Object.values(field.levels).flatMap((L) => L.flatMap((lv) => [...lv.solid.meshes, ...lv.fade.meshes])).filter((im) => im.count === 0 && im.visible).length;
ok(empty === 0, "empty instanced meshes are hidden (no draw)");

// ---- (claude/xmas4, plan jobs 5 + 7) the pole garlands' poles and the December windows
{
  const { buildPoleGeometry, hookPoint, POLE_TOP } = await import("../../viewer/christmas/xmasCity.js");
  const g = buildPoleGeometry([{ x: 10, y: 50, z: 20, h: 6.2 }, { x: 30, y: 52, z: 20, h: 5.5 }]);
  const Y = g.attributes.position.array; let y0 = Infinity, y1 = -Infinity;
  for (let i = 1; i < Y.length; i += 3) if (Math.abs(Y[i - 1] - 10) < 1) { y0 = Math.min(y0, Y[i]); y1 = Math.max(y1, Y[i]); }
  ok(Math.abs(y0 - 50) < 1e-4 && Math.abs(y1 - (50 + 6.2 + POLE_TOP + 0.12)) < 1e-3 && g.attributes.color.itemSize === 4 && g.index.count / 3 < 600,
    `a Christmas pole stands on its foot (${y0.toFixed(3)}) and reaches its hook + ${POLE_TOP} m + the cap (${y1.toFixed(2)}); the spans' attributes; ${g.index.count / 3} triangles for 2 poles`);
  const hp = hookPoint({ x: 0, z: 0 }, 6, { x: 10, z: 0 });
  ok(Math.abs(hp[0] - 0.08) < 1e-9 && hp[1] === 6, "the wire meets the pole's surface toward the other end (8 cm off the axis)");
  const pd = JSON.parse(fs.readFileSync(new URL("../../models/christmas/poles.json", import.meta.url), "utf8"));
  const psp = buildSpans(pd.spans.map((s) => ({ a: hookPoint(s.a, 50 + s.a.h, s.b), b: hookPoint(s.b, 50 + s.b.h, s.a), sag: s.sag, motif: false })));
  ok(pd.spans.length >= 10 && psp.bulbs.attributes.position.count / 6 > 200, `the pole garlands build with the street garlands' code: ${pd.spans.length} garlands, ${psp.bulbs.attributes.position.count / 6} LEDs`);
  const W = await import("../../viewer/christmas/xmasWindows.js");
  const D = (y, mo, d) => new Date(y, mo, d, 12);
  ok(W.xmasWinOn(P(""), D(2026, 11, 1)) && !W.xmasWinOn(P(""), D(2026, 10, 30)) && !W.xmasWinOn(P("xmas=0"), D(2026, 11, 24)) && !W.xmasWinOn(P("xmas=1&xmaswin=0"), D(2026, 11, 24)) && W.xmasWinOn(P("xmas=1"), D(2026, 6, 1)),
    "December windows compiled in with the layer only (1 Dec on, 30 Nov off, ?xmas=0 off, ?xmaswin=0 off, ?xmas=1 on)");
  ok(W.xmasWin.value === 0, "the December windows' uniform is 0 until the layer starts (and stays 0 when it is off)");
  const fsrc = fs.readFileSync(new URL("../../viewer/facades.js", import.meta.url), "utf8");
  ok(/if \(!XMAS_WIN\.on\) return vec4\(col\.mul\(warm\)\.mul\(mix\(float\(0\.85\), float\(1\.35\), lit\)\), litRoom\.mul\(emit\)\);/.test(fsrc) && /If\(xmasWin\.greaterThan\(0\.5\)/.test(fsrc),
    "facades.js interiorRoom: the shader of before when the layer is off (an early return, the same expression), the strings behind If(xmasWin > 0.5)");
  // (the lit set and its colour unchanged: the night's CPU copy, litHash.js, must still match the shader)
  ok(!/XMAS|xmas/.test(fs.readFileSync(new URL("../../viewer/nightLights/litHash.js", import.meta.url), "utf8")), "litHash.js (the lit windows' CPU copy) untouched: the December strings are decorations, not lit rooms");
}
console.log(fails ? `${fails} FAIL` : "all PASS");
process.exit(fails ? 1 : 0);
