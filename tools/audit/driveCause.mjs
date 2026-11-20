// The drive check's census by CAUSE (tools/audit/driveCheck.mjs, docs/DRIVECHECK.md "Census by cause"), one definition:
//   a  the lane / centre line / OSM band runs through something real: a drawn building; a garden piece where no roadway
//      is measured, or beside an alley whose path also runs into buildings (within 15 m: Carre Cassimans)
//   b  the collider's generator is wrong: a LiDAR trunk on the carriageway; a garden piece reaching into a MEASURED roadway
//   c  a real obstacle where it stands: UrbIS-measured bollards on the roadway (the path should not use it)
//   d  the drive surface under the collider (a cliff, a deck's level)
export const CAUSES = { a: "lane / band data through something real", b: "collider generator wrong", c: "real obstacle on the carriageway", d: "drive surface defect" };
export function causeOf(p, places) {
  const k = p.src.split(" ")[0];
  if (k === "hero" || k === "wall") return "d";
  if (k === "building") return "a";
  if (k === "tree") return "b";
  if (k === "post") return "c";
  if (k === "garden") {
    if (!p.meas) return "a";
    const alley = places.some((q) => q !== p && q.tile === p.tile && q.src.startsWith("building") && Math.hypot(q.x - p.x, q.z - p.z) < 15);
    return alley ? "a" : "b";
  }
  return "?";
}
