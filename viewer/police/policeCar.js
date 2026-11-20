// THE PLAYER'S UNMARKED POLICE CAR (docs/POLICE_GAME.md): a civilian faceted estate in a dark paint, no livery, with
// the claude/police-car lab's kit (viewer/policeCar/: magnetic beacon on the roof above the driver + its cable, two
// blue LED heads in the grille, an LED bar behind the windscreen, the Belgian two-tone siren 495 / 440 Hz) and a
// headlight WIG-WAG (left / right head lamps alternating while the blue lights run).
//   const pc = new PoliceCar({ driver, kit });   await pc.install()   (the drive mode's car becomes this one)
//   pc.update(dt) every frame (the game's updater)   pc.setLights(on) (L)   pc.setSiren(on) (J)   pc.uninstall()
//
// LIGHTS. Emissive lenses + the city's bloom always. The REAL light (the blue on walls / road / cars round the car)
// goes into ONE slot of the night pool (viewer/nightLights/nightLighting.js LightPool, the clustered loop), reserved
// once when the game first loads: no Light object is ever added or removed (fixed light count, no shader rebuild); the
// pool shades only the pixels its cone reaches and is 0 by day (pool.scale follows the night). Without the night pool
// (?night=0) the lights are emissive only.
// NO LIGHT THROUGH WALLS: pool lights have no shadow, so the beam's range is cut at the first building it meets: a
// march along the beam in 1.5 m steps against the drive colliders' building footprints round the car (gathered every
// 8 frames within 30 m, the same polygons the car collides with): the wall it hits is lit, what stands behind it is not.
// SOUND: the siren plays through the game kit's audio, behind the speaker button (viewer/audio/soundGate.js: every sound
// OFF by default, one switch); muted, J still switches the siren "on" for the traffic (it yields) and the HUD shows it.
import * as THREE from "three/webgpu";
import { uniform, select, positionLocal, float } from "three/tsl";
import { loadPack, packMaterial, playerSeeThrough, FLEET_SOURCE, CARS_OLD, setPlayerDent } from "../drive/carPacks.js";
import { createCar, carLights, fitBody } from "../drive/carModel.js";
import { gather, pointInBuilding } from "../drive/colliders.js";
import { NIGHT } from "../nightLights/nightMode.js";
import { buildBeacon, buildFlasher, buildVisor, buildCable, beaconU, BLUE } from "../policeCar/beaconModel.js";
import { fitPoliceKit } from "../policeCar/fitCar.js";
import { soundGate } from "../audio/soundGate.js";
import { lampState } from "../policeCar/pattern.js";
import { Siren } from "../policeCar/siren.js";
import { env as lightEnv } from "../lighting.js";
import { mergeKit, unmergeKit } from "./kitMerge.js";   // perfgame round 2: the kit's static parts in 2 draws (?carmerge=old)
import { addRearPlate } from "./plateDecal.js";        // claude/policerear: the rear plate as a pre-filtered texture (?carplate=old)

/** the car: type and paint (Belgian unmarked cars: dark estates, VW Passat / Skoda Octavia class) */
export const POLICE_CAR = { type: "estate", paint: 0x1c232c, mode: "rotating" };
/** ?policecar=marked (cars2 only): the Belgian police estate in its livery (white, blue + yellow Battenburg, POLICE)
 *  instead of the unmarked dark estate (docs/CARS2.md) */
const MARKED = !CARS_OLD && typeof location !== "undefined" && /[?&]policecar=marked(&|$)/.test(location.search);
export const LIGHT = {
  beam: 1500,           // the rotating beam (pool units: colour x intensity, falloff 1 / (d^2 + size^2))
  fanW: 0.15, fanH: 0.55,   // the beam's fan: half width / half height at 1 m (~ +-8.5 deg x +-29 deg)
  beamRange: 30,        // m (cut at the first wall)
  // (fix4 item 2, live; ?beam=old = 0) the fan's edges spread over +-beamSoft x its half sizes (the pool's APERTURE
  // profile, a negative mullion value): the road footprint was a hard-edged blue rectangle
  beamSoft: /[?&]beam=old(&|$)/.test(location.search) ? 0 : 0.8,
  grille: 260,          // the grille / visor flash cone (forward, LED slots)
  grilleAngle: 0.6,
  grilleRange: 16,
  dayGain: 1.7, nightGain: 0.75,   // lens emissive gain by day / at night
};

