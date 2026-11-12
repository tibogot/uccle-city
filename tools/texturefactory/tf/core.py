"""Texture factory core: tileable (toroidal) image operations on float32 arrays, in METRES.

Every map is an N x N float32 array that wraps (left edge continues the right edge, top the bottom), so every
operation here is periodic: FFT noise, wrap-padded blurs, BORDER_WRAP warps, np.roll derivatives. A generator works
in real units: `T = Tex(N, size_m)`; T.px = metres per texel; heights in metres; then `bake()` derives the normal
(OpenGL, +y up), AO (horizon search on the height field), curvature, and writes the maps.

The building blocks mirror Substance Designer's node families (see docs/TEXTURE_FACTORY_RESEARCH.md):
  noise / fbm (Perlin, Clouds), worley (Cells, Crystal), units (Tile Generator + Flood Fill: per-unit ids, local
  coordinates and edge distance), warp (Warp / Directional Warp), slope_blur, curvature (Curvature Smooth), ao (Ambient
  Occlusion HBAO), edge wear (curvature x grunge), grime in recesses (AO x grunge).
"""
import numpy as np
import cv2

f32 = np.float32


class Tex:
    """Grid of N x N texels covering size_m x size_m metres; yy, xx in metres (y DOWN the image)."""

    def __init__(self, N, size_m, seed):
        self.N, self.size, self.px = N, float(size_m), float(size_m) / N
        self.seed = seed
        self.rng = np.random.default_rng(seed)
        c = (np.arange(N, dtype=f32) + 0.5) * self.px
        self.xx, self.yy = np.meshgrid(c, c)

    def child(self, k):
        """an independent random stream (stable when other calls are added elsewhere)"""
        return np.random.default_rng([self.seed, k])

    # -------------------------------------------------------------------------------------------- noises
    def noise(self, wavelength_m, k, octaves=1, gain=0.5, lac=2.0, beta=0.0):
        """Band-limited, isotropic, perfectly tileable noise (FFT spectral synthesis), mean 0, std 1.
        wavelength_m: the base feature size; octaves > 1 adds finer bands (gain per octave): an fbm."""
        f0 = self.size / wavelength_m                       # cycles per tile
        fhi = f0 * lac ** (octaves - 1)
        # synthesise at a smaller size when only low frequencies are wanted, then upsample (periodic)
        M = self.N
        while M > 64 and fhi * 6 < M / 2:
            M //= 2
        rng = self.child(k)
        w = rng.standard_normal((M, M)).astype(f32)
        F = np.fft.rfft2(w)
        fy = np.fft.fftfreq(M)[:, None] * M
        fx = np.fft.rfftfreq(M)[None, :] * M
        r = np.sqrt(fx * fx + fy * fy) + 1e-6
        amp = np.zeros_like(r)
        for o in range(octaves):
            fc = f0 * lac ** o
            # a smooth log-gaussian band around fc (~1 octave wide)
            amp += (gain ** o) * np.exp(-0.5 * (np.log(r / fc) / 0.42) ** 2) * (r / fc) ** (-beta)
        amp[0, 0] = 0
        # no detail finer than ~3 texels of the FINAL map (it would alias into diagonal crawl): a steep low-pass at
        # N/6 cycles per tile; the energy cut is MISSING from the result (std scaled by the kept fraction), so a
        # noise finer than the texel fades out like a mip would average it
        lp = np.exp(-(r / (self.N / 6.0)) ** 4)
        kept = float(np.sqrt(((amp * lp) ** 2).sum() / max((amp ** 2).sum(), 1e-20)))
        out = np.fft.irfft2(F * amp * lp, s=(M, M)).astype(f32)
        out -= out.mean()
        out *= kept / (out.std() + 1e-9)
        if M != self.N:
            out = upsample(out, self.N)
        return out

    def white(self, k):
        return self.child(k).random((self.N, self.N), dtype=f32)

    # -------------------------------------------------------------------------------------------- cellular
    def worley(self, cell_m, k, jitter=0.9, aniso=(1.0, 1.0)):
        """Periodic Worley: F1, F2 distances (m) and the id of the nearest point. cell_m = mean spacing.
        aniso stretches the cells (x, y)."""
        gx = max(1, int(round(self.size / (cell_m * aniso[0]))))
        gy = max(1, int(round(self.size / (cell_m * aniso[1]))))
        rng = self.child(k)
        jx = rng.random((gy, gx)) * jitter + (1 - jitter) / 2
        jy = rng.random((gy, gx)) * jitter + (1 - jitter) / 2
        cw, ch = self.size / gx, self.size / gy
        cx = np.floor(self.xx / cw).astype(np.int32)
        cy = np.floor(self.yy / ch).astype(np.int32)
        F1 = np.full((self.N, self.N), 1e9, f32)
        F2 = np.full((self.N, self.N), 1e9, f32)
        ID = np.zeros((self.N, self.N), np.int32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ix, iy = cx + dx, cy + dy
                wx, wy = ix % gx, iy % gy
                px = (ix + jx[wy, wx]) * cw
                py = (iy + jy[wy, wx]) * ch
                d = np.sqrt((self.xx - px) ** 2 + (self.yy - py) ** 2).astype(f32)
                nid = wy * gx + wx
                closer = d < F1
                F2 = np.where(closer, F1, np.minimum(F2, d))
                ID = np.where(closer, nid, ID)
                F1 = np.where(closer, d, F1)
        return F1, F2, ID, gx * gy

    # -------------------------------------------------------------------------------------------- filters
    def blur(self, a, sigma_m):
        return blur(a, sigma_m / self.px)

    def warp(self, a, dx_m, dy_m, interp=cv2.INTER_LINEAR):
        """sample a at (x + dx, y + dy) (displacements in metres)"""
        N = self.N
        gx, gy = np.meshgrid(np.arange(N, dtype=f32), np.arange(N, dtype=f32))
        return cv2.remap(a, gx + (dx_m / self.px).astype(f32), gy + (dy_m / self.px).astype(f32), interp,
                         borderMode=cv2.BORDER_WRAP)

    def grad(self, h):
        """dh/dx, dh/dy (per metre; y down the image)"""
        gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / (2 * self.px)
        gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) / (2 * self.px)
        return gx.astype(f32), gy.astype(f32)

    def slope_blur(self, a, slope, amount_m, steps=8, mode="min"):
        """Substance's Slope Blur: smear `a` along the gradient of `slope` (eroded / chipped edges when mode=min)."""
        gx, gy = self.grad(self.blur(slope, 2 * self.px))
        mag = np.sqrt(gx * gx + gy * gy) + 1e-9
        ux, uy = gx / mag, gy / mag
        out = a.copy()
        for i in range(1, steps + 1):
            s = amount_m * i / steps
            b = self.warp(a, ux * s, uy * s)
            out = np.minimum(out, b) if mode == "min" else np.maximum(out, b) if mode == "max" else out + b
        if mode == "mean":
            out /= steps + 1
        return out

    def curvature(self, h, radius_m):
        """convexity (+ on ridges / arrises, - in hollows), dimensionless: (h - blur(h)) / radius"""
        return ((h - self.blur(h, radius_m)) / radius_m).astype(f32)

    def ao(self, h, radius_m, dirs=12, steps=7, strength=1.0):
        """Horizon-based ambient occlusion of the height field (periodic), 1 = open."""
        occ = np.zeros_like(h)
        N = self.N
        rmax = radius_m / self.px
        dists = [max(1.0, rmax * (2 ** (i - steps + 1))) for i in range(steps)]
        hs = cv2.GaussianBlur(h, (0, 0), 0.7)
        for d in range(dirs):
            a = (d + 0.5) * 2 * np.pi / dirs
            ca, sa = np.cos(a), np.sin(a)
            best = np.zeros_like(h)
            for r in dists:
                sh = shift(hs, r * ca, r * sa)
                best = np.maximum(best, (sh - hs) / (r * self.px))
            occ += 1 - 1 / np.sqrt(1 + best * best)            # sin(horizon angle)
        ao = 1 - strength * occ / dirs
        return np.clip(ao, 0, 1).astype(f32)

    def normal(self, h):
        """tangent-space normal, OpenGL convention (+x right, +y UP), from a height field in metres"""
        gx, gy = self.grad(h)
        nx, ny, nz = -gx, gy, np.ones_like(h)                 # y down the image -> +y up flips the sign
        l = np.sqrt(nx * nx + ny * ny + 1)
        return np.stack([nx / l, ny / l, nz / l], -1).astype(f32)

    # -------------------------------------------------------------------------------------------- units
    def per_unit(self, ids, n, k, dist="uniform", **kw):
        """one random value per unit id (Substance: Flood Fill to Random Grayscale)"""
        rng = self.child(k)
        if dist == "uniform":
            v = rng.random(n + 1)
        elif dist == "normal":
            v = rng.standard_normal(n + 1)
        else:
            raise ValueError(dist)
        return v.astype(f32)[ids]


