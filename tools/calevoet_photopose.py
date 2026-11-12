"""GARE D'UCCLE-CALEVOET: camera poses of the reference photos (the lab's overlays, the side-by-sides) and the facade
measurements back-projected from them (after tools/wolvendael_photopose.py).

    python tools/calevoet_photopose.py [--measure] [--undistort]     (opencv-python, numpy)

Correspondences hand-picked on the full-size originals (data/raw/refs/calevoet/full/, git-ignored):
  - POINTS: pixel <-> (u, w, h) in the building frame (tools/calevoet_measure.py: u along the tracks, u+ = SSE; w across,
    w+ = the track side; h m TAW): the gable apexes (ridges from the DSM), corner feet on the platform (DTM);
  - LINES: a pixel on a vertical wall corner through a footprint corner (UrbIS solid 534568);
  - priors: the EXIF focal (35 mm eq. on the diagonal), the eye ~1.6 m over the far platform.
--measure: the pixels in MEASURE are back-projected on the track facade's plane (w = TRACK_W) or a gable plane (u = ...):
models/calevoet_station/photo_measured.json (read by tools/blender/calevoet_station.py).
--undistort: data/raw/refs/calevoet/undist/<photo> (1600 px, git-ignored) for the lab's overlays.
Writes models/calevoet_station/photo_views.json: pos / target / up (building frame), vertical fov, f, errors.
Blender / three frame used inside: (u, -w, h - 40).
"""
import json, math, sys
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parent.parent
REFS = ROOT / "data" / "raw" / "refs" / "calevoet"
if not REFS.exists(): REFS = ROOT.parent.parent.parent / "data" / "raw" / "refs" / "calevoet"
FULL = REFS / "full"
DATUM = 40.0
TRACK_W = 3.23                      # the track facade's plane (UrbIS 3.14..3.28 along the main block and the wings)

def f35(mm, W, H): return mm / 43.267 * math.hypot(W, H)

CRED_S = "Photo: Stratoswift, {y}, CC BY-SA 4.0 (Wikimedia Commons, {t})"
VIEWS = json.load(open(ROOT / "tools" / "calevoet_picks.json", encoding="utf-8"))["views"]
MEASURE = json.load(open(ROOT / "tools" / "calevoet_picks.json", encoding="utf-8"))["measure"]


def to_b(p): return [p[0], -p[1], p[2] - DATUM]


def proj(obj, p, W, H):
    rv, tv, f, k1 = p[:3], p[3:6], p[6], p[7]
    K = np.array([[f, 0, W / 2], [0, f, H / 2], [0, 0, 1.0]])
    out, _ = cv2.projectPoints(np.asarray(obj, float).reshape(-1, 3), rv, tv, K, np.array([k1, 0, 0, 0, 0.0]))
    return out.reshape(-1, 2)


LINES = []
def line_res(q, W, H):
    out = []
    for (px_, (u, w)) in LINES:
        a, b = proj(np.array([to_b((u, w, 52.0)), to_b((u, w, 60.0))]), q, W, H)
        d = b - a; n = np.array([-d[1], d[0]]) / (np.linalg.norm(d) + 1e-9)
        out.append(float((np.array(px_) - a) @ n))
    return out


def cam_of(q):
    R, _ = cv2.Rodrigues(q[:3]); return R, (-R.T @ q[3:6]).ravel()


def lm(obj, pix, p, W, H, free, f0, cam_h, wide, iters=80):
    p = p.copy(); lam = 1e-3
    def res(q):
        r = [(proj(obj, q, W, H) - pix).ravel() * 0.7] if len(obj) else []
        r.append(np.array(line_res(q, W, H)))
        extra = [q[7] * (200.0 if wide else 3000.0), (q[6] - f0) / f0 * 300]
        if cam_h is not None: extra.append((cam_of(q)[1][2] + DATUM - cam_h) * 6.0)
        return np.concatenate(r + [np.array(extra)])
    r = res(p); e = (r ** 2).sum()
    for _ in range(iters):
        J = np.zeros((len(r), len(free)))
        for j, i in enumerate(free):
            d = np.zeros_like(p); d[i] = 1e-6 * max(1.0, abs(p[i])) if i != 6 else 0.5
            J[:, j] = (res(p + d) - r) / d[i]
        A = J.T @ J; g = J.T @ r
        while True:
            step = np.linalg.solve(A + lam * np.diag(np.diag(A) + 1e-9), -g)
            q = p.copy(); q[free] += step
            rq = res(q); eq = (rq ** 2).sum()
            if eq < e: p, r, e = q, rq, eq; lam = max(lam / 3, 1e-7); break
            lam *= 4
            if lam > 1e7: return p
    return p


