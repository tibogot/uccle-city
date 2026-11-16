# Browser pose strips: crops real screenshots (the character centred by the side camera) and tiles them, labelled.
#   python tools/characters/shotStrip.py <out.jpg> <labels.json> <shot0.jpeg> <shot1.jpeg> ... [--crop x0,y0,x1,y1]
# labels.json: [{t, mode, speed, top, stairs}, ...] (the in-page harness log, one per shot)
import sys, json
from PIL import Image, ImageDraw
args = sys.argv[1:]
crop = (430, 150, 1010, 790)
if "--crop" in args:
    i = args.index("--crop"); crop = tuple(int(v) for v in args[i + 1].split(",")); del args[i:i + 2]
out, labels, shots = args[0], json.load(open(args[1])), args[2:]
ims = [Image.open(s).convert("RGB").crop(crop) for s in shots]
w, h = ims[0].size
strip = Image.new("RGB", (w * len(ims), h + 40), (24, 26, 30))
d = ImageDraw.Draw(strip)
for i, im in enumerate(ims):
    strip.paste(im, (i * w, 40))
    f = labels[i] if i < len(labels) else {}
    d.text((i * w + 6, 4), f"t {f.get('t', '')} s  {f.get('mode', '')}  {f.get('speed', '')} m/s" + (f"  stairs {f['stairs']}" if f.get("stairs") else ""), fill=(235, 235, 235))
    d.text((i * w + 6, 20), str(f.get("top", ""))[:70], fill=(170, 200, 240))
strip.save(out, quality=84)
print("wrote", out, strip.size)
