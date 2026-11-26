// THE WINTER LOOK (claude/xmasreview, owner 2026-11-26 "yes do the winter look for christmas"): gate row `winter`.
// Rules season-from-date, bare-winter-trees, walker-statics (docs/rules/). Node only (no browser):
//   season   viewer/seasons/seasonMode.js: winter exactly in the Christmas season by the BRUSSELS date (UTC instants
//            round the midnights), ?xmas=1 forces it (21 Dec outside the season), ?season=summer / winter force the
//            mode, ?day= pins the day, the summer day stays 200 (the city as before outside the season)
//   sun      the time presets keep their place against sunrise / sunset: on 15 Dec "golden" is a low sun (< 10 deg)
//            before a sunset at 16:25-16:55 Brussels clock; lighting.js takes SEASON.day and presetHour; main.js sets
//            the season's uniforms (lawns, shrubs) on the lighting's day at boot
//   trees    in winter the street species' cards draw TWIGS: the pool's depth pass and the shadow keep the mask's .g
//            (twigs) for the trees and the deciduous shrubs, the far impostors (kit + old) bake the twig mask, the
//            colours x WINTER_F, the evergreen shrubs' tint / WINTER_F (their green exactly back); no new view / mesh /
//            pass in the winter code (draws and triangles = summer's); summer: nothing of it (BARE false)
//   walker   the firs' planter + crown and the chalets reach the walker's collision world (window.__walkerStatics,
//            cityHook.js takeExtras)
globalThis.location ??= { search: "?xmas=1", href: "http://localhost/viewer/index.html?xmas=1" };   // (before any viewer module: the page's mode)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const out = (ok, msg) => { if (!ok) fails++; if (!ok || !QUIET) console.log(`${ok ? "PASS" : "FAIL"} ${msg}`); };