// the wig-wag: per side head-lamp level (uniforms: no rebuild), the head lamps' own level otherwise
const wig = { on: uniform(0), L: uniform(0), R: uniform(0) };
const _v = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion(), _fw = new THREE.Vector3(), _fp = new THREE.Vector3(), _bp = new THREE.Vector3();
let models = null, poolSlot = -1, poolRef = null;

/** the police model: the faceted pack's estate with its OWN material (its paint, the wig-wag head lamps) */
async function policeModel() {
  if (models) return models;
  const pack = await loadPack(FLEET_SOURCE);
  const car = pack.cars.find((c) => c.id === (MARKED ? "police" : POLICE_CAR.type)) || pack.cars[0];
  const paint = MARKED ? car.paint.clone() : new THREE.Color(POLICE_CAR.paint);
  // head lamps: the city's head switch, or (wig-wag) the side's flash: + x = the car's left
  const head = carLights.head.mul(float(1).sub(wig.on)).add(wig.on.mul(select(positionLocal.x.greaterThan(0), wig.L, wig.R)).mul(1.6));
  const mat = packMaterial({ paint, lights: { head, tail: carLights.tail, brake: carLights.brake }, rich: pack.rich, seeThrough: playerSeeThrough(pack.rich) });
  mat.name = "police unmarked";
  const wheelPos = {};
  for (const k of ["FL", "FR", "RL", "RR"]) wheelPos[k] = car.parts[`Wheel_${k}`]?.pos || [0, 0.3, 0];
  const lods = car.lods.map((L) => ({
    body: [{ geo: L.Body, mat, name: "Body" }],
    wheels: Object.fromEntries(["FL", "FR", "RL", "RR"].map((k) => [k, L[`Wheel_${k}`] ? [{ geo: L[`Wheel_${k}`], mat, name: "Wheel" }] : []])),
    tris: L.tris,
  }));
  models = { spec: `police:${car.id}`, label: "unmarked police car", lods, wheelPos, size: car.size, dent: car.dent, mats: { Pack: mat }, lodDist: pack.lods.map((l) => l.until),
    setPaint: (hex) => { if (!MARKED) paint.setHex(hex ?? POLICE_CAR.paint); } };
  return models;
}

/** the night pool's slot for the beacon, reserved once per page (the pool is typed arrays: a slot costs nothing at 0) */
async function beaconSlot() {
  if (!NIGHT) return null;
  if (poolSlot < 0) {
    const m = await import("../nightLights/cityNight.js");
    poolRef = m.pool;
    try { poolSlot = poolRef.reserve(1); } catch { poolRef = null; }
  }
  return poolRef;
}

