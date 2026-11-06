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
    "c05.jpg": dict(name="north-west, from rue de Stalle (Commons, D. Stemgée 2020)", credit="Photo: Daan Stemgée (Onroerend Erfgoed), 2020, CC BY 4.0 (Wikimedia Commons, 356110)", pts=[
        ((2936, 1216), (0.0, WC, 44.05)), ((2851, 3802), (0.0, WC - 0.7, 34.32)), ((2851, 3311), (0.0, WC - 0.7, 36.42)), ((3001, 3304), (0.0, WC + 0.7, 36.42)),
        ((2212, 3013), (0.0, WC - 4.35, 37.35)), ((2610, 2041), (0.0, WC - 2.25, 40.75)), ((1561, 1187), (6.8, WC, 47.0)),
        ((1338, 3280), (3.95, WC - 4.35, 36.78)), ((1144, 3280), (4.9, WC - 4.35, 36.78)), ((1338, 3802), (3.95, WC - 4.35, 34.62)),
        ((1981, 3438), (1.0, WC - 4.35, 35.88)),
    ], probes=[((1799, 3304), (WC - 4.35, 36.55, "north aisle oculus west of the door")), ((1950, 2490), (WC - 2.25, 39.72, "clerestory oculus 1")),
               ((1484, 2575), (WC - 2.25, 39.72, "clerestory oculus 2")), ((1127, 2629), (WC - 2.25, 39.72, "clerestory oculus 3")),
               ((1661, 3260), (WC - 4.35, 36.9, "T anchor"))]),
    "heritage_P01.jpg": dict(name="north side + chevet (inventory)", credit="Reference only: Inventaire du patrimoine architectural, urban.brussels (no free licence)", pts=[
        ((1278, 232), (0.0, WC, 44.05)), ((1545, 627), (0.0, WC - 4.35, 37.35)), ((865, 642), (11.2, WC - 4.35, 37.35)),
        ((1353, 677), (3.95, WC - 4.35, 36.78)), ((1301, 677), (4.9, WC - 4.35, 36.78)), ((1301, 846), (4.9, WC - 4.35, 34.62)),
        ((488, 383), (12.95, WC - 2.25, 39.75)), ((420, 645), (13.5, WC - 2.25, 37.4)), ((555, 645), (12.4, WC - 2.25, 37.4)),
    ], probes=[((1010, 690), (WC - 4.35, 36.55, "aisle oculus A")), ((1190, 680), (WC - 4.35, 36.55, "aisle oculus B")), ((1470, 675), (WC - 4.35, 36.55, "aisle oculus C")),
               ((1500, 740), (WC - 4.35, 35.5, "leper window")), ((965, 430), (WC - 2.25, 39.72, "clerestory 1")), ((1128, 450), (WC - 2.25, 39.72, "clerestory 2")),
               ((1262, 462), (WC - 2.25, 39.72, "clerestory 3")), ((930, 60), (WC, 45.5, "belfry"))]),
    "heritage_P03.jpg": dict(name="west front, frontal (inventory)", credit="Reference only: Inventaire du patrimoine architectural, urban.brussels (no free licence)", pts=[
        ((450, 908), (0.0, WC - 0.7, 36.42)), ((635, 908), (0.0, WC + 0.7, 36.42)), ((450, 1180), (0.0, WC - 0.7, 34.32)), ((635, 1180), (0.0, WC + 0.7, 34.32)),
        ((437, 772), (0.0, WC - 0.85, 37.35)), ((657, 772), (0.0, WC + 0.85, 37.35)), ((537, 270), (0.0, WC, 41.97)),
        ((283, 382), (0.0, WC - 2.25, 40.75)), ((815, 378), (0.0, WC + 2.25, 40.75)),
    ], frange=(0.8, 1.6)),
}


def solve(img_wh, pts_all, shift=True, frange=(0.5, 6.0), probes=()):
    W, H = img_wh
    pts = pts_all
    obj = np.array([[u, -w, h - 30.0] for _, (u, w, h) in pts], np.float64)
    pix = np.array([p for p, _ in pts], np.float64)
    best = None
    # focal x principal-point height (photos straightened with a shift lens / in software keep the verticals
    # parallel: their principal point is not the image centre)
    for f in np.geomspace(frange[0] * W, frange[1] * W, 90):
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
    # probes: a pixel + a wall line (w, h) along u: the u where that line projects nearest the pixel (where the model
    # should put the feature)
    Kc = np.array([[f, 0, W / 2], [0, f, cy], [0, 0, 1]], np.float64)
    for (px_, (w, h, label)) in probes:
        us = np.arange(-2.0, 18.0, 0.02)
        o = np.array([[u, -w, h - 30.0] for u in us])
        pr, _ = cv2.projectPoints(o, rv, tv, Kc, None)
        d = np.sqrt(((pr.reshape(-1, 2) - np.array(px_)) ** 2).sum(1))
        print(f"   probe {label}: u = {us[d.argmin()]:.2f} (miss {d.min():.0f} px)")
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
        r = solve((W, H), v["pts"], v.get("shift", True), v.get("frange", (0.5, 6.0)), v.get("probes", ()))
        out[v["name"]] = dict(file=fn, credit=v["credit"], size=[W, H], **r)
        print(fn, r)
    json.dump(out, open(old, "w"), indent=1)


if __name__ == "__main__":
    main()
