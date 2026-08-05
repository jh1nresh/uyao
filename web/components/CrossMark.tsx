/**
 * Uyao brand mark —— 幾何從 designs/uyao-logo 的 kit 直接搬進來（inline
 * 免掉一次請求）。方形 U 入口 + 上升掃描訊號 + Y 形負空間；
 * 不再用綠十字 —— 那是「藥局」這個品類的符號，不是這個品牌的。
 *
 * 完整資產（lockup／反白／mono／favicon PNG）在 `public/brand/`，
 * 幾何以 kit 為準：改這裡之前先改 kit，不要讓兩邊分岔。
 */
export function CrossMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 192 192"
      className="flex-none"
    >
      <path fill="#0B7A3E" d="M24 24h40v64q0 8 7 15l25 25v40H24V24Z" />
      <path fill="#0B7A3E" d="m112 128 32-32h24v72h-56v-40Z" />
      <path fill="#0B7A3E" d="m100 100 48-48 16 16-48 48-16-16Z" />
    </svg>
  );
}
