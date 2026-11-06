"""CHAPELLE DE STALLE: camera poses of the reference photos (for the lab's photo overlays and the side-by-sides).

    python tools/stalle_photopose.py            (opencv-python, numpy; reads data/raw/refs/stalle/*.jpg sizes)

Each photo gets hand-picked correspondences: a pixel of the ORIGINAL image <-> a point of the chapel in the building
frame (u along the axis, w south, h m TAW: footprint corners, DSM / photo levels, opening corners of the model). The
focal length is scanned, the pose solved (cv2.solvePnP, principal point at the image centre), and the camera written
as the lab's viewpoint: pos (u, w, h), target, vertical fov. Writes models/stalle/photo_views.json.
Reprojection errors are printed: a large one means the model and the photo disagree there (a fix for the model).
"""
import json, math, os, sys
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parent.parent
REFS = ROOT / "data" / "raw" / "refs" / "stalle"
WC = 0.1

# (pixel x, pixel y) in the original image  <->  (u, w, h)
VIEWS = {
    "c00.jpg": dict(name="west front (Commons, EmDee 2011)", credit="Photo: EmDee, 2011, CC BY-SA 3.0 (Wikimedia Commons, Chapelle de Stalle 08.JPG)", pts=[
        ((1050, 3025), (0.0, WC - 0.7, 34.32)), ((1385, 3025), (0.0, WC + 0.7, 34.32)),
        ((1050, 2530), (0.0, WC - 0.7, 36.42)), ((1385, 2530), (0.0, WC + 0.7, 36.42)),
        ((1030, 2300), (0.0, WC - 0.85, 37.35)), ((1440, 2300), (0.0, WC + 0.85, 37.35)),
        ((1200, 1235), (0.0, WC, 41.97)), ((1210, 715), (0.0, WC, 44.05)),
        ((700, 1490), (0.0, WC - 2.25, 40.75)), ((1700, 1500), (0.0, WC + 2.25, 40.75)),
        ((1609, 735), (6.8, WC, 47.0)), ((1450, 943), (6.8, WC - 0.99, 45.58)), ((1792, 943), (6.8, WC + 0.99, 45.58)),
    ]),
}


def solve(img_wh, pts, shift=True):
    W, H = img_wh
    obj = np.array([[u, -w, h - 30.0] for _, (u, w, h) in pts], np.float64)
    pix = np.array([p for p, _ in pts], np.float64)
    best = None
    # focal x principal-point height (photos straightened with a shift lens / in software keep the verticals
    # parallel: their principal point is not the image centre)
    for f in np.geomspace(0.5 * W, 6 * W, 90):
      for cy in np.linspace(0.2 * H, 1.0 * H, 33) if shift else [H / 2]:
        Kc = np.array([[f, 0, W / 2], [0, f, cy], [0, 0, 1]], np.float64)
        ok, rv, tv = cv2.solvePnP(obj, pix, Kc, None, flags=cv2.SOLVEPNP_SQPNP)
        if not ok: continue
        ok, rv, tv = cv2.solvePnP(obj, pix, Kc, None, rv, tv, True, flags=cv2.SOLVEPNP_ITERATIVE)
        proj, _ = cv2.projectPoints(obj, rv, tv, Kc, None)
        err = np.sqrt(((proj.reshape(-1, 2) - pix) ** 2).sum(1))
        if best is None or err.mean() < best[0]: best = (err.mean(), f, rv, tv, err, cy)
    e, f, rv, tv, err, cy = best
    R, _ = cv2.Rodrigues(rv)
    cam = (-R.T @ tv).ravel()                                   # Blender frame (u, -w, h - 30)
    fwd = R.T @ np.array([0, 0, 1.0])                           # camera +z (OpenCV) = forward
    dist = np.linalg.norm(obj.mean(0) - cam)
    tgt = cam + fwd * dist
    fov = math.degrees(2 * math.atan(H / 2 / f))
    to_uwh = lambda p: [round(float(p[0]), 2), round(float(-p[1]), 2), round(float(p[2] + 30.0), 2)]
    return dict(pos=to_uwh(cam), target=to_uwh(tgt), fov=round(fov, 2), cy=round(float(cy / H), 4), f_px=round(float(f), 1), err_px=[round(float(x), 1) for x in err], mean_err=round(float(e), 1))


def main():
    out = {}
    old = ROOT / "models" / "stalle" / "photo_views.json"
    if old.exists(): out = json.load(open(old))
    for fn, v in VIEWS.items():
        p = REFS / fn
        if not p.exists(): print("missing", p); continue
        im = cv2.imread(str(p)); H, W = im.shape[:2]
        r = solve((W, H), v["pts"], v.get("shift", True))
        out[v["name"]] = dict(file=fn, credit=v["credit"], size=[W, H], **r)
        print(fn, r)
    json.dump(out, open(old, "w"), indent=1)


if __name__ == "__main__":
    main()
