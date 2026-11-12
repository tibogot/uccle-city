"""Offline comparison sheet: a generated set next to CC0 scan candidates, same physical scale, same light.

    python -E -P tools/texturefactory/sheet.py <material> [--crop 0.6] [--res 1k|2k] [--out path.png]

Each column = one texture set (generated variants first, then the material's CC0 candidates from
viewer/materials/candidates.json, read from the scan candidates' 1K WebP in viewer/materials/textures/ or from the
claude/materials worktree when they are not built here); rows = a 1:1 crop of `crop` metres (close-up detail), the whole
repeat tiled 2 x 2 (the repeat / the far look), and the grazing-light relief. Quick review only; the real comparison
is the Material Lab (labs/material-lab.html) on the same wall in the viewer.
"""
import glob
import json
import os
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from tf.bake import OUT_WEB, WT, MAIN  # noqa: E402

CAND = os.path.join(WT, "viewer", "materials", "candidates.json")


def find_scan(files):
    for root in [os.path.join(WT, "viewer", "materials")] + glob.glob(os.path.join(MAIN, ".claude", "worktrees", "*", "viewer", "materials")):
        a = os.path.join(root, files + "_albedo.webp")
        if os.path.exists(a) and os.path.exists(os.path.join(root, files + "_nra.webp")):
            return a, os.path.join(root, files + "_nra.webp")
    return None


def load_set(alb_path, nra_path):
    a = cv2.cvtColor(cv2.imread(alb_path, cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    n = cv2.imread(nra_path, cv2.IMREAD_UNCHANGED)
    n = cv2.cvtColor(n, cv2.COLOR_BGRA2RGBA).astype(np.float32) / 255
    return a, n


def shade(a_srgb, nra, light=(-0.55, 0.45, 0.35)):
    a = np.where(a_srgb <= 0.04045, a_srgb / 12.92, ((a_srgb + 0.055) / 1.055) ** 2.4)
    nx, ny = nra[..., 0] * 2 - 1, nra[..., 1] * 2 - 1
    nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1))
    l = np.array(light, np.float32)
    l /= np.linalg.norm(l)
    ndl = np.clip(nx * l[0] + ny * l[1] + nz * l[2], 0, 1)
    c = a * (ndl * 2.2 + 0.35 * nra[..., 3])[..., None]
    c = c / (1 + c * 0.15)
    return np.clip(np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.clip(c, 0, None), 1 / 2.4) - 0.055), 0, 1)


def column(a, nra, size_m, crop_m, W=420):
    R = a.shape[0]
    px = int(round(crop_m / size_m * R))
    lit = shade(a, nra)
    c1 = cv2.resize(lit[:px, :px], (W, W), interpolation=cv2.INTER_CUBIC if px < W else cv2.INTER_AREA)
    # 3 m x 3 m of wall: the repeat tiled (shows how the repeat reads from ~10 m)
    reps = max(1, int(np.ceil(3.0 / size_m)))
    big = np.tile(lit, (reps, reps, 1))
    pxb = int(round(3.0 / size_m * R))
    c2 = cv2.resize(big[:pxb, :pxb], (W, W), interpolation=cv2.INTER_AREA)
    # albedo alone (flat light)
    c3 = cv2.resize(a[:px, :px], (W, W), interpolation=cv2.INTER_CUBIC if px < W else cv2.INTER_AREA)
    return np.vstack([c1, np.ones((6, W, 3)), c2, np.ones((6, W, 3)), c3])


def main():
    mat = sys.argv[1]
    crop = float(sys.argv[sys.argv.index("--crop") + 1]) if "--crop" in sys.argv else 0.6
    res = sys.argv[sys.argv.index("--res") + 1] if "--res" in sys.argv else "1k"
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else os.path.join(MAIN, "data", "raw", "texfactory", "sheets", f"{mat}.png")
    only = sys.argv[sys.argv.index("--only") + 1].split(",") if "--only" in sys.argv else None
    cols, labels = [], []
    gen = json.load(open(os.path.join(OUT_WEB, "generated.json"))) if os.path.exists(os.path.join(OUT_WEB, "generated.json")) else {}
    for cid, e in gen.items():
        if e["material"] != mat or not cid.endswith("_" + res):
            continue
        if only and cid not in only:
            continue
        p = os.path.join(WT, "viewer", "materials", e["files"])
        a, n = load_set(p + "_albedo.webp", p + "_nra.webp")
        cols.append(column(a, n, e["size_m"], crop))
        labels.append(f"GEN {e['variant']} ({e['size_m']} m)")
    cm = json.load(open(CAND))["materials"].get(mat, [])
    for c in cm:
        if c.get("source") == "texfactory" or (only and c["id"] not in only):
            continue
        f = find_scan(c["files"])
        if not f:
            continue
        a, n = load_set(*f)
        cols.append(column(a, n, c["size_m"], crop))
        labels.append(f"{c['id'][:22]}{' *' if c.get('current') else ''}")
    if not cols:
        print("nothing to compare")
        return
    sheet = np.hstack([np.hstack([c, np.ones((c.shape[0], 6, 3))]) for c in cols])
    sheet = (sheet * 255).astype(np.uint8)
    head = np.full((34, sheet.shape[1], 3), 255, np.uint8)
    for i, l in enumerate(labels):
        cv2.putText(head, l, (8 + i * 426, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 1, cv2.LINE_AA)
    sheet = np.vstack([head, sheet])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    cv2.imwrite(out, cv2.cvtColor(sheet, cv2.COLOR_RGB2BGR))
    print(out, f"rows: {crop} m crop (lit) | 3 x 3 m (lit, tiled) | {crop} m albedo")


if __name__ == "__main__":
    main()
