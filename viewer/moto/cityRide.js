// THE TWO-WHEELER MODES' CITY GLUE (motorbike round 2, docs/MOTO.md): what main.js would otherwise carry, kept here so
// its edits stay small (another branch works on main.js's boot).
//   K           the scooter, on the nearest road (like B for the motorbike)
//   V           a Villo: the nearest station's docked bike within 250 m (taken out of the street kit: viewer/moto/
//               villoDocks.js), else one on the nearest road (a free ride, no station near)
//   E on foot   near a docked bike (walk / third person): take it ("E: take a Villo bike" prompt)
//   E riding    a Villo, slow, near a station's free dock: dock it, back on foot beside it ("E: dock the bike")
// hookRides({ driver, walker, getThird, drive, onFoot, updaters, log }) -> { scooter(), villo() }
import { nearBike, freeDock, takeBike, poseOf } from "./villoDocks.js";

export function hookRides({ driver, walker, getThird, drive, onFoot, leaveFoot, focus, updaters, log = console.log }) {
  // the prompt (own UI: one small line above the HUD)
  const tip = document.createElement("div");
  Object.assign(tip.style, { position: "fixed", left: "50%", bottom: "54px", transform: "translateX(-50%)", padding: "5px 12px", borderRadius: "7px",
    background: "rgba(20,24,30,.72)", color: "#f3f5f7", font: "500 14px/1.2 system-ui, sans-serif", display: "none", zIndex: 2, pointerEvents: "none" });
  document.body.append(tip);
  let from = "walk";                       // how the player was on foot before taking a bike (back to it when docking)
  const footPos = () => {
    const th = getThird?.();
    if (th?.on) return { x: th.tp.x, z: th.tp.z, mode: "third" };
    if (walker.on) return { x: walker.x, z: walker.z, mode: "walk" };
    return null;
  };
  const pose = {};
  const ride = async (h) => {
    takeBike(h);
    poseOf(h.x, h.z, h.yaw, pose);
    leaveFoot?.();
    // rolled out of its dock and turned round: facing away from the dock post (toward the road)
    await driver.start(pose.x, pose.z, pose.heading + Math.PI, "villo");
    log(`villo: took a bike at ${h.x.toFixed(1)}, ${h.z.toFixed(1)} (E at any station's free dock to dock it)`);
  };
  let lastUse = -1e9;
  const use = async () => {
    // (one E press reaches two listeners: the driver's keys while riding, this file's on foot; a dock turns the
    // driver off within the same event, the second listener must not take the bike straight back)
    if (performance.now() - lastUse < 400) return;
    lastUse = performance.now();
    if (driver.on && driver.vehicle === "villo") {
      const c = driver.state;
      if (!c || Math.abs(c.speed) > 1.6) return;
      const d = freeDock(c.x, c.z, 3.5);
      if (!d) return;
      const dx = d.x, dz = d.z, yaw = d.yaw, y = d.y;
      driver.dockVillo(dx, y, dz, yaw);
      // on foot 1.2 m behind the docked bike (toward the road side), facing the station
      const bx = dx + Math.sin(yaw) * 1.85, bz = dz + Math.cos(yaw) * 1.85;
      onFoot(from, bx, bz, yaw + Math.PI);
      log("villo: docked");
      return;
    }
    const p = footPos();
    if (!p) return;
    const D = driver.dockedVillo;
    if (D && Math.hypot(D.x - p.x, D.z - p.z) < 2.6) {         // the bike the player docked: out again (turned round)
      from = p.mode; leaveFoot?.();
      await driver.start(D.x, D.z, D.heading + Math.PI, "villo");
      return;
    }
    const h = nearBike(p.x, p.z, 2.2);
    if (!h) return;
    from = p.mode;
    await ride(h);
  };
  driver.onUse = use;
  addEventListener("keydown", (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target?.closest?.("input,select,textarea")) return;
    if (e.code === "KeyE" && !driver.on) use();
    else if (e.code === "KeyK" && !(driver.on && driver.vehicle === "scooter")) scooter();
    else if (e.code === "KeyV" && !(driver.on && driver.vehicle === "villo")) villo();
  });
  // the prompt, a few times a second (a scan of the loaded stations' arrays)
  let n = 0;
  updaters.push(() => {
    if (++n % 8) return;
    let text = "";
    if (driver.on && driver.vehicle === "villo") {
      const c = driver.state;
      text = c && Math.abs(c.speed) < 1.6 && freeDock(c.x, c.z, 3.5) ? "E: dock the bike" : "";
      driver.prompt = text;
      tip.style.display = "none";
      return;
    }
    const p = !driver.on && footPos();
    const D = driver.dockedVillo;
    if (p && (nearBike(p.x, p.z, 2.2) || (D && Math.hypot(D.x - p.x, D.z - p.z) < 2.6))) text = "E: take a Villo bike";
    tip.textContent = text; tip.style.display = text ? "" : "none";
  });

  function scooter() { return drive("scooter"); }
  /** the nearest station's bike (250 m), else a ride from the nearest road */
  async function villo() {
    const f = focus?.();
    const p = footPos() || (driver.on ? { x: driver.x, z: driver.z } : f ? { x: f.x, z: f.z } : null);
    const h = p ? nearBike(p.x, p.z, 250) : null;
    if (h) { from = p.mode || "walk"; return ride({ ...h }); }
    from = "walk";
    return drive("villo");
  }
  return { scooter, villo };
}
