# Decode the RGBM lightmaps (lin = (rgb * a * 4)^2) to a tone-mapped strip, for a quick look:
#   python tools/interior/viewLightmaps.py models/interior/maison1 out.png
import sys
import numpy as np
from PIL import Image
d, out = sys.argv[1], sys.argv[2]
ims = []
for n, g in (("sky", 6), ("sun", 10), ("night", 0.6)):
    a = np.asarray(Image.open(f"{d}/lm_{n}.png")).astype(np.float32) / 255
    lin = (a[..., :3] * a[..., 3:4] * 4) ** 2 * g
    v = np.clip(lin / (1 + lin), 0, 1) ** (1 / 2.2)
    ims.append(Image.fromarray((v * 255).astype(np.uint8)).resize((640, 640)))
s = Image.new("RGB", (1920, 640))
for i, im in enumerate(ims): s.paste(im, (i * 640, 0))
s.save(out)
