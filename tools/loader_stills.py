"""The loading screen's stills (docs/BOOT.md): PNG renders from debug/loaderShots.js -> viewer/loader/stills/<id>.avif
(+ <id>.jpg, the fallback), 1920 x 1080, each aimed at ~150-300 KB.

    python tools/loader_stills.py <folder with stjob.png observatory.png townhall.png> [ids...]

Needs Pillow with AVIF (Pillow >= 11.3 has it built in).
"""
import os, sys
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "viewer", "loader", "stills")
W, H = 1920, 1080
TARGET_KB = (150, 300)


def encode(im, path, fmt, q):
    if fmt == "AVIF":
        im.save(path, fmt, quality=q, speed=4)
    else:
        im.save(path, fmt, quality=q, optimize=True, progressive=True, subsampling="4:2:0")
    return os.path.getsize(path) / 1024


def best(im, path, fmt, qs):
    """the highest quality whose file stays under the target's top"""
    for q in qs:
        kb = encode(im, path, fmt, q)
        if kb <= TARGET_KB[1]:
            return q, kb
    return q, kb


def main():
    src = sys.argv[1]
    ids = sys.argv[2:] or ["stjob", "observatory", "townhall"]
    os.makedirs(OUT, exist_ok=True)
    for i in ids:
        im = Image.open(os.path.join(src, f"{i}.png")).convert("RGB").resize((W, H), Image.LANCZOS)
        qa, ka = best(im, os.path.join(OUT, f"{i}.avif"), "AVIF", [72, 66, 60, 55, 50, 45])
        qj, kj = best(im, os.path.join(OUT, f"{i}.jpg"), "JPEG", [86, 82, 78, 74, 70, 66, 62])
        print(f"{i}: avif q{qa} {ka:.0f} KB, jpg q{qj} {kj:.0f} KB")


if __name__ == "__main__":
    main()
