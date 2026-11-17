// node --import ./tools/christmas/hook.mjs tools/christmas/xmasTest.mjs
// The Christmas layer's offline checks (no browser): the date switch, the kit (GLB pieces, levels, slots, attributes),
// every slot material builds (TSL graphs), the procedural street garlands, the instanced field's level buckets, and the
// placement data (models/christmas/site.json). Prints PASS / FAIL lines; exit 1 on a FAIL.
globalThis.location ??= { search: "?xmas=1", href: "http://localhost/viewer/index.html?xmas=1" };
import fs from "node:fs";
let fails = 0;
const ok = (c, msg) => { console.log(`${c ? "PASS" : "FAIL"} ${msg}`); if (!c) fails++; };

const { xmasActive, buildSpans, XmasField } = await import("../../viewer/christmas/xmasCity.js");
const P = (s) => new URLSearchParams(s);
ok(xmasActive(P(""), new Date(2026, 11, 1)) === true, "1 Dec: on");
ok(xmasActive(P(""), new Date(2026, 10, 30)) === false, "30 Nov: off");
ok(xmasActive(P(""), new Date(2027, 0, 6)) === true, "6 Jan: on");
ok(xmasActive(P(""), new Date(2027, 0, 7)) === false, "7 Jan: off");
ok(xmasActive(P("xmas=1"), new Date(2026, 6, 1)) === true && xmasActive(P("xmas=0"), new Date(2026, 11, 24)) === false, "?xmas=1 / ?xmas=0 force");
ok(xmasActive(P("day=350"), new Date(2026, 6, 1)) === true && xmasActive(P("day=200"), new Date(2026, 11, 24)) === false, "?day= decides when given");

// ---- the kit
const { loadXmasKit } = await import("../../viewer/christmas/xmasKit.js");
const kit = await loadXmasKit();
const want = ["tree", "wreath", "swag", "lampmotif", "spanmotif", "chalet"].filter((p) => kit.pieces[p]);
ok(want.length >= 5 && want.every((p) => kit.pieces[p]?.lods.length === 3), `${want.length} pieces x 3 levels (${Object.keys(kit.pieces).join(", ")})`);
for (const p of want) {
  const P_ = kit.pieces[p];
  const colour = P_.lods.every((l) => l.every((x) => x.geometry.attributes.color?.itemSize === 4));
  const uv0 = P_.lods[0].every((x) => x.geometry.attributes.uv), noUvFar = P_.lods.slice(1).every((l) => l.every((x) => !x.geometry.attributes.uv));
  const falling = P_.tris[0] >= P_.tris[1] && P_.tris[1] >= P_.tris[2];
  ok(colour && uv0 && noUvFar && falling, `${p}: tris ${P_.tris.join(" / ")}, range ${P_.range.join(" / ")} m, COLOR_0 everywhere, UV on LOD0 only`);
}
const slots = new Set(Object.values(kit.pieces).flatMap((p) => p.lods.flatMap((l) => l.map((x) => x.slot))));
let built = 0;
const EXTRA = ["wire_dark", ...["chalet_wood", "chalet_trim", "roof_felt", "snow_fake", "chalet_interior", "sign_board"].filter((x) => !slots.has(x))];
for (const s of [...slots, ...EXTRA]) for (const uvs of [true, false]) for (const instanced of [true, false]) { const m = kit.slotMaterial(s, { uvs, instanced }); if (m?.isNodeMaterial) built++; }
ok(built === (slots.size + EXTRA.length) * 4, `${built} materials built for ${slots.size} slots + ${EXTRA.join(", ")}: ${[...slots].join(", ")}`);
const emissive = ["bulb_warm", "led_rope", "star_glow"].every((s) => kit.slotMaterial(s, { instanced: true }).emissiveNode);
ok(emissive, "LEDs, LED rope and the star glow (emissive only: no light added)");

