"""THE POOL'S BAKED CAUSTICS (claude/villa3 job 3b, rule villa-caustics-baked): the classic cheap game technique.

A real light-through-waves projection, computed (no Blender needed: it is a ray splat): a TILEABLE water surface
(a sum of travelling waves whose wave vectors are whole multiples of 2 pi / L and whose phases loop over the
animation), its normals refract a vertical bundle of sun rays (Snell, n = 1.333) onto a floor at depth D, and the
arriving photons are splatted (bilinear, wrapped) into the tile: the bright web where the rays bunch up. Three
refractive indices (1.327 / 1.333 / 1.341) give the R / G / B channels: the slight rainbow split at the lines' edges
comes out of ONE texture lookup. FRAMES layers loop seamlessly.

    python tools/villa/caustics_bake.py [size=256] [frames=12]   -> models/villa/caustics.ktx2 (+ _work PNGs)
The shader (viewer/villa/villaPool.js) samples it twice (two scales, two scroll directions, two frame phases) and
takes the MIN: <= 2 lookups."""
import sys, os, subprocess
import numpy as np
from PIL import Image
N = int(sys.argv[1]) if len(sys.argv) > 1 else 256
FR = int(sys.argv[2]) if len(sys.argv) > 2 else 16
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
WORK = os.path.join(ROOT, "models", "villa", "_caustics"); os.makedirs(WORK, exist_ok=True)
L, D = 1.0, 1.1                  # the tile (1 m: the shader scales it) and the depth of the floor under the surface
rng = np.random.default_rng(7)
waves = []
for _ in range(14):              # (kx, ky integer: tileable; m integer: loops in FR frames)
    kx, ky = rng.integers(-6, 7, 2)
    if kx == 0 and ky == 0: continue
    k = np.hypot(kx, ky)
    waves.append((kx, ky, 0.0085 / k ** 1.25, rng.integers(1, 3) * (1 if rng.random() < 0.5 else -1), rng.random() * 2 * np.pi))
R = 6                             # rays per texel per axis
xs = (np.arange(N * R) + 0.5) / (N * R) * L
X, Y = np.meshgrid(xs, xs, indexing="xy")
files = []
for f in range(FR):
    ph = 2 * np.pi * f / FR
    gx = np.zeros_like(X); gy = np.zeros_like(Y)
    for (kx, ky, a, m, p0) in waves:
        arg = 2 * np.pi * (kx * X + ky * Y) / L + m * ph + p0
        c = np.cos(arg) * a * 2 * np.pi / L
        gx += c * kx; gy += c * ky
    nrm = np.stack([-gx, -gy, np.ones_like(gx)], -1); nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
    chans = []
    for eta in (1 / 1.327, 1 / 1.333, 1 / 1.341):
        i = np.array([0, 0, -1.0])                                   # the sun straight down (the shader projects along the real one)
        cosi = -(nrm @ i)
        k2 = 1 - eta * eta * (1 - cosi * cosi)
        t = eta * i + (eta * cosi - np.sqrt(np.maximum(k2, 0)))[..., None] * nrm
        hx = X + t[..., 0] / -t[..., 2] * D; hy = Y + t[..., 1] / -t[..., 2] * D
        u = (hx / L * N) % N - 0.5; v = (hy / L * N) % N - 0.5
        u0 = np.floor(u).astype(int); v0 = np.floor(v).astype(int); fu = u - u0; fv = v - v0
        img = np.zeros((N, N))
        for du, dv, w in ((0, 0, (1 - fu) * (1 - fv)), (1, 0, fu * (1 - fv)), (0, 1, (1 - fu) * fv), (1, 1, fu * fv)):
            np.add.at(img, ((v0 + dv) % N, (u0 + du) % N), w)
        img /= img.mean()
        chans.append(img)
    I = np.stack(chans, -1)
    T = np.clip(I / (I + 1.0) * 1.35 - 0.1, 0, 1) ** 1.6         # (mean ~0.35; the lines near 1)
    p = os.path.join(WORK, f"c{f:02d}.png"); Image.fromarray((T * 255 + 0.5).astype(np.uint8), "RGB").save(p); files.append(p)
    print("frame", f, "mean", round(float(T.mean()), 3), "max", round(float(T.max()), 3))
KTX = os.environ.get("KTX_EXE", "C:/Program Files/KTX-Software/bin/ktx.exe")
out = os.path.join(ROOT, "models", "villa", "caustics.ktx2")
subprocess.run([KTX, "create", "--format", "R8G8B8A8_UNORM", "--assign-tf", "linear", "--layers", str(FR), "--encode", "basis-lz", "--clevel", "2", "--qlevel", "200",
                "--generate-mipmap", *files, out], check=True)          # (ETC1S: 165 KB for 12 x 256^2; UASTC was 552 KB, over the 0.5 MB budget)
print(out, os.path.getsize(out) // 1024, "KB")
