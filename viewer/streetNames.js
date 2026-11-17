// Street names across UrbIS and OSM, and the street-surface vote of viewer/surfaces.js (docs/SURFVOTE.md).
//
// UrbIS street surfaces carry one French name ("Rue Geleytsbeek"), stored double-encoded in the shipped tiles
// (UTF-8 bytes read as cp1252 by pipeline/build_surfaces.py: "LycÃ©e"); OSM names are bilingual, either order
// ("Avenue du Lycée Français - Franse Lyceumlaan", "Bemptstraat - Rue de Bempt"). The old vote compared them as
// they are and never matched, so every measured carriageway fell back to its class's base surface (asphalt).
// Plain functions, no three.js: imported by the tile worker and by tools/audit/surfvote.mjs.

/** Repairs UTF-8 read as Latin-1 / cp1252 ("ChaussÃ©e" -> "Chaussée"); any other string comes back as it is. */
export function fixMojibake(s) {
  if (!s || !/[ÃÂÅ]/.test(s)) return s;
  const bytes = [];
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    const b = c < 256 ? c : CP1252.get(c);
    if (b == null) return s;
    bytes.push(b);
  }
  try { return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes)); } catch { return s; }
}
const CP1252 = new Map([[0x20ac, 0x80], [0x201a, 0x82], [0x192, 0x83], [0x201e, 0x84], [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87],
  [0x2c6, 0x88], [0x2030, 0x89], [0x160, 0x8a], [0x2039, 0x8b], [0x152, 0x8c], [0x17d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97], [0x2dc, 0x98], [0x2122, 0x99], [0x161, 0x9a],
  [0x203a, 0x9b], [0x153, 0x9c], [0x17e, 0x9e], [0x178, 0x9f]]);

const ABBR = { av: "avenue", ave: "avenue", bd: "boulevard", bld: "boulevard", boul: "boulevard", r: "rue", pl: "place", sq: "square",
  chee: "chaussee", chau: "chaussee", st: "saint", ste: "sainte", dr: "dreve", sent: "sentier", imp: "impasse", all: "allee" };
/** street-type words and articles: dropped (and the rest sorted) for the loose key */
const TYPE = new Set(["rue", "avenue", "boulevard", "chaussee", "chemin", "place", "square", "dreve", "clos", "allee", "sentier",
  "venelle", "impasse", "parvis", "quai", "rond", "point", "cite", "jardin", "jardins", "parc", "promenade", "passage", "petite", "petit",
  "vieille", "vieux", "grande", "grand", "de", "du", "des", "la", "le", "les", "l", "d", "au", "aux", "et", "a", "en"]);

/** one name, normalised: repaired, no accents, lower case, punctuation and hyphens as spaces, abbreviations spelt out */
export function normName(s) {
  if (!s) return "";
  const t = fixMojibake(String(s)).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/[’‘'`´.,;:()"/-]/g, " ").replace(/\s+/g, " ").trim();
  return t.split(" ").map((w) => ABBR[w] || w).join(" ");
}
/** the loose key: the name's own words (no street type, no article), sorted ("Avenue de la Chênaie" -> "chenaie") */
export function looseKey(norm) {
  return norm.split(" ").filter((w) => w && !TYPE.has(w)).sort().join(" ");
}
/** an OSM name's sides: "Avenue du Lycée Français - Franse Lyceumlaan" -> both, normalised; also "A / B" */
export function osmSides(name) {
  if (!name) return [];
  return [...new Set(String(name).split(/\s+[-–\/]\s+/).map(normName).filter(Boolean))];
}

/** a surface's outer-ring box [x0, z0, x1, z1], cached on a WeakMap */
const BOXES = new WeakMap();
function boxOf(s) {
  let b = BOXES.get(s);
  if (!b) {
    b = [Infinity, Infinity, -Infinity, -Infinity];
    for (const p of s.rings?.[0] || []) { if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1]; if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1]; }
    BOXES.set(s, b);
  }
  return b;
}
/** even-odd point in rings ([[x, z], ...] outer + holes) */
function inRings(rings, x, z) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, zi] = ring[i], [xj, zj] = ring[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
  }
  return inside;
}

