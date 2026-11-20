// THE ENGINE MODEL behind the player car's engine sound (docs/ENGINE_SOUND.md). Ported from Thunderline
// (C:/Users/tibog/Downloads/game-engine-v1, games/thunderline/proto/kit/engineModel.js, the owner's own engine, read-only
// source): the car itself has no gearbox (a force model, viewer/drive/carCtl.js); this gives the SOUND an engine: RPM,
// gear and load from the car's real speed and the player's throttle, automatic shifts (a 0.13 s drive cut while the
// clutch is out), the launch floor (clutch slip / wheelspin in 1st), free revving in the air, the rev limiter. Pure
// logic, no audio, no allocation per update. Ours adds: a throttle-dependent upshift point (a light foot shifts early,
// flat out near the redline) and per-car configs (a city car, not Thunderline's racer). The lift-off pops are not ported
// (the owner found them annoying in Thunderline).

/** a petrol city car (our hatchbacks, estates, the police estate): 6 gears; top 144 km/h (carCtl topSpeed 40 m/s) in
 *  5th / 6th at ~5,000 rpm. Gear top speeds are km/h at the redline. */
export const ENGINE_CAR = {
  idle: 850,
  redline: 6600,
  shiftUp: 6300,        // flat out
  shiftUpLight: 2600,   // a light foot (throttle ~0.3)
  shiftDown: 1700,
  shiftTime: 0.13,      // s with the drive cut
  gearTopKmh: [52, 88, 124, 160, 196, 232],
  wheelRadius: 0.317,   // m (carCtl wheelSpin)
  launchRpm: 2800,      // clutch slip floor in 1st with the throttle down
  reverseRpm: 4200, reverseKmh: 36,
  freeRevUp: 9000, freeRevDown: 5200,
  follow: 18,           // 1/s: how fast RPM follows the wheels (drivetrain lash)
  airFlare: 700, airRise: 2600, airFall: 3200, airLoad: 0.35, landDip: 350,
};

export function createEngineModel(cfg = ENGINE_CAR) {
  const k = 60 / (3.6 * 2 * Math.PI * cfg.wheelRadius);         // wheel rpm per km/h
  const ratio = new Float64Array(cfg.gearTopKmh.length);
  for (let i = 0; i < ratio.length; i++) ratio[i] = cfg.redline / (cfg.gearTopKmh[i] * k);
  const s = { rpm: cfg.idle, gear: 1, load: 0, shifting: 0, limiter: false, shifts: 0, wasAir: false };
  /** step()'s inputs: IN[0] dt (s), IN[1] km/h, IN[2] throttle (doubles in an array: no heap number per call) */
  const IN = new Float64Array(3);
  const m = {
    s, ratio, cfg, in: IN,
    /** update() as IN = [dt, km/h, throttle] + step(...) */
    update(dt, kmh, throttle, grounded = true, air = false, reverse = false) { IN[0] = dt; IN[1] = kmh; IN[2] = throttle; return m.step(grounded, air, reverse); },
    /**
     * @param dt s   @param kmh speed along the nose (km/h, >= 0)   @param throttle 0..1 (brakes are 0)
     * @param grounded wheels on the ground   @param air in the air (wheels still turning)   @param reverse driving backwards
     */
    step(grounded = true, air = false, reverse = false) {
      const dt = IN[0], kmh = IN[1], throttle = IN[2];
      const thr = throttle < 0 ? 0 : throttle > 1 ? 1 : throttle;
      const wheel = kmh * k, n = ratio.length;
      const up = cfg.shiftUpLight + (cfg.shiftUp - cfg.shiftUpLight) * Math.min(1, Math.max(0, (thr - 0.3) / 0.6));   // (the upshift point by the pedal)
      // GEAR: shift on RPM, only with the wheels down
      if (reverse && grounded) { s.gear = 1; s.shifting = 0; }
      else if (grounded && s.shifting <= 0) {
        const inGear = wheel * ratio[s.gear - 1];
        if (inGear > up && thr > 0.3 && s.gear < n) { s.gear++; s.shifting = cfg.shiftTime; s.shifts++; }
        else if (inGear < cfg.shiftDown && s.gear > 1 && wheel * ratio[s.gear - 2] < up * 0.92) { s.gear--; s.shifting = cfg.shiftTime * 0.8; s.shifts++; }
      }
      s.shifting = Math.max(0, s.shifting - dt);
      let target;
      if (air) {
        const base = Math.max(cfg.idle, wheel * ratio[s.gear - 1]);
        target = Math.min(base + thr * cfg.airFlare, cfg.shiftUp - 150);
        const rate = target > s.rpm ? cfg.airRise : cfg.airFall;
        s.rpm += Math.max(-rate * dt, Math.min(rate * dt, target - s.rpm));
        s.wasAir = true;
      } else if (!grounded) {
        target = thr > 0.2 ? cfg.redline + 200 : Math.max(cfg.idle, s.rpm - cfg.freeRevDown * dt);
        const rate = thr > 0.2 ? cfg.freeRevUp : cfg.freeRevDown;
        s.rpm += Math.max(-rate * dt, Math.min(rate * dt, target - s.rpm));
      } else {
        if (s.wasAir) { s.rpm = Math.max(cfg.idle, s.rpm - cfg.landDip); s.wasAir = false; }
        target = wheel * ratio[s.gear - 1];
        if (reverse) target = cfg.idle + (cfg.reverseRpm - cfg.idle) * Math.min(1, kmh / cfg.reverseKmh) * (0.6 + 0.4 * thr);
        else if (s.gear === 1 && thr > 0.5) target = Math.max(target, cfg.launchRpm * (0.6 + 0.4 * thr));
        target = Math.max(cfg.idle + thr * 250, target);
        if (s.shifting > 0) target = Math.min(target, s.rpm);   // the clutch is out: no climbing
        s.rpm += (target - s.rpm) * (1 - Math.exp(-dt * cfg.follow));
      }
      // LIMITER: past the redline the ignition cuts in bursts
      s.limiter = s.rpm >= cfg.redline - 20 && thr > 0.2;
      s.rpm = Math.min(s.rpm, cfg.redline + 60);
      // LOAD: pulling with the throttle (cut during a shift)
      const wantLoad = s.shifting > 0 ? 0 : air ? thr * cfg.airLoad : thr;
      s.load += (wantLoad - s.load) * (1 - Math.exp(-dt * 14));
      return s;
    },
    reset() { s.rpm = cfg.idle; s.gear = 1; s.load = 0; s.shifting = 0; s.limiter = false; s.wasAir = false; },
  };
  return m;
}
