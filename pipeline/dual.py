"""Collapse OSM dual carriageways into one two-way road with a median (used by build_roads.py).

OSM maps an avenue with a central reservation as two one-way ways, one per direction. Every
cross street then makes two junctions 10-30 m apart, which the road engine cannot fit
("road-swallowed"), and a roundabout gets two arms per avenue ("ring-crowded"). This pass
replaces each paired stretch with ONE two-way way:

- Pairing: one-way car ways with the same `name` are linked into directed chains (in travel
  direction). Chain B pairs with chain A where a node of A lies PAIR_MIN..PAIR_MAX m from B and
  B runs the opposite way (direction dot < -0.7), or the node is on B too (where the two
  carriageways diverge), over at least MIN_RUN m of A. Short pairs are the flares around a
  traffic island at a junction; long ones are true dual carriageways.
- Centreline: A's nodes in the run, each moved to the midpoint between itself and its
  projection on B. B's nodes that other streets use are inserted at their projected station.
  Centreline nodes closer than SNAP m merge (the run ends win, then the smaller OSM id), so a
  cross street that met both carriageways now meets one node.
- The new way has id "<wayA>d<wayB>" (road ids r<wayA>d<wayB>_<k>). It is tagged like A without
  oneway, plus "__type", "__lanes" (A's lanes on the right, B's on the left, a median sized
  from the measured gap) and "__dual" (meta).
- The carriageways keep their parts outside the run. At each end of the run, the end node
  joins A's and B's remainders to the centreline: a `split` node (returned in `splits`). If
  both remainders reach the same roundabout within RING_REACH m, they are dropped and the end
  node joins the ring (returned in `ring_join`), so the avenue enters it as one arm.
- A run shorter than SHORT_SPLIT m with a split end is skipped: it is the narrow tip of an
  island wider than PAIR_MAX (an "eye"), and the two carriageways are kept.

Node ids stay OSM node ids; positions move to the centreline.
"""
from __future__ import annotations

import math
from collections import defaultdict

PAIR_MIN, PAIR_MAX = 4.0, 35.0
MIN_RUN = 12.0
SNAP = 6.0
RING_REACH = 70.0
SHORT_SPLIT = 40.0   # a run shorter than this that ends in a split is the tip of a wider island: skipped


def _proj(px, pz, pts):
    """Nearest point on polyline pts: (distance, station, qx, qz, unit direction) or None."""
    best, s0 = None, 0.0
    for k in range(len(pts) - 1):
        (ax, az), (bx, bz) = pts[k], pts[k + 1]
        dx, dz = bx - ax, bz - az
        L = math.hypot(dx, dz)
        if L < 1e-6:
            continue
        t = max(0.0, min(1.0, ((px - ax) * dx + (pz - az) * dz) / (L * L)))
        qx, qz = ax + dx * t, az + dz * t
        d = math.hypot(px - qx, pz - qz)
        if best is None or d < best[0]:
            best = (d, s0 + t * L, qx, qz, (dx / L, dz / L))
        s0 += L
    return best


def _cum(pts):
    out = [0.0]
    for k in range(1, len(pts)):
        out.append(out[-1] + math.dist(pts[k - 1], pts[k]))
    return out


def _chains(ways, cand, wcount):
    """Directed chains of same-name one-way ways: [{name, seq, parts:[(wid, i0, i1)]}].

    Ways are linked only through a node no other way uses (wcount == 2): at a junction with the
    two-way road, an exit flare and an entry flare must not become one U-shaped chain."""
    by_name = defaultdict(list)
    for wid in cand:
        by_name[ways[wid]["_name"]].append(wid)
    chains = []
    for name, wids in by_name.items():
        starts, ends = defaultdict(list), defaultdict(list)
        for w in wids:
            starts[ways[w]["_seq"][0]].append(w)
            ends[ways[w]["_seq"][-1]].append(w)
        used = set()
        for w in wids:
            if w in used:
                continue
            head, seen = w, {w}
            while True:
                p = ends[ways[head]["_seq"][0]]
                if len(p) != 1 or p[0] in seen or p[0] in used or wcount[ways[head]["_seq"][0]] != 2:
                    break
                head = p[0]
                seen.add(head)
            seq, parts, cur = [], [], head
            while cur is not None and cur not in used:
                used.add(cur)
                s = ways[cur]["_seq"]
                i0 = len(seq) - 1 if seq else 0
                seq = seq + s[1:] if seq else list(s)
                parts.append((cur, i0, len(seq) - 1))
                nxt = starts[s[-1]]
                cur = nxt[0] if len(nxt) == 1 and wcount[s[-1]] == 2 else None
            if len(seq) >= 2 and len(set(seq)) == len(seq):
                chains.append({"name": name, "seq": seq, "parts": parts})
    return chains


