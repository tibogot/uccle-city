// Main-thread side of bakeWorker.js: send a job list ([bank, method, ...args]), get the baked buffers back and
// put them into the banks' caches as real AudioBuffers. Falls back to baking here if workers fail.
export function bakeInWorker(ctx, banks, jobs) {
  return new Promise((resolve) => {
    let w;
    const fallback = (why) => { const t0 = performance.now(); for (const [b, m, ...a] of jobs) banks[b][m](...a); resolve({ ms: performance.now() - t0, where: "main (" + why + ")" }); };
    try { w = new Worker(new URL("./bakeWorker.js", import.meta.url), { type: "module" }); } catch (e) { return fallback(e.message); }
    w.onerror = (e) => { w.terminate(); fallback(e.message || "worker error"); };
    w.onmessage = (e) => {
      const t0 = performance.now();
      const unpack = (v) => {
        if (v && v.__buf) { const b = ctx.createBuffer(v.d.length, v.d[0].length, v.sr); v.d.forEach((a, i) => b.copyToChannel(a, i)); return b; }
        if (Array.isArray(v)) return v.map(unpack);
        if (v instanceof Float32Array) return v;
        if (v && typeof v === "object") { const o = {}; for (const k in v) o[k] = unpack(v[k]); return o; }
        return v;
      };
      for (const [name, data] of Object.entries(e.data.out)) {
        const bank = banks[name];
        if (data.map) for (const [k, v] of unpack(data.map)) bank.cache.set(k, v);
        else Object.assign(bank.c, unpack(data.obj));
      }
      w.terminate();
      resolve({ ms: e.data.ms, unpackMs: performance.now() - t0, where: "worker" });
    };
    w.postMessage({ sampleRate: ctx.sampleRate, jobs });
  });
}