// ---- RULE 19 (needle cards): the fir's near level is alpha-tested needle cards with CANOPY normals; the far levels
// have none. Why: the first fir was solid lumpy sleeves with a stroke pattern: lit by their own surface, they read as
// flat leaves / cards up close (docs/CHRISTMAS.md "needle cards"). On the decoded GLB (what the viewer gets).
{
  const T = kit.pieces.tree, cards = T.lods.map((l) => l.find((x) => x.slot === "fir_cards"));
  const g = cards[0]?.geometry;
  ok(!!g && !!g.attributes.uv && !cards[1] && !cards[2], `fir: needle cards on LOD0 only (${cards.map((c) => (c ? c.geometry.index.count / 3 : 0)).join(" / ")} card triangles per level)`);
  if (g) {
    const P = g.attributes.position, N = g.attributes.normal, I = g.index.array, n = P.count;
    // the kit's canopy direction (glTF: Y up): out from the trunk, 35.5 deg up, straight up round the leader
    let good = 0;
    for (let i = 0; i < n; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), rl = Math.hypot(x, z), k = Math.min(1, rl / 0.35);
      let cx = rl > 1e-5 ? (x / rl) * Math.cos(0.62) * k : 0, cz = rl > 1e-5 ? (z / rl) * Math.cos(0.62) * k : 0, cy = Math.sin(0.62) * k + (1 - k);
      const l = Math.hypot(cx, cy, cz); cx /= l; cy /= l; cz /= l;
      if (N.getX(i) * cx + N.getY(i) * cy + N.getZ(i) * cz > 0.8) good++;
    }
    // ... and not the card's own flat normal: triangles whose 3 corner normals all sit within 3 deg of the face's (+-)
    let flat = 0;
    const v = (i) => [P.getX(i), P.getY(i), P.getZ(i)];
    for (let t = 0; t < I.length; t += 3) {
      const [a, b, c] = [v(I[t]), v(I[t + 1]), v(I[t + 2])];
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const fn = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], fl = Math.hypot(...fn) || 1;
      if ([0, 1, 2].every((q) => Math.abs((N.getX(I[t + q]) * fn[0] + N.getY(I[t + q]) * fn[1] + N.getZ(I[t + q]) * fn[2]) / fl) > Math.cos(3 * Math.PI / 180))) flat++;
    }
    const nt = I.length / 3;
    ok(good / n >= 0.98 && flat / nt < 0.05, `fir cards shade as a volume: ${(100 * good / n).toFixed(1)} % of ${n} vertices within 37 deg of the canopy normal (>= 98 %), ${(100 * flat / nt).toFixed(1)} % of ${nt} triangles flat-shaded (< 5 %)`);
  }
  const m = kit.slotMaterial("fir_cards", { uvs: true, instanced: true, mask: true }), s = kit.slotMaterial("fir_cards", { uvs: true, instanced: true, mask: false });
  ok([m, s].every((x) => x.maskNode && !x.transparent && x.side === 2 && x.normalNode && x.depthWrite !== false), "fir cards: alpha TESTED (a mask, never blended), two-sided, own (canopy) normal node, depth written");
  const nd = kit.info.needles;
  ok(!!nd && fs.existsSync(new URL(`../../models/christmas/${nd.file}`, import.meta.url)) && nd.levels >= 10, `needle atlas ${nd?.file} ${nd?.px?.join(" x ")}, ${nd?.levels} coverage-preserving mip levels, ${((nd?.ktx2_bytes ?? 0) / 1024).toFixed(0)} KB`);
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
const THREE = await import("three/webgpu");
const field = new XmasField(kit, { shadows: { tree: true } });
const m = new THREE.Matrix4();
for (let i = 0; i < 50; i++) field.add("swag", m.makeTranslation(i * 4, 0, 0), `s${i}`);
field.update(new THREE.Vector3(0, 1.7, 0));
const R = kit.pieces.swag.range;
const expect = [0, 1, 2].map((k) => { let n = 0; for (let i = 0; i < 50; i++) { const d = Math.hypot(i * 4, 1.7); const lo = k ? R[k - 1] : 0; if (!(d >= R[k] + 5 || (k && d < lo * 0.88 - 5))) n++; } return n; });
ok(field.stats.drawn.join() === expect.join(), `swags bucketed per level ${field.stats.drawn.join(" / ")} (expected ${expect.join(" / ")}), ${field.stats.draws} draws`);
const empty = Object.values(field.levels).flatMap((L) => L.flatMap((lv) => [...lv.solid.meshes, ...lv.fade.meshes])).filter((im) => im.count === 0 && im.visible).length;
ok(empty === 0, "empty instanced meshes are hidden (no draw)");
console.log(fails ? `${fails} FAIL` : "all PASS");
process.exit(fails ? 1 : 0);