def _owner(chain, idx):
    """Way id that owns segment idx -> idx+1 of the chain."""
    for wid, i0, i1 in chain["parts"]:
        if i0 <= idx < i1:
            return wid
    return chain["parts"][-1][0]


def _ring_reach(rem, nodes, ring_of):
    """Index in rem of the first roundabout node within RING_REACH m, or None."""
    d = 0.0
    for i, n in enumerate(rem):
        if n in ring_of:
            return i
        if i:
            p, q = nodes[rem[i - 1]], nodes[n]
            d += math.hypot(p["x"] - q["x"], p["z"] - q["z"])
        if d > RING_REACH:
            return None
    return None


def collapse(ways, nodes, ring_of, oneway_dir, lane_stack, highway_type, skip_pairs=()):
    """Mutates `ways` and `nodes`. Returns (splits, ring_join, report).

    skip_pairs: {frozenset({wayA, wayB})} never collapsed (pipeline/overrides.json dual.skipWays)."""
    skip = {frozenset(map(int, p)) for p in skip_pairs}
    cand = []
    for wid, w in ways.items():
        t = w["tags"]
        ow = oneway_dir(t)
        if not ow or not t.get("name") or t.get("junction") in ("roundabout", "circular"):
            continue
        seq = [n for n in w["nodes"] if n in nodes]
        if ow < 0:
            seq = seq[::-1]
        if len(seq) >= 2:
            w["_seq"], w["_name"] = seq, t["name"]
            cand.append(wid)
    wcount = defaultdict(int)
    for w in ways.values():
        for n in set(w["nodes"]):
            wcount[n] += 1
    chains = _chains(ways, cand, wcount)
    for c in chains:
        c["pts"] = [(nodes[n]["x"], nodes[n]["z"]) for n in c["seq"]]
        c["cum"] = _cum(c["pts"])
        c["tags"] = {wid: ways[wid]["tags"] for wid, _, _ in c["parts"]}
        c["consumed"] = []
    # how many ways use each node, not counting the chains of the same name
    use = defaultdict(set)
    for wid, w in ways.items():
        for n in w["nodes"]:
            use[n].add(w.get("_name") if wid in cand else wid)

    def is_junction(nid, name):
        return any(u != name for u in use[nid])

    overlap = lambda rngs, lo, hi: any(a <= hi and lo <= b for a, b in rngs)
    remap, new_ways, splits, ring_join, report = {}, {}, set(), {}, []
    by_name = defaultdict(list)
    for c in chains:
        by_name[c["name"]].append(c)
    for name, cs in by_name.items():
        for A in cs:
            for B in cs:
                if A is B:
                    continue
                flags = []
                bset = set(B["seq"])
                for i, (px, pz) in enumerate(A["pts"]):
                    i2 = min(i, len(A["pts"]) - 2)
                    (ax, az), (bx, bz) = A["pts"][i2], A["pts"][i2 + 1]
                    L = math.hypot(bx - ax, bz - az) or 1.0
                    pr = _proj(px, pz, B["pts"])
                    if A["seq"][i] in bset:      # a node both carriageways share: where they diverge / meet
                        q = B["seq"].index(A["seq"][i])
                        flags.append((0.0, B["cum"][q], px, pz, (0.0, 0.0)))
                        continue
                    ok = pr is not None and PAIR_MIN <= pr[0] <= PAIR_MAX and \
                        ((bx - ax) * pr[4][0] + (bz - az) * pr[4][1]) / L < -0.7
                    flags.append(pr if ok else None)
                i = 0
                while i < len(flags):
                    if flags[i] is None:
                        i += 1
                        continue
                    j = i
                    while j + 1 < len(flags) and flags[j + 1] is not None:
                        j += 1
                    if A["cum"][j] - A["cum"][i] >= MIN_RUN and not overlap(A["consumed"], i, j):
                        _make(A, B, i, j, flags, nodes, ring_of, is_junction, remap, new_ways, splits, ring_join, report,
                              lane_stack, highway_type, overlap, skip)
                    i = j + 1
    if not report:
        return splits, ring_join, report

    # carriageways: replace their ways by the parts outside the consumed ranges
    for c in chains:
        if not c["consumed"]:
            continue
        for wid, _, _ in c["parts"]:
            ways.pop(wid, None)
        cur, q = 0, 0
        for lo, hi in sorted(c["consumed"]) + [(len(c["seq"]) - 1, len(c["seq"]) - 1)]:
            if lo > cur:
                owner = _owner(c, cur)
                tags = dict(c["tags"][owner])
                if tags.get("oneway") in ("-1", "reverse"):
                    tags["oneway"] = "yes"     # the sequence is already in travel direction
                new_ways[f"{owner}r{q}"] = {"nodes": c["seq"][cur:lo + 1], "tags": tags}
                q += 1
            cur = max(cur, hi)
    ways.update(new_ways)
    # remap node references onto the centreline; cut out the loops this makes (median crossings)
    for wid in list(ways):
        out = []
        for nid in (remap.get(n, n) for n in ways[wid]["nodes"]):
            if out and out[-1] == nid:
                continue
            if nid in out:
                out = out[: out.index(nid) + 1]
                continue
            out.append(nid)
        if len(out) < 2:
            del ways[wid]
        else:
            ways[wid]["nodes"] = out
    for r in report:
        r.pop("_A", None)
    return splits, ring_join, report


