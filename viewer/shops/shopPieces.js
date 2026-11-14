// The shopfront kit's pieces, shared by the kit (viewer/shops/shopKit.js, main thread) and the layout
// (viewer/shops/shopLayout.js, in the street-life worker: no bare imports here). docs/assets/SHOPS.md.

/** the pieces, their LOD bands (m: switch to LOD1, end), stretch line (YS, m above the origin), shadow flag; single:
 *  LOD0 only to the end (tiny pieces: a second LOD would cost a draw for nothing) */
export const PIECES = {
  front_classic: { lod: [40, 420], ys: 1.6, shadow: true },
  riser_classic: { lod: [30, 260], ys: 99, shadow: false },
  front_modern: { lod: [40, 420], ys: 1.6, shadow: true },
  riser_modern: { lod: [160, 160], ys: 99, shadow: false, single: true },     // (120 tris: one LOD, one draw)
  door_classic: { lod: [25, 220], ys: 2.26, shadow: false },
  door_modern: { lod: [25, 220], ys: 2.26, shadow: false },
  mullion: { lod: [160, 160], ys: 1.6, shadow: false, single: true },          // (244 tris: one LOD, one draw)
  awning: { lod: [40, 360], ys: 99, shadow: true },
  blade: { lod: [25, 160], ys: 99, shadow: true },
  parasol_sq: { lod: [35, 320], ys: 99, shadow: true },
  table_sq: { lod: [20, 140], ys: 99, shadow: true },
  planter: { lod: [25, 200], ys: 99, shadow: true },
};
/** nominal width of the stretching pieces (tools/blender/shopfronts.py W0) */
export const W0 = 2.0;
/** the record each tile gives per piece: x y z yaw, dW dH ys stripes, r g b amount */
export const SHOP_STRIDE = 12;
