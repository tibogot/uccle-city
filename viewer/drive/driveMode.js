// DRIVE MODE: the Car Lab's hatchback and driving model in the city.
//   W / S (↑ ↓) throttle, brake, reverse   A / D (← →) steer   Space handbrake
//   R back to the start   C camera (chase / far / bumper / orbit)   G draw colliders   Esc back to orbit
// Collisions: each loaded tile carries its drive data from the tile worker (colliders.js buildDriveData: building
// footprints, kerb islands, tree trunks, in 48 m cells) plus its lamp posts (added here, from lamps.js lampSites).
// The car only looks at the cells round it (carEnv.js). Ground = the drivable surface grid (road deck, sidewalks).
import * as THREE from "three/webgpu";
import { loadCarModel, createCar, carLights } from "./carModel.js";
import { HANDLING, createCarState, stepCar } from "./carPhysics.js";
import { addCircles, driveHeight, gather, pointInBuilding, KIND } from "./colliders.js";
import { createCarEnv } from "./carEnv.js";
import { ChaseCamera } from "./chaseCamera.js";
import { ColliderDebug } from "./debugDraw.js";
import { DriveKeys } from "./input.js";
import { lampSites } from "../lamps.js";
import { env as lightEnv } from "../lighting.js";

/** Main thread, once per loaded tile: the worker's drive data + the tile's lamp posts. */
export function tileDrive(drive, roads, bounds) {
  if (!drive) return null;
  const lamps = lampSites(roads, bounds).map((p) => ({ x: p.x, z: p.z, r: 0.2, kind: KIND.lamp }));
  addCircles(drive.col, lamps);
  drive.counts.lamps = lamps.length;
  return drive;
}

export class Driver {
  /** world: { tiles: [{ bounds, hm, drive }], at(x, z) } */
  constructor(camera, dom, scene, world) {
    Object.assign(this, { camera, dom, scene, world, on: false });
    this.chase = new ChaseCamera(camera, dom);
    this.debug = new ColliderDebug(scene);
    this.debug.visible = /[?&]drivedebug=1/.test(location.search);
    this.keys = new DriveKeys({ active: () => this.on, onKey: (k) => {
      if (k === "KeyR") this.reset(); else if (k === "KeyC") this.chase.next();
      else if (k === "KeyG") this.debug.visible = !this.debug.visible; else if (k === "Escape") this.onExit?.();
    } });
    this.ground = (x, z) => {
      const t = this.world.at(x, z);
      return t.drive ? driveHeight(t.hm, t.drive.ground.delta, x, z) : t.hm.surface(x, z) + 0.12;
    };
    this.sets = (x, z, r) => {
      const out = this._sets ||= [];
      out.length = 0;
      for (const t of this.world.tiles) {
        const b = t.bounds;
        if (t.drive && x + r >= b.x0 && x - r <= b.x1 && z + r >= b.z0 && z - r <= b.z1) out.push(t.drive.col);
      }
      return out;
    };
    this.env = createCarEnv({ sets: this.sets, ground: this.ground, handling: HANDLING });
    this.camNear = [];
    this.insideWall = (x, z) => pointInBuilding(this.camNear, x, z);
    this.hud = document.createElement("div");
    Object.assign(this.hud.style, { position: "fixed", left: "50%", bottom: "14px", transform: "translateX(-50%)", padding: "6px 14px",
      borderRadius: "8px", background: "rgba(20,24,30,.7)", color: "#fff", font: "600 22px/1 ui-monospace, monospace", display: "none", zIndex: 2 });
    document.body.append(this.hud);
    this.ms = 0;
  }

  async start(x, z, heading) {
    if (!this.car) {
      this.model = await loadCarModel();
      this.car = createCar(this.model);
      this.scene.add(this.car.root);
    }
    this.startPose = { x, z, heading };
    this.on = true;
    this.car.root.visible = true;
    this.hud.style.display = "";
    this.reset();
  }
  reset() {
    const s = this.startPose;
    this.state = createCarState(s.x, s.z, s.heading);
    this.state.y = this.ground(s.x, s.z);
    this.chase.reset();
  }
  stop() {
    this.on = false; this.chase.active = false;
    if (this.car) this.car.root.visible = false;
    this.debug.visible = false;
    this.hud.style.display = "none";
  }
  get x() { return this.state?.x ?? 0; }
  get z() { return this.state?.z ?? 0; }

  update(dt) {
    if (!this.on || !this.state) return;
    this.chase.active = true;
    const t0 = performance.now();
    const c = this.state;
    stepCar(c, this.keys.read(), dt, this.env, HANDLING);
    carLights.brake.value = c.braking ? 1 : 0;
    carLights.head.value = carLights.tail.value = lightEnv.uNight?.value > 0.5 ? 1 : 0;
    this.car.update(c);
    this.camNear.length = 0;
    for (const col of this.sets(c.x, c.z, 14)) gather(col, c.x, c.z, 14, this.camNear);
    this.chase.update(c, dt, this.ground, this.insideWall);
    this.debug.update(this.sets, this.ground, c, this.env.contacts > 0);
    this.ms = this.ms * 0.95 + (performance.now() - t0) * 0.05;
    if ((this._hudN = (this._hudN || 0) + 1) % 6 === 0)
      this.hud.innerHTML = `${(Math.abs(c.speed) * 3.6).toFixed(0)} <small style="font-size:12px;color:#b8c2cc;font-weight:400">km/h${c.speed < -0.2 ? " R" : ""} · C camera · G colliders · R reset</small>`;
  }
  info() {
    const c = this.state;
    return c ? { x: +c.x.toFixed(1), z: +c.z.toFixed(1), y: +c.y.toFixed(2), kmh: +(c.speed * 3.6).toFixed(1), hits: c.hits, near: this.env.tested, ms: +this.ms.toFixed(3), cam: this.chase.mode } : null;
  }
}
