// NODE-BUILD AUDIT summary (perf9, docs/PERF_GAME.md round 9). Load the page with ?buildaudit=1 (viewer/buildAudit.js), then
//   const B = await import("/debug/buildAudit.js"); B.run()
// -> { builds, ms, beforeCover: { n, ms }, afterCover: { n, ms }, codes, repeats, repeatMs, byMat, dup }
//   builds / ms     every node build three made and its main-thread time (async builds: wall time incl. their yields)
//   codes           distinct WGSL (vertex + fragment) among them; repeats = builds whose WGSL an earlier build already made
//   repeatMs        the main-thread time of those repeats (what one shared graph per code would save)
//   byMat           [material, builds, ms] most expensive first
//   dup             [code, builds, ms wasted, materials (count)] the biggest repeat groups first
// B.run({ until: ms }) counts only builds before that time (e.g. window.__playAt); B.run({ pass: "own" }) only the own pass.
export function run({ top = 25, until = Infinity, pass = null } = {}) {
  const A = globalThis.__builds;
  if (!A) return "load with ?buildaudit=1";
  const rec = A.rec.filter((r) => r.t <= until && (!pass || r.pass === pass));
  const sum = (a) => +a.reduce((s, r) => s + r.ms, 0).toFixed(0);
  const cover = window.__coverAt ?? Infinity;
  const byCode = new Map(), byMat = new Map();
  for (const r of rec) {
    let e = byCode.get(r.code); if (!e) byCode.set(r.code, (e = []));
    e.push(r);
    const k = r.mat + (r.pass === "own" ? "" : ` [${r.pass}]`);
    const m = byMat.get(k) || { n: 0, ms: 0 }; m.n++; m.ms += r.ms; byMat.set(k, m);
  }
  const dup = [];
  let repeats = 0, repeatMs = 0;
  for (const [code, list] of byCode) {
    if (list.length < 2 || !code) continue;
    const wasted = list.slice(1).reduce((s, r) => s + r.ms, 0);
    repeats += list.length - 1; repeatMs += wasted;
    const mats = new Map(); for (const r of list) mats.set(r.mat, (mats.get(r.mat) || 0) + 1);
    dup.push([code, list.length, +wasted.toFixed(0), [...mats].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${k} (${n})`).join(", ")]);
  }
  dup.sort((a, b) => b[2] - a[2]);
  const b4 = rec.filter((r) => r.t < cover), af = rec.filter((r) => r.t >= cover);
  return {
    builds: rec.length, ms: sum(rec), beforeCover: { n: b4.length, ms: sum(b4) }, afterCover: { n: af.length, ms: sum(af) },
    codes: byCode.size, repeats, repeatMs: Math.round(repeatMs),
    byMat: [...byMat].sort((a, b) => b[1].ms - a[1].ms).slice(0, top).map(([k, v]) => [k, v.n, Math.round(v.ms)]),
    dup: dup.slice(0, top),
  };
}
