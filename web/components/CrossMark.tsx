/**
 * Uyao brand mark v2 —— 幾何從 `public/brand/uyao-mark-v2-x-safe.svg` 的 kit
 * 直接搬進來（inline 免掉一次請求）：單筆 stroke 的 u/y 合體字形。
 *
 * 完整資產（lockup／反白／mono／favicon／X avatar PNG）在 `public/brand/`，
 * 幾何以 kit 為準：改這裡之前先改 kit，不要讓兩邊分岔。
 */
export function CrossMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      width={size}
      height={size}
      viewBox="18 10 166 166"
      className="flex-none"
    >
      <path
        d="M44 28v78c0 34 16 52 48 52 24 0 36-16 36-42v-12L98 64m30 40 30-40"
        fill="none"
        stroke="#0B7A3E"
        strokeWidth="32"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
