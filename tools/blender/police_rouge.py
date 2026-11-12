"""UCCLE POLICE STATION (Commissariat Central "Marlow", Rue Rouge 17, police zone 5342): built entirely in code (no hand
modelling) from MEASURED data and look-only street views (models/police_rouge/NOTES.md).

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/police_rouge.py -- <out_dir> [--no-bake] [--previews] [--fast]
      <out_dir>/police.raw.glb   nodes "Police" (LOD0) and "Police_far" (the scripted far variant = LOD1; LOD2 is made from
                                 it by meshoptimizer in tools/police_pack.mjs); one primitive per NAMED material slot
      <out_dir>/police_ao.png    ambient occlusion (Cycles) in TEXCOORD_1 (LOD0 in v 0..AO_SPLIT, far above)
      <out_dir>/police.json      the measurements used, slots and codes, placement, counts, the yard / markings for the viewer
      docs/police/preview_*.png  Cycles renders (--previews)

INPUT: <out_dir>/site.json + site_dtm.* (tools/police_measure.py). The plan: the UrbIS footprint (solid 528055 + the
link 528772) squared to the frame; the facades by the counts in NOTES.md; ESTIMATED where no view shows a facade.

SWAPPABLE MATERIALS: NO colour, NO texture in the GLB:
  - every face is in a NAMED slot (SLOTS); one primitive per slot = one draw call per slot;
  - COLOR_0.r = per-face code / 16 + 1/32 (CODES); COLOR_0.g = per-vertex AO of the thin parts; COLOR_0.b =
    sqrt(region width / 4 m) (the viewer's anti-sparkle);
  - TEXCOORD_0 = world metres (walls: along / m TAW - OY; roofs: u / -w) except the sign / flag faces (0..1 in their
    atlas cell / cloth); TEXCOORD_1 = the lightmap UV of the baked AO.
Frame: Blender x = u, y = -w, z = m TAW - OY (OY = 40). glTF (Y up) -> three.js local (u, TAW - OY, w): the node goes at
the city position of the frame origin, height OY, rotation.y = -rotation (site.json frame).
"""
import bpy, bmesh, json, math, os, sys, time
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wolvendael_kit as KT
from wolvendael_kit import (K, Builder, Frame, P, hz, Z, OY, face_dir, fbox, hbox, box, lathe, pipe, offset_poly, sweep_closed)

T0 = time.time()
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/police_rouge")
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
AO_PX = 2048
SITE = json.load(open(os.path.join(OUT, "site.json")))
_g = json.load(open(os.path.join(OUT, "site_dtm.json")))
OXC, OZC = SITE["frame"]["origin_city"]; ROT = SITE["frame"]["rotation_rad"]
_ca, _sa = math.cos(ROT), math.sin(ROT)
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene

# ------------------------------------------------------------------------------------------------ slots and codes
SLOTS = ["brick_yellow", "brick_red_brussels", "concrete_white", "stone_blue", "painted_metal_white", "alu_anthracite",
         "glass_window", "screen_fabric", "roof_membrane", "solar_panel", "galvanised_steel", "cast_iron_green",
         "rubble_stone", "hedge", "signage", "flag_fabric"]
(BRICK, BRICKR, CONC, BLUE, WHITE, ALU, GLASS, SCREEN, MEMB, SOLAR, GALV, GREEN, RUBBLE, HEDGE, SIGN, FLAG) = range(16)
CODES = ["plain", "joint", "reveal", "sill", "band", "cornice", "plinth", "frame", "bar", "pane", "panel", "text",
         "flag_be", "flag_eu", "hazard", "red"]
(C_PLAIN, C_JOINT, C_REVEAL, C_SILL, C_BAND, C_CORNICE, C_PLINTH, C_FRAME, C_BAR, C_PANE, C_PANEL, C_TEXT,
 C_FLAG_BE, C_FLAG_EU, C_HAZARD, C_RED) = range(16)

# ------------------------------------------------------------------------------------------------ ground (DTM)
import numpy as np
_dtm = np.fromfile(os.path.join(OUT, "site_dtm.bin"), dtype="<u2").reshape(_g["rows"], _g["cols"]).astype(np.float64) / 100 + _g["base"]
def city(u, w): return OXC + u * _ca - w * _sa, OZC + u * _sa + w * _ca
def ground_city(x, z):
    c = (x - _g["x0"]) / _g["step"]; r = (z - _g["z0"]) / _g["step"]
    c0 = int(min(max(math.floor(c), 0), _g["cols"] - 2)); r0 = int(min(max(math.floor(r), 0), _g["rows"] - 2)); fc, fr = c - c0, r - r0
    a = _dtm
    return (a[r0, c0] * (1 - fc) + a[r0, c0 + 1] * fc) * (1 - fr) + (a[r0 + 1, c0] * (1 - fc) + a[r0 + 1, c0 + 1] * fc) * fr
def ground(u, w): return ground_city(*city(u, w))
def ground_min(ua, wa, ub, wb, n=24): return min(ground(ua + (ub - ua) * t / n, wa + (wb - wa) * t / n) for t in range(n + 1))

# ------------------------------------------------------------------------------------------------ THE PLAN (building frame, m TAW)
# 528055 squared to the frame (its corners within 0.15 m of these lines); w+ = south-east along Rue Rouge, u+ = the street
A_E, A_N, A_S, A_W = 14.59, -14.00, 0.52, -0.65          # wing A (north block): front, north face, the step, back
B_E, B_S, B_W, B_N = 5.32, 12.60, -4.80, -1.55           # wing B (south block)
L_W, L_N, L_S = -6.55, -3.78, 2.40                       # the link (528772)
FP = [(A_E, A_N), (A_E, A_S), (B_E, A_S), (B_E, B_S), (B_W, B_S), (B_W, B_N), (A_W, B_N), (A_W, A_N)]
LINK = [(A_W, L_N), (A_W, B_N), (B_W, B_N), (B_W, L_S), (L_W, L_S), (L_W, L_N)]
# levels (Street View proportions on the UrbIS heights: NOTES.md)
GF, F1, F2 = 47.85, 51.35, 54.80
PLINTH_TOP = 48.25
BAND = (51.20, 51.35)
WALL_TOP, CORNICE_TOP, DECK = 58.30, 58.90, 58.62
LINK_TOP = 50.98
GF_SILL, GF_HEAD = 48.55, 50.55
UP_SILL = {1: 52.15, 2: 55.45}; UP_HEAD = {1: 54.05, 2: 57.35}
UP_W, GF_W = 1.90, 1.35
REV = 0.13                                                # window reveal (wall face -> frame front)
LANDMARKS = {}

# ------------------------------------------------------------------------------------------------ helpers
def inside_poly(u, w, poly):
    c = False
    for i in range(len(poly)):
        (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % len(poly)]
        if (y1 > w) != (y2 > w) and u < (x2 - x1) * (w - y1) / (y2 - y1) + x1: c = not c
    return c

def wall_frame(a, b, poly=FP):
    fr, L = Frame.of(a[0], a[1], b[0], b[1])
    mid = fr.p(L / 2, OY, 0.2)
    if inside_poly(mid.x, -mid.y, poly):
        fr, L = Frame.of(b[0], b[1], a[0], a[1]); a, b = b, a
    return fr, L, a, b

def s_of(fr, u, w): return (P(u, w, OY) - fr.O).dot(fr.U)
def span(fr, along_u, fixed, c, width):
    """s0, s1 of an element centred at c (u if the wall runs along u, else w) of the given width"""
    p = (lambda x: s_of(fr, x, fixed)) if along_u else (lambda x: s_of(fr, fixed, x))
    a, b = p(c - width / 2), p(c + width / 2)
    return min(a, b), max(a, b)

class Opening:
    def __init__(self, s0, s1, h0, h1, kind="up", screen=0.0, slot=WHITE, cols=3, transom=None, rev=REV, extra=None):
        self.s0, self.s1, self.h0, self.h1, self.kind, self.screen, self.slot = s0, s1, h0, h1, kind, screen, slot
        self.cols, self.transom, self.rev, self.extra = cols, transom, rev, extra or {}
        # the wall's hole starts 3 cm under a sill's top (its edge buried in the sill: no slit)
        self.cut0 = h0 - 0.03 if kind in ("up", "gf", "stair") else h0

def wall_grid(fr, s0, s1, hb, ht, openings, plates=(), slot=BRICK, code=C_PLAIN):
    """a planar wall s0..s1 x hb..ht as a grid of quads (no fans), minus the openings and plates (holes)"""
    sc = {s0, s1}; hc = {hb, ht}
    for o in openings: sc |= {o.s0, o.s1}; hc |= {o.cut0, o.h1}
    for (a, b, c, d) in plates: sc |= {a, b}; hc |= {c, d}
    sc = sorted(x for x in sc if s0 - 1e-6 <= x <= s1 + 1e-6); hc = sorted(x for x in hc if hb - 1e-6 <= x <= ht + 1e-6)
    holes = [(o.s0, o.cut0, o.s1, o.h1) for o in openings] + [(a, c, b, d) for (a, b, c, d) in plates]
    for i in range(len(sc) - 1):
        for j in range(len(hc) - 1):
            a, b, c, d = sc[i], sc[i + 1], hc[j], hc[j + 1]
            if b - a < 1e-5 or d - c < 1e-5: continue
            cs, ch = (a + b) / 2, (c + d) / 2
            if any(x0 <= cs <= x1 and y0 <= ch <= y1 for (x0, y0, x1, y1) in holes): continue
            face_dir([fr.p(a, c), fr.p(b, c), fr.p(b, d), fr.p(a, d)], fr.N, slot, code, [(a, hz(c)), (b, hz(c)), (b, hz(d)), (a, hz(d))])

def quad(pts, n, slot, code, uv=None): face_dir(pts, n, slot, code, uv)

# ------------------------------------------------------------------------------------------------ joinery
FW = 0.068          # outer frame face width
MW = 0.085          # mullion / transom width
FD = 0.075          # frame depth
GL = 0.045          # glass behind the frame front

def light_glass(fr, a, b, c, d, dfront, far):
    quad([fr.p(a, c, dfront - GL), fr.p(b, c, dfront - GL), fr.p(b, d, dfront - GL), fr.p(a, d, dfront - GL)], fr.N, GLASS, C_PANE,
         [(a, hz(c)), (b, hz(c)), (b, hz(d)), (a, hz(d))])
    if far: return
    # the glazing beads: the light's four inner sides from the frame front back to the glass
    for (p0, p1, n) in (((a, c), (b, c), Z), ((b, d), (a, d), -Z), ((a, d), (a, c), fr.U), ((b, c), (b, d), -fr.U)):
        quad([fr.p(p0[0], p0[1], dfront), fr.p(p1[0], p1[1], dfront), fr.p(p1[0], p1[1], dfront - GL - 0.002), fr.p(p0[0], p0[1], dfront - GL - 0.002)],
             n, WHITE if K.slot_frame == WHITE else ALU, C_FRAME)

