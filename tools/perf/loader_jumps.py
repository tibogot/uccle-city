"""Jumps in a boot screencast (docs/BOOT.md): the loading screen always moves (the stills' zoom / the old flight), so a
frame identical to the one before is a frame the page failed to produce: a stall, seen as a JUMP when motion resumes.

    python tools/perf/loader_jumps.py boot.mp4 [--until SECONDS] [--roi x0,y0,x1,y1 (fractions)]

Prints: frames, fps, stalled frames (mean abs diff < threshold), the longest stall (ms), stalls > 50 / 100 ms, and the
biggest single-frame changes (a cut / a jump of the view). Needs opencv-python + numpy. The region of interest defaults
to the upper half of the frame (above the readout, whose text changes on its own).
"""
import sys, argparse
import cv2, numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("--until", type=float, default=None, help="stop at this time (s), e.g. the cover's fade")
ap.add_argument("--start", type=float, default=0.0)
ap.add_argument("--roi", default="0.05,0.05,0.95,0.55")
ap.add_argument("--still", type=float, default=0.15, help="mean abs diff (0-255) under which two frames count as the same")
a = ap.parse_args()

cap = cv2.VideoCapture(a.video)
fps = cap.get(cv2.CAP_PROP_FPS) or 30
x0, y0, x1, y1 = [float(v) for v in a.roi.split(",")]
prev, i, diffs, ts = None, 0, [], []
while True:
    ok, f = cap.read()
    if not ok: break
    t = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000 or i / fps
    i += 1
    if t < a.start: continue
    if a.until is not None and t > a.until: break
    h, w = f.shape[:2]
    g = cv2.cvtColor(f[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)], cv2.COLOR_BGR2GRAY).astype(np.float32)
    if prev is not None:
        diffs.append(float(np.mean(np.abs(g - prev)))); ts.append(t)
    prev = g
d = np.array(diffs)
same = d < a.still
runs, run, run_t = [], 0, None
for k, s in enumerate(same):
    if s:
        if run == 0: run_t = ts[k]
        run += 1
    elif run:
        runs.append((run, run_t)); run = 0
if run: runs.append((run, run_t))
ms = lambda n: (n + 1) * 1000 / fps      # n identical frames after one = n + 1 frame times without a change
longest = max(runs, default=(0, 0))
print(f"frames {len(d) + 1} at {fps:.1f} fps, {ts[0] if ts else 0:.1f}-{ts[-1] if ts else 0:.1f} s")
print(f"stalled frames: {int(same.sum())} ({100 * same.mean():.1f} %), stalls: {len(runs)}, longest {ms(longest[0]):.0f} ms at {longest[1]:.1f} s")
print(f"stalls > 50 ms: {sum(1 for r in runs if ms(r[0]) > 50)}, > 100 ms: {sum(1 for r in runs if ms(r[0]) > 100)}, > 250 ms: {sum(1 for r in runs if ms(r[0]) > 250)}")
print("longest stalls (ms @ s):", ", ".join(f"{ms(r[0]):.0f}@{r[1]:.1f}" for r in sorted(runs, reverse=True)[:8]))
top = np.argsort(-d)[:6]
print("biggest changes (diff @ s):", ", ".join(f"{d[k]:.1f}@{ts[k]:.1f}" for k in top))
print(f"median change per frame: {np.median(d):.2f}")
