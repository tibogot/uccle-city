// Dev panel audit (viewer/devPanel.js + smoothPanel.js): every control is changed through the panel (Ctrl.setValue /
// its button) and checked against the engine value it should drive, the address bar where it should be mirrored,
// and a picture difference where the control is visual (share of pixels that change by > 8/255, small readback).
//   const a = await import("/debug/panelAudit.js"); await a.audit()   -> rows { folder, control, engine, url, picture }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frames = (n) => new Promise((r) => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });

let cv = null;
async function grab() {
  await frames(3);
  const c = viewer.renderer.domElement;
  cv ||= Object.assign(document.createElement("canvas"), { width: 192, height: 108 });
  const g = cv.getContext("2d", { willReadFrequently: true });
  await new Promise((r) => requestAnimationFrame(() => { viewer.renderFrame(); g.drawImage(c, 0, 0, cv.width, cv.height); r(); }));
  return g.getImageData(0, 0, cv.width, cv.height).data;
}
const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 24) n++; return +(100 * n / (a.length / 4)).toFixed(1); };

export function controls() {
  const out = [];
  for (const f of document.querySelectorAll(".upanel .usec")) {
    const folder = f.querySelector(".ustitle .uname")?.textContent || "";
    for (const el of f.querySelectorAll(".ubody > .urow, .ubody > button, .ubody > .ubtns > button")) out.push({ folder, label: el.tagName === "BUTTON" ? el.textContent : el.querySelector("label").textContent, el });
  }
  return out;
}
// a label, or "label#n" for the n-th control with that label (the two "  morph band (m)")
const ctrl = (label) => {
  const [l, n = 0] = label.split("#");
  return window.__devPanel.gui.controllersRecursive().filter((c) => (c._label ?? c.row?.querySelector?.("label")?.textContent ?? c.row?.querySelector?.()?.textContent) === l)[+n];
};

/** Change one control, run check(), restore. `visual`: also measure the picture change. */
export async function probe(label, value, check, { visual = false, restore = true, wait = 300 } = {}) {
  const c = ctrl(label);
  if (!c) return { control: label, result: "NOT FOUND" };
  const before = c.object[c.property];
  const p0 = visual ? await grab() : null;
  const url0 = location.search;
  if (typeof before === "function") c.object[c.property].call(c.object); else c.setValue(typeof value === "function" ? value(before) : value);
  await sleep(wait);
  const p1 = visual ? await grab() : null;
  let engine;
  try { engine = await check(); } catch (e) { engine = `ERR ${e.message}`; }
  const url = location.search !== url0 ? decodeURIComponent(location.search.replace(url0.slice(1), "…")) : "unchanged";
  const picture = visual ? diff(p0, p1) : null;
  if (restore && typeof before !== "function") { c.setValue(before); await sleep(100); }
  return { control: label, engine, url, picture };
}
