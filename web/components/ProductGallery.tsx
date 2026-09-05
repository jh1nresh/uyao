"use client";

import Image from "next/image";
import { useState } from "react";

/** The cabinet illustration opens with explicit mouse, touch or keyboard zoom. */
export function ProductGallery({ image, locale }: {
  image: { src: string; alt: string };
  locale: "zh" | "en";
}) {
  const [zoomOrigin, setZoomOrigin] = useState<{ x: number; y: number } | null>(null);
  return (
    <div className="min-w-0">
      <button
        type="button"
        aria-label={locale === "en" ? "Zoom product image" : "放大商品圖片"}
        aria-pressed={Boolean(zoomOrigin)}
        className={`relative block aspect-[3/2] w-full overflow-hidden border border-line bg-paper p-0 outline-offset-4 ${zoomOrigin ? "cursor-zoom-out" : "cursor-zoom-in"}`}
        onClick={() => setZoomOrigin((previous) => previous ? null : { x: 50, y: 50 })}
        onKeyDown={(event) => { if (event.key === "Escape") setZoomOrigin(null); }}
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse" || !zoomOrigin) return;
          const rect = event.currentTarget.getBoundingClientRect();
          setZoomOrigin({
            x: Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)),
            y: Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100)),
          });
        }}
      >
        <span className="absolute inset-0" style={zoomOrigin ? { transform: "scale(2.2)", transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%` } : undefined}>
          <Image src={image.src} alt={image.alt} fill sizes="(min-width: 900px) 50vw, 100vw" className="object-contain" priority />
        </span>
        <span aria-hidden className="pointer-events-none absolute bottom-3 right-3 border border-line bg-paper/95 px-2 py-1 text-xs text-forest">
          {zoomOrigin ? (locale === "en" ? "Click to reduce −" : "點圖縮小 −") : (locale === "en" ? "Click to enlarge +" : "點圖放大 +")}
        </span>
      </button>
    </div>
  );
}
