/** 綠十字 brand 錨點 — 純 CSS，不用圖庫 icon。 */
export function CrossMark({ size = 26 }: { size?: number }) {
  return (
    <div
      aria-hidden
      className="flex flex-none items-center justify-center bg-green font-black leading-none text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.62) }}
    >
      十
    </div>
  );
}