export class PoliceCar {
  constructor({ driver, kit }) {
    this.driver = driver; this.kit = kit;
    this.lightsOn = false; this.sirenOn = false; this.master = 0; this.t = 0;
    this.parts = null; this.prevSpec = null; this.installed = false;
    this.siren = null; this.sound = false;
    soundGate.onChange(() => this.syncSound());            // (a siren already on starts the moment the speaker button turns on)
    this.near = []; this.nearN = 0; this.nearAt = { x: 1e9, z: 1e9 };
    this.cost = { cpu: 0 }; this.range = 0;
  }
  async install() {
    const d = this.driver, model = await policeModel();
    await beaconSlot();
    if (d.vehicle !== "car") await d.setVehicle("car");
    if (!this.installed) this.prevSpec = d.spec && !d.spec.startsWith("police:") ? d.spec : this.prevSpec;
    if (d.model !== model) {
      if (d.car) d.scene.remove(d.car.root);
      d.spec = model.spec; d.model = model;
      fitBody(model);
      setPlayerDent(model);                          // (claude/dent: the crumple's frame on this model)
      d.car = createCar(model);
      d.car.root.visible = d.on;
      d.scene.add(d.car.root);
      if (d.state) d.car.update(d.state);
    }
    this.attach(d.car, model);
    this.installed = true;
  }
  attach(car, model) {
    if (this.parts?.car === car) return;
    this.detach();
    model.fit ??= fitPoliceKit(model);
    const fit = model.fit;
    const beacon = buildBeacon();
    beacon.group.position.fromArray(fit.beacon.pos);
    beacon.group.rotation.set(fit.beacon.pitch, 0, fit.beacon.roll);
    beacon.setMode(POLICE_CAR.mode);
    const cable = buildCable(fit.cable);
    const flashers = fit.grille.map((g) => { const f = buildFlasher(g.side); f.position.fromArray(g.pos); f.rotation.y = g.yaw; return f; });
    const visor = fit.visor ? buildVisor(fit.visor.width) : null;
    if (visor) visor.position.fromArray(fit.visor.pos);
    const roofKit = new THREE.Group(); roofKit.name = "police-roof-kit"; roofKit.add(beacon.group, cable);
    const front = new THREE.Group(); front.name = "police-front-kit"; front.add(...flashers); if (visor) front.add(visor);
    car.chassis.add(roofKit, front);
    const merged = mergeKit(car.chassis, [roofKit, front]);
    const plate = addRearPlate(car.chassis, model.lods[0].body[0].geo);
    this.parts = { car, beacon, roofKit, front, flashers, merged, plate };
  }
  detach() { if (this.parts) { unmergeKit(this.parts.merged); this.parts.plate?.removeFromParent(); this.parts.roofKit.removeFromParent(); this.parts.front.removeFromParent(); this.parts = null; } }
  async uninstall() {
    this.setLights(false); this.setSiren(false);
    this.lightOff();
    wig.on.value = 0;
    this.detach();
    this.installed = false;
    // back to the car the player had (or the drive mode's default: the faceted hatch, ?car= when given)
    const back = this.prevSpec || new URLSearchParams(location.search).get("car") || "faceted:hatch_c";
    if (this.driver.spec?.startsWith("police:")) await this.driver.setCar(back).catch(() => this.driver.setCar("scripted"));
  }

  setLights(v = !this.lightsOn) { this.lightsOn = v; if (!v && this.sirenOn) this.setSiren(false); return v; }
  /** the siren needs the blue lights (a Belgian priority vehicle uses both): J switches them on too */
  setSiren(v = !this.sirenOn) {
    this.sirenOn = v;
    if (v && !this.lightsOn) this.lightsOn = true;
    this.syncSound();
    return v;
  }
  setSound(on) { this.sound = !!on; this.syncSound(); }
  syncSound() {
    const want = this.sound && this.sirenOn;
    if (want && !this.siren) {
      const ctx = this.kit.audio.ready();
      if (!ctx) return;
      const bus = ctx.createGain(); bus.gain.value = 0.9; bus.connect(this.kit.audio.master);
      this.siren = new Siren(ctx, bus);
    }
    if (!this.siren) return;
    const t = this.siren.ctx.currentTime;
    if (want && !this.siren.on) this.siren.start(t + 0.02);
    else if (!want && this.siren.on) this.siren.stop(t);
  }

  lightOff() { if (poolRef && poolSlot >= 0) poolRef.weight(poolSlot, 0); }

  /** the beam's free length from p along (dx, dz): marched against the building footprints round the car */
  freeRange(px, pz, dx, dz, max) {
    const l = Math.hypot(dx, dz);
    if (l < 1e-4) return max;
    dx /= l; dz /= l;
    for (let s = 1.5; s < max; s += 1.5) if (pointInBuilding(this.near, px + dx * s, pz + dz * s)) return s + 0.6;
    return max;
  }