def joinery(fr, o, far):
    """the frame in its opening at d = -rev: an outer frame ring, `cols` columns (mullions), an optional transom (its
    height above the sill), glass per light; o.extra: 'doors' = [(s0, s1)] door leaves (a push bar), 'panels' =
    [(h0, h1)] opaque light rows (the stair window's spandrel), 'transoms' = [h, ...] several"""
    K.B.new_group()
    slot = o.slot; K.slot_frame = slot
    df = -o.rev
    s0, s1, h0, h1 = o.s0, o.s1, o.h0 + (0.0 if o.kind in ("door", "entrance") else 0.02), o.h1
    # the ring (front faces at d = df, sides back to df - FD; outer sides end in the reveal)
    i0, i1, j0, j1 = s0 + FW, s1 - FW, h0 + FW, h1 - FW
    for (a, b, c, d) in ((s0, i0, h0, h1), (i1, s1, h0, h1), (i0, i1, j1, h1), (i0, i1, h0, j0)):
        quad([fr.p(a, c, df), fr.p(b, c, df), fr.p(b, d, df), fr.p(a, d, df)], fr.N, slot, C_FRAME, [(a, hz(c)), (b, hz(c)), (b, hz(d)), (a, hz(d))])
    # columns and rows
    cols = o.extra.get("cuts_s") or [i0 + (i1 - i0) * k / o.cols for k in range(1, o.cols)]
    rows = sorted(o.extra.get("transoms") or ([h0 + o.transom] if o.transom else []))
    xs = [i0] + cols + [i1]; ys = [j0] + rows + [j1]
    # mullions run full height between the ring's rails; transoms between the mullions
    for x in cols:
        a, b = x - MW / 2, x + MW / 2
        quad([fr.p(a, j0, df), fr.p(b, j0, df), fr.p(b, j1, df), fr.p(a, j1, df)], fr.N, slot, C_BAR, [(a, hz(j0)), (b, hz(j0)), (b, hz(j1)), (a, hz(j1))])
    for k in range(len(xs) - 1):
        a = xs[k] + (MW / 2 if k > 0 else 0); b = xs[k + 1] - (MW / 2 if k < len(xs) - 2 else 0)
        for y in rows:
            c, d = y - MW / 2, y + MW / 2
            quad([fr.p(a, c, df), fr.p(b, c, df), fr.p(b, d, df), fr.p(a, d, df)], fr.N, slot, C_BAR, [(a, hz(c)), (b, hz(c)), (b, hz(d)), (a, hz(d))])
    panels = o.extra.get("panels", [])
    for k in range(len(xs) - 1):
        a = xs[k] + (MW / 2 if k > 0 else 0); b = xs[k + 1] - (MW / 2 if k < len(xs) - 2 else 0)
        for q in range(len(ys) - 1):
            c = ys[q] + (MW / 2 if q > 0 else 0); d = ys[q + 1] - (MW / 2 if q < len(ys) - 2 else 0)
            if any(pa - 1e-3 <= (c + d) / 2 <= pb + 1e-3 for (pa, pb) in panels):
                dp = df - 0.03
                quad([fr.p(a, c, dp), fr.p(b, c, dp), fr.p(b, d, dp), fr.p(a, d, dp)], fr.N, WHITE, C_PANEL, [(a, hz(c)), (b, hz(c)), (b, hz(d)), (a, hz(d))])
                if not far:
                    for (p0, p1, n) in (((a, c), (b, c), Z), ((b, d), (a, d), -Z), ((a, d), (a, c), fr.U), ((b, c), (b, d), -fr.U)):
                        quad([fr.p(p0[0], p0[1], df), fr.p(p1[0], p1[1], df), fr.p(p1[0], p1[1], dp - 0.002), fr.p(p0[0], p0[1], dp - 0.002)], n, slot, C_FRAME)
            else:
                light_glass(fr, a, b, c, d, df, far)
    if far: return
    # the leaves' push bars (doors)
    for (da, db) in o.extra.get("doors", []):
        hb = GF + 1.02
        fbox(fr, da + 0.12, db - 0.12, hb - 0.018, hb + 0.018, df - 0.005, df + 0.045, ALU, C_BAR, skip=("back",))
        # the meeting stile between a pair's leaves
        if db - da < 1.4: continue
        m = (da + db) / 2
        quad([fr.p(m - 0.03, j0, df + 0.004), fr.p(m + 0.03, j0, df + 0.004), fr.p(m + 0.03, rows[0] - MW / 2 if rows else j1, df + 0.004),
              fr.p(m - 0.03, rows[0] - MW / 2 if rows else j1, df + 0.004)], fr.N, slot, C_BAR)

def reveal(fr, o, far, slot_side=BRICK):
    """the opening's brick reveal: two jambs and the head soffit from the wall face back to the frame front"""
    K.B.new_group()
    d0, d1 = 0.0, -o.rev
    s0, s1, h0, h1 = o.s0, o.s1, o.cut0, o.h1
    quad([fr.p(s0, h0, d0), fr.p(s0, h1, d0), fr.p(s0, h1, d1), fr.p(s0, h0, d1)], fr.U, slot_side, C_REVEAL)
    quad([fr.p(s1, h0, d1), fr.p(s1, h1, d1), fr.p(s1, h1, d0), fr.p(s1, h0, d0)], -fr.U, slot_side, C_REVEAL)
    quad([fr.p(s0, h1, d0), fr.p(s1, h1, d0), fr.p(s1, h1, d1), fr.p(s0, h1, d1)], -Z, slot_side, C_REVEAL)

def sill(fr, o, far):
    """precast concrete sill: sloped top from the frame to 4.5 cm proud, front, underside; lugs 4 cm into the jambs'
    brick each side (they start inside the wall)"""
    K.B.new_group()
    a, b = o.s0 - 0.04, o.s1 + 0.04
    hs = o.h0
    prof = [(-o.rev - 0.01, hs + 0.02), (0.045, hs - 0.008), (0.045, hs - 0.07), (-0.03, hs - 0.07)]
    # top (sloped), front, underside
    for k in range(3):
        (dA, hA), (dB, hB) = prof[k], prof[k + 1]
        want = fr.N * (hB - hA) - Z * (dB - dA)
        quad([fr.p(a, hA, dA), fr.p(b, hA, dA), fr.p(b, hB, dB), fr.p(a, hB, dB)], want, CONC, C_SILL,
             [(a, k * 0.1), (b, k * 0.1), (b, k * 0.1 + 0.1), (a, k * 0.1 + 0.1)])
    for s, sg in ((a, -1), (b, 1)):
        quad([fr.p(s, h, d) for d, h in prof], fr.U * sg, CONC, C_SILL)

def threshold(fr, o):
    """a blue-stone step under a door / the entrance: from the frame out 0.32 m, its top at the floor"""
    K.B.new_group()
    g = min(ground_of(fr, o.s0), ground_of(fr, o.s1))
    fbox(fr, o.s0 - 0.06, o.s1 + 0.06, g - 0.15, GF, -o.rev - 0.02, 0.32, BLUE, C_SILL, skip=("back",))

def ground_of(fr, s):
    p = fr.p(s, OY, 0.5); return ground(p.x, -p.y)

def screen(fr, o, far):
    """exterior roller screen: guides on the jambs, the fabric lowered o.screen of the height, its bottom bar"""
    if o.screen is None: return
    K.B.new_group()
    df = -o.rev
    s0, s1, h0, h1 = o.s0, o.s1, o.h0, o.h1
    g = 0.032
    hb = h1 - (h1 - h0 - 0.06) * o.screen - 0.05             # the bottom bar's underside
    if not far:
        for (a, b) in ((s0, s0 + g), (s1 - g, s1)):
            fbox(fr, a, b, h0 + 0.028, h1, df - 0.01, df + 0.05, WHITE, C_FRAME, skip=("back", "top"))
        fbox(fr, s0 + g, s1 - g, hb, hb + 0.045, df + 0.008, df + 0.046, WHITE, C_BAR, skip=())
    if o.screen > 0.02:
        dS = df + 0.027
        quad([fr.p(s0 + g, hb + 0.02, dS), fr.p(s1 - g, hb + 0.02, dS), fr.p(s1 - g, h1, dS), fr.p(s0 + g, h1, dS)], fr.N, SCREEN, C_PANEL,
             [(s0, hz(hb)), (s1, hz(hb)), (s1, hz(h1)), (s0, hz(h1))])

def opening_parts(fr, o, far):
    reveal(fr, o, far, slot_side=o.extra.get("reveal_slot", BRICK))
    joinery(fr, o, far)
    if o.kind in ("up", "gf", "stair"): sill(fr, o, far)
    if o.kind in ("door", "entrance"): threshold(fr, o)
    if o.kind in ("up", "gf"): screen(fr, o, far)

# ------------------------------------------------------------------------------------------------ facades
def win_up(fr, along_u, fixed, c, floor, scr=0.0):
    s0, s1 = span(fr, along_u, fixed, c, UP_W)
    return Opening(s0, s1, UP_SILL[floor], UP_HEAD[floor], "up", screen=scr, cols=3, transom=0.62)
def win_gf(fr, along_u, fixed, c, scr=0.0, wid=GF_W, cols=2):
    s0, s1 = span(fr, along_u, fixed, c, wid)
    return Opening(s0, s1, GF_SILL, GF_HEAD, "gf", screen=scr, cols=cols, transom=0.62)
def door_alu(fr, along_u, fixed, c, wid, head=GF_HEAD, slot=ALU, cols=1, transom=1.95):
    s0, s1 = span(fr, along_u, fixed, c, wid)
    o = Opening(s0, s1, GF, head, "door", slot=slot, cols=cols, transom=transom, rev=0.16)
    o.extra["doors"] = [(s0 + FW, s1 - FW)]
    return o