# ------------------------------------------------------------------------------------------------ helpers
def upsample(a, N):
    M = a.shape[0]
    t = np.tile(a, (3, 3))
    big = cv2.resize(t, (3 * N, 3 * N), interpolation=cv2.INTER_CUBIC)
    return np.ascontiguousarray(big[N:2 * N, N:2 * N])


def blur(a, sigma_px):
    if sigma_px <= 0.05:
        return a
    p = int(np.ceil(sigma_px * 3.5)) + 1
    if p >= a.shape[0]:
        F = np.fft.rfft2(a)
        M = a.shape[0]
        fy = np.fft.fftfreq(M)[:, None]
        fx = np.fft.rfftfreq(M)[None, :]
        return np.fft.irfft2(F * np.exp(-2 * (np.pi * sigma_px) ** 2 * (fx * fx + fy * fy)), s=a.shape).astype(f32)
    b = cv2.copyMakeBorder(a, p, p, p, p, cv2.BORDER_WRAP)
    b = cv2.GaussianBlur(b, (0, 0), sigma_px)
    return b[p:-p, p:-p]


def shift(a, dx, dy):
    """a sampled at (x + dx, y + dy) pixels, periodic, bilinear"""
    M = np.float32([[1, 0, -dx], [0, 1, -dy]])
    return cv2.warpAffine(a, M, (a.shape[1], a.shape[0]), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP * 0,
                          borderMode=cv2.BORDER_WRAP)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return (t * t * (3 - 2 * t)).astype(f32)


