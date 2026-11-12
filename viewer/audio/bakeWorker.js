// Bakes the sound banks off the main thread. The synth code only needs ctx.sampleRate and ctx.createBuffer, so
// a stand-in context runs the very same functions here; the finished sample arrays are transferred back and
// wrapped into real AudioBuffers (bakeInWorker). Keeps the ~2 s of first-time synthesis off the main thread.
import { FootstepBank } from "./footsteps.js";
import { VehicleBank } from "./vehicles.js";
import { TransitBank } from "./transit.js";
import { AmbienceBank, BirdBank, BellBank } from "./ambience.js";

class FakeBuffer {
  constructor(ch, n, sr) { this.numberOfChannels = ch; this.length = n; this.sampleRate = sr; this.duration = n / sr; this._d = Array.from({ length: ch }, () => new Float32Array(n)); }
  getChannelData(i) { return this._d[i]; }
}
const BANKS = { feet: FootstepBank, veh: VehicleBank, tr: TransitBank, amb: AmbienceBank, birds: BirdBank, bells: BellBank };

function pack(v, transfer) {
  if (v instanceof FakeBuffer) { transfer.push(...v._d.map((a) => a.buffer)); return { __buf: 1, sr: v.sampleRate, d: v._d }; }
  if (Array.isArray(v)) return v.map((x) => pack(x, transfer));
  if (v instanceof Float32Array) return v;
  if (v && typeof v === "object") { const o = {}; for (const k in v) o[k] = pack(v[k], transfer); return o; }
  return v;
}

self.onmessage = (e) => {
  const { sampleRate, jobs } = e.data;
  const ctx = { sampleRate, createBuffer: (ch, n, sr) => new FakeBuffer(ch, n, sr) };
  const banks = {};
  const t0 = performance.now();
  for (const [bank, method, ...args] of jobs) { banks[bank] ??= new BANKS[bank](ctx); banks[bank][method](...args); }
  const transfer = [], out = {};
  for (const [name, b] of Object.entries(banks)) out[name] = b.cache ? { map: pack([...b.cache.entries()], transfer) } : { obj: pack(b.c, transfer) };
  self.postMessage({ out, ms: performance.now() - t0 }, transfer);
};