def facade_specs(far):
    """(frame, s-range, openings, plates, GF slot, notes) per wall"""
    F = []
    # F0 wing A front (u = A_E), along w
    fr, L, a, b = wall_frame((A_E, A_N), (A_E, A_S))
    ops = [door_alu(fr, False, A_E, -0.83, 1.2),
           win_gf(fr, False, A_E, -3.50), win_gf(fr, False, A_E, -5.95), win_gf(fr, False, A_E, -9.60, scr=1.0), win_gf(fr, False, A_E, -12.15, scr=1.0)]
    ops += [win_up(fr, False, A_E, c, 1, s) for c, s in ((-1.10, 0.0), (-3.50, 0.0), (-5.90, 0.55))]
    ops += [win_up(fr, False, A_E, c, 2, s) for c, s in ((-1.10, 0.0), (-3.50, 0.0), (-5.90, 0.0))]
    pier = span(fr, False, A_E, (A_S - 0.62 + A_S) / 2, 0.62)
    F.append(dict(name="front_A", fr=fr, L=L, ends=(a, b), ops=ops, plates=[(pier[0], pier[1], -10, BAND[0])], gf_slot=BRICK))
    # F1 the step (w = A_S), along u: the public entrance + the stair window
    fr, L, a, b = wall_frame((A_E, A_S), (B_E, A_S))
    s0, s1 = span(fr, True, A_S, 9.9, 7.4)
    ent = Opening(s0, s1, GF, 50.60, "entrance", slot=ALU, rev=0.20)
    cuts = sorted(s_of(fr, u, A_S) for u in (7.4, 9.2, 10.6, 12.4))
    ent.extra.update(cuts_s=cuts, transoms=[50.02], doors=[tuple(sorted((s_of(fr, 7.4, A_S), s_of(fr, 9.2, A_S)))), tuple(sorted((s_of(fr, 10.6, A_S), s_of(fr, 12.4, A_S))))])
    st0, st1 = span(fr, True, A_S, 6.15, 1.0)
    stair = Opening(st0, st1, 51.75, 57.55, "stair", slot=WHITE, cols=1, rev=0.10)
    stair.extra.update(transoms=[53.55, 54.35, 55.05, 56.30], panels=[(54.35, 55.05)])
    pier = span(fr, True, A_S, (A_E - 0.62 + A_E) / 2, 0.62)
    F.append(dict(name="step", fr=fr, L=L, ends=(a, b), ops=[ent, stair], plates=[(pier[0], pier[1], -10, BAND[0])], gf_slot=BRICK))
    # F2 wing B front (u = B_E), along w
    fr, L, a, b = wall_frame((B_E, A_S), (B_E, B_S))
    ops = [win_gf(fr, False, B_E, 2.25, wid=UP_W, cols=3), door_alu(fr, False, B_E, 4.65, 1.10), win_gf(fr, False, B_E, 7.05, wid=UP_W, cols=3, scr=0.3)]
    ops += [win_up(fr, False, B_E, c, 1, s) for c, s in ((2.25, 0.4), (4.65, 0.4), (7.05, 0.0))]
    ops += [win_up(fr, False, B_E, c, 2, s) for c, s in ((2.25, 0.35), (4.65, 0.35), (7.05, 0.35))]
    gp = span(fr, False, B_E, 8.7, 0.6)
    F.append(dict(name="front_B", fr=fr, L=L, ends=(a, b), ops=ops, plates=[(gp[0], gp[1], -10, BAND[0])], gf_slot=BRICKR, pier_B=gp))
    # F3 wing B south (w = B_S), along u: ESTIMATED
    fr, L, a, b = wall_frame((B_E, B_S), (B_W, B_S))
    ops = [win_gf(fr, True, B_S, 2.9), door_alu(fr, True, B_S, 0.25, 1.0, slot=ALU), win_gf(fr, True, B_S, -2.4)]
    ops += [win_up(fr, True, B_S, c, 1, s) for c, s in ((2.9, 0.6), (0.25, 0.0), (-2.4, 0.3))]
    ops += [win_up(fr, True, B_S, c, 2, s) for c, s in ((2.9, 0.0), (0.25, 0.45), (-2.4, 0.0))]
    F.append(dict(name="south_B", fr=fr, L=L, ends=(a, b), ops=ops, plates=[], gf_slot=BRICKR, est=True))
    # F4 wing B back (u = B_W), along w: ESTIMATED (the link covers w B_N..L_S below its top)
    fr, L, a, b = wall_frame((B_W, B_S), (B_W, B_N))
    ops = [win_gf(fr, False, B_W, 6.2), win_gf(fr, False, B_W, 10.0)]
    ops += [win_up(fr, False, B_W, c, 1, s) for c, s in ((2.0, 0.0), (6.0, 0.5), (10.0, 0.0))]
    ops += [win_up(fr, False, B_W, c, 2, s) for c, s in ((2.0, 0.3), (6.0, 0.0), (10.0, 0.3))]
    F.append(dict(name="back_B", fr=fr, L=L, ends=(a, b), ops=ops, plates=[], gf_slot=BRICK, est=True, link_from=(B_N, L_S)))
    # F5 wing B north (w = B_N), along u, above the link: ESTIMATED
    fr, L, a, b = wall_frame((B_W, B_N), (A_W, B_N))
    ops = [win_up(fr, True, B_N, -2.72, 1, 0.0), win_up(fr, True, B_N, -2.72, 2, 0.0)]
    F.append(dict(name="north_B", fr=fr, L=L, ends=(a, b), ops=ops, plates=[], gf_slot=BRICK, est=True, above_link=True))
    # F6 wing A back (u = A_W), along w: behind the school's stair block 531654 and the link: plain
    fr, L, a, b = wall_frame((A_W, B_N), (A_W, A_N))
    F.append(dict(name="back_A", fr=fr, L=L, ends=(a, b), ops=[], plates=[], gf_slot=BRICK, est=True))
    # F7 wing A north (w = A_N), along u: ESTIMATED
    fr, L, a, b = wall_frame((A_W, A_N), (A_E, A_N))
    ops = [win_gf(fr, True, A_N, 2.0), door_alu(fr, True, A_N, 5.6, 1.0, slot=ALU), win_gf(fr, True, A_N, 9.2), win_gf(fr, True, A_N, 12.8, scr=1.0)]
    ops += [win_up(fr, True, A_N, c, 1, s) for c, s in ((2.0, 0.0), (5.6, 0.3), (9.2, 0.0), (12.8, 0.7))]
    ops += [win_up(fr, True, A_N, c, 2, s) for c, s in ((2.0, 0.0), (5.6, 0.0), (9.2, 0.4), (12.8, 0.0))]
    F.append(dict(name="north_A", fr=fr, L=L, ends=(a, b), ops=ops, plates=[], gf_slot=BRICK, est=True))
    return F

def build_walls(far):
    F = facade_specs(far)
    for f in F:
        fr, L, ops, plates = f["fr"], f["L"], f["ops"], list(f["plates"])
        K.B.new_group()
        gb = min(ground_of(fr, 0.0), ground_of(fr, L), ground_of(fr, L / 2)) - 0.35
        bandp = (0.0, L, BAND[0], BAND[1])
        if f.get("above_link"):
            wall_grid(fr, 0.0, L, LINK_TOP - 0.05, WALL_TOP, ops, plates + [bandp])
        else:
            lf = f.get("link_from")
            pls = plates + [bandp]
            if lf:
                # (the link's roof meets this wall: below LINK_TOP the wall is the link's inside, left out)
                l0, l1 = sorted((s_of(fr, B_W, lf[0]), s_of(fr, B_W, lf[1])))
                pls.append((l0, l1, gb, LINK_TOP - 0.05))
            wall_grid(fr, 0.0, L, gb, PLINTH_TOP, ops, pls, slot=BLUE, code=C_PLINTH)
            wall_grid(fr, 0.0, L, PLINTH_TOP, BAND[0], ops, pls, slot=f["gf_slot"])
            wall_grid(fr, 0.0, L, BAND[1], WALL_TOP, ops, pls)
        for o in ops: opening_parts(fr, o, far)
        if f.get("pier_B"):
            a_, b_ = f["pier_B"]
            K.B.new_group()
            fbox(fr, a_, b_, gb, BAND[0] + 0.02, -0.02, 0.035, BLUE, C_PLINTH, skip=("back",))
    return F

def corner_clad(far):
    """the grey stone cladding of the outer corner (the public entrance's corner pier), proud 4 cm on both faces"""
    K.B.new_group()
    u0, u1, w0, w1 = A_E - 0.62, A_E + 0.04, A_S - 0.62, A_S + 0.04
    g = ground(A_E, A_S) - 0.35; t = BAND[0] + 0.02
    hbox(u0, u1, w0, w1, g, t, BLUE, C_PLINTH, skip=())

def bands_and_cornice(far):
    K.B.new_group()
    sweep_closed(FP, [(-0.012, BAND[0]), (0.025, BAND[0]), (0.025, BAND[1]), (-0.012, BAND[1])], CONC, C_BAND)
    prof = [(-0.02, WALL_TOP), (0.31, WALL_TOP), (0.355, WALL_TOP + 0.045), (0.355, CORNICE_TOP - 0.035), (0.325, CORNICE_TOP),
            (-0.30, CORNICE_TOP), (-0.30, DECK - 0.03)]
    if far: prof = [(-0.02, WALL_TOP), (0.355, WALL_TOP), (0.355, CORNICE_TOP), (-0.30, CORNICE_TOP), (-0.30, DECK - 0.03)]
    sweep_closed(FP, prof, CONC, C_CORNICE)

def rect_fill(poly, h, slot, code, up=True):
    """a rectilinear polygon [(u, w)] filled with quads (its distinct u / w lines as a grid; no fans) at height h"""
    us = sorted(set(round(p[0], 4) for p in poly)); ws = sorted(set(round(p[1], 4) for p in poly))
    for i in range(len(us) - 1):
        for j in range(len(ws) - 1):
            cu, cw = (us[i] + us[i + 1]) / 2, (ws[j] + ws[j + 1]) / 2
            if not inside_poly(cu, cw, poly): continue
            pts = [P(us[i], ws[j], h), P(us[i + 1], ws[j], h), P(us[i + 1], ws[j + 1], h), P(us[i], ws[j + 1], h)]
            face_dir(pts, Z if up else -Z, slot, code, [(p.x, p.y) for p in pts])

def roof(far):
    K.B.new_group()
    inner = [(round(x, 4), round(y, 4)) for x, y in offset_poly(FP, -0.30)]
    rect_fill(inner, DECK, MEMB, C_PLAIN)
    LANDMARKS["roof_deck"] = DECK

def link(far):
    """the one-storey link (528772) behind the wings: brick, a flat roof with a concrete coping (ESTIMATED)"""
    K.B.new_group()
    # its free walls: the west (u L_W) and the south (w L_S, u L_W..B_W); north = against 531654, east = the wings
    for (a, b) in (((L_W, L_N), (L_W, L_S)), ((L_W, L_S), (B_W, L_S))):
        fr, L, a2, b2 = wall_frame(a, b, poly=LINK)
        gb = min(ground_of(fr, 0), ground_of(fr, L)) - 0.35
        ops = []
        if a[1] == L_S and b[1] == L_S:
            ops = [door_alu(fr, True, L_S, (L_W + B_W) / 2, 1.0, slot=ALU)]
        wall_grid(fr, 0.0, L, gb, PLINTH_TOP, ops, slot=BLUE, code=C_PLINTH)
        wall_grid(fr, 0.0, L, PLINTH_TOP, LINK_TOP - 0.25, ops)
        for o in ops: opening_parts(fr, o, far)
    sweep_closed(LINK, [(-0.02, LINK_TOP - 0.25), (0.05, LINK_TOP - 0.25), (0.05, LINK_TOP), (-0.25, LINK_TOP), (-0.25, LINK_TOP - 0.22)], CONC, C_CORNICE)
    inner = [(round(x, 4), round(y, 4)) for x, y in offset_poly(LINK, -0.25)]
    rect_fill(inner, LINK_TOP - 0.20, MEMB, C_PLAIN)