def lerp(a, b, t):
    if np.ndim(t) == 2 and np.ndim(a) == 3 or np.ndim(t) == 2 and np.ndim(b) == 3:
        t = t[..., None]
    return (a + (b - a) * t).astype(f32)


def srgb_to_lin(c):
    c = np.asarray(c, dtype=f32)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4).astype(f32)


def lin_to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055).astype(f32)


def hexcol(h):
    """'#rrggbb' (sRGB) -> linear RGB"""
    h = h.lstrip("#")
    return srgb_to_lin([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def tone(col, value, warm=0.0):
    """scale a linear colour's value (multiplicative, x array) and shift it warm (+) / cool (-)"""
    v = np.asarray(value, dtype=f32)
    c = np.asarray(col, dtype=f32)
    if v.ndim == 2:
        v = v[..., None]
    out = c * v
    if np.ndim(warm) == 2 or warm:
        w = np.asarray(warm, dtype=f32)
        if w.ndim == 2:
            w = w[..., None]
        out = out * (1 + w * np.array([0.25, 0.0, -0.3], f32))
    return out.astype(f32)


def remap01(a, lo=None, hi=None):
    lo = a.min() if lo is None else lo
    hi = a.max() if hi is None else hi
    return np.clip((a - lo) / (hi - lo + 1e-9), 0, 1).astype(f32)


def lichen(T, k, cell_m, density, rmin, rmax):
    """irregular lichen rosettes (clumped, lobed, broken up): mask 0..1 and a per-colony random (colour pick)"""
    wx = T.noise(cell_m * 0.25, k + 1, octaves=2) * rmax * 0.5
    wy = T.noise(cell_m * 0.25, k + 2, octaves=2) * rmax * 0.5
    F1, _, ID, n = T.worley(cell_m, k)
    F1 = T.warp(F1, wx, wy)
    ID = T.warp(ID.astype(np.float32), wx, wy, interp=cv2.INTER_NEAREST).astype(np.int32)
    rng = T.child(k + 7000)
    r = (rmin + (rmax - rmin) * rng.random(n + 1) ** 2)[ID]
    on = (rng.random(n + 1) < density)[ID]
    clump = smoothstep(-0.3, 0.6, T.noise(cell_m * 4, k + 3, octaves=2))     # colonies cluster
    lobes = smoothstep(-0.4, 0.5, T.noise(max(rmin * 0.6, 2 * T.px), k + 4, octaves=2))
    m = smoothstep(r, r * 0.6, F1) * on * clump * (0.35 + 0.65 * lobes)
    return m.astype(f32), rng.random(n + 1).astype(f32)[ID]