def _make(A, B, i, j, flags, nodes, ring_of, is_junction, remap, new_ways, splits, ring_join, report,
          lane_stack, highway_type, overlap, skip=frozenset()):
    # B runs the other way: A's run START is beside B's later stations, A's run END beside the earlier ones
    near = lambda s: min(range(len(B["cum"])), key=lambda q: abs(B["cum"][q] - s))
    b_in, b_out = near(flags[j][1]), near(flags[i][1])     # B enters the shared stretch at b_in, leaves at b_out
    if b_in >= b_out or overlap(B["consumed"], b_in, b_out):
        return
    if frozenset((_owner(A, i), _owner(B, b_in))) in skip or frozenset((_owner(A, j - 1 if j else 0), _owner(B, b_out - 1))) in skip:
        return
    start, end = A["seq"][i], A["seq"][j]
    name = A["name"]

    cl, gaps = [], []
    for q in range(i, j + 1):
        nid = A["seq"][q]
        d, _, qx, qz, _ = flags[q]
        gaps.append(d)
        cl.append([A["cum"][q], nid, (nodes[nid]["x"] + qx) / 2, (nodes[nid]["z"] + qz) / 2])
    apts = A["pts"][i:j + 1]
    for q in range(b_in + 1, b_out):
        nid = B["seq"][q]
        if not is_junction(nid, name):
            continue
        pr = _proj(nodes[nid]["x"], nodes[nid]["z"], apts)
        cl.append([A["cum"][i] + pr[1], nid, (nodes[nid]["x"] + pr[2]) / 2, (nodes[nid]["z"] + pr[3]) / 2])
    cl.sort()
    merged, snapped = [], {}
    for st, nid, x, z in cl:
        if merged and st - merged[-1][0] < SNAP:
            last = merged[-1]
            ends = {start, end}
            if last[1] in ends and nid in ends:
                merged.append([st, nid, x, z])       # never merge the two run ends
                continue
            keep = last[1] if last[1] in ends else nid if nid in ends else min(last[1], nid)
            gone = nid if keep == last[1] else last[1]
            snapped[gone] = keep
            pos = (last[2], last[3]) if last[1] in ends else (x, z) if nid in ends else ((last[2] + x) / 2, (last[3] + z) / 2)
            merged[-1] = [last[0], keep, pos[0], pos[1]]
            continue
        merged.append([st, nid, x, z])
    seq = [m[1] for m in merged]
    if len(seq) < 2 or seq[0] != start or seq[-1] != end:
        return
    # end kinds, decided before anything changes
    plan = []
    for end_node, a_rem, b_rem, at_start in ((start, A["seq"][:i + 1][::-1], B["seq"][b_out:], True),
                                             (end, A["seq"][j:], B["seq"][:b_in + 1][::-1], False)):
        ia, ib = _ring_reach(a_rem, nodes, ring_of), _ring_reach(b_rem, nodes, ring_of)
        if ia is not None and ib is not None and ring_of[a_rem[ia]] == ring_of[b_rem[ib]]:
            plan.append(("ring", end_node, at_start, ia, ib, ring_of[a_rem[ia]]))
        elif len(a_rem) >= 2 and len(b_rem) >= 2:
            plan.append(("split", end_node, at_start, None, None, None))
        else:
            plan.append(("join", end_node, at_start, None, None, None))
    if A["cum"][j] - A["cum"][i] < SHORT_SPLIT and any(p[0] == "split" for p in plan):
        return       # the narrow tip of a wider island: keep the two carriageways
    remap.update(snapped)
    for _, nid, x, z in merged:
        nodes[nid] = {**nodes[nid], "x": x, "z": z}
    remap[B["seq"][b_out]] = start
    remap[B["seq"][b_in]] = end
    A["consumed"].append((i, j))
    B["consumed"].append((b_in, b_out))

    # lane stack: A's travel side on the right, B's on the left, median between
    wa, wb = _owner(A, i), _owner(B, b_in)
    ta, tb = A["tags"][wa], B["tags"][wb]
    hw = highway_type.get(ta.get("highway"), "local")
    rtype = hw if hw in ("avenue", "collector") else "local"
    st_type = rtype if rtype != "local" else "oneWay"
    sa = lane_stack(st_type, ta, True, False) or {}
    sb = lane_stack(st_type, tb, True, False) or {}
    fallback = [{"type": "driving", "width": 3.2}, {"type": "sidewalk", "width": 2.5}]
    right, left = sa.get("right") or fallback, sb.get("right") or fallback
    drive_a = sum(l["width"] for l in right if l["type"] == "driving")
    drive_b = sum(l["width"] for l in left if l["type"] == "driving")
    gaps = sorted(g for g in gaps if g > 0) or [0.0]
    gap = gaps[len(gaps) // 2]
    median = max(0.0, gap - drive_a / 2 - drive_b / 2)
    kind = "raised" if median >= 1.5 else "painted" if median >= 0.5 else "line"
    tags = {k: v for k, v in ta.items() if k not in ("oneway", "lanes", "lanes:forward", "lanes:backward")}
    tags["__type"] = rtype
    tags["__lanes"] = {"center": {"width": round(median, 2) if kind != "line" else 0, "kind": kind}, "left": left, "right": right}
    tags["__dual"] = {"ways": [wa, wb], "gapM": round(gap, 2), "medianM": round(median, 2)}
    wid = f"{wa}d{wb}"
    new_ways[wid] = {"nodes": seq, "tags": tags}

    ends_kind = []
    for kind_, end_node, at_start, ia, ib, ring in plan:
        if kind_ == "ring":
            ring_join[end_node] = ring
            if at_start:
                A["consumed"].append((i - ia, i))
                B["consumed"].append((b_out, b_out + ib))
            else:
                A["consumed"].append((j, j + ia))
                B["consumed"].append((b_in - ib, b_in))
        elif kind_ == "split":
            splits.add(end_node)               # both carriageways carry on past this node
        ends_kind.append(kind_)                # "join": the pair ends at a junction, now one node
    report.append({"way": wid, "name": name, "lengthM": round(A["cum"][j] - A["cum"][i], 1), "gapM": round(gap, 2),
                   "medianM": round(median, 2), "median": kind, "nodes": len(seq), "ends": ends_kind})