# ------------------------------------------------------------------------------------------------ roof equipment
def solar_rows(far):
    """portrait modules ~1.0 x 1.7 m tilted 12 deg to the south (w+ is south-east: the high edge at w-), on two
    galvanised rails and triangular feet; rows read on the ortho (NOTES)"""
    arrays = [(1.6, 11.4, [-11.8, -10.0]), (6.4, 11.4, [-6.5, -4.85, -3.2, -1.55]), (-3.0, 2.0, [0.65, 2.42, 4.19, 5.96, 7.73, 9.5])]
    tilt = math.radians(12); dw = 1.66; mod_u = 0.99; gap = 0.02
    for (ua, ub, rows) in arrays:
        n = int(round((ub - ua) / (mod_u + gap)))
        for w0 in rows:
            K.B.new_group()
            hl = DECK + 0.18; hh = hl + dw * math.tan(tilt)            # low edge (w+), high edge (w-)
            wl, wh = w0 + dw, w0                                        # (w0 = the high edge)
            if far:
                pts = [P(ua, wl, hl), P(ub, wl, hl), P(ub, wh, hh), P(ua, wh, hh)]
                face_dir(pts, Vector((0, 0, 1)), SOLAR, C_PANE, [((p.x - ua) / (mod_u + gap), (p.y + wl) / dw) for p in pts])
                continue
            for k in range(n):
                a = ua + k * (mod_u + gap); b = a + mod_u
                # the module: a slab 4 cm thick: top (cells), the frame's sides, bottom
                th = 0.04
                top = [P(a, wl, hl), P(b, wl, hl), P(b, wh, hh), P(a, wh, hh)]
                face_dir(top, Vector((0, math.sin(tilt), math.cos(tilt))), SOLAR, C_PANE, [((p.x - a) / mod_u, (p.y + wl) / dw) for p in top])
                bot = [P(a, wl, hl - th), P(b, wl, hl - th), P(b, wh, hh - th), P(a, wh, hh - th)]
                face_dir(bot, -Z, GALV, C_FRAME)
                for (p0, p1, q0, q1, nn) in ((top[0], top[1], bot[1], bot[0], Vector((0, 1, 0))), (top[2], top[3], bot[3], bot[2], Vector((0, -1, 0))),
                                              (top[1], top[2], bot[2], bot[1], Vector((1, 0, 0))), (top[3], top[0], bot[0], bot[3], Vector((-1, 0, 0)))):
                    face_dir([p0, p1, q0, q1], nn, GALV, C_FRAME)
            # rails under the modules (along u) and feet (a triangle prism every 2 m)
            for f in (0.22, 0.78):
                ww = wh + (wl - wh) * f; hh_ = hh + (hl - hh) * f - 0.04
                hbox(ua - 0.05, ub + 0.05, ww - 0.02, ww + 0.02, hh_ - 0.05, hh_, GALV, C_FRAME)
            nf = max(2, int((ub - ua) / 2.0) + 1)
            for k in range(nf):
                uu = ua + (ub - ua) * k / (nf - 1)
                uu = min(max(uu, ua + 0.05), ub - 0.05)
                hbox(uu - 0.02, uu + 0.02, wh + 0.15, wh + 0.25, DECK + 0.03, hh - 0.08, GALV, C_FRAME, skip=("bottom",))
                hbox(uu - 0.02, uu + 0.02, wl - 0.25, wl - 0.15, DECK + 0.03, hl - 0.06, GALV, C_FRAME, skip=("bottom",))
                hbox(uu - 0.12, uu + 0.12, wh + 0.05, wl - 0.05, DECK - 0.02, DECK + 0.045, BLUE, C_PLAIN, skip=("bottom",))     # the ballast tray (concrete)

def roof_equipment(far):
    K.B.new_group()
    # the rooflight: an upstand curb and a flat glazed top
    hbox(3.1, 4.8, -7.2, -5.8, DECK - 0.03, DECK + 0.32, CONC, C_PLAIN)
    if not far:
        hbox(3.15, 4.75, -7.15, -5.85, DECK + 0.32, DECK + 0.36, ALU, C_FRAME, skip=("bottom",))
        pts = [P(3.18, -5.88, DECK + 0.365), P(4.72, -5.88, DECK + 0.365), P(4.72, -7.12, DECK + 0.365), P(3.18, -7.12, DECK + 0.365)]
        face_dir(pts, Z, GLASS, C_PANE, [(p.x, p.y) for p in pts])
    else:
        pts = [P(3.1, -5.8, DECK + 0.33), P(4.8, -5.8, DECK + 0.33), P(4.8, -7.2, DECK + 0.33), P(3.1, -7.2, DECK + 0.33)]
        face_dir(pts, Z, GLASS, C_PANE, [(p.x, p.y) for p in pts])
    # the ventilation box (DSM 59.9 = 1 m over the deck): galvanised with louvres on two sides
    K.B.new_group()
    hbox(3.4, 4.5, -5.5, -3.9, DECK - 0.03, DECK + 1.05, GALV, C_PANEL)
    hbox(3.35, 4.55, -5.55, -3.85, DECK + 1.05, DECK + 1.12, GALV, C_FRAME)
    if not far:
        for k in range(8):
            h = DECK + 0.25 + k * 0.09
            for (uu, sg) in ((4.5, 1), (3.4, -1)):
                hbox(uu - 0.01 if sg > 0 else uu - 0.035, uu + 0.035 if sg > 0 else uu + 0.01, -5.4, -4.0, h, h + 0.035, GALV, C_BAR)
    # two AC condensers (white casings, a fan grille on top)
    for (ua, ub, wa, wb) in ((1.0, 1.8, -3.0, -2.0), (3.0, 3.8, -2.0, -1.0)):
        K.B.new_group()
        hbox(ua, ub, wa, wb, DECK + 0.08, DECK + 0.72, WHITE, C_PANEL)
        hbox(ua + 0.05, ub - 0.05, wa + 0.05, wb - 0.05, DECK - 0.02, DECK + 0.08, GALV, C_FRAME, skip=("top",))
        if not far:
            c = P((ua + ub) / 2, (wa + wb) / 2, DECK + 0.72)
            lathe(c, [(0.30, 0.0), (0.30, 0.025), (0.0, 0.025)], 20, ALU, C_BAR, smooth=False)
    # vent pipes with cowls
    for (uu, ww) in ((1.6, -3.4), (3.5, -2.6), (0.8, -8.0)):
        K.B.new_group()
        pipe(P(uu, ww, DECK - 0.05), P(uu, ww, DECK + 0.55), 0.055, 16, GALV, C_FRAME)
        if not far:
            lathe(P(uu, ww, DECK + 0.55), [(0.0, 0.0), (0.09, 0.0), (0.09, 0.03), (0.13, 0.08), (0.0, 0.10)], 16, GALV, C_FRAME, smooth=False)
    # the red unit on the west edge (a red-painted cabinet, kind unknown)
    K.B.new_group()
    hbox(-0.25, 0.3, -11.0, -9.5, DECK - 0.03, DECK + 0.6, SIGN, C_RED)
    # the roof access hatch (ESTIMATED: near the stair core)
    hbox(6.0, 7.0, -0.8, 0.1, DECK - 0.03, DECK + 0.30, CONC, C_PLAIN)
    hbox(5.95, 7.05, -0.85, 0.15, DECK + 0.30, DECK + 0.36, ALU, C_FRAME)

# ------------------------------------------------------------------------------------------------ the entrance details
def entrance_details(far):
    # the blue blade sign: at the first floor by the outer corner of wing A's front (POLICE / POLITIE lettering slot)
    K.B.new_group()
    w0, w1 = -0.10, -0.02                    # its thickness along w
    h0, h1 = 51.55, 52.25
    u0, u1 = A_E + 0.16, A_E + 0.62
    hbox(u0, u1, w0, w1, h0, h1, SIGN, C_PANEL, skip=("front", "back"))
    # the two broad faces carry the lettering (atlas row 0: v 0..0.5, its blue border included)
    for (ww, sg) in ((w0, -1), (w1, 1)):
        pts = [P(u0, ww, h0), P(u1, ww, h0), P(u1, ww, h1), P(u0, ww, h1)]
        uvs = [(0.0, 0.0), (1.0, 0.0), (1.0, 0.5), (0.0, 0.5)] if sg > 0 else [(1.0, 0.0), (0.0, 0.0), (0.0, 0.5), (1.0, 0.5)]
        face_dir(pts, Vector((0, -sg, 0)), SIGN, C_TEXT, uvs)
    if not far:
        for h in (h0 + 0.08, h1 - 0.08):
            hbox(A_E - 0.02, u0 + 0.01, -0.075, -0.045, h - 0.015, h + 0.015, ALU, C_FRAME)
    # the memorial plaque (stone) on wing A's front by the door
    K.B.new_group()
    fr, L, a, b = wall_frame((A_E, A_N), (A_E, A_S))
    s0, s1 = span(fr, False, A_E, -2.38, 0.75)
    fbox(fr, s0, s1, 48.95, 49.52, -0.01, 0.03, BLUE, C_PANEL)
    # CCTV cameras on brackets (corner, mid-front, the step)
    if not far:
        for (uu, ww, dirv) in ((A_E, -0.4, (1, 0)), (A_E, -7.6, (1, 0)), (13.4, A_S, (0, 1)), (B_E, 9.6, (1, 0))):
            K.B.new_group()
            h = 50.95
            du, dw = dirv
            # arm
            if du: hbox(uu - 0.02, uu + 0.22, ww - 0.02, ww + 0.02, h - 0.012, h + 0.025, ALU, C_FRAME)
            else: hbox(uu - 0.02, uu + 0.02, ww - 0.02, ww + 0.22, h - 0.012, h + 0.025, ALU, C_FRAME)
            cu, cw = uu + du * 0.30, ww + dw * 0.30
            hbox(cu - (0.13 if du else 0.05), cu + (0.13 if du else 0.05), cw - (0.05 if du else 0.13), cw + (0.05 if du else 0.13), h - 0.12, h - 0.02, WHITE, C_PANEL)
            hbox(cu - (0.15 if du else 0.06), cu + (0.15 if du else 0.06), cw - (0.06 if du else 0.15), cw + (0.06 if du else 0.15), h - 0.02, h + 0.01, WHITE, C_FRAME)
    # yellow-black bollards before the entrance and at the pedestrian lane
    for (uu, ww) in ((15.6, 1.4), (16.6, 2.3), (23.6, 8.6), (24.2, 9.2)):
        K.B.new_group()
        g = ground(uu, ww)
        if far: continue
        lathe(P(uu, ww, g - 0.1), [(0.0, 0.0), (0.075, 0.0), (0.075, 1.0), (0.06, 1.06), (0.0, 1.08)], 16, SIGN, C_HAZARD, smooth=True)

# ------------------------------------------------------------------------------------------------ the yard's closure
WALL_U0, WALL_U1 = 26.10, 26.55                # the rubble wall along Rue Rouge (u)
GATE_S = (9.6, 14.9)                            # the vehicle gate (w)
GATE_N = (-18.5, -15.3)                         # the north gate (w)
WALL_RUNS = [(-20.4, GATE_N[0]), (GATE_N[1], GATE_S[0]), (GATE_S[1], 20.6)]
HEDGE_BOX = (25.05, 25.95, -15.0, 9.4)

def street_level(w): return ground(WALL_U1 + 0.4, w)
def wall_top(w): return street_level(w) + 0.82

