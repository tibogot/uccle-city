"""Bake a generator's maps (albedo linear RGB, height m, roughness, optional cavity AO / metalness) into the files the
material library reads, exactly like a scan (tools/textures/process_textures.py):

  data/raw/texfactory/out/<mat>/<variant>/   2K sources (git-ignored): albedo.png (sRGB), normal.png (OpenGL),
                                             rough.png, ao.png, height.png (16 bit, range in meta.json), preview.png
  data/raw/texfactory/_work/<id>_<role>.png  RGBA PNG for the KTX2 encoder (tools/texturefactory/encode.py)
  viewer/materials/generated/<mat>/<variant>/<mat>_<res>_albedo.webp + _nra.webp   WebP fallback (git-ignored)
     nra = R,G normal x,y (OpenGL, +y up) + B roughness + A ambient occlusion (linear), like the scans
"""
import json
import os

import cv2
import numpy as np

from .core import lin_to_srgb, f32

HERE = os.path.dirname(os.path.abspath(__file__))
WT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))                      # the worktree / checkout root
MAIN = os.path.abspath(os.path.join(WT, "..", "..", "..")) if ".claude" in WT else WT
RAW = os.path.join(MAIN, "data", "raw", "texfactory")
OUT_WEB = os.path.join(WT, "viewer", "materials", "generated")
WORK = os.path.join(RAW, "_work")


def finish(T, albedo, height, rough, cavity=None, metal=None, ao_radius=0.03, ao_strength=1.0):
    """derive normal + AO from the height; returns the full-resolution map set"""
    n = T.normal(height)
    ao = T.ao(height, ao_radius, strength=ao_strength)
    if cavity is not None:
        ao = ao * cavity
    return {"albedo": np.clip(albedo, 0, 1).astype(f32), "height": height.astype(f32), "rough": np.clip(rough, 0.02, 1).astype(f32),
            "ao": np.clip(ao, 0, 1).astype(f32), "normal": n, "metal": metal, "N": T.N, "size_m": T.size}


def _u8(a):
    return np.clip(np.round(a * 255), 0, 255).astype(np.uint8)


def downsample(maps, R):
    """area-filtered downsample; the normal is re-derived from the averaged vectors (renormalised), like a mip"""
    N = maps["N"]
    if R == N:
        return maps
    out = dict(maps)
    rs = lambda a: cv2.resize(a, (R, R), interpolation=cv2.INTER_AREA)
    out["albedo"] = rs(maps["albedo"])
    out["rough"] = rs(maps["rough"])
    out["ao"] = rs(maps["ao"])
    out["height"] = rs(maps["height"])
    n = rs(maps["normal"])
    n /= np.linalg.norm(n, axis=-1, keepdims=True) + 1e-9
    out["normal"] = n
    out["N"] = R
    return out


def lit_preview(m, light=(-0.55, 0.45, 0.35)):
    """a quick grazing-light render (sRGB u8) to judge relief and colour without the viewer"""
    l = np.array(light, f32)
    l /= np.linalg.norm(l)
    ndl = np.clip((m["normal"] * l).sum(-1), 0, 1)
    sky = 0.35 * m["ao"]
    c = m["albedo"] * (ndl * 2.2 + sky)[..., None]
    return _u8(lin_to_srgb(c / (1 + c * 0.15)))


def stats(m):
    a = m["albedo"]
    small = cv2.resize(a, (64, 64), interpolation=cv2.INTER_AREA)
    lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    return {"mean_albedo_linear": [round(float(v), 4) for v in small.reshape(-1, 3).mean(0)],
            "mean_roughness": round(float(m["rough"].mean()), 3),
            "lum_std": round(float(lum.std() / (lum.mean() + 1e-6)), 3)}


def write(mat, variant, maps, meta, sizes=(1024, 2048), webp=True):
    """write the 2K sources, the KTX2 work files and the WebP fallbacks; return the per-resolution entries"""
    src = os.path.join(RAW, "out", mat, variant)
    os.makedirs(src, exist_ok=True)
    os.makedirs(WORK, exist_ok=True)
    m = maps
    cv2.imwrite(os.path.join(src, "albedo.png"), cv2.cvtColor(_u8(lin_to_srgb(m["albedo"])), cv2.COLOR_RGB2BGR))
    nrm = m["normal"] * 0.5 + 0.5
    cv2.imwrite(os.path.join(src, "normal.png"), cv2.cvtColor(_u8(nrm), cv2.COLOR_RGB2BGR))
    cv2.imwrite(os.path.join(src, "rough.png"), _u8(m["rough"]))
    cv2.imwrite(os.path.join(src, "ao.png"), _u8(m["ao"]))
    h = m["height"]
    lo, hi = float(h.min()), float(h.max())
    cv2.imwrite(os.path.join(src, "height.png"), np.round((h - lo) / (hi - lo + 1e-12) * 65535).astype(np.uint16))
    if m.get("metal") is not None:
        cv2.imwrite(os.path.join(src, "metal.png"), _u8(m["metal"]))
    prev = lit_preview(m)
    cv2.imwrite(os.path.join(src, "preview.png"), cv2.cvtColor(prev, cv2.COLOR_RGB2BGR))
    st = stats(m)
    json.dump({**meta, **st, "height_range_m": [lo, hi], "N": m["N"]}, open(os.path.join(src, "meta.json"), "w"), indent=1)

    entries = {}
    web = os.path.join(OUT_WEB, mat, variant)
    os.makedirs(web, exist_ok=True)
    for R in sizes:
        d = downsample(m, R)
        alb = _u8(lin_to_srgb(d["albedo"]))
        nra = np.dstack([_u8(d["normal"][..., 0] * 0.5 + 0.5), _u8(d["normal"][..., 1] * 0.5 + 0.5), _u8(d["rough"]), _u8(d["ao"])])
        tag = f"{'1k' if R == 1024 else '2k' if R == 2048 else R}"
        base = f"{mat}_{tag}"
        e = {"px": R, "files": f"generated/{mat}/{variant}/{base}"}
        for role, im in (("albedo", np.dstack([alb, np.full((R, R), 255, np.uint8)])), ("nra", nra)):
            key = f"tf_{mat}_{variant}_{tag}_{role}"
            raw = os.path.join(WORK, key + ".png")
            cv2.imwrite(raw, cv2.cvtColor(np.ascontiguousarray(im), cv2.COLOR_RGBA2BGRA))
            json.dump({"width": R, "height": R, "out": os.path.join(web, f"{base}_{role}.ktx2"), "role": role,
                       "mat": mat, "variant": variant, "tag": tag}, open(raw + ".json", "w"))
            if webp:
                p = os.path.join(web, f"{base}_{role}.webp")
                if role == "albedo":
                    cv2.imwrite(p, cv2.cvtColor(alb, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_WEBP_QUALITY, 90])
                else:   # lossless: the packed normal / roughness / AO must not get chroma-subsampled
                    cv2.imwrite(p, cv2.cvtColor(nra, cv2.COLOR_RGBA2BGRA), [cv2.IMWRITE_WEBP_QUALITY, 101])
                e[f"{role}_webp_bytes"] = os.path.getsize(p)
        entries[tag] = e
    return st, entries
