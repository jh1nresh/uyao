/**
 * 綠十字 brand 錨點 —— 純 SVG，不用圖庫 icon。
 *
 * 原本把「十」當文字排，有兩個問題：
 * 1. Noto Sans TC 的「十」是**字**不是十字 —— 橫畫有筆鋒且略微傾斜、豎畫收細，
 *    縮到 40px 以下就虛掉，撐不住 brand mark，更別說 16px 的 favicon。
 * 2. 依賴 webfont。字型是 display:swap，第一次載入時 mark 會先用系統字型畫一次
 *    再跳掉 —— logo 當場變形。
 *
 * 改成幾何後跟 `app/icon.svg` 是同一組比例，header 與分頁圖示長得一樣。
 * 橫畫刻意偏上（中心 42%）保留「十」的字感，同時讀得出藥局十字。
 */
export function CrossMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className="flex-none"
    >
      <rect width="32" height="32" fill="#0B7A3E" />
      <rect x="13.6" y="4" width="4.8" height="24" fill="#fff" />
      <rect x="4" y="11.2" width="24" height="4.8" fill="#fff" />
    </svg>
  );
}
