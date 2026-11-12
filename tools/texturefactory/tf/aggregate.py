"""Aggregates: stones packed in a binder (asphalt, concrete, render sand, sett joints).

stones(): a Worley layer turned into separate polygonal stones (Substance: Cells + Flood Fill): each cell is shrunk by
a gap (F2 - F1 > gap: polygonal, sharp-cornered like crushed rock), its corners rounded by a blur, each stone its own
size, presence, colour index and height (a flattened dome: worn tops). Layers of different sizes are max-combined.
"""
import numpy as np

from .core import smoothstep, f32


def stones(T, cell_m, k, presence=0.7, gap_m=None, round_m=None, dome_m=0.002, flat=0.6, jitter=1.0, aniso=(1, 1)):
    """returns dict(mask 0..1, height m (0 outside), id map, n, rnd per-texel random per stone)"""
    F1, F2, ID, n = T.worley(cell_m, k, jitter=jitter, aniso=aniso)
    rng = T.child(k + 5000)
    on = rng.random(n + 1) < presence
    size = 0.6 + 0.8 * rng.random(n + 1)               # per stone: shrink more or less
    gap = (gap_m if gap_m is not None else cell_m * 0.12) * (2.2 - size)[ID]
    e = (F2 - F1) - gap                                  # > 0 inside the shrunk stone (distance-like, m)
    # an edge warp so the stones are not perfect Voronoi polygons
    e = e + T.noise(cell_m * 0.6, k + 1) * cell_m * 0.06
    r = round_m if round_m is not None else cell_m * 0.12
    mask = smoothstep(0.0, max(T.px * 0.9, r * 0.35), e) * on[ID]
    inner = np.clip(e / (cell_m * 0.35), 0, 1)
    dome = np.sqrt(np.clip(1 - (1 - inner) ** 2, 0, 1))
    dome = np.minimum(dome, flat + (1 - flat) * 0.4)      # worn, flattened tops
    h = dome * dome_m * (0.6 + 0.8 * rng.random(n + 1))[ID] * mask
    rnd = rng.random(n + 1).astype(f32)[ID]
    rnd2 = rng.random(n + 1).astype(f32)[ID]
    return {"mask": mask.astype(f32), "height": h.astype(f32), "id": ID, "n": n, "rnd": rnd, "rnd2": rnd2, "edge": e}


def palette_pick(rnd, palette):
    """palette: [(lin_rgb, weight)] -> per-texel colour picked by the stone's random value"""
    w = np.array([p[1] for p in palette], f32)
    cdf = np.cumsum(w / w.sum())
    idx = np.searchsorted(cdf, rnd).clip(0, len(palette) - 1)
    cols = np.stack([np.asarray(p[0], f32) for p in palette])
    return cols[idx]
