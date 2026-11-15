"""Presented frames in a Chrome performance trace of a boot (docs/BOOT.md): the loading screen always moves, so every
display refresh should present a new frame; a gap between two presented frames is a stall (a JUMP when it resumes).

    python tools/perf/trace_frames.py trace.json.gz [--from MS] [--to MS]   (ms from the trace's navigation start)

Uses the viz "Swap" events of the GPU process (one per presented compositor frame) and the PipelineReporter states
(presented / dropped). Prints frame-interval stats over the window, the longest gaps, and dropped frames.
"""
import gzip, json, argparse, collections

ap = argparse.ArgumentParser()
ap.add_argument("trace")
ap.add_argument("--from", dest="t0", type=float, default=None)
ap.add_argument("--to", dest="t1", type=float, default=None)
ap.add_argument("--gpu", type=float, default=None, help="also list the GPU process' main-thread tasks longer than this (ms)")
a = ap.parse_args()

op = gzip.open if a.trace.endswith(".gz") else open
d = json.load(op(a.trace, "rt", encoding="utf-8"))
ev = d["traceEvents"] if isinstance(d, dict) else d
nav = min((e["ts"] for e in ev if e.get("name") in ("navigationStart", "TracingStartedInBrowser") and e.get("ts")), default=None)
nav = next((e["ts"] for e in ev if e.get("name") == "navigationStart"), nav)
# a trace started after the navigation (debug/gpuCalls.js clock marks "sync@<performance.now() ms>"): align on one
mk = next((e for e in ev if str(e.get("name", "")).startswith("sync@")), None)
if mk is not None and not any(e.get("name") == "navigationStart" for e in ev):
    nav = mk["ts"] - float(mk["name"][5:]) * 1000
ms = lambda ts: (ts - nav) / 1000
swaps = sorted(ms(e["ts"]) for e in ev if e.get("name") == "Swap" and e.get("ph") in ("X", "B", "b"))
t0 = a.t0 if a.t0 is not None else (swaps[0] if swaps else 0)
t1 = a.t1 if a.t1 is not None else (swaps[-1] if swaps else 0)
w = [t for t in swaps if t0 <= t <= t1]
gaps = sorted(((w[i + 1] - w[i], w[i]) for i in range(len(w) - 1)), reverse=True)
iv = sorted(g for g, _ in gaps)
q = lambda p: iv[min(len(iv) - 1, int(p * len(iv)))] if iv else 0
print(f"window {t0:.0f}-{t1:.0f} ms: {len(w)} presented frames ({len(w) / max(1e-9, (t1 - t0) / 1000):.1f} fps)")
print(f"frame interval p50 {q(.5):.1f} ms, p95 {q(.95):.1f}, p99 {q(.99):.1f}, max {iv[-1] if iv else 0:.1f}")
print(f"gaps > 50 ms: {sum(1 for g, _ in gaps if g > 50)}, > 100 ms: {sum(1 for g, _ in gaps if g > 100)}, > 250 ms: {sum(1 for g, _ in gaps if g > 250)}")
print("longest gaps (ms @ ms):", ", ".join(f"{g:.0f}@{t:.0f}" for g, t in gaps[:10]))
st = collections.Counter()
for e in ev:
    if e.get("name") == "PipelineReporter" and e.get("ph") in ("b", "X"):
        t = ms(e["ts"])
        if t0 <= t <= t1:
            st[(e.get("args", {}).get("chrome_frame_reporter", {}) or {}).get("state", "?")] += 1
print("pipeline reporter states:", dict(st))

if a.gpu is not None:
    th = {(e["pid"], e["tid"]): e["args"]["name"] for e in ev if e.get("name") == "thread_name"}
    g = sorted(((e["dur"] / 1000, ms(e["ts"])) for e in ev if e.get("ph") == "X" and e.get("name") == "GPUTask" and "dur" in e
                and th.get((e["pid"], e["tid"])) == "CrGpuMain" and t0 <= ms(e["ts"]) <= t1 and e["dur"] / 1000 >= a.gpu), key=lambda x: x[1])
    print(f"GPU main tasks >= {a.gpu:.0f} ms: {len(g)}, {sum(d for d, _ in g):.0f} ms in total")
    print("  (ms @ start ms):", ", ".join(f"{d:.0f}@{t:.0f}" for d, t in g))
