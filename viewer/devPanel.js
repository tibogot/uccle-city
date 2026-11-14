// THE DEV PANEL (docs/DEVPANEL.md): every control that matters, for the owner and the coordinator (not a player UI),
// in collapsible sections (viewer/panelUI.js: our own UI, never lil-gui) docked top right, remembered, searchable:
//   Go to & share · Modes & camera · Time & sun · Sky & clouds · Weather · Night · Traffic, trams & trains ·
//   Lighting & post · World layers · A/B: old versions · Streaming & boot · Smoothness · Performance · Debug & audits
// LIVE controls act at once (and are mirrored into the address bar, so a reload or a copied URL keeps them). Every URL
// switch of viewer/features.js shows in its section; the ones read at boot are STAGED (amber) and applied together by
// "Apply & reload" (the URL rewritten, the view kept). Chips under the search: the switches set in the URL now.
// Keys: H photo mode (all UI hidden), ` the panel, / search, ? the key help.  ?panel=0: the old HUD only.
// Cost: nothing per frame. One 4 Hz timer writes the DOM only while the panel is shown, and only for open sections;
// the frame-time graph's sampler (one rAF) runs only while the Performance section is open.
//
// ADD A SECTION (e.g. Weather from claude/weather-city): `const f = section("id", "Title")`, then f.add(...) like the
// rest, then `switches(f, "id")` if features.js has rows with that group. A live setting mirrored into the URL:
// setParam(key, value, default).
import { Panel as GUI } from "./panelUI.js";
import { uLampPower } from "./lampLight.js";
import { addSmoothnessFolder } from "./smoothPanel.js";
import { FEATURES, readSwitch, writeSwitch, isSet } from "./features.js";
import { PLACES } from "./places.js";
import { setHudHidden } from "./devHud.js";
import { cityWeather } from "./weather/cityWeather.js";

const TIMES = ["golden", "midday", "overcast", "twilight", "night", "misty"];
const CHARS = ["hoodie", "casual", "capsule"];
const FACETED = ["hatch_s", "hatch_c", "estate", "saloon", "suv", "van_c", "van_p", "taxi"];   // models/cars/faceted.glb
const NAV = new Set(FEATURES.filter((f) => f.group === "nav").map((f) => f.key));

const CSS = `
.upanel .uchips { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 10px 7px; }
.upanel .uchips:empty { display: none; }
.upanel .uchip { display: inline-flex; align-items: center; gap: 2px; font: 10.5px/1 ui-monospace, Consolas, monospace; background: var(--chip);
  color: var(--muted); border-radius: 10px; padding: 3px 3px 3px 7px; cursor: pointer; max-width: 100%; }
.upanel .uchip:hover { color: var(--fg); }
.upanel .uchip.staged { background: var(--warnbg); color: var(--warn); }
.upanel .uchip i { font-style: normal; width: 14px; height: 14px; display: grid; place-items: center; border-radius: 50%; }
.upanel .uchip i:hover { background: var(--btnh); }
.upanel .upend { display: flex; align-items: center; gap: 6px; padding: 7px 10px; }
.upanel .upend span { flex: 1; color: var(--warn); font-weight: 600; }
.upanel .upend button.ubtn { width: auto; margin: 0; }
.upanel .uperf { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; margin: 4px 0 6px; }
.upanel .uperf div { background: var(--bg2); border-radius: 6px; padding: 4px 6px; min-width: 0; }
.upanel .uperf b { display: block; font: 600 13px/1.2 ui-monospace, Consolas, monospace; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.upanel .uperf span { font-size: 10px; color: var(--dim); text-transform: uppercase; letter-spacing: .04em; white-space: nowrap; }
.upanel .uperf b.warn { color: var(--warn); } .upanel .uperf b.bad { color: var(--bad); } .upanel .uperf b.ok { color: var(--ok); }
.upanel canvas.ugraph { width: 100%; height: 54px; display: block; background: var(--bg2); border-radius: 6px; }
.upanel .uperfline { font: 11px/1.4 ui-monospace, Consolas, monospace; color: var(--muted); margin: 5px 0 2px; white-space: pre-wrap; }
.ukeys { position: fixed; inset: 0; z-index: 7; display: grid; place-items: center; background: rgba(0,0,0,.35); }
.ukeys > div { background: #171b21; color: #e3e7ec; border-radius: 12px; padding: 16px 20px; width: min(820px, calc(100vw - 32px)); max-height: calc(100vh - 40px);
  overflow: auto; font: 12.5px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; box-shadow: 0 10px 40px rgba(0,0,0,.5); }
:root[data-ui-theme=light] .ukeys > div { background: #f7f6f3; color: #1d2228; }
@media (prefers-color-scheme: light) { :root:not([data-ui-theme=dark]) .ukeys > div { background: #f7f6f3; color: #1d2228; } }
.ukeys .ucols { columns: 2 340px; column-gap: 28px; } .ukeys .ucols > section { break-inside: avoid; }
.ukeys h2 { font-size: 14px; margin: 0 0 4px; } .ukeys h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; opacity: .6; margin: 12px 0 4px; }
.ukeys table { border-collapse: collapse; width: 100%; } .ukeys td { padding: 2px 0; vertical-align: top; } .ukeys td:first-child { width: 165px; white-space: nowrap; padding-right: 8px; }
.ukeys kbd { font: 11px ui-monospace, Consolas, monospace; border: 1px solid rgba(127,127,127,.45); border-bottom-width: 2px; border-radius: 4px; padding: 0 5px; margin-right: 2px; }
`;
const KEYS = [
  ["Everywhere", [["H", "photo mode: hide all the UI (the data credits stay)"], ["`", "show / hide the dev panel"], ["/", "search the dev panel"], ["?", "this help"], ["M", "the full map (the minimap's teleport)"], ["Esc", "leave walk / fly / drive / third person; close this help"]]],
  ["Orbit", [["drag · right-drag · wheel", "turn · pan · zoom"]]],
  ["Walk", [["W A S D / arrows", "move"], ["drag", "look"], ["Shift", "run"]]],
  ["Drive", [["W A S D / arrows", "throttle, brake, steer"], ["R", "reset the car"], ["C", "camera"], ["G", "the car colliders"]]],
  ["Third person", [["W A S D", "move"], ["Shift", "run"], ["Space", "jump"], ["G", "the character colliders"]]],
  ["Falcon", [["W / S", "nose down / up"], ["A / D", "bank"], ["Space", "flap"], ["Shift", "tuck (stoop)"], ["C", "half fold (fast glide)"], ["Q", "brake"], ["F", "talons / strike"], ["E", "land"], ["V", "camera"], ["R", "reset"], ["G", "flight debug"]]],
];

