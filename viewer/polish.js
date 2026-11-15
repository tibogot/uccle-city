// VISUAL POLISH round 1 (docs/POLISH.md): every look change of the batch has its own ?key=old A/B, and ?polish1=old
// turns them all back at once (the city as it was before the batch).
const qs = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
const ALL_OLD = qs.get("polish1") === "old";
/** true = draw this item as before the polish batch (?key=old or ?polish1=old) */
export const polishOld = (key) => ALL_OLD || qs.get(key) === "old";