/**
 * The street-surface vote, new (docs/SURFVOTE.md): for each UrbIS street surface, the OSM surface of the roads of the
 * same street. Names match on either side of OSM's bilingual name after normalising (exact), else on the loose key when
 * it names one street only in the tile. Among the matching roads, those running INSIDE the surface vote by their length
 * there (a street that is setts at one end and asphalt at the other gets each end right); with none inside (the OSM
 * line beside the measured surface, or the surface a short spur), all of the street's roads in the tile vote by length.
 * @param {{surfaces: object[]}} surf   surfaces.json
 * @param {{roads: object[], nodes: object[]}} roads   roads.json as the worker has it (after the overrides)
 * @param {Record<string, number>} SURFACE   roadData.js SURFACE (OSM surface -> code; unknown / untagged = 0)
 * @param {{exact: object, loose: object} | null} [city]  data/roads/streetVote.json (tools/build_street_vote.mjs): the
 *        city-wide vote by street key, for a surface whose street has no road in this tile's cut (the surface runs on
 *        past the tile's road buffer): without it such a piece fell to asphalt at the tile seam
 * @returns {{ of: (s) => number | null, stats }}  of(s): the voted code for a surface, null = no street matched
 */
export function surfaceVote(surf, roads, SURFACE, city = null) {
  const N = new Map((roads.nodes || []).map((n) => [n.id, n]));
  // the roads by street key, each with its polyline and its surface code
  const exact = new Map(), loose = new Map(), named = [];
  const add = (m, k, v) => { if (!k) return; let a = m.get(k); if (!a) m.set(k, (a = [])); a.push(v); };
  for (const r of roads.roads) {
    const nm = r.meta?.name;
    if (!nm) continue;
    const a = N.get(r.a), b = N.get(r.b);
    const pts = [a, ...(r.pts || []), b].filter(Boolean).map((p) => [p.x, p.z]);
    const road = { r, pts, code: SURFACE[r.meta?.surface] ?? 0, street: osmSides(nm).join(" | ") };
    named.push(road);
    for (const side of osmSides(nm)) { add(exact, side, road); add(loose, looseKey(side), road); }
  }
  for (const [k, list] of loose) if (new Set(list.map((d) => d.street)).size > 1) loose.delete(k);   // ambiguous: no loose match
  const cache = new Map();
  const stats = { surfaces: 0, named: 0, exact: 0, loose: 0, spatial: 0, city: 0, unmatched: 0, filled: 0 };
  const of = (s) => {
    if (cache.has(s)) return cache.get(s);
    let res = null;
    stats.surfaces++;
    if (s.name) {
      stats.named++;
      const n = normName(s.name);
      let list = exact.get(n);
      if (list) stats.exact++;
      else if ((list = loose.get(looseKey(n)))) stats.loose++;
      if (list) {
        const uniq = [...new Set(list)];
        // length of each road inside the surface (2 m samples), else the street's length in the tile
        const bb = boxOf(s);
        const inside = new Map(), all = new Map();
        for (const d of uniq) {
          for (let i = 1; i < d.pts.length; i++) {
            const [x0, z0] = d.pts[i - 1], [x1, z1] = d.pts[i], L = Math.hypot(x1 - x0, z1 - z0);
            all.set(d.code, (all.get(d.code) || 0) + L);
            if (Math.max(x0, x1) < bb[0] || Math.min(x0, x1) > bb[2] || Math.max(z0, z1) < bb[1] || Math.min(z0, z1) > bb[3]) continue;
            const k = Math.max(1, Math.ceil(L / 2));
            for (let j = 0; j < k; j++) {
              const t = (j + 0.5) / k, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
              if (x < bb[0] || x > bb[2] || z < bb[1] || z > bb[3]) continue;
              if (inRings(s.rings, x, z)) inside.set(d.code, (inside.get(d.code) || 0) + L / k);
            }
          }
        }
        const pick = (m) => [...m].sort((p, q) => q[1] - p[1] || p[0] - q[0])[0]?.[0] ?? null;
        if (inside.size) { stats.spatial++; res = pick(inside); } else res = pick(all);
      } else if (city && (city.exact[n] ?? city.loose[looseKey(n)]) != null) { stats.city++; res = city.exact[n] ?? city.loose[looseKey(n)]; }
      else stats.unmatched++;
    }
    cache.set(s, res);
    return res;
  };
  /** OSM roads of a street with NO surface tag take the vote of the street's measured carriageways they run in (2 m
   *  samples, at least half their length inside), when that vote is not asphalt: the engine carriageway kept over a
   *  voted surface then draws the same paving, not a strip of asphalt between setts. Votes are taken from the roads'
   *  tags as they were (each road's code is read above), so the order of the calls does not matter. */
  const fillUntagged = () => {
    const byKey = new Map();
    for (const s of surf.surfaces) {
      if (!s.name || s.c > 3) continue;            // carriageway classes only (pipeline/build_surfaces.py CLASS 0-3)
      const n = normName(s.name);
      add(byKey, n, s); add(byKey, "~" + looseKey(n), s);
    }
    for (const d of named) {
      if (d.r.meta?.surface) continue;
      const sides = osmSides(d.r.meta.name);
      const cands = new Set(sides.flatMap((k) => byKey.get(k) || byKey.get("~" + looseKey(k)) || []));
      const codeOf = (s) => (s.surface != null ? (SURFACE[s.surface] ?? 0) : of(s));
      if (![...cands].some((s) => codeOf(s) > 0)) continue;      // the street's measured surfaces are all asphalt here
      const tally = new Map();
      let L = 0, inside = 0;
      for (let i = 1; i < d.pts.length; i++) {
        const [x0, z0] = d.pts[i - 1], [x1, z1] = d.pts[i], l = Math.hypot(x1 - x0, z1 - z0), k = Math.max(1, Math.ceil(l / 2));
        L += l;
        for (let j = 0; j < k; j++) {
          const x = x0 + ((x1 - x0) * (j + 0.5)) / k, z = z0 + ((z1 - z0) * (j + 0.5)) / k;
          for (const s of cands) {
            const b = boxOf(s);
            if (x < b[0] || x > b[2] || z < b[1] || z > b[3] || !inRings(s.rings, x, z)) continue;
            const c = codeOf(s);
            if (c != null) { tally.set(c, (tally.get(c) || 0) + l / k); inside += l / k; }
            break;
          }
        }
      }
      const best = [...tally].sort((p, q) => q[1] - p[1] || p[0] - q[0])[0];
      if (best && best[0] > 0 && inside >= 0.5 * L) { d.r.meta.surface = CODE_NAME[best[0]]; stats.filled++; }
    }
    return stats.filled;
  };
  return { of, fillUntagged, stats };
}
/** roadData.js SURFACE code -> the OSM value written on a filled road */
const CODE_NAME = { 1: "sett", 2: "paving_stones", 3: "cobblestone", 4: "gravel", 5: "paving_herringbone" };

