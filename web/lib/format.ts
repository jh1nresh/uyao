export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatPrice(twd: number): string {
  return `NT$${twd}`;
}

export function formatFromPrice(twd: number): string {
  return `NT$${twd} 起`;
}
