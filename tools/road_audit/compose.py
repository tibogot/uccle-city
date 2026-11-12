"""Side-by-side strips of Road Lab screenshots: photo | before (paint v1) | after (paint v2), with a caption bar.

    python tools/road_audit/compose.py <dir> <out_dir>      # <dir>/j<N>_{photo,v1,v2}.png -> <out_dir>/junction_<N>.jpg
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
for n in range(1, 11):
    parts = [src / f"j{n}_{k}.png" for k in ("photo", "v1", "v2")]
    if not all(p.exists() for p in parts):
        continue
    ims = [Image.open(p).convert("RGB") for p in parts]
    w, h = ims[0].size
    s = 640 / w
    ims = [im.resize((640, int(h * s))) for im in ims]
    H = ims[0].size[1]
    sheet = Image.new("RGB", (640 * 3 + 8, H + 26), (30, 34, 40))
    d = ImageDraw.Draw(sheet)
    for k, (im, lab) in enumerate(zip(ims, ("orthophoto 2024 (UrbIS, CC0)", "before: paint v1 (engine rules)", "after: paint v2 (measured)"))):
        sheet.paste(im, (k * 644, 26))
        d.text((k * 644 + 6, 6), f"{n}. {lab}", fill=(230, 233, 238))
    sheet.save(out / f"junction_{n:02d}.jpg", quality=86)
    print(out / f"junction_{n:02d}.jpg")
