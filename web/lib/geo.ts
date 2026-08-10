import type { AreaSlug, Store } from "./types";
import { AREAS } from "./data";

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * 各區中心點 —— 必須與 `src/pharmabox/seed.py` 的 AREA_CENTER 一致。
 * seed 用它算出靜態的「距區中心」距離，這裡用來判斷使用者離服務區多遠。
 */
export const AREA_CENTER: Record<AreaSlug, LatLng> = {
  datong: { lat: 25.0633, lng: 121.513 },
  linkou: { lat: 25.0772, lng: 121.3916 },
  xinzhuang: { lat: 25.0359, lng: 121.4322 },
  zhongshan: { lat: 25.0637, lng: 121.5265 },
  xinyi: { lat: 25.033, lng: 121.5654 },
};

const EARTH_RADIUS_M = 6371000;

export function haversineM(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h)));
}

/**
 * 有定位就回真實距離，沒有就退回 seed 算好的「距區中心」。
 * 沒座標的藥局兩種情況都回 null —— 不猜。
 */
export function distanceFor(store: Store, from: LatLng | null): number | null {
  if (from && store.lat !== null && store.lng !== null) {
    return haversineM(from, { lat: store.lat, lng: store.lng });
  }
  return store.distanceM;
}

/** 排序用：沒距離的排最後，不要讓 null 混進數值比較。 */
export function byDistance(from: LatLng | null) {
  return (a: Store, b: Store) =>
    (distanceFor(a, from) ?? Infinity) - (distanceFor(b, from) ?? Infinity);
}

/** 使用者離這一區有多遠 —— 太遠就該提醒他這區不是他的生活圈。 */
export function distanceToArea(area: AreaSlug, from: LatLng): number {
  return haversineM(from, AREA_CENTER[area]);
}

/** GPS 只負責選最近的已開放服務區；店家排序仍需要每家店自己的座標。 */
export function nearestServiceArea(from: LatLng): AreaSlug {
  return AREAS
    .map((area) => ({ area: area.slug, distance: distanceToArea(area.slug, from) }))
    .sort((a, b) => a.distance - b.distance)[0].area;
}