  /** every frame (the game's updater): pattern, lenses, wig-wag, the pool light, the siren's scheduling */
  update(dt) {
    const t0 = performance.now(), d = this.driver;
    if (!this.installed) return;
    if (d.car && this.parts?.car !== d.car && d.model === models) this.attach(d.car, models);
    const on = d.on && d.vehicle === "car" && !!this.parts;
    this.t += dt;
    const target = this.lightsOn && on ? 1 : 0;
    this.master += (target - this.master) * (1 - Math.exp(-dt / 0.03));
    if (this.master < 1e-3 && target === 0) this.master = 0;
    const s = lampState(this.t, POLICE_CAR.mode), m = this.master;
    const night = lightEnv.uNight?.value ?? 0;
    beaconU.angle.value = s.angle;
    beaconU.rot.value = POLICE_CAR.mode === "rotating" ? m : 0;
    beaconU.led.value = s.beacon * m;
    beaconU.gL.value = s.grilleL * m; beaconU.gR.value = s.grilleR * m; beaconU.visor.value = s.visor * m;
    beaconU.gain.value = LIGHT.dayGain + (LIGHT.nightGain - LIGHT.dayGain) * night;
    // wig-wag: the head lamps alternate L / R at the LED cycle (2 per s each side), only with the lights on
    wig.on.value = m > 0.5 ? 1 : 0;
    const ph = (this.t * 2.2) % 1;
    wig.L.value = ph < 0.5 ? 1 : 0.05; wig.R.value = ph < 0.5 ? 0.05 : 1;
    // the pool light
    const P = this.parts;
    if (P && poolRef && poolSlot >= 0 && m > 0 && night > 0.05) {
      const c = d.state;
      // building footprints round the car, refreshed when it moved 6 m (or every 8 frames when it moves fast)
      if (Math.abs(c.x - this.nearAt.x) + Math.abs(c.z - this.nearAt.z) > 6) {
        this.near.length = 0;
        for (const col of d.sets(c.x, c.z, LIGHT.beamRange + 6)) gather(col, c.x, c.z, LIGHT.beamRange + 6, this.near);
        this.nearAt.x = c.x; this.nearAt.z = c.z;
      }
      P.beacon.mirror.rotation.y = s.angle;
      d.car.root.updateMatrixWorld(true);
      const bg = P.beacon.group;
      if (POLICE_CAR.mode === "rotating") {
        bg.localToWorld(_v.set(0, 0.09, 0));
        bg.getWorldQuaternion(_q);
        _d.set(Math.sin(s.angle), -0.03, Math.cos(s.angle)).normalize().applyQuaternion(_q);
        _bp.copy(_v).addScaledVector(_d, 1.3);                     // the apex 1.3 m out: no hot disc on the own roof
        const R = this.freeRange(_bp.x, _bp.z, _d.x, _d.z, LIGHT.beamRange);
        this.range = R;
        const I = LIGHT.beam * m;
        poolRef.set(poolSlot, _bp.x, _bp.y, _bp.z, R, BLUE.r * I, BLUE.g * I, BLUE.b * I, 1, 0.4);
        // a TALL NARROW FAN, not a round cone (the dome's flutes spread a real reflector's beam vertically): the pool's
        // APERTURE profile (a light behind a rectangular opening) with a narrow, tall opening 1 m out
        // (fix4) the soft fan also needs a soft cone: 0.95 / 0.85 rad cut the fan's lower edge (the footprint's near
        // edge on the road) over 5 deg; 1.25 / 0.55 lets the profile shape it (the bounding sphere is the same 30 m)
        if (LIGHT.beamSoft > 0) poolRef.spot(poolSlot, _d.x, _d.y, _d.z, 1.25, 0.55);
        else poolRef.spot(poolSlot, _d.x, _d.y, _d.z, 0.95, 0.85);
        poolRef.profile(poolSlot, 3, LIGHT.fanW, LIGHT.fanH, 1, LIGHT.beamSoft > 0 ? -LIGHT.beamSoft : 0);
      } else {
        const g = Math.max(s.beacon, s.grilleL, s.grilleR, s.visor * 0.6);
        const fy = P.flashers.length ? P.flashers[0].position.y : 0.6;
        P.front.localToWorld(_fp.set(0, fy, (P.flashers[0]?.position.z ?? 2) + 0.3));
        d.car.root.getWorldDirection(_fw); _fw.y -= 0.12; _fw.normalize();
        const R = this.freeRange(_fp.x, _fp.z, _fw.x, _fw.z, LIGHT.grilleRange), I = LIGHT.grille * g * m;
        poolRef.set(poolSlot, _fp.x, _fp.y, _fp.z, R, BLUE.r * I, BLUE.g * I, BLUE.b * I, g > 1e-3 ? 1 : 0, 0.3);
        poolRef.spot(poolSlot, _fw.x, _fw.y, _fw.z, LIGHT.grilleAngle, LIGHT.grilleAngle * 0.4);
        poolRef.profile(poolSlot, 0);
      }
    } else {
      if (P) P.beacon.mirror.rotation.y = s.angle;
      this.lightOff();
    }
    if (this.siren) this.siren.update(this.siren.ctx.currentTime, 1);
    this.cost.cpu = this.cost.cpu * 0.95 + (performance.now() - t0) * 0.05;
  }
}
