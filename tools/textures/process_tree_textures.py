"""Process the tree textures lab's sources into KTX2 (Basis UASTC + Zstandard, mipmapped), 1024 px:

LEAF SPRAYS (one card = one spray, as the procedural masks of viewer/treesPlane.js / treesBeech.js):
  sources  data/raw/textures/trees/blender/<sp>_{albedo,normal,thick}.png        (tools/blender/leafAtlas.py, "model":
                                                                                   leaves modelled in Blender)
           data/raw/textures/trees/blender/<sp>_scan_{albedo,normal,thick}.png   (the same sprays of CC0 SCANNED
                                                                                   leaves, ambientCG LeafSet010 / 024)
  outputs  viewer/trees/textures/leaf_<sp>[_scan]_a.ktx2   RGB albedo (sRGB) + A coverage; the alpha mips are
                                                           COVERAGE-PRESERVING (Castano; the procedural masks'
                                                           coverageMips): each level keeps the share of texels >= 0.5
                                                           of level 0, or far leaves thin into see-through crowns
           viewer/trees/textures/leaf_<sp>[_scan]_n.ktx2   R,G = the normal's x, y in the card's frame (OpenGL, +y =
                                                           image up, z = sqrt(1 - x^2 - y^2) toward the viewer),
                                                           B = thickness (light through = 1 - B), A = 1 (linear)
  The cluster is rounded off (a 10 % radial fade, as the masks) so the card's square never shows; the colour is bled
  under alpha 0 (push-pull) so filtering never pulls in black.

BARK SCANS (CC0; tiling, mixed in the shader with the species' own macro variation):
  sources  data/raw/textures/trees/<polyhaven|ambientcg>/<id>/{albedo,normal,rough,ao}.*
  outputs  viewer/trees/textures/bark_<id>_albedo.ktx2 (sRGB), bark_<id>_nra.ktx2 (normal x, y, roughness, AO; linear)

The manifest viewer/trees/textures/tree_textures.json records sources, licences, the mean linear albedo (leaves: over
the leaf texels; the shader keeps the species' palette and takes the spray's variation around this mean), sizes on
disk and the real size of one bark repeat.

    python -E -P tools/textures/process_tree_textures.py [--size 1024] [only ...]
(-E -P: no environment / no script-dir imports; the raw files are only read as images.)
Needs KTX-Software's `ktx` (C:/Program Files/KTX-Software/bin/ktx.exe).
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAW = os.path.join(ROOT, "data", "raw", "textures", "trees")
WORK = os.path.join(RAW, "_work")
OUT = os.path.join(ROOT, "viewer", "trees", "textures")
KTX = os.environ.get("KTX_EXE", "C:/Program Files/KTX-Software/bin/ktx.exe")
Image.MAX_IMAGE_PIXELS = 64_000_000

LEAVES = {
    # name: (blender pass prefix, what, licence, source)
    "leaf_plane": ("plane", "London plane spray, leaves modelled in Blender (tools/blender/leafAtlas.py)", "own work (repo licence)", "tools/blender/leafAtlas.py"),
    "leaf_plane_scan": ("plane_scan", "the plane's spray of CC0 scanned maple leaves (ambientCG LeafSet010)", "CC0", "https://ambientcg.com/view?id=LeafSet010"),
    "leaf_beech": ("beech", "beech spray, leaves modelled in Blender (tools/blender/leafAtlas.py)", "own work (repo licence)", "tools/blender/leafAtlas.py"),
    "leaf_beech_scan": ("beech_scan", "the beech's spray of CC0 scanned leaves (ambientCG LeafSet024)", "CC0", "https://ambientcg.com/view?id=LeafSet024"),
}
BARKS = {
    # id: (source, real size of one repeat in metres, what)
    "Bark009": ("ambientcg", 1.0, "plane: the camouflage (pale under-bark, peeling plates)"),
    "bark_platanus": ("polyhaven", 1.5, "plane: old, dark flaking bark (the foot of old planes)"),
    "chinese_hackberry_bark": ("polyhaven", 1.8, "beech: smooth grey-brown bark with pale lichen spots"),
    "Bark005": ("ambientcg", 1.0, "beech: smooth olive-grey bark with branch scars and algae"),
}


def srgb_to_lin(a):
    a = a / 255.0
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)


def coverage_mips(a0):
    """Level 0 alpha (uint8, square) -> the list of levels, each scaled so the same share of texels is >= 128."""
    target = (a0 >= 128).mean()
    out = [a0]
    src = a0.astype(np.float32)
    while src.shape[0] > 1:
        h = src.shape[0] // 2
        box = src.reshape(h, 2, h, 2).mean(axis=(1, 3))
        lo, hi = 0.5, 8.0
        for _ in range(18):
            k = (lo + hi) / 2
            if (box * k >= 128).mean() < target:
                lo = k
            else:
                hi = k
        mip = np.clip(np.round(box * (lo + hi) / 2), 0, 255)
        out.append(mip.astype(np.uint8))
        src = mip
    return out


def box_mips(img):
    """float32 HxWxC -> levels down to 1x1 (box filter)."""
    out = [img]
    while out[-1].shape[0] > 1:
        s = out[-1]
        h = s.shape[0] // 2
        out.append(s.reshape(h, 2, h, 2, s.shape[2]).mean(axis=(1, 3)))
    return out


def bleed(rgb, alpha):
    """Push-pull: the colour of the covered texels spread under the empty ones (weights = coverage)."""
    w = (alpha > 8).astype(np.float32)[..., None]
    levels = [(rgb * w, w)]
    while levels[-1][0].shape[0] > 1:
        c, ww = levels[-1]
        h = c.shape[0] // 2
        levels.append((c.reshape(h, 2, h, 2, -1).sum(axis=(1, 3)), ww.reshape(h, 2, h, 2, 1).sum(axis=(1, 3))))
    fill = levels[-1][0] / np.maximum(levels[-1][1], 1e-6)
    for c, ww in reversed(levels[:-1]):
        up = np.repeat(np.repeat(fill, 2, axis=0), 2, axis=1)
        own = c / np.maximum(ww, 1e-6)
        k = np.clip(ww, 0, 1)
        fill = own * k + up * (1 - k)
    return np.where(w > 0, rgb, fill)


def write_levels(name, levels, fmt, tf):
    """Each level as a PNG in the work dir, then `ktx create` with those levels: UASTC + zstd."""
    paths = []
    for i, lv in enumerate(levels):
        p = os.path.join(WORK, f"{name}_L{i}.png")
        Image.fromarray(lv.astype(np.uint8), "RGBA").save(p)
        paths.append(p)
    dst = os.path.join(OUT, f"{name}.ktx2")
    cmd = [KTX, "create", "--format", fmt, "--assign-tf", tf, "--encode", "uastc", "--uastc-quality", "2",
           "--zstd", "18", "--levels", str(len(levels)), *paths, dst]
    subprocess.run(cmd, check=True)
    return os.path.getsize(dst)


def gen_mips_and_write(name, rgba, fmt, tf):
    levels = [np.clip(np.round(l), 0, 255) for l in box_mips(rgba.astype(np.float32))]
    return write_levels(name, levels, fmt, tf)


def process_leaf(name, prefix, size):
    d = os.path.join(RAW, "blender")
    alb = Image.open(os.path.join(d, f"{prefix}_albedo.png")).convert("RGBA").resize((size, size), Image.LANCZOS)
    nor = Image.open(os.path.join(d, f"{prefix}_normal.png"))
    nor = np.asarray(nor.convert("RGBA").resize((size, size), Image.LANCZOS)).astype(np.float32)
    thk = np.asarray(Image.open(os.path.join(d, f"{prefix}_thick.png")).convert("L").resize((size, size), Image.LANCZOS)).astype(np.float32)
    a = np.asarray(alb).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3]
    # round the cluster off (as the procedural masks): the card's square never shows
    yy, xx = np.mgrid[0:size, 0:size]
    r = np.hypot(xx - size / 2 + 0.5, yy - size / 2 + 0.5) / (size / 2)
    alpha = alpha * np.clip((1 - r) / 0.1, 0, 1)
    # the normal's x, y (camera space, OpenGL: +y image up) from the 0..1 encoding; renormalised (filtering)
    n = nor[..., :3] / 255.0 * 2 - 1
    n /= np.maximum(np.linalg.norm(n, axis=2, keepdims=True), 1e-6)
    n[..., 2] = np.abs(n[..., 2])
    nrm = np.dstack([(n[..., 0] * 0.5 + 0.5) * 255, (n[..., 1] * 0.5 + 0.5) * 255, thk])
    rgb_b = bleed(rgb, alpha)
    nrm_b = bleed(nrm, alpha)
    # (the bleed's fill under the empty texels: the normal's "flat" default where nothing was covered at all)
    a_levels = coverage_mips(np.clip(np.round(alpha), 0, 255).astype(np.uint8))
    c_levels = box_mips(rgb_b)
    n_levels = box_mips(nrm_b)
    A = [np.dstack([c, al.astype(np.float32)]) for c, al in zip(c_levels, a_levels)]
    N = [np.dstack([nl, np.full(nl.shape[:2], 255.0, np.float32)]) for nl in n_levels]
    sa = write_levels(f"{name}_a", [np.clip(np.round(x), 0, 255) for x in A], "R8G8B8A8_SRGB", "srgb")
    sn = write_levels(f"{name}_n", [np.clip(np.round(x), 0, 255) for x in N], "R8G8B8A8_UNORM", "linear")
    cov = alpha >= 128
    mean = srgb_to_lin(rgb[cov]).mean(axis=0)
    return {"px": size, "coverage": round(float(cov.mean()), 4), "mean_albedo_linear": [round(float(v), 4) for v in mean],
            "mean_thickness": round(float(thk[cov].mean() / 255), 3), "a_ktx2_bytes": sa, "n_ktx2_bytes": sn}


def find(d, role):
    for ext in (".jpg", ".png"):
        p = os.path.join(d, role + ext)
        if os.path.exists(p):
            return p
    return None


def process_bark(aid, src, size):
    d = os.path.join(RAW, src, aid)
    load = lambda role, mode: (Image.open(find(d, role)).convert(mode).resize((size, size), Image.LANCZOS) if find(d, role) else None)
    alb, nor, rough = load("albedo", "RGB"), load("normal", "RGB"), load("rough", "L")
    ao = load("ao", "L") or Image.new("L", (size, size), 255)
    if alb is None or nor is None or rough is None:
        raise SystemExit(f"{aid}: missing raw maps in {d}: run fetch_tree_textures.py")
    nr, ng, _ = nor.split()
    nra = np.dstack([np.asarray(nr), np.asarray(ng), np.asarray(rough), np.asarray(ao)]).astype(np.float32)
    albA = np.dstack([np.asarray(alb), np.full((size, size), 255, np.uint8)]).astype(np.float32)
    sa = gen_mips_and_write(f"bark_{aid}_albedo", albA, "R8G8B8A8_SRGB", "srgb")
    sn = gen_mips_and_write(f"bark_{aid}_nra", nra, "R8G8B8A8_UNORM", "linear")
    mean = srgb_to_lin(np.asarray(alb).reshape(-1, 3).astype(np.float32)).mean(axis=0)
    return {"px": size, "mean_albedo_linear": [round(float(v), 4) for v in mean],
            "mean_roughness": round(float(np.asarray(rough).mean() / 255), 3), "albedo_ktx2_bytes": sa, "nra_ktx2_bytes": sn}


def main():
    size = int(sys.argv[sys.argv.index("--size") + 1]) if "--size" in sys.argv else 1024
    only = [a for a in sys.argv[1:] if not a.startswith("--") and not a.isdigit()]
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(WORK, exist_ok=True)
    mp = os.path.join(OUT, "tree_textures.json")
    man = json.load(open(mp)) if os.path.exists(mp) else {"leaves": {}, "bark": {}}
    for name, (prefix, what, lic, url) in LEAVES.items():
        if only and name not in only:
            continue
        e = process_leaf(name, prefix, size)
        man["leaves"][name] = {"what": what, "licence": lic, "source": url, **e}
        print(name, e)
    for aid, (src, size_m, what) in BARKS.items():
        if only and aid not in only:
            continue
        meta = json.load(open(os.path.join(RAW, src, aid, "meta.json")))
        e = process_bark(aid, src, size)
        man["bark"][aid] = {"what": what, "licence": "CC0", "source": meta["url"], "size_m": size_m, **e}
        print(aid, e)
    man["megascans"] = {
        "status": "not available locally (2026-11-06): slot C in the lab is empty",
        "licence": "Fab Standard License (NOT CC0): lab only, never committed raw, never redistributed",
        "wanted": ["Beech Bark", "European Beech (leaf set)", "Norway Maple (palmate leaves, for the plane)",
                   "Maple Leaves", "Silver Birch Bark"],
        "how": "drop the exported maps into data/raw/textures/trees/megascans/<asset>/ (albedo, normal, roughness, "
               "opacity) and add them to BARKS / LEAVES above (leaves: tools/blender/leafAtlas.py --scan-root)",
    }
    json.dump(man, open(mp, "w"), indent=1)


if __name__ == "__main__":
    main()