def rubble_wall(far):
    """grey sandstone rubble wall with blue-stone copings; the top follows the sidewalk (+0.82 m); piers at the gates"""
    PIER_ENDS = {GATE_N[0]: -0.2, GATE_N[1]: 0.2, GATE_S[0]: -0.2, GATE_S[1]: 0.2}
    for (w0r, w1r) in WALL_RUNS:
        K.B.new_group()
        w0 = w0r + PIER_ENDS.get(w0r, 0.0); w1 = w1r + PIER_ENDS.get(w1r, 0.0)
        n = max(1, int(math.ceil((w1 - w0) / 2.5)))
        for k in range(n):
            a, b = w0 + (w1 - w0) * k / n, w0 + (w1 - w0) * (k + 1) / n
            ta, tb = wall_top(a), wall_top(b)
            ga, gb = min(ground(WALL_U0 - 0.3, a), street_level(a)) - 0.3, min(ground(WALL_U0 - 0.3, b), street_level(b)) - 0.3
            # street face (u+), yard face (u-), sloped tops shared by the coping
            for (uu, sg) in ((WALL_U1, 1), (WALL_U0, -1)):
                pts = [P(uu, a, ga), P(uu, b, gb), P(uu, b, tb - 0.06), P(uu, a, ta - 0.06)]
                face_dir(pts, Vector((sg, 0, 0)), RUBBLE, C_PLAIN, [(-a if sg > 0 else a, hz(ga)), (-b if sg > 0 else b, hz(gb)), (-b if sg > 0 else b, hz(tb - 0.06)), (-a if sg > 0 else a, hz(ta - 0.06))])
            # the coping slab: 6 cm thick, 3 cm overhang each side
            c0, c1 = WALL_U0 - 0.03, WALL_U1 + 0.03
            top = [P(c0, a, ta), P(c1, a, ta), P(c1, b, tb), P(c0, b, tb)]
            face_dir(top, Z, BLUE, C_SILL, [(c0, -a), (c1, -a), (c1, -b), (c0, -b)])
            for (uu, sg) in ((c1, 1), (c0, -1)):
                face_dir([P(uu, a, ta - 0.06), P(uu, b, tb - 0.06), P(uu, b, tb), P(uu, a, ta)], Vector((sg, 0, 0)), BLUE, C_SILL)
                # its underside (the overhang)
                ui = WALL_U1 if sg > 0 else WALL_U0
                face_dir([P(ui, a, ta - 0.06), P(uu, a, ta - 0.06), P(uu, b, tb - 0.06), P(ui, b, tb - 0.06)], -Z, BLUE, C_SILL)
        # the run's end caps (rubble) + the coping's end
        for (ww, sg, wr) in ((w0, -1, w0r), (w1, 1, w1r)):
            if wr in PIER_ENDS: continue                       # (the end is inside a gate pier)
            t = wall_top(ww); g = min(ground(WALL_U0 - 0.3, ww), street_level(ww)) - 0.3
            face_dir([P(WALL_U0, ww, g), P(WALL_U1, ww, g), P(WALL_U1, ww, t - 0.06), P(WALL_U0, ww, t - 0.06)], Vector((0, -sg, 0)), RUBBLE, C_PLAIN)
            face_dir([P(WALL_U0 - 0.03, ww, t - 0.06), P(WALL_U1 + 0.03, ww, t - 0.06), P(WALL_U1 + 0.03, ww, t), P(WALL_U0 - 0.03, ww, t)], Vector((0, -sg, 0)), BLUE, C_SILL)
    # gate piers (rubble, a blue-stone cap): either side of both gates
    for ww in (GATE_N[0] - 0.28, GATE_N[1] + 0.28, GATE_S[0] - 0.28, GATE_S[1] + 0.28):
        K.B.new_group()
        t = wall_top(ww) + 0.35; g = min(ground(WALL_U0 - 0.3, ww), street_level(ww)) - 0.3
        hbox(WALL_U0 - 0.05, WALL_U1 + 0.05, ww - 0.28, ww + 0.28, g, t - 0.08, RUBBLE, C_PLAIN, skip=("top",))
        hbox(WALL_U0 - 0.09, WALL_U1 + 0.09, ww - 0.32, ww + 0.32, t - 0.08, t, BLUE, C_SILL)

def mesh_fence(far):
    """dark green welded-mesh fence on the wall (1.15 m): square posts every ~2.5 m, panels of 4 mm vertical wires every
    5 cm between a bottom and a top wire pair (LOD0); the far variant: posts and rails only"""
    uc = (WALL_U0 + WALL_U1) / 2
    for (w0, w1) in WALL_RUNS:
        a0, a1 = w0 + (0.35 if w0 in (GATE_N[1], GATE_S[1]) else 0.05), w1 - (0.35 if w1 in (GATE_N[0], GATE_S[0]) else 0.05)
        if a1 - a0 < 0.5: continue
        n = max(1, int(math.ceil((a1 - a0) / 2.5)))
        posts = [a0 + (a1 - a0) * k / n for k in range(n + 1)]
        K.B.new_group()
        for p in posts:
            t = wall_top(p)
            hbox(uc - 0.03, uc + 0.03, p - 0.03, p + 0.03, t - 0.05, t + 1.18, GREEN, C_FRAME)
            hbox(uc - 0.035, uc + 0.035, p - 0.035, p + 0.035, t + 1.18, t + 1.20, GREEN, C_FRAME)
        for k in range(n):
            a, b = posts[k] + 0.03, posts[k + 1] - 0.03
            ta, tb = wall_top(a), wall_top(b)
            K.B.new_group()
            # rails (two wires bottom, two at the top): 5 mm square bars
            for dh in ((0.06, 0.08, 1.06, 1.10) if not far else (0.07, 1.08)):
                face_strip = [P(uc, a, ta + dh), P(uc, b, tb + dh)]
                hb_ = 0.0025 if not far else 0.012
                pts = lambda ux: [P(ux, a, ta + dh - hb_), P(ux, b, tb + dh - hb_), P(ux, b, tb + dh + hb_), P(ux, a, ta + dh + hb_)]
                for (ux, sg) in ((uc + hb_, 1), (uc - hb_, -1)):
                    face_dir(pts(ux), Vector((sg, 0, 0)), GREEN, C_BAR)
                face_dir([P(uc - hb_, a, ta + dh + hb_), P(uc + hb_, a, ta + dh + hb_), P(uc + hb_, b, tb + dh + hb_), P(uc - hb_, b, tb + dh + hb_)], Z, GREEN, C_BAR)
                face_dir([P(uc - hb_, a, ta + dh - hb_), P(uc + hb_, a, ta + dh - hb_), P(uc + hb_, b, tb + dh - hb_), P(uc - hb_, b, tb + dh - hb_)], -Z, GREEN, C_BAR)
            if far: continue
            m = int((b - a) / 0.05)
            for j in range(1, m):
                ww = a + (b - a) * j / m; t = ta + (tb - ta) * j / m
                r = 0.002
                # a vertical wire (offset 6 mm street-side of the rails: no shared planes)
                ux = uc + 0.006
                for (p0, p1, nn) in (((ux - r, ww - r), (ux - r, ww + r), Vector((-1, 0, 0))), ((ux + r, ww + r), (ux + r, ww - r), Vector((1, 0, 0))),
                                     ((ux - r, ww + r), (ux + r, ww + r), Vector((0, -1, 0))), ((ux + r, ww - r), (ux - r, ww - r), Vector((0, 1, 0)))):
                    face_dir([P(p0[0], p0[1], t + 0.03), P(p1[0], p1[1], t + 0.03), P(p1[0], p1[1], t + 1.13), P(p0[0], p0[1], t + 1.13)], nn, GREEN, C_BAR)

def hedge(far):
    """the privet hedge behind the fence: a long box with chamfered top edges on the ground (ESTIMATED height 1.5 m)"""
    K.B.new_group()
    u0, u1, w0, w1 = HEDGE_BOX
    top = 48.95; ch = 0.18
    n = 10
    for k in range(n):
        a, b = w0 + (w1 - w0) * k / n, w0 + (w1 - w0) * (k + 1) / n
        ga, gb = ground(u0, a) - 0.15, ground(u0, b) - 0.15
        prof = [(u0, None), (u0, top - ch), (u0 + ch, top), (u1 - ch, top), (u1, top - ch), (u1, None)]
        for j in range(len(prof) - 1):
            (ua, ha), (ub, hb) = prof[j], prof[j + 1]
            ha_a = ga if ha is None else ha; ha_b = gb if ha is None else ha
            hb_a = ga if hb is None else hb; hb_b = gb if hb is None else hb
            pts = [P(ua, a, ha_a), P(ub, a, hb_a), P(ub, b, hb_b), P(ua, b, ha_b)]
            mid_u = (ua + ub) / 2; mid_h = ((ha_a if ha is not None else top) + (hb_a if hb is not None else top)) / 2
            out = Vector((mid_u - (u0 + u1) / 2, 0, (mid_h - (top - 0.6)) * 0.8))
            face_dir(pts, out, HEDGE, C_PLAIN)
    for (ww, sg) in ((w0, -1), (w1, 1)):
        g = ground(u0, ww) - 0.15
        pts = [P(u0, ww, g), P(u1, ww, g), P(u1, ww, top - ch), P(u1 - ch, ww, top), P(u0 + ch, ww, top), P(u0, ww, top - ch)]
        face_dir(pts, Vector((0, -sg, 0)), HEDGE, C_PLAIN)

def sliding_gate(far):
    """the galvanised sliding gate of the vehicle entrance, OPEN as in April 2024: its 5.4 m leaf parked south behind the
    wall (ESTIMATED where), on a ground rail; a frame of 6 cm tubes, 25 mm square bars every 12 cm"""
    K.B.new_group()
    uu = WALL_U0 - 0.30
    w0, w1 = GATE_S[1] - 0.2, GATE_S[1] + 5.2
    g = max(ground(uu, w0), ground(uu, w1))
    h0, h1 = g + 0.08, g + 1.95
    t = 0.03
    hbox(uu - t, uu + t, w0, w1, h0, h0 + 0.06, GALV, C_FRAME)
    hbox(uu - t, uu + t, w0, w1, h1 - 0.06, h1, GALV, C_FRAME)
    hbox(uu - t, uu + t, w0, w0 + 0.06, h0 + 0.06, h1 - 0.06, GALV, C_FRAME, skip=("bottom", "top"))
    hbox(uu - t, uu + t, w1 - 0.06, w1, h0 + 0.06, h1 - 0.06, GALV, C_FRAME, skip=("bottom", "top"))
    hbox(uu - t, uu + t, w0 + 0.06, w1 - 0.06, (h0 + h1) / 2 - 0.03, (h0 + h1) / 2 + 0.03, GALV, C_FRAME)
    if not far:
        m = int((w1 - w0 - 0.12) / 0.12)
        for j in range(1, m):
            ww = w0 + 0.06 + (w1 - w0 - 0.12) * j / m
            hbox(uu - 0.0125, uu + 0.0125, ww - 0.0125, ww + 0.0125, h0 + 0.06, (h0 + h1) / 2 - 0.03, GALV, C_BAR, skip=("bottom", "top"))
            hbox(uu - 0.0125, uu + 0.0125, ww - 0.0125, ww + 0.0125, (h0 + h1) / 2 + 0.03, h1 - 0.06, GALV, C_BAR, skip=("bottom", "top"))
    # the ground rail + the guide post with its rollers
    hbox(uu - 0.04, uu + 0.04, GATE_S[0] + 0.2, w1 + 0.4, g - 0.05, g + 0.04, GALV, C_FRAME)
    hbox(uu + 0.06, uu + 0.18, GATE_S[1] + 0.05, GATE_S[1] + 0.17, g - 0.2, h1 + 0.1, GALV, C_FRAME)

