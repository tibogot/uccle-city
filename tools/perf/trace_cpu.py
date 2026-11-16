"""Main-thread CPU profile of a Chrome performance trace (docs/PERF_GAME.md): where the renderer's main thread spends
its time, from the sampling profiler (ProfileChunk events) and the trace's GC / task events.

    python tools/perf/trace_cpu.py trace.json.gz [--top 40] [--incl] [--match three.webgpu]

Prints: the busy share of the main thread, GC time (minor / major) and the longest GC pauses, then the functions by
SELF time (and with --incl by INCLUSIVE time) as ms per second of trace, with their script (file:line).
"""
import gzip, json, argparse, collections

ap = argparse.ArgumentParser()
ap.add_argument("trace")
ap.add_argument("--top", type=int, default=40)
ap.add_argument("--incl", action="store_true")
ap.add_argument("--match", default=None, help="only frames whose url contains this (self time view)")
ap.add_argument("--callers", default=None, help="who calls functions with this name (inclusive time per caller)")
a = ap.parse_args()

op = gzip.open if a.trace.endswith(".gz") else open
d = json.load(op(a.trace, "rt", encoding="utf-8"))
ev = d["traceEvents"] if isinstance(d, dict) else d

# the renderer main thread: the thread named CrRendererMain with the most events
names = {(e["pid"], e["tid"]): e["args"]["name"] for e in ev if e.get("name") == "thread_name"}
cnt = collections.Counter((e.get("pid"), e.get("tid")) for e in ev if names.get((e.get("pid"), e.get("tid"))) == "CrRendererMain")
main = cnt.most_common(1)[0][0]
mev = [e for e in ev if (e.get("pid"), e.get("tid")) == main]
ts = [e["ts"] for e in mev if e.get("ph") == "X" and e.get("ts", 0) > 0]
T0, T1 = min(ts), max(ts)
dur_s = (T1 - T0) / 1e6
print(f"main thread {main}, {dur_s:.1f} s")

# GC
gc = collections.defaultdict(list)
for e in mev:
    n = e.get("name", "")
    if e.get("ph") == "X" and n in ("MinorGC", "MajorGC", "V8.GC_SCAVENGER", "V8.GC_MARK_COMPACTOR", "V8.GCFinalizeMC", "V8.GC_MC_INCREMENTAL", "V8.GC_MINOR_MARK_SWEEPER", "BlinkGC.AtomicPhase"):
        gc[n].append(e.get("dur", 0) / 1000)
for n, l in gc.items():
    l.sort()
    print(f"GC {n}: {len(l)} x, total {sum(l):.0f} ms ({sum(l) / dur_s:.1f} ms/s), max {l[-1]:.1f} ms, top {[round(x, 1) for x in l[-5:]]}")
tasks = [e for e in mev if e.get("ph") == "X" and e.get("name") in ("RunTask", "ThreadControllerImpl::RunTask")]
busy = sum(e.get("dur", 0) for e in tasks) / 1000
print(f"tasks: {len(tasks)}, busy {busy:.0f} ms = {busy / (dur_s * 1000) * 100:.0f} %; longest {sorted(round(e.get('dur', 0) / 1000) for e in tasks)[-10:]}")

# the sampling profile: Profile + ProfileChunk events (same id) on the main thread's pid
prof = [e for e in ev if e.get("name") in ("Profile", "ProfileChunk") and e.get("pid") == main[0]]
by_id = collections.defaultdict(list)
for e in prof: by_id[e.get("id")].append(e)
best = max(by_id.values(), key=lambda l: sum(len(x.get("args", {}).get("data", {}).get("cpuProfile", {}).get("samples", []) or []) for x in l))
nodes, parent, samples, deltas = {}, {}, [], []
for e in best:
    cp = e.get("args", {}).get("data", {}).get("cpuProfile", {})
    for n in cp.get("nodes", []) or []:
        nodes[n["id"]] = n["callFrame"]
        if "parent" in n: parent[n["id"]] = n["parent"]
    samples += cp.get("samples", []) or []
    deltas += e.get("args", {}).get("data", {}).get("timeDeltas", []) or []
if not samples:
    print("no samples"); raise SystemExit
# sample i lasts deltas[i+1]
selfT = collections.Counter(); inclT = collections.Counter(); callers = collections.Counter()
lab = lambda cf: f"{cf.get('functionName') or '(anon)'}  {cf.get('url', '').split('/')[-1]}:{cf.get('lineNumber', -1) + 1}"
for i, s in enumerate(samples):
    dt = (deltas[i + 1] if i + 1 < len(deltas) else 0) / 1000
    if dt <= 0 or dt > 50: continue
    cf = nodes.get(s, {})
    if a.match and a.match not in cf.get("url", ""): pass
    selfT[lab(cf)] += dt
    seen = set(); n = s; prev = None
    while n in nodes:
        L = lab(nodes[n])
        if L not in seen: inclT[L] += dt; seen.add(L)
        if a.callers and nodes[n].get("functionName") == a.callers and prev is None:
            p = parent.get(n)
            if p in nodes: callers[lab(nodes[p])] += dt
            prev = n
        n = parent.get(n)
tot = sum(selfT.values())
print(f"sampled {tot:.0f} ms ({tot / dur_s:.0f} ms/s)")
print("\nSELF time (ms/s of trace):")
for k, v in selfT.most_common(a.top):
    if a.match and a.match not in k: continue
    print(f"  {v / dur_s:7.2f}  {k}")
if a.incl:
    print("\nINCLUSIVE time (ms/s):")
    for k, v in inclT.most_common(a.top): print(f"  {v / dur_s:7.2f}  {k}")
if a.callers:
    print(f"\ncallers of {a.callers}:")
    for k, v in callers.most_common(20): print(f"  {v / dur_s:7.2f}  {k}")
