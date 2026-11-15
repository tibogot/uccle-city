// Snow round 2 (docs/WEATHER.md "Snow round 2"): tracks + caps checks from the console / the agent's tab.
//   const s = await import("/debug/snowTracks.js");
//   await s.walk(1155, 543.6, 90, 3.5)       walk east (deg: 0 = -z, 90 = +x) for 3.5 s, then look back at the prints
//   await s.drive(1150, 548, 90, 3, "car")   drive (or "moto") for 3 s, then stop
//   await s.look(x, z, h, tx, tz, th)         orbit camera at x, z, h m above the ground looking at tx, tz, th
//   s.stats()                                 trail + movers + caps stats
const V = () => window.viewer;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const W = async () => (await import("/viewer/weather/cityWeather.js")).cityWeather;
const key = (type, code) => { const e = new KeyboardEvent(type, { code, key: code === "KeyW" ? "w" : code, bubbles: true }); window.dispatchEvent(e); document.dispatchEvent(e); };
const yawOf = (deg) => -deg * Math.PI / 180;     // walker yaw: 0 = -z, +90 deg (our "east") = -pi/2

export async function walk(x, z, deg, secs = 3, { back = true, pitch = -0.55 } = {}) {
  const w = (await W()).movers.walker;
  w.start(x, z, yawOf(deg));
  await wait(700);
  key("keydown", "KeyW"); await wait(secs * 1000); key("keyup", "KeyW");
  await wait(400);
  if (back) { w.yaw += Math.PI; w.pitch = pitch; }
  await wait(600);
  return { x: w.x, z: w.z };
}
export async function drive(x, z, deg, secs = 3, vehicle = "car") {
  const d = (await W()).movers.driver;
  const c = await W();
  c.movers.walker.on = false; V().controls.enabled = false;
  await d.start(x, z, deg * Math.PI / 180, vehicle === "moto" ? "moto" : "car");
  await wait(1200);
  key("keydown", "KeyW"); await wait(secs * 1000); key("keyup", "KeyW");
  key("keydown", "KeyS"); await wait(900); key("keyup", "KeyS");
  await wait(800);
  return { x: d.state.x, z: d.state.z, v: Math.hypot(d.state.vx ?? 0, d.state.vz ?? 0) };
}
export async function look(x, z, h, tx, tz, th = 0) {
  const v = V(), w = v.world, c = await W();
  // (no setView: its preset camera jump would move the trail window away and clear the tracks)
  c.movers.walker.on = false; c.movers.driver.stop(); v.controls.enabled = true;
  v.camera.position.set(x, w.surface(x, z) + h, z);
  v.controls.target.set(tx, w.surface(tx, tz) + th, tz);
  v.controls.update();
  await wait(700);
}
export async function stats() {
  const c = await W();
  return { trails: c.trails?.stats, movers: c.snowMovers?.stats, caps: c.caps?.stats };
}
/** a jpg of the canvas posted to the receiver (tools: a tiny POST-to-file server), else returned as a data URL */
export async function shot(name, url = null) {
  const w = await import("/debug/weatherCity.js");
  if (url) return w.save(name, url);
  return w.jpg();
}

/** the proof views of docs/WEATHER.md "Snow round 2" (same camera with and without the round's switches) */
export async function proofView(name) {
  const near = (arr, stride, x, z, off = 0) => {
    let best = null, bd = 1e18;
    for (let o = 0; o < arr.length; o += stride) { const d = (arr[o + off] - x) ** 2 + (arr[o + off + 2] - z) ** 2; if (d < bd) { bd = d; best = o; } }
    return best;
  };
  if (name === "walk") return look(1166.5, 545.8, 1.6, 1158, 543.4, 0);
  if (name === "drive") return look(1172, 538.5, 1.2, 1165, 541.5, 0);
  if (name === "carClose") return look(1236.9, 594.4, 1.9, 1233.4, 591.9, 0.8);
  if (name === "car20") return look(1250, 603, 3.0, 1233.4, 591.9, 0.8);
  if (name === "shelter") { const yaw = -1.2506, fx = Math.sin(yaw), fz = Math.cos(yaw), x = 1217.15, z = 612.97; return look(x + fx * 5 + Math.cos(yaw) * 3, z + fz * 5 - Math.sin(yaw) * 3, 3.2, x, z, 2.0); }
  if (name === "wall") return look(1213.5, 633.5, 1.7, 1209, 629.3, 0.6);
  if (name === "bench") {
    const { cityFurniture } = await import("/viewer/furniture2/cityFurniture.js");
    let best = null, bd = 1e18;
    for (const t of cityFurniture.tiles.values()) for (const p of ["bench_street", "bench_park", "bench_backless"]) { const A = t.inst?.[p]; if (!A) continue; for (let o = 0; o < A.length; o += 8) { const d = (A[o] - 1180) ** 2 + (A[o + 2] - 545) ** 2; if (d < bd) { bd = d; best = [A[o], A[o + 2], A[o + 3]]; } } }
    if (!best) return null;
    const [x, z, yaw] = best, fx = Math.sin(yaw), fz = Math.cos(yaw);
    await look(x + fx * 2.2 + Math.cos(yaw) * 1.2, z + fz * 2.2 - Math.sin(yaw) * 1.2, 1.5, x, z, 0.4);
    return best;
  }
  if (name === "trees") return look(1185, 538, 1.7, 1150, 556, 9);
  return null;
}
