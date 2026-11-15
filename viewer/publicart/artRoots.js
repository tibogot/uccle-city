// The public art kit's scene roots (viewer/publicart/artCity.js): each one carries a "<root>_lod0" child the collider
// builder (viewer/heroColliders.js), the collision test and the contact audit read, like the landmarks'. Static (the
// lists are read before the kit loads); a root not in the scene (?art=old) is skipped.
/** where the kit replaces UrbIS solids that carried wall-mounted street plates (the street life layer placed them on the
 *  monoliths' boxes, now hidden): [x, z, r] circles; the street life worker drops wall plates inside them */
export const ART_CLEAR = /[?&]art=old(&|$)/.test(typeof location !== "undefined" ? location.search : "") ? [] : [[-2240.0, 376.0, 19.6]];
export const ART_ROOTS = ["art-monolithes", "art-evades", "art-gobert", "art-km5", "art-milestone0", "art-milestone1", "art-charlesquint1", "art-charlesquint2"];