def north_gate(far):
    """the two-leaf dark green steel gate at the north end (closed): frames + sheet infill"""
    K.B.new_group()
    uu = (WALL_U0 + WALL_U1) / 2
    w0, w1 = GATE_N[0] + 0.03, GATE_N[1] - 0.03
    g = max(ground(uu, w0), ground(uu, w1))
    h0, h1 = g + 0.05, g + 1.75
    wm = (w0 + w1) / 2
    for (a, b) in ((w0, wm - 0.01), (wm + 0.01, w1)):
        hbox(uu - 0.03, uu + 0.03, a, a + 0.06, h0, h1, GREEN, C_FRAME)
        hbox(uu - 0.03, uu + 0.03, b - 0.06, b, h0, h1, GREEN, C_FRAME)
        hbox(uu - 0.03, uu + 0.03, a + 0.06, b - 0.06, h1 - 0.06, h1, GREEN, C_FRAME)
        hbox(uu - 0.03, uu + 0.03, a + 0.06, b - 0.06, h0, h0 + 0.06, GREEN, C_FRAME)
        hbox(uu - 0.012, uu + 0.012, a + 0.06, b - 0.06, h0 + 0.06, h1 - 0.06, GREEN, C_PANEL)

def street_signs(far):
    """the 'no entry except service vehicles' sign on the vehicle gate's north pier: a red-rimmed white disc (C3) and a
    blue plate (atlas row 1: the lettering), on a galvanised post (ESTIMATED height)"""
    K.B.new_group()
    ww = GATE_S[0] - 0.62; uu = WALL_U1 + 0.12
    g = street_level(ww)
    pipe(P(uu, ww, g - 0.1), P(uu, ww, g + 2.25), 0.03, 16, GALV, C_FRAME)
    c = P(uu + 0.04, ww, g + 1.95)
    segs = 24
    for (r0, r1, code) in ((0.0, 0.24, C_PLAIN), (0.24, 0.31, C_RED)):
        for k in range(segs):
            a, b = 2 * math.pi * k / segs, 2 * math.pi * (k + 1) / segs
            pa = lambda r, t: c + Vector((0, math.cos(t) * r, math.sin(t) * r))
            pts = [pa(r0, a), pa(r1, a), pa(r1, b), pa(r0, b)] if r0 > 0 else [c, pa(r1, a), pa(r1, b)]
            face_dir(pts, Vector((1, 0, 0)), SIGN, code)
    # the back of the disc (grey)
    for k in range(segs):
        a, b = 2 * math.pi * k / segs, 2 * math.pi * (k + 1) / segs
        pa = lambda r, t: c + Vector((-0.01, math.cos(t) * r, math.sin(t) * r))
        face_dir([c + Vector((-0.01, 0, 0)), pa(0.31, a), pa(0.31, b)], Vector((-1, 0, 0)), GALV, C_FRAME)
    # the rim of the disc (closes the 1 cm between its face and its back)
    for k in range(segs):
        a, b = 2 * math.pi * k / segs, 2 * math.pi * (k + 1) / segs
        q = lambda dx, t: c + Vector((dx, math.cos(t) * 0.31, math.sin(t) * 0.31))
        face_dir([q(0.0, a), q(-0.01, a), q(-0.01, b), q(0.0, b)], Vector((0, math.cos((a + b) / 2), math.sin((a + b) / 2))), GALV, C_FRAME)
    # the blue plate under it (its street face carries the lettering: atlas row 1)
    h0, h1 = g + 1.38, g + 1.62
    hbox(uu + 0.03, uu + 0.05, ww - 0.30, ww + 0.30, h0, h1, SIGN, C_PANEL, skip=("right",))
    pts = [P(uu + 0.05, ww + 0.30, h0), P(uu + 0.05, ww - 0.30, h0), P(uu + 0.05, ww - 0.30, h1), P(uu + 0.05, ww + 0.30, h1)]
    face_dir(pts, Vector((1, 0, 0)), SIGN, C_TEXT, [(0.0, 0.5), (1.0, 0.5), (1.0, 0.75), (0.0, 0.75)])

def flags(far):
    """three flagpoles in front of wing A behind the hedge line (Belgium, Europe, Europe as in April 2024): tapered
    aluminium poles with a ball, the flags hanging in a light breeze (cloth with folds, two sides)"""
    for k, (ww, code) in enumerate(((-4.4, C_FLAG_EU), (-1.4, C_FLAG_BE), (1.6, C_FLAG_EU))):
        uu = 24.55
        g = ground(uu, ww)
        top = g + 8.6
        K.B.new_group()
        lathe(P(uu, ww, g - 0.2), [(0.055, 0.0), (0.05, 2.0), (0.032, top - g + 0.2)], 16, GALV, C_FRAME, smooth=True)
        KT.knob(P(uu, ww, top + 0.24), 0.06, GALV, C_FRAME, rings=6, segs=12)
        hbox(uu - 0.2, uu + 0.2, ww - 0.2, ww + 0.2, g - 0.3, g + 0.06, BLUE, C_PLAIN)
        # the flag: hoist 1.0 m along the pole from 0.15 under the top, fly 1.5 m, drooping 50 deg toward u- (the
        # yard: the wind from the street that day), folds across the fly
        K.B.new_group()
        sv = K.B.smooth; K.B.smooth = True
        nS, nT = (9, 6) if not far else (4, 3)
        flyL, hoist = 1.5, 1.0
        droop = math.radians(52)
        d = Vector((-math.cos(droop) * 0.85, math.cos(droop) * 0.53 * (1 if k % 2 else -1), -math.sin(droop))).normalized()
        down = Vector((0, 0, -1))
        side = d.cross(down).normalized()
        base = P(uu, ww, top - 0.12)
        def pt(s, t, off):
            fold = 0.09 * math.sin(2 * math.pi * (s * 2.1 + t * 0.35 + k * 0.3)) * min(1.0, s * 4)
            return base + Vector((-0.04, 0, 0)) + d * (s * flyL) + down * (t * hoist) + side * (fold + off)
        for off, sg in ((0.004, 1), (-0.004, -1)):
            for i in range(nS):
                for j in range(nT):
                    s0_, s1_, t0_, t1_ = i / nS, (i + 1) / nS, j / nT, (j + 1) / nT
                    pts = [pt(s0_, t0_, off), pt(s1_, t0_, off), pt(s1_, t1_, off), pt(s0_, t1_, off)]
                    nrm = (pts[1] - pts[0]).cross(pts[3] - pts[0]) * sg
                    face_dir(pts, nrm, FLAG, code, [(s0_, 1 - t0_), (s1_, 1 - t0_), (s1_, 1 - t1_), (s0_, 1 - t1_)])
        # the hems: the 8 mm edge of the cloth all round (closes the two sheets)
        K.B.smooth = False
        rim = [(i / nS, 0.0) for i in range(nS)] + [(1.0, j / nT) for j in range(nT)] + [(1 - i / nS, 1.0) for i in range(nS)] + [(0.0, 1 - j / nT) for j in range(nT)]
        cen = pt(0.5, 0.5, 0.0)
        for i in range(len(rim)):
            (sa_, ta_), (sb_, tb_) = rim[i], rim[(i + 1) % len(rim)]
            q = [pt(sa_, ta_, 0.004), pt(sb_, tb_, 0.004), pt(sb_, tb_, -0.004), pt(sa_, ta_, -0.004)]
            mid = (q[0] + q[1]) * 0.5
            face_dir(q, mid - cen, FLAG, code)
        K.B.smooth = sv

# ------------------------------------------------------------------------------------------------ build
def build(far):
    K.B = Builder(); K.FAR = far; KT.KNOBS.clear()
    build_walls(far)
    corner_clad(far)
    bands_and_cornice(far)
    roof(far)
    link(far)
    solar_rows(far)
    roof_equipment(far)
    entrance_details(far)
    rubble_wall(far)
    mesh_fence(far)
    hedge(far)
    sliding_gate(far)
    north_gate(far)
    street_signs(far)
    flags(far)
    return K.B

K.slot_frame = WHITE
B_MAIN = build(False)
B_FAR = build(True)
print(f"built LOD0 {len(B_MAIN.f)} faces, far {len(B_FAR.f)} faces ({time.time() - T0:.1f}s)")

# ------------------------------------------------------------------------------------------------ mesh
mats = []
for name in SLOTS:
    m = bpy.data.materials.new(name); mats.append(m)
AO_SPLIT = 0.80
AO_PARK_U = 0.997
PACK_SHAPE = "CONCAVE" if "--fast" not in ARGS else "AABB"
ROUND_SLOTS = ("galvanised_steel", "flag_fabric", "signage")

def region_width(me, override):
    bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
    cos_t = math.cos(math.radians(50))
    seen = [False] * len(bm.faces); width = [4.0] * len(bm.faces)
    for f0 in bm.faces:
        if seen[f0.index]: continue
        if override[f0.index] is not None:
            seen[f0.index] = True; width[f0.index] = override[f0.index]; continue
        reg, stack = [], [f0]; seen[f0.index] = True; n0 = f0.normal.copy()
        while stack:
            f = stack.pop(); reg.append(f)
            for e in f.edges:
                for g in e.link_faces:
                    if not seen[g.index] and override[g.index] is None and g.normal.dot(f.normal) > cos_t:
                        seen[g.index] = True; stack.append(g)
        t = Z.cross(n0); t = t.normalized() if t.length > 1e-3 else Vector((1, 0, 0))
        bv = n0.cross(t).normalized()
        xs = [v.co.dot(t) for f in reg for v in f.verts]; ys = [v.co.dot(bv) for f in reg for v in f.verts]
        zs = [v.co.dot(n0) for f in reg for v in f.verts]
        ext = sorted((max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)))
        w = ext[1] if ext[0] > 0.01 else min(max(xs) - min(xs), max(ys) - min(ys))
        inreg = set(f.index for f in reg)
        area = sum(f.calc_area() for f in reg)
        per = sum(e.calc_length() for f in reg for e in f.edges if sum(1 for g in e.link_faces if g.index in inreg) == 1)
        if per > 1e-6: w = min(w, 2.0 * area / per)
        for f in reg: width[f.index] = w
    bm.free()
    col = me.color_attributes["Col"]
    c = [0.0] * (4 * len(me.loops)); col.data.foreach_get("color", c)
    for poly in me.polygons:
        enc = min(1.0, math.sqrt(max(0.0, width[poly.index]) / 4.0))
        for li in poly.loop_indices: c[4 * li + 2] = enc
    col.data.foreach_set("color", c)

