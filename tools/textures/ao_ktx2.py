# AO MAPS -> KTX2 BC4 (fix3, docs/FIX3.md): every baked ambient-occlusion PNG over 300 KB (models/*/*_ao.png: the
# landmarks, bridges, kits) re-encoded as a KTX2 of BC4 blocks (one channel, 4 bits / texel: half of the R8 texture the
# loaders made from the PNG), with ALL its mip levels baked here (box filter, as the GPU's mip generation), Zstandard
# supercompressed by the KTX-Software CLI (`ktx deflate`). three's KTX2Loader passes BC4 through untouched (no Basis
# transcode; WebGPU feature texture-compression-bc); without it the loaders fall back to the PNG.
#
# Why BC4 and not Basis (UASTC / ETC1S): on desktop both transcode to BC7 = 1 byte / texel, the same GPU memory as the
# R8 texture we have now; BC4 halves it and needs no transcoder. The KTX CLI has no BC4 encoder: the blocks are encoded
# here (numpy, min / max endpoints + an endpoint refinement search, error measured below).
#
#   python tools/textures/ao_ktx2.py [--min-kb 300] [--force] [names...]
# writes models/<dir>/<name>_ao.ktx2 and viewer/aoKtx2List.js (the list the loaders read: file -> source PNG hash, the
# ?v= stamp). Prints per map: PNG KB, KTX2 KB, mean / max abs error of level 0 (0..255).
import hashlib
import json
import os
import struct
import subprocess
import sys

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
KTX = os.environ.get("KTX_EXE", r"C:\Program Files\KTX-Software\bin\ktx.exe")
VK_FORMAT_BC4_UNORM_BLOCK = 139


