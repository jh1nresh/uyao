"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export interface GalleryImage {
  src: string;
  alt: string;
  label: string;
}

/** A stable picture window with separately labelled illustration and source photos. */
export function ProductGallery({ images, locale }: {
  images: readonly GalleryImage[];
  locale: "zh" | "en";
}) {
  const [active, setActive] = useState(0);
  const [zoomOrigin, setZoomOrigin] = useState<{ x: number; y: number } | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  if (images.length === 0) return null;
  const current = images[active] ?? images[0];

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
    const back = event.key === "ArrowUp" || event.key === "ArrowLeft";
    if (!forward && !back) return;
    event.preventDefault();
    const next = (active + (forward ? 1 : -1) + images.length) % images.length;
    setActive(next);
    setZoomOrigin(null);
    railRef.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }

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
          <Image key={current.src} src={current.src} alt={current.alt} fill sizes="(min-width: 900px) 50vw, 100vw" className="object-contain" priority />
        </span>
        <span aria-hidden className="pointer-events-none absolute bottom-3 right-3 border border-line bg-paper/95 px-2 py-1 text-xs text-forest">
          {zoomOrigin ? (locale === "en" ? "Click to reduce −" : "點圖縮小 −") : (locale === "en" ? "Click to enlarge +" : "點圖放大 +")}
        </span>
      </button>
      <p className="mb-0 mt-3 flex justify-between gap-4 text-xs text-muted-2"><span>{current.label}</span><span>{active + 1} / {images.length}</span></p>
      {images.length > 1 && (
        <div ref={railRef} role="group" aria-label={locale === "en" ? "Product images" : "商品圖片"} onKeyDown={onKeyDown} className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {images.map((image, i) => (
            <button key={image.src} type="button" aria-pressed={i === active} tabIndex={i === active ? 0 : -1}
              onClick={() => { setActive(i); setZoomOrigin(null); }}
              className={`w-[86px] shrink-0 border-0 border-b-2 bg-transparent p-0 pb-2 text-xs outline-offset-2 ${i === active ? "border-forest text-forest" : "border-transparent text-muted-2 hover:border-line"}`}>
              <span className="relative mb-2 block aspect-[3/2] border border-line bg-paper"><Image src={image.src} alt="" fill sizes="86px" className="object-contain" /></span>
              {image.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
