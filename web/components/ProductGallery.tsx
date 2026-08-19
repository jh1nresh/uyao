"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export interface GalleryImage {
  src: string;
  alt: string;
  /** 縮圖下方的短標，例如「包裝照」「產品特色」；電商圖不只一張時才分得出來 */
  label: string;
}

/**
 * 品項圖廊：左側直式縮圖列 + 右側主圖，手機改成主圖 + 下方橫向縮圖列。
 *
 * 站上不做交易，所以這裡刻意沒有價格、購物車與「立即購買」—— 圖廊是用來
 * 看清楚商品，不是結帳漏斗。
 *
 * 主圖用 object-contain：包裝實拍是 4:5、電商說明圖是 1:1，塞進同一個方框
 * 若用 cover 會把說明圖的文字裁掉。
 */
export function ProductGallery({
  images,
  locale,
}: {
  images: readonly GalleryImage[];
  locale: "zh" | "en";
}) {
  const [active, setActive] = useState(0);
  // 放大鏡：滑鼠移入以游標為中心放大（transform-origin 用百分比），
  // 觸控裝置改成點一下放大、再點一下還原。null = 未放大。
  const [zoomOrigin, setZoomOrigin] = useState<{ x: number; y: number } | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

  if (images.length === 0) return null;
  const current = images[active] ?? images[0];

  function originFromEvent(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  }

  /** 方向鍵在縮圖列上換圖，換完把焦點帶到新的按鈕，不然鍵盤使用者會迷路。 */
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
    const back = event.key === "ArrowUp" || event.key === "ArrowLeft";
    if (!forward && !back) return;
    event.preventDefault();
    const next = forward
      ? (active + 1) % images.length
      : (active - 1 + images.length) % images.length;
    setActive(next);
    setZoomOrigin(null);
    railRef.current
      ?.querySelectorAll<HTMLButtonElement>("button")
      [next]?.focus();
  }

  const single = images.length === 1;

  return (
    <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-start">
      {/* 不給實色底：圖是透明去背的，直接吃頁面底色，淺色與深色主題都對。 */}
      <div className="min-w-0 flex-1 border border-line">
        <div
          className={`relative aspect-square overflow-hidden ${zoomOrigin ? "cursor-zoom-out" : "cursor-zoom-in"}`}
          onPointerMove={(event) => {
            // 滑鼠 hover 即放大並跟著游標平移；觸控的 move 不動作，避免捲頁時誤觸。
            if (event.pointerType === "mouse") setZoomOrigin(originFromEvent(event));
          }}
          onPointerLeave={() => setZoomOrigin(null)}
          onPointerUp={(event) => {
            if (event.pointerType !== "mouse") {
              setZoomOrigin((prev) => (prev ? null : originFromEvent(event)));
            }
          }}
        >
          <div
            className="absolute inset-0"
            style={
              zoomOrigin
                ? {
                    transform: "scale(2.2)",
                    transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                  }
                : undefined
            }
          >
            <Image
              key={current.src}
              src={current.src}
              alt={current.alt}
              fill
              sizes="(min-width: 1024px) 460px, (min-width: 640px) 55vw, 100vw"
              className="object-contain"
              priority
            />
          </div>
          {/* 說明圖上的小字縮在 460px 內看不清，提示可以放大；放大中就讓位給圖。 */}
          {!zoomOrigin && (
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-2 right-2 border border-line bg-paper/90 px-2 py-0.5 text-[11px] text-muted-2"
            >
              {locale === "en" ? "Hover or tap to zoom" : "移入或點圖放大"}
            </span>
          )}
        </div>
      </div>

      {!single && (
        <div
          ref={railRef}
          role="tablist"
          aria-label={locale === "en" ? "Product images" : "商品圖片"}
          aria-orientation="vertical"
          onKeyDown={onKeyDown}
          className="flex shrink-0 gap-2 overflow-x-auto sm:w-[76px] sm:flex-col sm:overflow-x-visible"
        >
          {images.map((image, i) => (
            <button
              key={image.src}
              type="button"
              role="tab"
              aria-selected={i === active}
              // roving tabindex：整列只有一個 tab stop，其餘用方向鍵走
              tabIndex={i === active ? 0 : -1}
              onClick={() => {
                setActive(i);
                setZoomOrigin(null);
              }}
              title={image.label}
              className={`relative aspect-square w-[76px] shrink-0 overflow-hidden border bg-paper outline-offset-2 sm:w-full ${
                i === active ? "border-forest" : "border-line hover:border-line-strong"
              }`}
            >
              {/* 說明圖是白底大量留白，縮到 76px 用 contain 幾乎只剩白；
                  改成填滿縮圖框，內容才看得到。包裝照是去背的，填滿也不會失真。 */}
              <Image
                src={image.src}
                alt=""
                fill
                sizes="84px"
                className="object-cover"
              />
              <span className="sr-only">{image.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