def mips(a):
    """level 0 .. 1x1, 2x2 box filter (an odd size keeps its last row / column in the last texel)"""
    out = [a]
    f = a.astype(np.float32)
    while f.shape[0] > 1 or f.shape[1] > 1:
        h, w = f.shape
        nh, nw = max(1, h // 2), max(1, w // 2)
        f = f[: nh * 2 if h > 1 else 1, : nw * 2 if w > 1 else 1]
        if h > 1: f = (f[0::2] + f[1::2]) * 0.5
        if w > 1: f = (f[:, 0::2] + f[:, 1::2]) * 0.5
        out.append(np.clip(np.rint(f), 0, 255).astype(np.uint8))
    return out


def palette(e0, e1):
    """BC4 8-level palette for e0 > e1 (e0, e1: (N,) float) -> (N, 8)"""
    p = np.empty((e0.shape[0], 8), np.float32)
    p[:, 0] = e0; p[:, 1] = e1
    for i in range(1, 7): p[:, i + 1] = ((7 - i) * e0 + i * e1) / 7.0
    return p


def bc4(img):
    """uint8 (H, W) -> BC4 blocks bytes (row-major blocks, 8 bytes each), padded to a multiple of 4 by edge copy"""
    h, w = img.shape
    bh, bw = (h + 3) // 4, (w + 3) // 4
    pad = np.pad(img, ((0, bh * 4 - h), (0, bw * 4 - w)), mode="edge").astype(np.float32)
    allb = pad.reshape(bh, 4, bw, 4).transpose(0, 2, 1, 3).reshape(-1, 16)         # texel k = row * 4 + col
    outs, decs = [], []
    for s in range(0, allb.shape[0], 65536):
        o, d = bc4_blocks(allb[s:s + 65536])
        outs.append(o); decs.append(d)
    dec = np.concatenate(decs).reshape(bh, bw, 4, 4).transpose(0, 2, 1, 3).reshape(bh * 4, bw * 4)[:h, :w]
    return b"".join(outs), dec


def bc4_blocks(blk):
    lo, hi = blk.min(1), blk.max(1)
    best_err = np.full(blk.shape[0], np.inf, np.float32)
    best_e0, best_e1, best_idx = hi.copy(), lo.copy(), np.zeros(blk.shape, np.int64)
    # endpoint refinement: the min / max pulled in by 0..3 levels each end (rounding of the 1/7 steps)
    for a in range(0, 4):
        for b in range(0, 4):
            e0 = np.clip(hi - a, 0, 255); e1 = np.clip(lo + b, 0, 255)
            e1 = np.minimum(e1, e0 - 1)                                             # keep the 8-level mode (e0 > e1)
            ok = e1 >= 0
            e0 = np.where(ok, e0, 1); e1 = np.where(ok, e1, 0)
            p = palette(e0, e1)
            d = np.abs(blk[:, :, None] - p[:, None, :])
            idx = d.argmin(2)
            err = np.take_along_axis(d, idx[:, :, None], 2)[:, :, 0]
            sse = (err * err).sum(1)
            better = sse < best_err
            best_err = np.where(better, sse, best_err)
            best_e0 = np.where(better, e0, best_e0); best_e1 = np.where(better, e1, best_e1)
            best_idx = np.where(better[:, None], idx, best_idx)
    flat = hi == lo                                                                  # one value: e0 = v, e1 = v - 1 (or 1, 0)
    best_e0 = np.where(flat, np.maximum(hi, 1), best_e0); best_e1 = np.where(flat, np.maximum(hi, 1) - 1, best_e1)
    best_idx = np.where(flat[:, None], np.where(hi[:, None] == 0, 1, 0), best_idx)
    bits = np.zeros(blk.shape[0], np.uint64)
    for k in range(16): bits |= best_idx[:, k].astype(np.uint64) << np.uint64(3 * k)
    out = np.zeros((blk.shape[0], 8), np.uint8)
    out[:, 0] = best_e0.astype(np.uint8); out[:, 1] = best_e1.astype(np.uint8)
    for k in range(6): out[:, 2 + k] = ((bits >> np.uint64(8 * k)) & np.uint64(255)).astype(np.uint8)
    # decoded level, for the error report
    dec = np.take_along_axis(palette(best_e0.astype(np.float32), best_e1.astype(np.float32)), best_idx, 1)
    return out.tobytes(), dec


def ktx2(levels_bytes, w, h):
    """an uncompressed-scheme KTX2 of BC4 levels (level 0 first in the list; the data is written smallest first)"""
    n = len(levels_bytes)
    ident = bytes([0xAB, 0x4B, 0x54, 0x58, 0x20, 0x32, 0x30, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A])
    # DFD: one basic block, BC4 model (131), 4x4 texel block, 8 bytes a plane, one sample of 64 bits
    sample = struct.pack("<HBB4BII", 0, 63, 0, 0, 0, 0, 0, 0, 0xFFFFFFFF)
    block = struct.pack("<IHHBBBB4B8B", 0, 2, 24 + len(sample), 131, 1, 1, 0, 3, 3, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0) + sample
    dfd = struct.pack("<I", 4 + len(block)) + block
    kv_key, kv_val = b"KTXwriter\x00", b"uccle tools/textures/ao_ktx2.py\x00"
    kv = struct.pack("<I", len(kv_key) + len(kv_val)) + kv_key + kv_val
    kv += b"\x00" * ((-len(kv)) % 4)
    head = 12 + 9 * 4 + 4 * 4 + 2 * 8 + n * 24
    dfd_off = head
    kv_off = dfd_off + len(dfd)
    data_off = kv_off + len(kv)
    data_off += (-data_off) % 8
    offs = [0] * n
    body = b""
    cur = data_off
    for i in reversed(range(n)):                         # smallest level first in the file
        cur += (-cur) % 8
        if len(body) < cur - data_off: body += b"\x00" * (cur - data_off - len(body))
        offs[i] = cur
        body += levels_bytes[i]
        cur += len(levels_bytes[i])
    hdr = ident + struct.pack("<9I", VK_FORMAT_BC4_UNORM_BLOCK, 1, w, h, 0, 0, 1, n, 0)
    hdr += struct.pack("<4I2Q", dfd_off, len(dfd), kv_off, len(kv), 0, 0)
    for i in range(n): hdr += struct.pack("<3Q", offs[i], len(levels_bytes[i]), len(levels_bytes[i]))
    assert len(hdr) == head
    pad = b"\x00" * (data_off - (head + len(dfd) + len(kv)))
    return hdr + dfd + kv + pad + body


def main():
    args = sys.argv[1:]
    min_kb = 300
    if "--min-kb" in args: min_kb = int(args[args.index("--min-kb") + 1])
    force = "--force" in args
    names = [a for i, a in enumerate(args) if not a.startswith("--") and (i == 0 or args[i - 1] != "--min-kb")]
    pngs = []
    for d, _, fs in os.walk(os.path.join(ROOT, "models")):
        for f in fs:
            if f.endswith("_ao.png") and os.path.getsize(os.path.join(d, f)) > min_kb * 1024:
                pngs.append(os.path.join(d, f))
    pngs.sort()
    # the petrol kit's loader reads its AO pixels on the CPU (fuelKit.js at()): it keeps the PNG
    pngs = [p for p in pngs if not p.replace("\\", "/").endswith("models/fuel/fuelkit_ao.png")]
    listing = {}
    tot_png = tot_ktx = 0
    for p in pngs:
        rel = os.path.relpath(p, ROOT).replace("\\", "/")
        out = p[:-4] + ".ktx2"
        src_hash = hashlib.sha1(open(p, "rb").read()).hexdigest()[:10]
        if names and not any(n in rel for n in names) and os.path.exists(out):
            listing[rel] = src_hash; continue
        img = np.asarray(Image.open(p).convert("RGB"))[:, :, 0]                       # the loaders take the red channel
        h, w = img.shape
        if w % 4 or h % 4: print("skip (not a multiple of 4):", rel, w, h); continue
        if force or not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(p):
            lv = mips(img)
            blocks = []
            err0 = None
            for i, m in enumerate(lv):
                b, dec = bc4(m)
                blocks.append(b)
                if i == 0: err0 = np.abs(dec - m.astype(np.float32))
            raw = out + ".raw.ktx2"
            open(raw, "wb").write(ktx2(blocks, w, h))
            subprocess.run([KTX, "deflate", "--zstd", "19", raw, out], check=True)
            os.remove(raw)
            subprocess.run([KTX, "validate", out], check=True, stdout=subprocess.DEVNULL)
            print(f"{rel}: {w}x{h} {len(lv)} levels, PNG {os.path.getsize(p) // 1024} KB -> KTX2 {os.path.getsize(out) // 1024} KB, "
                  f"level-0 error mean {err0.mean():.2f} max {err0.max():.0f} /255")
        tot_png += os.path.getsize(p); tot_ktx += os.path.getsize(out)
        listing[rel] = src_hash
    js = ("// GENERATED by tools/textures/ao_ktx2.py (fix3, docs/FIX3.md): the AO PNGs that have a BC4 KTX2 beside them\n"
          "// (<name>_ao.ktx2), -> the source PNG's hash (the ?v= stamp). viewer/aoTexture.js reads it.\n"
          f"export const AO_KTX2 = {json.dumps(listing, indent=1)};\n")
    open(os.path.join(ROOT, "viewer", "aoKtx2List.js"), "w", encoding="utf8", newline="\n").write(js)
    print(f"{len(listing)} maps; this run's PNG {tot_png / 1048576:.1f} MB -> KTX2 {tot_ktx / 1048576:.1f} MB")


if __name__ == "__main__":
    main()
