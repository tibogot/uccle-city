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
const want = ["tree", "wreath", "swag", "lampmotif", "spanmotif"];
ok(want.every((p) => kit.pieces[p]?.lods.length === 3), `5 pieces x 3 levels (${Object.keys(kit.pieces).join(", ")})`);
for (const p of want) {
  const P_ = kit.pieces[p];
  const colour = P_.lods.every((l) => l.every((x) => x.geometry.attributes.color?.itemSize === 4));
  const uv0 = P_.lods[0].every((x) => x.geometry.attributes.uv), noUvFar = P_.lods.slice(1).every((l) => l.every((x) => !x.geometry.attributes.uv));
  const falling = P_.tris[0] >= P_.tris[1] && P_.tris[1] >= P_.tris[2];
  ok(colour && uv0 && noUvFar && falling, `${p}: tris ${P_.tris.join(" / ")}, range ${P_.range.join(" / ")} m, COLOR_0 everywhere, UV on LOD0 only`);
}
const slots = new Set(Object.values(kit.pieces).flatMap((p) => p.lods.flatMap((l) => l.map((x) => x.slot))));
let built = 0;
for (const s of [...slots, "wire_dark"]) for (const uvs of [true, false]) for (const instanced of [true, false]) { const m = kit.slotMaterial(s, { uvs, instanced }); if (m?.isNodeMaterial) built++; }
ok(built === (slots.size + 1) * 4, `${built} materials built for ${slots.size} slots (+ the span wire): ${[...slots].join(", ")}`);
const emissive = ["bulb_warm", "led_rope", "star_glow"].every((s) => kit.slotMaterial(s, { instanced: true }).emissiveNode);
ok(emissive, "LEDs, LED rope and the star glow (emissive only: no light added)");

// ---- the site
const site = JSON.parse(fs.readFileSync(new URL("../../models/christmas/site.json", import.meta.url)));
ok(site.trees.length === 2, `trees: ${site.trees.map((t) => `${t.id} (${t.x}, ${t.z})`).join(", ")}`);
const badSpan = site.spans.filter((s) => { const w = Math.hypot(s.b[0] - s.a[0], s.b[2] - s.a[2]); return w < 6.9 || w > 26.1 || Math.abs(s.a[1] - s.b[1]) > 4; });
ok(site.spans.length > 20 && !badSpan.length, `${site.spans.length} spans 7-26 m wide, both ends within 4 m of height (${badSpan.length} off)`);
ok(site.spans.every((s) => !s.tram || !s.motif), `no star motif over a tram line (${site.spans.filter((s) => s.tram).length} tram spans at 7.3 m)`);
ok(site.swags.every((w) => Math.abs(Math.hypot(w.nx, w.nz) - 1) < 0.02 && w.sx > 0.6 && w.sx < 1.45), `${site.swags.length} swag modules: unit normals, scale 0.6-1.45`);
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
const empty = Object.values(field.levels).flatMap((L) => L.flatMap((lv) => lv.meshes)).filter((im) => im.count === 0 && im.visible).length;
ok(empty === 0, "empty instanced meshes are hidden (no draw)");
console.log(fails ? `${fails} FAIL` : "all PASS");
process.exit(fails ? 1 : 0);