def make_mesh(name, bld):
    used = sorted(set(bld.m)); remap = {m: i for i, m in enumerate(used)}
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(p) for p in bld.v], [], bld.f); me.update()
    for m in used: me.materials.append(mats[m])
    me.polygons.foreach_set("material_index", [remap[m] for m in bld.m])
    col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    cdat = []
    for poly, code in zip(me.polygons, bld.c):
        for _ in poly.loop_indices: cdat += [code / 16 + 1 / 32, 1.0, 0.0, 1.0]
    col.data.foreach_set("color", cdat)
    uv0 = me.uv_layers.new(name="UVMap")
    uvd = [0.0] * (2 * len(me.loops))
    for poly, given in zip(me.polygons, bld.uv):
        if given and len(given) == len(poly.loop_indices) and all(g is not None for g in given):
            for li, (u, v) in zip(poly.loop_indices, given): uvd[2 * li] = u; uvd[2 * li + 1] = v
            continue
        n = poly.normal
        if abs(n.z) < 0.75:
            t = Z.cross(n); t = t.normalized() if t.length > 1e-6 else Vector((1, 0, 0)); b = Z
        else:
            t = Vector((1, 0, 0)); b = Vector((0, 1, 0))
        for li in poly.loop_indices:
            p = me.vertices[me.loops[li].vertex_index].co
            uvd[2 * li] = p.dot(t); uvd[2 * li + 1] = p.dot(b)
    uv0.data.foreach_set("uv", uvd)
    me.uv_layers.new(name="Lightmap")
    ga = me.attributes.new("grp", "INT", "FACE"); ga.data.foreach_set("value", bld.g)
    sa = me.attributes.new("smoothf", "INT", "FACE"); sa.data.foreach_set("value", [int(x) for x in bld.sm])
    rwa = me.attributes.new("rw", "FLOAT", "FACE"); rwa.data.foreach_set("value", [(-1.0 if r is None else r) for r in bld.rw])
    obj = bpy.data.objects.new(name, me); scn.collection.objects.link(obj)
    bm = bmesh.new(); bm.from_mesh(me)
    # weld (0.4 mm); the smooth round parts apart from the rest (their smooth normals must not reach a flat neighbour)
    smf = me.attributes["smoothf"].data
    rv = {v for f in bm.faces if smf[f.index].value for v in f.verts}
    bmesh.ops.remove_doubles(bm, verts=[v for v in bm.verts if v not in rv], dist=0.0004)
    bmesh.ops.remove_doubles(bm, verts=[v for v in bm.verts if v.is_valid and v in rv], dist=0.0004)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.0002)
    bm.to_mesh(me); bm.free()
    sm = [0] * len(me.polygons); me.attributes["smoothf"].data.foreach_get("value", sm)
    me.set_sharp_from_angle(angle=math.radians(35))
    me.polygons.foreach_set("use_smooth", [bool(x) for x in sm])
    me.validate()
    rw = [0.0] * len(me.polygons); me.attributes["rw"].data.foreach_get("value", rw)
    region_width(me, [None if r < 0 else r for r in rw])
    ntri = sum(len(p.vertices) - 2 for p in me.polygons)
    print(name, "faces", len(me.polygons), "triangles", ntri, "verts", len(me.vertices))
    return obj, ntri, {SLOTS[mats.index(me.materials[i])]: sum(len(p.vertices) - 2 for p in me.polygons if p.material_index == i) for i in range(len(me.materials))}

def lightmap(objs, v0, v1):
    """one lightmap region (v0..v1): smart-projected; THIN faces (< 6 cm across) take no texels (parked at AO 1.0, their
    AO goes per vertex); faces smart_project leaves empty get a planar projection of their own (the villa's fix)"""
    for o in scn.objects: o.select_set(False)
    thin_all = {}
    for obj in objs:
        me = obj.data
        bm = bmesh.new(); bm.from_mesh(me)
        ng = [f_ for f_ in bm.faces if len(f_.verts) > 4]
        if ng: bmesh.ops.triangulate(bm, faces=ng, quad_method="BEAUTY", ngon_method="BEAUTY")
        bm.to_mesh(me); bm.free(); me.update()
        thin = [False] * len(me.polygons)
        for p_ in me.polygons:
            co = [me.vertices[v].co for v in p_.vertices]
            mx = max((co[i] - co[(i + 1) % len(co)]).length for i in range(len(co)))
            thin[p_.index] = mx > 0 and p_.area / mx < (0.06 if len(co) == 4 else 0.03)
        for p_ in me.polygons:
            if me.materials[p_.material_index].name in ROUND_SLOTS and p_.area < 0.05: thin[p_.index] = True
            if me.materials[p_.material_index].name == "flag_fabric": thin[p_.index] = True
        thin_all[obj.name] = thin
        me.uv_layers.active = me.uv_layers["Lightmap"]
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode="EDIT")
        bm = bmesh.from_edit_mesh(me); bm.faces.ensure_lookup_table()
        for f_ in bm.faces: f_.select_set(not thin[f_.index])
        bm.select_flush_mode(); bmesh.update_edit_mesh(me)
        bpy.ops.uv.smart_project(angle_limit=math.radians(50), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
        bpy.ops.object.mode_set(mode="OBJECT")
        lmd = me.uv_layers["Lightmap"].data; nz = 0
        for p_ in me.polygons:
            if thin[p_.index]: continue
            us = [lmd[li].uv for li in p_.loop_indices]
            if abs(sum(us[i].x * us[(i + 1) % len(us)].y - us[(i + 1) % len(us)].x * us[i].y for i in range(len(us)))) > 1e-12: continue
            n_ = p_.normal; t_ = (Vector((0, 0, 1)) if abs(n_.z) < 0.9 else Vector((1, 0, 0))).cross(n_).normalized(); b_ = n_.cross(t_)
            for li in p_.loop_indices:
                c_ = me.vertices[me.loops[li].vertex_index].co; lmd[li].uv = (c_.dot(t_), c_.dot(b_))
            nz += 1
        print(f"  {obj.name}: {nz} faces projected on their own plane (smart_project left them empty)")
        grp = [0] * len(me.polygons); me.attributes["grp"].data.foreach_get("value", grp)
        for poly, g in zip(me.polygons, grp):
            off = (g % 9973) * 1e-7
            for li in poly.loop_indices: u = lmd[li].uv; lmd[li].uv = (u.x + off, u.y + off)
        obj.select_set(False)
    for obj in objs: obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.mode_set(mode="EDIT")
    for obj in objs:
        me = obj.data; bm = bmesh.from_edit_mesh(me); bm.faces.ensure_lookup_table()
        th = thin_all[obj.name]
        for f_ in bm.faces: f_.select_set(not th[f_.index])
        bm.select_flush_mode(); bmesh.update_edit_mesh(me)
    bpy.ops.uv.select_all(action="SELECT")
    bpy.ops.uv.average_islands_scale()
    try: bpy.ops.uv.pack_islands(rotate=True, margin=0.0008, shape_method=PACK_SHAPE, margin_method="FRACTION")
    except Exception as e: print("pack_islands:", e)
    bpy.ops.object.mode_set(mode="OBJECT")
    cov = 0.0; area = 0.0; nfaces = 0; ncov = 0
    for obj in objs:
        me = obj.data; th = thin_all[obj.name]; lm = me.uv_layers["Lightmap"].data
        for p_ in me.polygons:
            for li in p_.loop_indices:
                if th[p_.index]: lm[li].uv = (AO_PARK_U, v0 + 0.5 * (v1 - v0))
                else: u = lm[li].uv; lm[li].uv = (u.x * 0.994, v0 + u.y * (v1 - v0))
            if not th[p_.index]:
                nfaces += 1
                li = list(p_.loop_indices); a2 = 0.0
                for j in range(1, len(li) - 1):
                    a, b, c_ = lm[li[0]].uv, lm[li[j]].uv, lm[li[j + 1]].uv
                    a2 += abs((b.x - a.x) * (c_.y - a.y) - (b.y - a.y) * (c_.x - a.x)) / 2
                cov += a2; ncov += a2 > 1e-12
                area += p_.area
        me.uv_layers.active = me.uv_layers["UVMap"]
    dens = math.sqrt(cov * AO_PX * AO_PX / max(area, 1))
    print(f"  lightmap v {v0:.3f}..{v1:.3f}: {sum(sum(t) for t in thin_all.values())} thin faces (vertex AO), {area:.0f} m2, {dens:.1f} px/m, "
          f"{ncov}/{nfaces} lightmapped faces have texels")
    for obj in objs:
        for a in ("grp", "smoothf", "rw"):
            if a in obj.data.attributes: obj.data.attributes.remove(obj.data.attributes[a])
    return thin_all, dens, (ncov, nfaces)

obj, ntri0, per_slot0 = make_mesh("Police", B_MAIN)
far, ntri_far, per_slot_far = make_mesh("Police_far", B_FAR)
thin0, dens0, cov0 = lightmap([obj], 0.0, AO_SPLIT)
thin1, dens1, cov1 = lightmap([far], AO_SPLIT + 0.005, 1.0)
print(f"meshes + lightmaps {time.time() - T0:.1f}s")

# ------------------------------------------------------------------------------------------------ ground + neighbours for the bake + previews
def load_ground():
    a = _dtm[::2, ::2]; step = _g["step"] * 2; rows, cols = a.shape
    verts = []
    for r in range(rows):
        for c in range(cols):
            x, z = _g["x0"] + c * step, _g["z0"] + r * step
            dx, dz = x - OXC, z - OZC
            u, w = dx * _ca + dz * _sa, -dx * _sa + dz * _ca
            verts.append((u, -w, a[r, c] - OY - 0.02))
    faces = [(r * cols + c, r * cols + c + 1, (r + 1) * cols + c + 1, (r + 1) * cols + c) for r in range(rows - 1) for c in range(cols - 1)]
    gm = bpy.data.meshes.new("Ground"); gm.from_pydata(verts, [], faces); gm.update()
    for p in gm.polygons:
        if p.normal.z < 0: p.flip()
    gm.update()
    g = bpy.data.objects.new("Ground", gm); scn.collection.objects.link(g)
    gmat = bpy.data.materials.new("GroundMat"); gmat.use_nodes = True
    gmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.25, 0.25, 0.24, 1)
    gm.materials.append(gmat)
    return g
ground_obj = load_ground()

def load_neighbours():
    """the UrbIS solids within 40 m that stay (the school's stair block 531654 the station abuts, the school, the
    garage, the houses): extruded footprints, base -> eaves, occluders for the AO bake only"""
    d = json.load(open(os.path.join(ROOT, "data", "tiles", "E4", "buildings.json"), encoding="utf-8"))
    hide = {SITE["solids"]["528055"]["id"], SITE["solids"]["528772"]["id"]}
    verts, faces = [], []
    for b in d["buildings"]:
        if b["id"] in hide: continue
        fp = b["footprint"][0]
        cx = sum(p[0] for p in fp) / len(fp); cz = sum(p[1] for p in fp) / len(fp)
        if math.hypot(cx - OXC, cz - OZC) > 45: continue
        loc = [((x - OXC) * _ca + (z - OZC) * _sa, -(x - OXC) * _sa + (z - OZC) * _ca) for x, z in fp]
        i0 = len(verts)
        for (u, w) in loc: verts.append((u, -w, b["base"] - OY - 0.5))
        for (u, w) in loc: verts.append((u, -w, b["eaves"] - OY))
        n = len(loc)
        for i in range(n):
            j = (i + 1) % n
            faces.append((i0 + i, i0 + j, i0 + n + j, i0 + n + i))
        faces.append(tuple(i0 + n + i for i in range(n)))
    if not faces: return None
    nm = bpy.data.meshes.new("Neighbours"); nm.from_pydata(verts, [], faces); nm.update(); nm.validate()
    o = bpy.data.objects.new("Neighbours", nm); scn.collection.objects.link(o)
    m = bpy.data.materials.new("NeighMat"); m.use_nodes = True; nm.materials.append(m)
    return o
