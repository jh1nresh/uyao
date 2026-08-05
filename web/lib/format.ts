/**
 * 還沒補上座標的藥局距離是 null —— 回空字串，讓呼叫端自己決定要不要留位置。
 * 不要塞「0 m」或「—」進去，那會被讀成「就在旁邊」。
 */
export function formatDistance(meters: number | null): string {
  if (meters === null) return "";
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatPrice(twd: number): string {
  return `NT$${twd}`;
}

export function formatFromPrice(twd: number): string {
  return `NT$${twd} 起`;
}
