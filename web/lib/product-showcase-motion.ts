/**
 * 精選貨架的連續位移。
 *
 * 舊實作把拖曳寫成像素 CSS 變數（還乘 0.42），換格卻用 cqw 格子，
 * 放開時先把 drag-x 歸零再換 active —— 畫面會先跳回再滑過去。
 * 這裡用同一個「格」當單位：拖曳、慣性、就位都走同一條 position。
 */

/** 與 globals.css `--ease-brand` 相同。 */
export const SHOWCASE_EASE = [0.23, 1, 0.32, 1] as const;
export const SHOWCASE_DURATION_MS = 480;
/** 手機一步約 28% 容器寬，側邊那支才不會被 stage 的 overflow 切掉。 */
export const SHOWCASE_STEP_MOBILE = 28;
export const SHOWCASE_STEP_DESKTOP = 26;
/** 桌機只露左右各一支，五支並排會把最外側切成半盒。 */
export const SHOWCASE_SIDE_DESKTOP = 1;

const FLICK_SLOTS_PER_MS = 0.0022;
const COMMIT_DISTANCE = 0.18;

export function wrapIndex(value: number, count: number): number {
  if (count <= 0) return 0;
  return ((value % count) + count) % count;
}

/** 從連續 position 到指定品項的最短有號距離（可跨環）。 */
export function shortestSignedDistance(
  index: number,
  position: number,
  count: number,
): number {
  if (count <= 0) return 0;
  const p = wrapIndex(position, count);
  let d = index - p;
  if (d > count / 2) d -= count;
  if (d < -count / 2) d += count;
  return d;
}

/** 從目前連續位置走到目標 index 的最短終點（可不在 0…count 內）。 */
export function shortestTarget(
  position: number,
  targetIndex: number,
  count: number,
): number {
  if (count <= 0) return 0;
  const current = wrapIndex(position, count);
  const goal = wrapIndex(targetIndex, count);
  let delta = goal - current;
  if (delta > count / 2) delta -= count;
  if (delta < -count / 2) delta += count;
  return position + delta;
}

export function showcaseScale(distance: number): number {
  const a = Math.abs(distance);
  if (a <= 1) return 1 - 0.34 * a;
  if (a <= 2) return 0.66 - 0.18 * (a - 1);
  return Math.max(0.36, 0.48 - 0.08 * (a - 2));
}

export function showcaseOpacity(distance: number): number {
  const a = Math.abs(distance);
  if (a <= 1) return 1 - 0.1 * a;
  if (a <= 2) return 0.9 - 0.28 * (a - 1);
  return Math.max(0, 0.62 - 0.4 * (a - 2));
}

export function showcaseFilter(distance: number): string {
  const a = Math.abs(distance);
  if (a < 0.04) return "none";
  return `brightness(${(1 - Math.min(0.08, 0.04 * a)).toFixed(3)})`;
}

export function itemTransform(distance: number, step: number): string {
  return `translate3d(calc(-50% + ${distance * step}cqw), 0, 0) scale(${showcaseScale(distance)})`;
}

export function showcaseItemStyle(
  distance: number,
  step: number,
): {
  transformOrigin: "bottom center";
  transform: string;
  opacity: number;
  zIndex: number;
  filter: string;
} {
  return {
    transformOrigin: "bottom center",
    transform: itemTransform(distance, step),
    opacity: showcaseOpacity(distance),
    zIndex: Math.round(10 - Math.abs(distance)),
    filter: showcaseFilter(distance),
  };
}

/**
 * 一次手勢只換一格。velocity 是格／毫秒，正值表示往後一項（手指往左）。
 */
export function snapFromDrag(
  start: number,
  current: number,
  velocity: number,
): number {
  const origin = Math.round(start);
  const delta = current - start;
  if (velocity > FLICK_SLOTS_PER_MS || delta > COMMIT_DISTANCE) return origin + 1;
  if (velocity < -FLICK_SLOTS_PER_MS || delta < -COMMIT_DISTANCE) return origin - 1;
  return origin;
}

function sampleBezier(a: number, b: number, t: number): number {
  const u = 1 - t;
  return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
}

function sampleBezierDerivative(a: number, b: number, t: number): number {
  const u = 1 - t;
  return 3 * u * u * a + 6 * u * t * (b - a) + 3 * t * t * (1 - b);
}

/** `cubic-bezier(0.23, 1, 0.32, 1)` 在時間軸上的 y。 */
export function easeBrand(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const [x1, y1, x2, y2] = SHOWCASE_EASE;
  let guess = t;
  for (let i = 0; i < 8; i += 1) {
    const x = sampleBezier(x1, x2, guess);
    const dx = sampleBezierDerivative(x1, x2, guess);
    if (Math.abs(dx) < 1e-6) break;
    guess = Math.min(1, Math.max(0, guess - (x - t) / dx));
  }
  return sampleBezier(y1, y2, guess);
}