def solve(W, H, v):
    obj = np.array([to_b(P) for _, P in v["pts"]], float); pix = np.array([px for px, _ in v["pts"]], float)
    # starting pose: solvePnP on the points + two points per line at plausible heights (the eaves 57.9 and the plinth 49)
    o2 = list(obj); p2 = list(pix)
    for (px_, (u, w)), h in zip(v["lines"], [57.0, 53.0] * 12):
        o2.append(to_b((u, w, h))); p2.append(px_)
    best = None
    for f in (v["f0"] * 0.95, v["f0"], v["f0"] * 1.05):
        K = np.array([[f, 0, W / 2], [0, f, H / 2], [0, 0, 1.0]])
        ok, rv, tv = cv2.solvePnP(np.array(o2), np.array(p2), K, None, flags=cv2.SOLVEPNP_SQPNP)
        if not ok: continue
        p = np.concatenate([rv.ravel(), tv.ravel(), [f, 0.0]])
        p = lm(obj, pix, p, W, H, [0, 1, 2, 3, 4, 5, 6] + ([7] if v["wide"] else []), v["f0"], v.get("cam_h"), v["wide"])
        err = np.sqrt(((proj(obj, p, W, H) - pix) ** 2).sum(1)); le = np.abs(line_res(p, W, H))
        score = float(np.concatenate([err, le]).mean())
        if best is None or score < best[0]: best = (score, p, err, le)
    return best


def backproject(p, W, H, px_list, plane_w=TRACK_W, plane_u=None):
    R, cam = cam_of(p); f = p[6]
    K = np.array([[f, 0, W / 2], [0, f, H / 2], [0, 0, 1.0]])
    und = cv2.undistortPoints(np.array(px_list, float).reshape(-1, 1, 2), K, np.array([p[7], 0, 0, 0, 0.0])).reshape(-1, 2)
    out = []
    for x, y in und:
        ray = R.T @ np.array([x, y, 1.0])
        t = ((plane_u - cam[0]) / ray[0]) if plane_u is not None else ((-plane_w - cam[1]) / ray[1])     # blender Y = -w
        q = cam + ray * t
        out.append([round(float(q[0]), 3), round(float(-q[1]), 3), round(float(q[2] + DATUM), 3)])
    return out



def main():
    out = {}; params = {}
    only = [a for a in sys.argv[1:] if a.endswith(".jpg")]
    for fn, v in VIEWS.items():
        if only and fn not in only: continue
        im = cv2.imread(str(FULL / fn)); H, W = im.shape[:2]
        v = dict(v); v["f0"] = f35(v["mm"], W, H); v["wide"] = False
        v["pts"] = [(tuple(a), tuple(b)) for a, b in v["pts"]]; v["lines"] = [(tuple(a), tuple(b)) for a, b in v["lines"]]
        LINES[:] = v["lines"]
        score, p, err, le = solve(W, H, v)
        params[fn] = (p, W, H)
        R, cam = cam_of(p)
        fwd = R.T @ np.array([0, 0, 1.0]); up = R.T @ np.array([0, -1.0, 0])
        tgt = cam + fwd * 60.0
        uwh = lambda q: [round(float(q[0]), 3), round(float(-q[1]), 3), round(float(q[2] + DATUM), 3)]
        r = dict(file=fn, name=v["name"], credit=v["credit"], size=[W, H], pos=uwh(cam), target=uwh(tgt), up=[round(float(up[0]), 4), round(float(-up[1]), 4), round(float(up[2]), 4)],
                 fov=round(math.degrees(2 * math.atan(H / 2 / p[6])), 3), f_px=round(float(p[6]), 1), f0_px=round(v["f0"], 1), k1=round(float(p[7]), 5),
                 err_px=[round(float(x), 1) for x in err], line_err_px=[round(float(x), 1) for x in le], mean_err=round(score, 2))
        out[fn] = r
        print(f"{fn}: f {r['f_px']} (EXIF {r['f0_px']}, fov {r['fov']}), cam {r['pos']}, pts err {r['err_px']}, lines {r['line_err_px']}, mean {r['mean_err']}")
        if "--check" in sys.argv:
            for nm, P3 in v.get("check", {}).items():
                print(f"   check {nm}: {proj(np.array([to_b(P3)]), p, W, H).round(1).tolist()}")
    if only: return
    json.dump(out, open(ROOT / "models" / "calevoet_station" / "photo_views.json", "w"), indent=1)
    if "--measure" in sys.argv:
        meas = {}
        for name, m in MEASURE.items():
            fn, pxs, plane = m[0], m[1], m[2]
            p, W, H = params[fn]
            q = backproject(p, W, H, pxs, plane_w=plane.get("w", TRACK_W), plane_u=plane.get("u"))
            meas[name] = dict(photo=fn, px=pxs, uwh=q, plane=plane)
        json.dump(meas, open(ROOT / "models" / "calevoet_station" / "photo_measured.json", "w"), indent=1)
        for k, m in meas.items(): print(f"  {k:26s} {m['photo']}  " + "  ".join(f"u {q[0]:6.2f} w {q[1]:5.2f} h {q[2]:6.2f}" for q in m["uwh"]))
    if "--undistort" in sys.argv:
        (REFS / "undist").mkdir(exist_ok=True)
        for fn, (p, W, H) in params.items():
            im = cv2.imread(str(FULL / fn)); s = 1600 / W
            cv2.imwrite(str(REFS / "undist" / fn), cv2.resize(im, (1600, int(round(H * s))), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 90])


if __name__ == "__main__":
    main()