export function createDevPanel(ctx) {
  const { renderer, scene, camera, controls, lighting, pipe, layers, contourOn, setView, walk, fly, drive, thirdPerson, driver, getThird, getTram, tsel, dev, gpuStats, resetGpu, params, log,
    teleport, getPlayer, manifest, world, getLite, frames, gpuPasses } = ctx;
  const sky = lighting.sky, SP = sky?.params;
  document.body.classList.add("devpanel");
  if (!document.getElementById("devpanel-css")) { const st = document.createElement("style"); st.id = "devpanel-css"; st.textContent = CSS; document.head.append(st); }
  const gui = new GUI({ title: "Dev panel", persist: "devpanel", search: true, badge: true });
  const refresh = () => gui.controllersRecursive().forEach((c) => c.updateDisplay());
  const section = (id, title, open = false) => gui.addFolder(title, { id, open });
  const chips = document.createElement("div"); chips.className = "uchips"; gui.top.append(chips);
  /** Mirror a live setting into the address bar (no reload): null / the default removes it. */
  const setParam = (k, v, def = null) => {
    const q = new URLSearchParams(location.search);
    if (v == null || v === def) q.delete(k); else q.set(k, v);
    history.replaceState(null, "", `${location.pathname}?${q}`);
    renderChips();
  };
  const mode = () => (getThird()?.on ? "third" : driver?.on ? "drive" : ctx.flyer?.on ? "fly" : ctx.walker?.on ? "walk" : "orbit");
  const tileAt = (x, z) => manifest?.tiles.find((t) => t.status !== "missing" && x >= t.bounds.x[0] && x < t.bounds.x[1] && z >= t.bounds.z[0] && z < t.bounds.z[1])?.name ?? null;

  // ---------------------------------------------------------------- the URL switches (viewer/features.js)
  // state at boot = what runs now (ctx.params); a change is STAGED until "Apply & reload"
  const staged = new Map();                   // key -> state
  const rows = new Map();                     // key -> { f, ctrl, folder, boot }
  const folderOf = new Map();                 // group -> folder
  function switches(folder, group) {
    const list = FEATURES.filter((f) => f.group === group && f.ui !== false && !f.live);
    if (!list.length) return;
    folderOf.set(group, folder);
    folder.heading("Switches", "(read at boot: change, then Apply & reload)");
    let sub;
    for (const f of list) {
      if (f.sub !== sub) { sub = f.sub; if (sub) folder.heading(sub); }
      const boot = readSwitch(f, params);
      const st = { v: boot };
      let ctrl;
      if (f.type === "select") {
        const opts = f.options.slice();
        if (boot != null && !opts.some(([v]) => v === boot)) opts.push([boot, boot]);
        const lab = (v) => (opts.find(([o]) => o === v) || opts[0])[1];
        st.lab = lab; st.v = lab(boot);
        ctrl = folder.add(st, "v", opts.map(([, l]) => l)).onChange((l) => stage(f, opts.find(([, x]) => x === l)[0]));
      } else if (f.type === "number") ctrl = folder.add(st, "v", f.min, f.max, f.step).onChange((v) => stage(f, v));
      else if (f.type === "text") { st.v = boot ?? ""; ctrl = folder.text(st, "v", f.placeholder).onChange((v) => stage(f, v.trim() || null)); }
      else ctrl = folder.add(st, "v").onChange((v) => stage(f, v));
      ctrl.name(f.label).hint(`${f.desc}\n?${f.key}  ·  read at boot: needs a reload`).keywords(`${f.key} ${f.sub ?? ""}`);
      keyChip(ctrl, f.key);
      rows.set(f.key, { f, ctrl, folder, boot, st });
    }
  }
  const keyChip = (ctrl, key) => { const l = ctrl.row.querySelector?.("label"); if (l?.tagName === "LABEL") { const k = document.createElement("span"); k.className = "ukey"; k.textContent = key; l.append(k); } };
  const same = (f, a, b) => (f.type === "text" || f.type === "select" ? (a ?? null) === (b ?? null) : a === b);
  function stage(f, v) {
    const r = rows.get(f.key);
    if (same(f, v, r.boot)) staged.delete(f.key); else staged.set(f.key, v);
    r.ctrl.row.classList.toggle("changed", staged.has(f.key));
    for (const [g, fo] of folderOf) fo.count([...staged.keys()].filter((k) => rows.get(k).f.group === g).length || "");
    renderFooter(); renderChips();
  }
  /** put a state into a row's control */
  const show = (r, v) => { r.st.v = r.f.type === "select" ? r.st.lab(v) : r.f.type === "text" ? v ?? "" : v; r.ctrl.updateDisplay(); };
  const defaultOf = (f) => (f.type === "on" ? true : f.type === "opt" || f.type === "old" ? false : f.type === "number" ? f.def : null);
  /** set a switch from code (a chip's ×, a script): shown and staged */
  const setSwitch = (key, v) => { const r = rows.get(key); if (!r) return false; show(r, v); stage(r.f, v); return true; };
  function revert() {
    for (const k of [...staged.keys()]) {
      const r = rows.get(k); staged.delete(k);
      show(r, r.boot); r.ctrl.row.classList.remove("changed");
    }
    for (const fo of folderOf.values()) fo.count("");
    renderFooter(); renderChips();
  }
  /** the URL of the current view (mode, tile, target, camera) on top of the current switches */
  function viewQuery(q = new URLSearchParams(location.search)) {
    q.delete("dev");
    const m = mode();
    const fix = (n) => +n.toFixed(1);
    if (m === "orbit") {
      const t = controls.target, c = camera.position;
      q.set("tile", tileAt(t.x, t.z) || tileAt(c.x, c.z) || q.get("tile") || "I6");
      q.set("view", "stjob"); q.set("at", `${fix(t.x)},${fix(t.z)}`);
      q.set("cam", `${fix(c.x)},${fix(c.z)},${fix(c.y - world.surface(c.x, c.z))}`);
    } else {
      const p = getPlayer?.() ?? { x: camera.position.x, z: camera.position.z };
      q.set("tile", tileAt(p.x, p.z) || q.get("tile") || "I6");
      q.set("view", m); q.set("at", `${fix(p.x)},${fix(p.z)}`); q.delete("cam");
    }
    if (q.get("tile") === "I6") q.delete("tile");
    if (q.get("tile") === "H6") log("dev panel: NB ?tile=H6 at boot is a known crash (TODO.md): the link may not open");
    return q;
  }
  const pretty = (q) => q.toString().replace(/%2C/gi, ",");     // (?at=x,z reads better than x%2Cz; both parse)
  function applyReload() {
    const q = viewQuery();
    for (const [k, v] of staged) writeSwitch(rows.get(k).f, q, v);
    location.search = pretty(q);
  }
  const foot = document.createElement("div"); foot.className = "upend";
  const footTxt = document.createElement("span");
  const bRevert = Object.assign(document.createElement("button"), { className: "ubtn", textContent: "Revert", title: "drop the staged switch changes", onclick: revert });
  const bApply = Object.assign(document.createElement("button"), { className: "ubtn primary", textContent: "Apply & reload", title: "rewrite the URL with the staged switches and reload (the view and mode are kept)", onclick: applyReload });
  foot.append(footTxt, bRevert, bApply);
  function renderFooter() {
    if (!staged.size) { foot.remove(); return; }
    footTxt.textContent = `${staged.size} switch${staged.size > 1 ? "es" : ""} staged`;
    footTxt.title = [...staged].map(([k, v]) => `${k}: ${v}`).join("\n");
    if (!foot.parentNode) gui.footer.append(foot);
  }
  /** chips: every registry switch set in the URL now (not at its default), plus the staged ones */
  function renderChips() {
    const q = new URLSearchParams(location.search);
    chips.textContent = "";
    const add = (text, cls, title, onX, onClick) => {
      const c = document.createElement("span"); c.className = `uchip ${cls}`; c.title = title; c.append(text);
      if (onX) { const x = document.createElement("i"); x.textContent = "×"; x.title = "back to the default"; x.onclick = (e) => { e.stopPropagation(); onX(); }; c.append(x); }
      c.onclick = onClick; chips.append(c);
    };
    const find = (k) => { if (!gui.searchInput) return; gui.searchInput.value = k; gui.filter(k); };
    for (const f of FEATURES) {
      if (NAV.has(f.key) || staged.has(f.key) || !isSet(f, q)) continue;
      const r = rows.get(f.key);
      add(`${f.key}=${q.get(f.key)}`, "", `${f.label}: ${f.desc}${r ? "" : " (live: change it with its control)"}`, r ? () => setSwitch(f.key, defaultOf(f)) : null, () => find(f.key));
    }
    for (const [k, v] of staged) {
      const r = rows.get(k), t = new URLSearchParams(); writeSwitch(r.f, t, v);
      add(t.has(k) ? `${k}=${t.get(k)}` : `${k}: default`, "staged", `staged (Apply & reload): ${r.f.label}`, () => setSwitch(k, r.boot), () => find(k));
    }
  }

  // ---------------------------------------------------------------- state (what the "panel settings" link carries)
  const S = {
    preset: tsel.value, hour: lighting.hour, day: lighting.day, timeSpeed: 0,
    coverage: lighting.firm?.coverage ?? 0.4, cloudType: lighting.firm?.cloudType ?? 0.5,
    cirrus: SP?.cirrus ?? 0.5, windSpeed: SP?.windSpeed ?? 12, windDeg: SP?.windDeg ?? 70, cloudBase: SP?.cloudBase ?? 4000,
    haze: SP?.haze ?? 1.6, aerosols: SP?.aerosols ?? 1, sunSize: SP?.sunSizeDeg ?? 0.6,
    autoExposure: SP?.autoExposure ?? true, ev: 0, nightEV: SP?.nightEV ?? 1.6,
    vfog: !!lighting.vfogOn, fogDensity: lighting.vfogParams?.density ?? 0.014, fogTop: lighting.vfogParams?.top ?? 82, fogFalloff: lighting.vfogParams?.falloff ?? 18,
    lampPower: uLampPower.value, ao: pipe?.uniforms.ao.value ?? 0.6, ssr: pipe?.uniforms.ssr.value ?? 1, bloom: pipe?.bloomPass?.strength.value ?? 0.24,
    skyHaze: dev.haze, shadows: lighting.sun.castShadow, fov: camera.fov,
    car: params.get("car") || "faceted:hatch_c", char: params.get("char") || "hoodie", parked: true,
  };

  // ---------------------------------------------------------------- Go to & share
  const fG = section("goto", "Go to & share", true);
  const HERE = { here: "", xz: "" };
  async function goTo(pl) {
    const [px, ph, pz] = pl.p, [tx, th, tz] = pl.t;
    const m = mode();
    if (!teleport) { log("go to: no teleport (main.js)"); return; }
    log(`go to: ${pl.name}…`);
    try {
      // the target tile streams in (the map's teleport); orbit: the camera at p looking at t; a mode: started at p facing t
      const at = m === "orbit" ? [tx, tz] : [px, pz];
      const r = await teleport({ x: at[0], z: at[1], yaw: Math.atan2(tz - pz, tx - px), exact: true });
      if (m === "orbit") {
        const g = (x, z) => world.ground?.(x, z) ?? world.surface(x, z);
        camera.position.set(px, g(px, pz) + ph, pz);
        // (the orbit keeps the camera above its target: a street-level target no higher than the eye)
        controls.target.set(tx, Math.min(g(tx, tz) + th, camera.position.y - 0.05), tz);
        if (pl.fov) { camera.fov = S.fov = pl.fov; camera.updateProjectionMatrix(); }
        controls.update(); lighting.snapNext = true;
      }
      log(`go to: ${pl.name} (tile ${r.tile}, ${r.ms.toFixed(0)} ms, ${m})`);
    } catch (e) { log(`go to ${pl.name}: ${e.message}`); }
  }
  let grp;
  for (const pl of PLACES) {
    if (pl.group !== grp) { grp = pl.group; fG.heading(grp); fG.buttons(PLACES.filter((p) => p.group === grp).map((p) => [p.name, () => goTo(p), `${p.name} (tile ${p.tile}): x ${p.t[0]}, z ${p.t[2]}${p.p[1] <= 3 ? ", street level" : ""}`]), 2); }
  }
  fG.heading("Position");
  fG.add(HERE, "here").name("here").listen();
  fG.text(HERE, "xz", "x, z  (city metres)").name("go to x, z").hint("type 'x, z' (city metres, x east, z south) and Enter: the tile streams in, the mode is kept").onChange((v) => {
    const [x, z] = v.split(/[ ,;]+/).map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(z)) { log("go to: type 'x, z'"); return; }
    const c = camera.position, t = controls.target, dx = c.x - t.x, dz = c.z - t.z, dh = c.y - t.y;
    goTo({ name: `${x}, ${z}`, p: [x + dx, Math.max(dh, 2), z + dz], t: [x, 0, z] });
  });
  fG.heading("Share");
  fG.buttons([
    ["🔗 Copy link to this view", () => share(false), "the URL with the tile, mode, target and camera (?tile ?view ?at ?cam) and every switch set now"],
    ["Copy link + panel settings", () => share(true), "the same plus the panel's live settings (sky, time, post, smoothness...) as ?dev="],
  ], 1);

  // ---------------------------------------------------------------- Modes & camera
  const fC = section("modes", "Modes & camera");
  const viewParam = { overview: null, stjob: "stjob", walk: "walk", fly: "fly", drive: "drive", third: "third" };
  const go = (k, f) => () => { f(); setParam("view", viewParam[k]); };
  fC.buttons([
    ["Overview", go("overview", () => setView("overview")), "orbit, the start tile from above"], ["Close-up", go("stjob", () => setView("stjob")), "orbit, Saint-Job (or ?at / ?cam)"],
    ["Walk", go("walk", () => walk()), "first person: WASD, drag to look, Shift run"], ["Fly (falcon)", go("fly", () => fly()), "the falcon flight"],
    ["Drive", go("drive", () => drive()), "the car, on the nearest road"], ["Third person", go("third", () => thirdPerson()), "a character on foot"],
  ], 3);
  const cars = ["scripted", ...FACETED.map((id) => `faceted:${id}`)];
  if (!cars.includes(S.car)) cars.push(S.car);
  fC.add(S, "car", cars).name("car (drive)").onChange(async (v) => {
    setParam("car", v, "faceted:hatch_c");
    try { await driver.setCar(v); log(`drive: car ${v}`); } catch (e) { log(`drive: car ${v} failed (${e.message})`); }
  });
  fC.add({ on: /[?&]drivedebug=1/.test(location.search) }, "on").name("car colliders (G)").onChange((v) => { driver.debug.visible = v; driver.debugWanted = v; setParam("drivedebug", v ? "1" : null); });
  fC.add(S, "char", CHARS).name("character (3rd person)").onChange(async (v) => {
    setParam("char", v, "hoodie");
    const t = getThird();
    if (!t) { log("third person: the character applies when the mode starts"); return; }
    try { await t.tp.useCharacter(v, renderer); t.character = v; log(`third person: ${v}`); } catch (e) { log(`third person: ${v} failed (${e.message})`); }
  });
  fC.add({ on: /[?&]chardebug=1/.test(location.search) }, "on").name("character colliders (G)").onChange((v) => {
    setParam("chardebug", v ? "1" : null);
    const t = getThird(); if (t) t.tp.debug.visible = v;
  });
  fC.add({ on: true }, "on").name("foot IK").onChange((v) => { const t = getThird(); if (t) t.tp.body.ikOn = v; });
  fC.add(S, "fov", 25, 90, 1).name("field of view").onChange((v) => { camera.fov = v; camera.updateProjectionMatrix(); });
  fC.add({ f: () => photo(true) }, "f").name("Photo mode (H to leave)");
  switches(fC, "modes");

  // ---------------------------------------------------------------- Time & sun
  const fT = section("time", "Time & sun");
  fT.add(S, "preset", TIMES).name("preset").onChange((v) => {
    tsel.value = v; tsel.onchange();
    lighting.hourOverride = null; lighting.urlHour = null; S.hour = lighting.hour; S.coverage = lighting.firm.coverage; S.cloudType = lighting.firm.cloudType; S.vfog = !!lighting.vfogOn;
    setParam("time", v, "golden"); setParam("hour", null);
    refresh();
  });
  fT.add(S, "hour", 0, 24, 0.01).name("solar time (h)").onChange((v) => { lighting.hourOverride = v; setParam("hour", v.toFixed(2)); }).listen();
  fT.add(S, "day", 1, 365, 1).name("day of year").onChange((v) => { lighting.day = v; setParam("day", v, 200); });
  let sunRaf = 0, sunLast = 0;
  const sunStep = (now) => {     // the sun moves every frame while a speed is set (no frame cost otherwise)
    const dt = Math.min(0.1, (now - (sunLast || now)) / 1000); sunLast = now;
    if (!S.timeSpeed) { sunRaf = 0; sunLast = 0; return; }
    S.hour = (lighting.hour + S.timeSpeed * dt / 3600) % 24; lighting.hourOverride = S.hour;
    sunRaf = requestAnimationFrame(sunStep);
  };
  fT.add(S, "timeSpeed", 0, 2000, 1).name("sun speed (x real)").onChange((v) => { if (v && !sunRaf) sunRaf = requestAnimationFrame(sunStep); });
  fT.add({ f: () => { lighting.hourOverride = null; lighting.urlHour = null; S.hour = lighting.hour; setParam("hour", null); refresh(); } }, "f").name("back to the preset's time");
  switches(fT, "time");

  // ---------------------------------------------------------------- Sky & clouds (Firmament)
  if (SP) {
    const fS = section("sky", "Sky & clouds");
    fS.add(S, "coverage", 0, 1, 0.01).name("cloud cover").onChange((v) => { lighting.firm.coverage = v; });
    fS.add(S, "cloudType", 0, 1, 0.01).name("type: stratus ↔ cumulus ↔ storm").onChange((v) => { lighting.firm.cloudType = v; });
    fS.add(S, "cloudBase", 500, 8000, 50).name("cloud base (m)").onChange((v) => { SP.cloudBase = v; });
    fS.add(S, "cirrus", 0, 1.5, 0.01).onChange((v) => { SP.cirrus = v; });
    fS.add(S, "windSpeed", 0, 90, 0.5).name("wind at the clouds (m/s)").onChange((v) => { SP.windSpeed = v; });
    fS.add(S, "windDeg", 0, 360, 1).name("wind direction (°)").onChange((v) => { SP.windDeg = v; });
    fS.add(S, "haze", 0, 6, 0.05).name("air haze").onChange((v) => { SP.haze = v; });
    fS.add(S, "aerosols", 0, 45, 0.1).name("aerosols (whiter sky)").onChange((v) => { SP.aerosols = v; });
    fS.add(S, "sunSize", 0.3, 3, 0.01).name("sun disc (°)").onChange((v) => { SP.sunSizeDeg = v; });
    fS.add(S, "autoExposure").name("eye adaptation").onChange((v) => { SP.autoExposure = v; });
    fS.add(S, "ev", -3, 3, 0.1).name("exposure bias (EV)").onChange((v) => { if (pipe) pipe.evBias = v; });
    fS.add(S, "nightEV", 0, 4, 0.1).name("night exposure (EV)").onChange((v) => { SP.nightEV = v; });
  }

  // ---------------------------------------------------------------- Weather
  const fW = section("weather", "Weather");
  // the fog keeps its own copy of the settings once created (vendor/volumetric-fog: P = { ...defaults, ...params }):
  // write both, or the sliders do nothing
  const fogSet = (k, v) => { lighting.vfogParams[k] = v; if (lighting.vfog?.params) lighting.vfog.params[k] = v; };
  fW.add(S, "vfog").name("volumetric valley fog").onChange((v) => { lighting.vfogOn = v; setParam("vfog", v ? "1" : null); });
  fW.add(S, "fogDensity", 0.001, 0.05, 0.001).name("fog density").onChange((v) => fogSet("density", v));
  fW.add(S, "fogTop", 40, 160, 1).name("fog layer top (m TAW)").onChange((v) => fogSet("top", v));
  fW.add(S, "fogFalloff", 2, 60, 1).name("fog falloff (m)").onChange((v) => fogSet("falloff", v));
  // rain / snow / fog presets, live weather, the simulated surface state (viewer/weather/cityWeather.js; ?weather=old none)
  cityWeather.panel(fW, setParam);
  switches(fW, "weather");

  // ---------------------------------------------------------------- Night (docs/NIGHT_HOOKUP.md)
  const fN = section("night", "Night");
  fN.note("The night lights are a boot flag (?night=1). The night look itself: Time & sun → preset 'night'.");
  switches(fN, "night");

  // ---------------------------------------------------------------- Traffic, trams & trains (line 92 on STIB's timetable)
  const fTr = section("transit", "Traffic, trams & trains");
  const TR = { clock: 12, speed: 1, on: params.get("trams") !== "0", model: params.get("tram") !== "box", info: "" };
  fTr.add(TR, "clock", 0, 23.99, 1 / 60).name("timetable clock (h)").onChange((v) => {
    const t = getTram(); if (!t) return;
    t.setClock(v * 3600);
    const hh = Math.floor(v), mm = Math.round((v - hh) * 60);
    setParam("clock", `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }).listen();
  fTr.add(TR, "speed", 0, 60, 0.5).name("timetable speed (x real)").onChange((v) => { getTram()?.setTimescale(v); setParam("timescale", v, 1); });
  fTr.add({ f: () => { const t = getTram(); if (!t) return; t.setClock(null); t.setTimescale(1); TR.speed = 1; setParam("clock", null); setParam("timescale", null); refresh(); } }, "f").name("back to now, real speed");
  fTr.add(TR, "info").name("running").listen();
  switches(fTr, "transit");

  // ---------------------------------------------------------------- Lighting & post
  const fL = section("lighting", "Lighting & post");
  fL.add(S, "lampPower", 0, 5, 0.05).name("street lamp pools").onChange((v) => { uLampPower.value = v; });
  fL.add(S, "skyHaze").name("sky haze + sun shafts").onChange((v) => { dev.haze = v; setParam("haze", v ? null : "0"); });
  if (pipe) {
    fL.add(S, "ao", 0, 1, 0.01).name("ambient occlusion").onChange((v) => { pipe.uniforms.ao.value = v; });
    fL.add(S, "ssr", 0, 2, 0.01).name("reflections (SSR)").onChange((v) => { pipe.uniforms.ssr.value = v; });
    fL.add(S, "bloom", 0, 1.5, 0.01).name("bloom").onChange((v) => { pipe.bloomPass.strength.value = v; });
  }
  fL.add(S, "shadows").name("sun shadows (recompiles)").onChange((v) => { lighting.sun.castShadow = v; });
  switches(fL, "lighting");

  // ---------------------------------------------------------------- World layers (live + every feature switch)
  const fWo = section("world", "World layers");
  fWo.heading("Live");
  for (const k of Object.keys(layers)) fWo.add(layers[k], "visible").name(`layer: ${k}`);
  fWo.add({ c: false }, "c").name("contour lines (1 m)").onChange((v) => { contourOn.value = v ? 1 : 0; });
  fWo.add(S, "parked").name("parked cars").onChange((v) => scene.traverse((o) => { if ((o.name === "parked-cars" || o.name === "parked-cars-fleet") && o.isGroup) o.visible = v; }));   // box cars (?cars=box) or the faceted fleet (carFleet.js)
  switches(fWo, "world");

  // ---------------------------------------------------------------- A/B: the versions before
  const fAB = section("ab", "A/B: old versions");
  fAB.note("Each switch brings back the version before a change, for comparisons (?x=old / ?x=0). Default = the current city.");
  switches(fAB, "ab");

  // ---------------------------------------------------------------- Streaming & boot, Smoothness (viewer/smoothPanel.js)
  const fSt = section("streaming", "Streaming & boot");
  const ST = { tiles: "" };
  fSt.add(ST, "tiles").name("tiles now").listen();
  switches(fSt, "streaming");
  const SM = addSmoothnessFolder(gui, ctx).state || null;

  // ---------------------------------------------------------------- Performance
  const fP = section("perf", "Performance");
  const pe = document.createElement("div"); pe.className = "uperf";
  const tile = (label) => { const d = document.createElement("div"), b = document.createElement("b"), s = document.createElement("span"); b.textContent = "–"; s.textContent = label; d.append(b, s); pe.append(d); return b; };
  const T = { fps: tile("fps"), frame: tile("frame ms p50/95"), gpu: tile("GPU ms p50/95"), draws: tile("draw calls"), tris: tile("triangles"), mem: tile("GPU memory"),
    tex: tile("geo / textures"), shaders: tile("shaders"), heap: tile("JS heap") };
  fP.custom(pe, "fps gpu ms frame draw calls triangles memory heap shaders textures geometries");
  const graph = document.createElement("canvas"); graph.className = "ugraph"; graph.width = 632; graph.height = 108;
  graph.title = "frame time (display frame interval), last 160 frames; lines at 16.7 and 33.3 ms";
  fP.custom(graph, "frame time graph");
  const pline = document.createElement("div"); pline.className = "uperfline";
  fP.custom(pline, "tiles streaming character car cpu");
  const M = { bench: "" };
  fP.buttons([["▶ Benchmark (3 views, ~20 s)", () => benchmark(), "overview, close-up, walk: GPU ms p50/p95 each, in the log"], ["GPU passes → log", () => {
    const p = gpuPasses?.(); log(p ? `GPU passes (ms, last frame): ${p.slice(0, 12).map(([k, ms]) => `${k} ${ms}`).join(" · ")}` : "GPU passes: no timestamps (?gpu=0?)");
  }, "ms per render pass of the last resolved frame, biggest first"]], 1);
  fP.add(M, "bench").name("last benchmark").listen();
  switches(fP, "perf");
  // the frame-time sampler: one rAF, only while the section is open and the panel shown (no allocation per frame)
  const FT = new Float32Array(160), FS = new Float32Array(160);
  let ftN = 0, ftI = 0, ftRaf = 0, ftLast = 0;
  const ftStep = (now) => {
    if (ftLast) { FT[ftI] = now - ftLast; ftI = (ftI + 1) % FT.length; if (ftN < FT.length) ftN++; }
    ftLast = now; ftRaf = requestAnimationFrame(ftStep);
  };
  const sampler = () => {
    const want = fP.isOpen && gui.visible;
    if (want && !ftRaf) { ftLast = 0; ftRaf = requestAnimationFrame(ftStep); }
    if (!want && ftRaf) { cancelAnimationFrame(ftRaf); ftRaf = 0; }
  };
  fP.onToggle(sampler); gui.onVisible(sampler); sampler();
  const g2 = graph.getContext("2d");
  const set = (b, txt, cls = "") => { if (b.textContent !== txt) b.textContent = txt; if (b.className !== cls) b.className = cls; };
  function drawGraph() {
    const w = graph.width, h = graph.height, max = 50;
    g2.clearRect(0, 0, w, h);
    const bw = w / FT.length;
    for (let i = 0; i < ftN; i++) {
      const v = FT[(ftI - ftN + i + FT.length) % FT.length], bh = Math.min(h, v / max * h);
      g2.fillStyle = v > 33.4 ? "#e5534b" : v > 17.5 ? "#e0a03c" : "#4f8fea";
      g2.fillRect(i * bw, h - bh, Math.max(1, bw - 1), bh);
    }
    g2.fillStyle = "rgba(128,128,128,.55)";
    for (const ms of [16.7, 33.3]) g2.fillRect(0, Math.round(h - ms / max * h), w, 1);
  }
  let gpuTick = 0;
  function updatePerf(fps) {
    set(T.fps, fps.toFixed(0), fps < 30 ? "bad" : fps < 55 ? "warn" : "ok");
    if (ftN > 4) {
      FS.set(FT); const s = FS.subarray(0, ftN).sort();
      const p50 = s[Math.floor(ftN * 0.5)], p95 = s[Math.min(ftN - 1, Math.floor(ftN * 0.95))];
      set(T.frame, `${p50.toFixed(1)} / ${p95.toFixed(0)}`, p95 > 33.4 ? "bad" : p95 > 20 ? "warn" : "");
    }
    if (++gpuTick % 2 === 0) {           // (gpuStats sorts its 600 samples: 2 Hz)
      const g = gpuStats();
      set(T.gpu, g.p50 != null ? `${g.p50} / ${g.p95}` : renderer.backend.trackTimestamp ? "…" : "off", g.p95 > 16.7 ? "bad" : g.p95 > 12 ? "warn" : "");
    }
    const r = renderer.info.render, mem = renderer.info.memory;
    set(T.draws, String(r.drawCalls ?? r.calls));
    set(T.tris, `${(r.triangles / 1e6).toFixed(2)} M`);
    set(T.mem, mem.total != null ? `${(mem.total / 1e6).toFixed(0)} MB` : "–");
    set(T.tex, `${mem.geometries ?? "–"} / ${mem.textures ?? "–"}`);
    set(T.shaders, String(mem.programs ?? "–"));
    const heap = performance.memory?.usedJSHeapSize;
    set(T.heap, heap ? `${(heap / 1e6).toFixed(0)} MB` : "n/a");
    const t = getThird();
    const cpu = t?.on ? `character ${t.tp.perf.ms.toFixed(3)} ms` : driver?.on ? `car ${driver.ms.toFixed(3)} ms` : "";
    const txt = `${ST.tiles}${cpu ? `\n${cpu} CPU` : ""}`;
    if (pline.textContent !== txt) pline.textContent = txt;
    drawGraph();
  }
  async function benchmark() {
    const out = [], sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (const [name, goV] of [["overview", () => setView("overview")], ["close-up", () => setView("stjob")], ["walk", () => walk()]]) {
      goV(); await sleep(2500); resetGpu(); await sleep(3500);
      const g = gpuStats(); out.push(`${name} ${g.p50}/${g.p95}`);
    }
    M.bench = out.join(" · ");
    log(`benchmark GPU ms p50/p95: ${M.bench}`);
  }

  // ---------------------------------------------------------------- Debug & audits
  const fD = section("debug", "Debug & audits");
  const D = { wireframe: false, log: !!document.getElementById("logBox")?.open, hud: true };
  fD.add(D, "wireframe").onChange((v) => scene.traverse((o) => { for (const m of [].concat(o.material || [])) { m.wireframe = v; m.needsUpdate = true; } }));
  fD.add(D, "log").name("dev log").onChange((v) => { const b = document.getElementById("logBox"); if (b) b.open = v; setParam("log", v ? "1" : null); });
  fD.add(D, "hud").name("HUD (stats + log)").onChange((v) => setHudHidden(!v));
  fD.heading("Audits", "(results in the log)");
  fD.buttons([
    ["Collider audit (loaded tiles)", async () => {
      try { const a = await window.viewer.auditColliders(); log(`collider audit: ${JSON.stringify(a.total)}`); } catch (e) { log(`collider audit: ${e.message}`); }
    }, "the drive colliders of the loaded tiles against what is drawn (viewer/drive/colliderAudit.js)"],
    ["URL switches → log", () => {
      const q = new URLSearchParams(location.search);
      log(`URL switches (${FEATURES.length} known, viewer/features.js): set now: ${FEATURES.filter((f) => isSet(f, q)).map((f) => `${f.key}=${q.get(f.key)}`).join(" ") || "none"}`);
    }, "the switches set in the URL now"],
  ], 1);
  switches(fD, "debug");

  // the live controls of the registry: found by their URL key in the search, the key shown
  for (const f of FEATURES) if (f.live) { const c = gui.all.find((x) => x._label === f.live); if (c) { c.keywords(f.key); keyChip(c, f.key); } }

  // ---------------------------------------------------------------- the 4 Hz read-outs (nothing while the panel is hidden)
  let wasDriving = false, lastFrames = frames?.() ?? 0, lastT = performance.now();
  setInterval(() => {
    if (driver?.on && !wasDriving && driver.debugWanted != null) driver.debug.visible = driver.debugWanted;   // the toggle survives a restart
    wasDriving = !!driver?.on;
    const now = performance.now(), f = frames?.() ?? 0, fps = (f - lastFrames) / ((now - lastT) / 1000);
    lastFrames = f; lastT = now;
    if (!gui.visible) return;
    const badge = `${mode()} · ${fps.toFixed(0)} fps`;
    if (gui.badge.textContent !== badge) gui.badge.textContent = badge;
    if (fG.isOpen) {
      const p = getPlayer?.() ?? { x: controls.target.x, z: controls.target.z };
      HERE.here = `${tileAt(p.x, p.z) ?? "?"}  x ${p.x.toFixed(0)}  z ${p.z.toFixed(0)}`;
    }
    if (fTr.isOpen) { const tr = getTram(); if (tr) { TR.clock = tr.clockSecs / 3600; TR.info = tr.info().split(". ")[0].replace(/^tram \d+ \([^)]*\): /, ""); } }
    if (fSt.isOpen || fP.isOpen) { const lite = getLite?.(); ST.tiles = `full ${world.tiles.length} (${world.tiles.map((t) => t.name).join(" ")}) · far ${lite?.size ?? "?"}`; }
    if (fP.isOpen) updatePerf(fps);
  }, 250);

  // ---------------------------------------------------------------- photo mode, keys, key help
  let photoOn = false, panelWas = true;
  function photo(on) {
    if (on === photoOn) return;
    photoOn = on;
    document.body.classList.toggle("photo", on);
    if (on) { panelWas = !gui.domElement.classList.contains("hidden"); gui.setVisible(false); } else gui.setVisible(panelWas);
    setHudHidden(on || !D.hud);
  }
  let help = null;
  function keyHelp(on = !help) {
    if (!on) { help?.remove(); help = null; return; }
    help = document.createElement("div"); help.className = "ukeys";
    const card = document.createElement("div");
    let html = "<h2>Keys</h2><div class=ucols>";
    for (const [h, list] of KEYS) html += `<section><h3>${h}</h3><table>${list.map(([k, d]) => `<tr><td>${k.split(" · ").map((x) => x.split(" / ").map((y) => `<kbd>${y}</kbd>`).join(" / ")).join(" · ")}</td><td>${d}</td></tr>`).join("")}</table></section>`;
    html += `<section><h3>URL</h3><div>Every ?switch is in the panel (search its key). ?panel=0: no panel. Docs: docs/DEVPANEL.md.</div></section></div>`;
    card.innerHTML = html; help.append(card);
    help.onclick = (e) => { if (e.target === help) keyHelp(false); };
    document.body.append(help);
  }
  gui.iconButton("?", "keys (?)", () => keyHelp());
  gui.iconButton("⊟", "close every section", () => gui.collapseAll());
  gui.iconButton("×", "hide the panel ( ` brings it back)", () => gui.setVisible(false), true);
  const typing = () => /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName ?? "");
  addEventListener("keydown", (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape" && help) { keyHelp(false); return; }
    if (typing()) return;
    if (e.code === "KeyH") photo(!photoOn);
    else if (e.code === "Backquote") { if (photoOn) photo(false); gui.setVisible(gui.domElement.classList.contains("hidden")); }
    else if (e.key === "?") keyHelp();
    else if (e.key === "/") {
      e.preventDefault();
      if (photoOn) photo(false);
      if (gui.domElement.classList.contains("hidden")) gui.setVisible(true);
      if (gui.domElement.classList.contains("closed")) gui.setCollapsed(false);
      gui.searchInput?.focus(); gui.searchInput?.select();
    }
  });

  // ---------------------------------------------------------------- share link
  function share(withPanel) {
    const q = viewQuery();
    if (withPanel) {
      const smooth = SM ? Object.fromEntries(Object.entries(SM).filter(([, v]) => typeof v === "number")) : undefined;
      const st = { ...S, smooth, mode: mode(), cam: camera.position.toArray().map((n) => +n.toFixed(2)), tgt: controls.target.toArray().map((n) => +n.toFixed(2)) };
      q.set("dev", btoa(JSON.stringify(st)));
    }
    const url = `${location.origin}${location.pathname}?${pretty(q)}`;
    navigator.clipboard?.writeText(url).then(() => log(`dev panel: link copied (${url.length} chars)`), () => log(url));
    history.replaceState(null, "", url);
    renderChips();
  }
  // restore a shared view (the mode's own state: car, character come from the URL / S)
  const enc = params.get("dev");
  if (enc) {
    try {
      const st = JSON.parse(atob(enc));
      const skip = new Set(["preset", "car", "char", "parked"]);
      for (const c of gui.controllersRecursive()) if (c.object === S && c.property in st && !skip.has(c.property)) { c.setValue(st[c.property]); }
      if (st.preset && st.preset !== S.preset) gui.controllersRecursive().find((c) => c.property === "preset")?.setValue(st.preset);
      if (st.hour != null) { lighting.hourOverride = st.hour; S.hour = st.hour; }
      if (SM && st.smooth) for (const c of gui.controllersRecursive()) if (c.object === SM && c.property in st.smooth) c.setValue(st.smooth[c.property]);
      if (st.cam && st.tgt && (!st.mode || st.mode === "orbit")) { setView("stjob"); camera.position.fromArray(st.cam); controls.target.fromArray(st.tgt); controls.update(); }
      else if (st.mode === "drive") drive(); else if (st.mode === "third") thirdPerson(); else if (st.mode === "fly") fly(); else if (st.mode === "walk") walk();
      refresh();
      // the link has done its job: drop it from the address bar, or a reload would put the shared state back over
      // everything changed since (the live settings are mirrored into their own parameters)
      const q = new URLSearchParams(location.search); q.delete("dev");
      history.replaceState(null, "", `${location.pathname}?${q}`);
    } catch (e) { log(`dev link: ${e.message}`); }
  }
  renderChips();
  window.__devPanel = { gui, S, TR, M, pipe, mode, staged, rows, setSwitch, applyReload, revert, goTo, places: PLACES, section, switches, setParam, photo, keyHelp };
  return gui;
}