neigh_obj = load_neighbours()

# ------------------------------------------------------------------------------------------------ AO bake (lighting only)
scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 4.0
ao_img = bpy.data.images.new("police_ao", AO_PX, AO_PX, alpha=False, float_buffer=False)
ao_img.colorspace_settings.name = "Non-Color"
for m in mats:
    m.use_nodes = True
    nt = m.node_tree; n = nt.nodes.new("ShaderNodeTexImage"); n.image = ao_img; n.name = "AO"; nt.nodes.active = n

def vertex_ao(o, thin):
    me = o.data
    aov = me.color_attributes.new("AOv", "FLOAT_COLOR", "CORNER"); me.color_attributes.active_color = aov
    for x in scn.objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
    try: bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    except Exception as e:
        print("vertex AO bake failed:", e); me.color_attributes.remove(aov); return
    a = [0.0] * (4 * len(me.loops)); aov.data.foreach_get("color", a)
    col = me.color_attributes["Col"]; c = [0.0] * (4 * len(me.loops)); col.data.foreach_get("color", c)
    n_set = 0
    for p in me.polygons:
        if not thin[p.index]: continue
        for li in p.loop_indices: c[4 * li + 1] = max(0.25, min(1.0, a[4 * li])); n_set += 1
    col.data.foreach_set("color", c)
    me.color_attributes.active_color = col
    me.color_attributes.remove(me.color_attributes["AOv"])
    print(f"  vertex AO {o.name}: {n_set} corners of thin faces")

if BAKE:
    scn.cycles.samples = 48 if "--fast" in ARGS else 96
    t = time.time()
    for (targets, others, clear) in (((obj,), (far,), True), ((far,), (obj,), False)):
        for o in others: o.hide_render = True
        for o in targets: o.hide_render = False
        for o in scn.objects: o.select_set(False)
        for o in targets: o.select_set(True)
        bpy.context.view_layer.objects.active = targets[0]
        bpy.ops.object.bake(type="AO", uv_layer="Lightmap", margin=3, use_clear=clear)
    print(f"AO bake {time.time() - t:.1f}s")
    t = time.time()
    far.hide_render = True; obj.hide_render = False
    vertex_ao(obj, thin0[obj.name])
    far.hide_render = False; obj.hide_render = True; vertex_ao(far, thin1[far.name])
    obj.hide_render = far.hide_render = False
    print(f"vertex AO {time.time() - t:.1f}s")
    px = np.empty(AO_PX * AO_PX * 4, np.float32); ao_img.pixels.foreach_get(px)
    px = px.reshape(AO_PX, AO_PX, 4); px[:, int(0.9945 * AO_PX):, :3] = 1.0
    ao_img.pixels.foreach_set(px.ravel())
    ao_img.filepath_raw = os.path.join(OUT, "police_ao.png"); ao_img.file_format = "PNG"
    scn.render.image_settings.color_mode = "BW"
    ao_img.save()
else:
    p = os.path.join(OUT, "police_ao.png")
    if os.path.exists(p): ao_img.filepath = p; ao_img.source = "FILE"; ao_img.reload()

# ------------------------------------------------------------------------------------------------ export
for m in mats:
    if m.node_tree and "AO" in m.node_tree.nodes: m.node_tree.nodes.remove(m.node_tree.nodes["AO"])
for o in scn.objects: o.select_set(False)
for o in (obj, far): o.select_set(True)
bpy.context.view_layer.objects.active = obj
glb = os.path.join(OUT, "police.raw.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                          export_all_vertex_colors=False, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
print("exported", glb, os.path.getsize(glb) // 1024, "KB")
bx = [p.x for p in B_MAIN.v]; by = [p.y for p in B_MAIN.v]
corners = [city(u, -y) for u in (min(bx), max(bx)) for y in (min(by), max(by))]
info = {
    "asset": "Commissariat de police d'Uccle, Rue Rouge 17 (tools/blender/police_rouge.py)",
    "triangles_lod0": ntri0, "triangles_far": ntri_far, "triangles_per_slot_lod0": per_slot0, "triangles_per_slot_far": per_slot_far,
    "slots": SLOTS, "codes": {"COLOR_0.r": "code / 16 + 1/32", "COLOR_0.g": "per-vertex AO of the thin faces (1 elsewhere)",
                              "COLOR_0.b": "sqrt(width of the flat region / 4 m)", "names": CODES},
    "uv": {"TEXCOORD_0": "world metres per face: walls (along, m TAW - 40), flat parts (u, -w); sign text faces: the lettering atlas (row 0 v 0..0.5 POLICE / POLITIE, row 1 v 0.5..0.75 the gate plate); flags: 0..1 (hoist -> fly, bottom -> top)",
           "TEXCOORD_1": "AO lightmap (thin faces: u > 0.994, AO 1)"},
    "lightmap": {"px": AO_PX, "split_v": AO_SPLIT, "lod0_px_per_m": round(dens0, 1), "far_px_per_m": round(dens1, 1),
                 "thin_faces_vertex_ao": [sum(thin0[obj.name]), sum(thin1[far.name])],
                 "lightmapped_faces_with_texels": {"lod0": cov0, "far": cov1}},
    "frame": "glTF Y up; three.js local (u, m TAW - OY, w); node at the city position of the frame origin, rotation.y = -rotation",
    "placement": {"city_local_position": [OXC, OY, OZC], "rotation_y_rad": -ROT,
                  "hides_solids": [SITE["solids"]["528055"]["id"], SITE["solids"]["528772"]["id"]],
                  "hides_bu_ids": sorted(set(x for x in (SITE["solids"]["528055"]["bu"], SITE["solids"]["528772"]["bu"]) if x))},
    "bounds_city": {"x": [round(min(c[0] for c in corners), 1), round(max(c[0] for c in corners), 1)],
                    "z": [round(min(c[1] for c in corners), 1), round(max(c[1] for c in corners), 1)],
                    "y": [round(min(p.z for p in B_MAIN.v) + OY, 1), round(max(p.z for p in B_MAIN.v) + OY, 1)]},
    "measured": {"footprint_squared": FP, "link": LINK, "levels_taw": {"gf": GF, "f1": F1, "f2": F2, "plinth_top": PLINTH_TOP, "band": BAND,
                 "gf_sill": GF_SILL, "gf_head": GF_HEAD, "up_sill": UP_SILL, "up_head": UP_HEAD, "wall_top": WALL_TOP, "cornice_top": CORNICE_TOP,
                 "deck": DECK, "link_top": LINK_TOP}},
    "yard": {"wall_u": [WALL_U0, WALL_U1], "gate_s_w": GATE_S, "gate_n_w": GATE_N, "wall_runs_w": WALL_RUNS, "hedge": HEDGE_BOX,
             "note": "the yard's paving and markings are drawn by the viewer (viewer/policeYard.js) on the city's own ground"},
    "estimated": "wing B's south face, both backs, wing A's north face and the link (no view: the counted rhythm), the levels (+-15 cm), "
                 "the window joinery's sections, the screens' positions (as seen in April 2024), the gate leaf's parked place, the hedge's "
                 "height, the flagpoles' exact places, the roof hatch",
    "landmarks": LANDMARKS,
}
json.dump(info, open(os.path.join(OUT, "police.json"), "w"), indent=1)
print(f"done {time.time() - T0:.1f}s")

# ------------------------------------------------------------------------------------------------ previews
if PREVIEWS:
    cols = {"brick_yellow": (0.62, 0.52, 0.36), "brick_red_brussels": (0.38, 0.17, 0.11), "concrete_white": (0.72, 0.71, 0.67),
            "stone_blue": (0.30, 0.31, 0.31), "painted_metal_white": (0.85, 0.85, 0.83), "alu_anthracite": (0.08, 0.09, 0.1),
            "glass_window": (0.05, 0.06, 0.08), "screen_fabric": (0.55, 0.48, 0.38), "roof_membrane": (0.12, 0.12, 0.13),
            "solar_panel": (0.03, 0.05, 0.1), "galvanised_steel": (0.55, 0.57, 0.58), "cast_iron_green": (0.05, 0.12, 0.07),
            "rubble_stone": (0.3, 0.28, 0.25), "hedge": (0.08, 0.18, 0.05), "signage": (0.05, 0.12, 0.45), "flag_fabric": (0.6, 0.5, 0.1)}
    for m in mats:
        nt = m.node_tree; bsdf = nt.nodes.get("Principled BSDF")
        if bsdf: bsdf.inputs["Base Color"].default_value = (*cols[m.name], 1); bsdf.inputs["Roughness"].default_value = 0.6
    far.hide_render = True
    if neigh_obj: neigh_obj.hide_render = False
    sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 4.0; so = bpy.data.objects.new("sun", sun); scn.collection.objects.link(so)
    so.rotation_euler = (math.radians(55), 0, math.radians(200))
    scn.world.use_nodes = True; scn.world.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    scn.world.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.65, 0.85, 1)
    scn.cycles.samples = 32
    scn.render.image_settings.color_mode = "RGB"
    pdir = os.path.join(ROOT, "docs", "police"); os.makedirs(pdir, exist_ok=True)
    def look(name, pos, tgt, lens=28, res=(1200, 800)):
        cam = bpy.data.cameras.new(name); cam.lens = lens; co = bpy.data.objects.new(name, cam); scn.collection.objects.link(co)
        co.location = pos; d = Vector(tgt) - Vector(pos); co.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        scn.camera = co; scn.render.resolution_x, scn.render.resolution_y = res
        scn.render.filepath = os.path.join(pdir, f"preview_{name}.png"); bpy.ops.render.render(write_still=True)
    look("street_north", P(32.0, -14.0, 48.6), P(12.0, -2.0, 52.5), lens=24)
    look("entrance", P(30.0, 16.0, 48.6), P(10.0, 2.0, 51.5), lens=24)
    look("aerial", P(45.0, 30.0, 85.0), P(5.0, -2.0, 55.0), lens=30)
    # GRAZING LIGHT (the no-bad-shading rule): a low sun skimming wing A's front (4 deg off its plane, 9 deg up), then the
    # step's entrance face; flat walls must stay flat, reveals / sills / the band / the cornice cast crisp shadows
    def sun_dir(d): so.rotation_euler = Vector(d).normalized().to_track_quat("-Z", "Y").to_euler()
    sun.energy = 5.0
    scn.world.node_tree.nodes["Background"].inputs[1].default_value = 0.25
    sun_dir((-0.07, 0.98, -0.16))
    look("grazing_front_windows", P(19.0, -9.0, 53.0), P(14.6, -4.0, 54.0), lens=30)
    look("grazing_cornice_corner", P(18.5, 3.5, 56.5), P(14.6, -1.0, 57.8), lens=28)
    sun_dir((-0.98, 0.17, -0.16))
    look("grazing_entrance", P(11.0, 6.5, 49.2), P(10.0, 0.5, 49.4), lens=24)