// ---- season
const S = await import("../../viewer/seasons/seasonMode.js");
const P = (s) => new URLSearchParams(s), U = (y, mo, d, h, mi = 0) => new Date(Date.UTC(y, mo, d, h, mi));
{
  const a = S.seasonMode(P(""), U(2026, 10, 30, 22, 30)), b = S.seasonMode(P(""), U(2026, 10, 30, 23, 30));
  out(!a.winter && a.day === 200 && b.winter && b.day === 335, `season: off at 23:30 on 30 Nov in Brussels (day ${a.day}), winter from 00:30 on 1 Dec (day ${b.day})`);
  const c = S.seasonMode(P(""), U(2027, 0, 6, 22, 30)), d = S.seasonMode(P(""), U(2027, 0, 6, 23, 30));
  out(c.winter && c.day === 6 && !d.winter && d.day === 200, "season: winter to 6 Jan 23:59 Brussels, summer (day 200) from 7 Jan");
  const e = S.seasonMode(P("xmas=1"), U(2026, 6, 1, 12)), f = S.seasonMode(P("season=summer"), U(2026, 11, 24, 12)), g = S.seasonMode(P("season=winter"), U(2026, 6, 1, 12));
  out(e.winter && e.day === S.WINTER_FORCED_DAY && !f.winter && f.day === 200 && g.winter, "season: ?xmas=1 forces winter (21 Dec outside the season), ?season=summer / winter force the mode");
  const h = S.seasonMode(P("day=120"), U(2026, 11, 24, 12)), i = S.seasonMode(P("xmas=0"), U(2026, 11, 24, 12));
  out(!h.winter && h.day === 120 && !i.winter && i.day === 200, "season: ?day= pins the day (and decides the season as the layer does), ?xmas=0 = summer");
  const j = S.seasonMode(P(""), U(2026, 11, 24, 12));
  out(j.winter && j.day === 358, `season: 24 Dec = day ${j.day} (the real day in Brussels)`);
}
// ---- sun
{
  const { sunInfo } = await import("../../viewer/seasons/season.js");
  const DEG = Math.PI / 180, day = 349, sun = sunInfo(day), summer = sunInfo(200);
  // the clock: Brussels CET = UTC + 1; local solar = UTC + 4.35 / 15 h + the equation of time (~ +5 min mid-December)
  const eot = (d) => { const B = (2 * Math.PI * (d - 81)) / 364; return (9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B)) / 60; };
  const clock = (solar) => solar - 4.35 / 15 - eot(day) + 1;
  const sunset = clock(sun.sunset), sunrise = clock(sun.sunrise);
  out(sunset > 16.42 && sunset < 16.92 && sunrise > 8.4 && sunrise < 8.9, `sun: 15 Dec sunrise ${sunrise.toFixed(2)} h, sunset ${sunset.toFixed(2)} h Brussels clock (expected ~8:40 / ~16:40)`);
  const gold = S.presetHour("golden", 18.7, sun, summer);
  const dec = 23.44 * DEG * Math.sin((2 * Math.PI * (284 + day)) / 365), H = (gold - 12) * 15 * DEG, lat = 50.8 * DEG;
  const elev = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H)) / DEG;
  out(elev > 2 && elev < 10 && S.presetHour("twilight", 20.45, sun, summer) > sun.sunset && S.presetHour("night", 23.4, sun, summer) === 23.4,
    `sun: winter "golden" at ${clock(gold).toFixed(2)} h clock, ${elev.toFixed(1)} deg up (a low golden sun), twilight after sunset, night unchanged`);
  const L = src("viewer/lighting.js"), M = src("viewer/main.js");
  out(/const DAY = SEASON\.day;/.test(L) && /presetHour\(/.test(L) && /if \(day !== SUMMER_DAY\)/.test(L), "sun: lighting.js takes SEASON.day and moves the presets only off the summer day (summer: as before)");
  const G = src("viewer/ground.js");
  out(/tone: uniformArray\(L\.map\(\(l\) => new THREE\.Vector3\(\.\.\.toneOf\(l\.cover\)\)\)/.test(G) && /SEASON\.winter \? TONE_WINTER\[cover\] : null/.test(G) && /uDry: uniform\(SEASON\.winter \? 0\.45 : 0\.3\)/.test(G),
    "ground: the winter lawns duller and olive (the textured ground's per-cover tone x TONE_WINTER, more dry patches); summer: the tones of before");
  out(/setCityDay\(lighting\.day\)/.test(M), "season: main.js sets the season's uniforms (lawns, shrubs, hedges, ivy) on the lighting's day at boot");
}
// ---- trees
{
  const T = await import("../../viewer/treesStylized.js");
  const { BUSH_KINDS, BUSH_TYPES } = await import("../../viewer/plants/bushes.js");
  out(T.BARE === true, "trees: ?xmas=1 = bare trees (BARE)");
  const rows = T.bushTintRows();
  const ever = BUSH_KINDS.filter((k) => !["hydrangea", "rose"].includes(k));
  out(ever.every((k) => { const r = rows[BUSH_KINDS.indexOf(k) + 1], t = BUSH_TYPES[k].tint; return [0, 1, 2].every((c) => Math.abs(r[c] * T.WINTER_F[c] - t[c]) < 1e-9) && r[3] === t[3]; })
    && ["hydrangea", "rose"].every((k) => { const r = rows[BUSH_KINDS.indexOf(k) + 1]; return r.join() === BUSH_TYPES[k].tint.join(); }),
    `trees: the evergreen shrubs (${ever.join(", ")}) get their summer green back (tint / WINTER_F), the deciduous (hydrangea, rose) keep the twig colour`);
  out(JSON.stringify(T.BARE_KIND_IDS) === JSON.stringify(["hydrangea", "rose"].map((k) => BUSH_KINDS.indexOf(k) + 1)), "trees: the deciduous shrub kinds draw twigs only, as the trees");
  const p = T.winterParams({ topColor: "#8aa64e", bottomColor: "#27441d", translucencyColor: "#c6d07c" });
  const lum = (h) => { const n = parseInt(h.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; return c; };
  const top = lum(p.topColor);
  out(top[1] < top[0] + 6 && top[2] > 70 && Math.max(...top) - Math.min(...top) < 30, `trees: the winter crown colour is a grey-brown (${p.topColor}), not green`);
  const t = src("viewer/treesStylized.js");
  out(/depth\.maskNode = depth\.maskNode\.and\(bareKeep\(\)\)/.test(t) && /colour\.maskShadowNode = colour\.maskShadowNode\.and\(bareKeep\(\)\)/.test(t),
    "trees: the pool's depth pass (what the EQUAL colour pass draws) and the sun's shadow keep only the twigs for bare cards");
  out(/startTreeKit\(renderer, shared, def\.id === "street" \? farLeafMask\(\) : PARAMS\.leafMask/.test(t) && /bakeTreeImpostors\(renderer, shared, VARIANTS, def\.id === "street" \? farLeafMask\(\) : PARAMS\.leafMask\)/.test(t),
    "trees: the far impostors (the kit and the old bake) are baked from the twig mask in winter (no leafy far crowns behind bare near ones)");
  const block = t.slice(t.indexOf("if (BARE && NB) {"), t.indexOf("}", t.indexOf("depth.userData.bare")));
  out(block.length > 50 && !/addView|new THREE\.(Instanced)?Mesh|MultiDrawSet/.test(block) && !/addView|new THREE\.(Instanced)?Mesh/.test(t.slice(t.indexOf("// ---- BARE WINTER TREES"), t.indexOf("export function leafMask"))),
    "trees: the winter code adds no view, mesh or pass (the same draws and triangles as summer; fewer fragments: the twigs cover less than the leaves)");
  out(/params: winterParams\(\{/.test(t) && /export const BARE = SEASON\.winter && !\/\[\?&\]baretrees=0/.test(t), "trees: the street species' params through winterParams; ?baretrees=0 / summer: the leafy trees as before");
}
// ---- walker
{
  const X = await import("../../viewer/christmas/xmasCity.js");
  const w = X.walkerFir({ id: "t", x: 10, z: 20, y: 70, scale: 1 });
  const pl = w.find((e) => e.polys), cr = w.find((e) => e.circles);
  out(pl && pl.ray && pl.polys[0].rings[0].length === 8 && pl.polys[0].top >= 70.55 && cr && !cr.ray && cr.circles[0].r >= 2 && cr.circles[0].top >= 72.5,
    "walker: a fir's planter (an octagon, body + camera, over its 0.55 m) and its crown (body only, r >= 2 m, to 3 m up)");
  const c = src("viewer/christmas/xmasCity.js"), h = src("viewer/character/cityHook.js");
  out(/\(window\.__walkerStatics \?\?= \[\]\)\.push\(\.\.\.walkerFir\(t\)\)/.test(c) && /\(window\.__walkerStatics \?\?= \[\]\)\.push\(\{ id: `xmas chalet/.test(c), "walker: the city registers each placed fir and chalet");
  out(/const takeExtras = \(\) => \{/.test(h) && /async function sync\(\) \{\r?\n    takeExtras\(\);/.test(h), "walker: cityHook.js takes the registered colliders into the collision world (at once and on every sync)");
}
console.log(fails ? `winterCheck: ${fails} FAIL` : "winterCheck: all PASS");
process.exit(fails ? 1 : 0);
