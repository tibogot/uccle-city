# Tiles the frames tools/blender/ualStrip.py rendered into one labelled strip per run: docs/ual/<run>.jpg
#   python tools/characters/stripTile.py <objdir> <outdir> <run> [<run> ...]
import sys, os, json
from PIL import Image, ImageDraw

OBJ, OUT, RUNS = sys.argv[1], sys.argv[2], sys.argv[3:]
os.makedirs(OUT, exist_ok=True)
for run in RUNS:
    d = os.path.join(OBJ, run)
    meta = json.load(open(os.path.join(d, "frames.json")))
    ims = [Image.open(os.path.join(d, f"r{f['k']}.png")).convert("RGB") for f in meta["frames"]]
    w, h = ims[0].size
    strip = Image.new("RGB", (w * len(ims), h + 44), (24, 26, 30))
    dr = ImageDraw.Draw(strip)
    for i, (im, f) in enumerate(zip(ims, meta["frames"])):
        strip.paste(im, (i * w, 44))
        dr.text((i * w + 6, 4), f"{run}  t {f['t']:.2f} s  {f['mode']}  {f['speed']} m/s", fill=(235, 235, 235))
        dr.text((i * w + 6, 18), (f.get("top") or "")[:62], fill=(170, 200, 240))
        if f.get("stairs"): dr.text((i * w + 6, 31), f"stairs k {f['stairs']}", fill=(240, 200, 150))
    strip.save(os.path.join(OUT, f"{run}.jpg"), quality=86)
    print("wrote", os.path.join(OUT, f"{run}.jpg"))