/** The city-wide table (tools/build_street_vote.mjs -> data/roads/streetVote.json): street key -> the OSM surface code
 *  most of its length has, over the whole network; loose keys only where they name one street. */
export function streetTable(roads, SURFACE) {
  const N = new Map((roads.nodes || []).map((n) => [n.id, n]));
  const ex = new Map(), lo = new Map(), loStreets = new Map();
  const add = (m, k, code, L) => { let v = m.get(k); if (!v) m.set(k, (v = new Map())); v.set(code, (v.get(code) || 0) + L); };
  for (const r of roads.roads) {
    const nm = r.meta?.name;
    if (!nm) continue;
    const pts = [N.get(r.a), ...(r.pts || []), N.get(r.b)].filter(Boolean);
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    const code = SURFACE[r.meta?.surface] ?? 0, sides = osmSides(nm);
    for (const side of sides) {
      add(ex, side, code, L);
      const k = looseKey(side);
      if (!k) continue;
      add(lo, k, code, L);
      let s = loStreets.get(k); if (!s) loStreets.set(k, (s = new Set())); s.add(sides.join(" | "));
    }
  }
  const pick = (v) => [...v].sort((p, q) => q[1] - p[1] || p[0] - q[0])[0][0];
  return {
    exact: Object.fromEntries([...ex].map(([k, v]) => [k, pick(v)]).sort()),
    loose: Object.fromEntries([...lo].filter(([k]) => loStreets.get(k).size === 1).map(([k, v]) => [k, pick(v)]).sort()),
  };
}

/** the OLD vote (?surfvote=old): the raw names compared as they are; street name -> the code most of its roads have */
export function oldNameVote(roads, SURFACE) {
  const votes = new Map();
  for (const r of roads.roads) {
    const nm = r.meta?.name;
    if (!nm) continue;
    const code = SURFACE[r.meta?.surface] ?? 0;
    const v = votes.get(nm) || new Map();
    v.set(code, (v.get(code) || 0) + 1);
    votes.set(nm, v);
  }
  return new Map([...votes].map(([nm, v]) => [nm, [...v].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]]));
}
