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
