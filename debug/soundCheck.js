// THE CITY SOUND'S BROWSER CHECK (docs/SOUND_CITY.md, rule 42): a devtools tool cannot listen, so this reads the audio
// graph instead and records what the master bus plays, for the owner to listen to later.
//   const S = await import("/debug/soundCheck.js")
//   S.watchUnmute()            before clicking the speaker button: the long tasks of the first unmute (the bake unpack)
//   await S.probe(3)           3 s: voices / HRTF / events / beds, the voices per category, the environment, the
//                              RMS + peak (dBFS) of the master and of every category bus (AnalyserNode taps), feeds ms
//   await S.record("stjob_day", 12, 8827)   12 s of the master bus (pre-compressor mix + reverb = what you hear,
//                              before the speaker volume) as a 16-bit stereo WAV, POSTed to tools/sound/save_server.py
//                              (python tools/sound/save_server.py 8827 docs/sound) -> docs/sound/stjob_day.wav
// Needs the sound on (the button). ?soundstats=1 for the feeds' / control step's ms.
import { encodeWav } from "../viewer/audio/renders.js";

const cs = () => { const c = window.__citySound; if (!c?.ready) throw new Error("city sound not started: turn the speaker button on (and wait for the banks)"); return c; };
const taps = new Map();
function tap(node, key) {
  if (taps.has(key)) return taps.get(key);
  const E = cs().engine, a = E.ctx.createAnalyser();
  a.fftSize = 2048; node.connect(a);                     // (an analyser has no output: it adds nothing to what is heard)
  const t = { a, buf: new Float32Array(a.fftSize), sum: 0, n: 0, peak: 0 };
  taps.set(key, t); return t;
}
const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);

/** sample the graph for `seconds`: levels per bus (dBFS), voices per category, engine stats */
export async function probe(seconds = 3) {
  const c = cs(), E = c.engine;
  const T = { master: tap(E.master, "master") };
  for (const k of Object.keys(E.bus)) T[k] = tap(E.bus[k], k);
  for (const t of Object.values(T)) { t.sum = 0; t.n = 0; t.peak = 0; }
  const cats = {};
  const t0 = performance.now();
  while (performance.now() - t0 < seconds * 1000) {
    for (const t of Object.values(T)) { t.a.getFloatTimeDomainData(t.buf); for (const v of t.buf) { t.sum += v * v; t.peak = Math.max(t.peak, Math.abs(v)); } t.n += t.buf.length; }
    for (const s of E._list) if (s._voice) cats[s.category] = (cats[s.category] || 0) + 1;
    for (const ev of E.events) cats[ev.src.category + " (one-shot)"] = (cats[ev.src.category + " (one-shot)"] || 0) + 1;
    await new Promise((r) => setTimeout(r, 100));
  }
  const steps = Math.round(seconds * 10), levels = {};
  for (const [k, t] of Object.entries(T)) levels[k] = { rms: +db(Math.sqrt(t.sum / Math.max(1, t.n))).toFixed(1), peak: +db(t.peak).toFixed(1) };
  for (const k of Object.keys(cats)) cats[k] = +(cats[k] / steps).toFixed(1);
  const st = E.stats;
  return {
    at: { x: Math.round(E.listener.x), y: Math.round(E.listener.y), z: Math.round(E.listener.z) }, env: E.envName, enclosure: +E.enclosure.toFixed(2), inPark: !!E.listener.inPark,
    voices: st.voices, hrtf: st.hrtf, events: st.events, beds: st.beds, sources: st.sources, stolen: st.stolen, dropped: st.dropped, voicesPerCategory: cats, levels,
    feeds: { ...c.stats }, controlMs: st.controlMs, controlMax: st.controlMax, ctx: { state: E.ctx.state, sampleRate: E.ctx.sampleRate, baseLatency: E.ctx.baseLatency, outputLatency: E.ctx.outputLatency },
  };
}

/** record `seconds` of the master bus as a WAV; port: tools/sound/save_server.py (else the WAV is returned as a Blob URL) */
export async function record(name, seconds = 10, port = 8827) {
  const E = cs().engine, ctx = E.ctx, n = Math.round(seconds * ctx.sampleRate);
  const L = new Float32Array(n), R = new Float32Array(n);
  let w = 0;
  const sp = ctx.createScriptProcessor(4096, 2, 2);        // (a debug tap: the deprecated node is enough and needs no module)
  const mute = ctx.createGain(); mute.gain.value = 0;
  E.master.connect(sp); sp.connect(mute).connect(ctx.destination);
  await new Promise((done) => {
    sp.onaudioprocess = (e) => {
      const a = e.inputBuffer.getChannelData(0), b = e.inputBuffer.getChannelData(1), k = Math.min(a.length, n - w);
      L.set(a.subarray(0, k), w); R.set(b.subarray(0, k), w); w += k;
      if (w >= n) { sp.onaudioprocess = null; done(); }
    };
  });
  E.master.disconnect(sp); sp.disconnect(); mute.disconnect();
  let peak = 0, sum = 0; for (let i = 0; i < n; i++) { peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); sum += (L[i] * L[i] + R[i] * R[i]) / 2; }
  // (encodeWav peak-normalises to -3 dBFS for listening: the real level is returned here)
  const { blob, gain } = encodeWav({ length: n, sampleRate: ctx.sampleRate, getChannelData: (c) => (c ? R : L) }, true);
  const info = { name: `${name}.wav`, seconds, rms: +db(Math.sqrt(sum / n)).toFixed(1), peak: +db(peak).toFixed(1), normalisedBy: +db(gain).toFixed(1) };
  if (port) {
    const r = await fetch(`http://127.0.0.1:${port}/save?name=${encodeURIComponent(name)}.wav`, { method: "POST", body: blob }).catch((e) => ({ ok: false, statusText: e.message }));
    info.saved = r.ok ? `docs/sound/${name}.wav (save_server root)` : `not saved: ${r.statusText}`;
  } else info.url = URL.createObjectURL(blob);
  return info;
}

/** call before the first click on the speaker button: long tasks (> 50 ms) and the longest frame until the banks are in */
export function watchUnmute(ms = 15000) {
  const out = { longTasks: [], longestFrame: 0, readyAfter: null };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) out.longTasks.push(Math.round(e.duration)); }).observe({ type: "longtask", buffered: false }); } catch { /* no longtask API */ }
  let last = performance.now(); const t0 = last;
  const loop = () => {
    const now = performance.now(); out.longestFrame = Math.max(out.longestFrame, Math.round(now - last)); last = now;
    if (window.__citySound?.ready && out.readyAfter == null) out.readyAfter = Math.round(now - t0);
    if (now - t0 < ms) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  window.__unmuteWatch = out;
  return out;
}
