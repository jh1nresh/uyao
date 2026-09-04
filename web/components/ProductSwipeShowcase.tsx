"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { useLocale } from "./LocaleProvider";
import { drugCopy } from "@/lib/i18n";
import { known } from "@/lib/pending";
import type { ShowcaseItem } from "@/lib/product-showcase";
import {
  SHOWCASE_DURATION_MS,
  SHOWCASE_SIDE_DESKTOP,
  SHOWCASE_STEP_DESKTOP,
  SHOWCASE_STEP_MOBILE,
  easeBrand,
  shortestSignedDistance,
  shortestTarget,
  showcaseItemStyle,
  snapFromDrag,
  wrapIndex,
} from "@/lib/product-showcase-motion";

/**
 * 品項橫向展示：用完整包裝實拍，不要整幅櫃景、也不貼回木板。
 * 左右滑動換主角，中央那一支放大，側邊縮小 —— 連續的貨架滑動，而不是
 * 「像素拖一段、放開再跳一格」。一次只露三支，避免側邊被切成半盒。
 *
 * 互動三條路都通：觸控／滑鼠拖曳、鍵盤方向鍵、下方左右箭頭。
 */

export type { ShowcaseItem } from "@/lib/product-showcase";

const SIDE_DESKTOP = SHOWCASE_SIDE_DESKTOP;
const DRAG_CLICK_PX = 8;

export function ProductSwipeShowcase({
  items,
  eyebrow,
  title,
  hrefPrefix,
  hrefQuery = "",
}: {
  items: readonly ShowcaseItem[];
  eyebrow?: string;
  title?: string;
  /**
   * 主角連結的前綴，例如 `/zh-tw/drug`。給字串而不是函式 —— Server
   * Component 不能把函式傳進 Client Component。沒給就只展示不導流。
   */
  hrefPrefix?: string;
  /** 保留首頁選定的地區等查詢條件。 */
  hrefQuery?: string;
}) {
  const locale = useLocale();
  const [active, setActive] = useState(0);
  // SSR 採手機優先，避免 hydration 前把桌機五支擠進窄螢幕。
  const [side, setSide] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const positionRef = useRef(0);
  const dragStartX = useRef<number | null>(null);
  const dragOrigin = useRef(0);
  const velocityRef = useRef(0);
  const lastMove = useRef({ x: 0, t: 0 });
  const didDragRef = useRef(false);
  const animRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const sideRef = useRef(side);
  const pillRailRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const count = items.length;
  const step = side === 1 ? SHOWCASE_STEP_MOBILE : SHOWCASE_STEP_DESKTOP;
  sideRef.current = side;

  const applyLayout = useCallback(
    (position: number) => {
      const currentStep = sideRef.current === 1 ? SHOWCASE_STEP_MOBILE : SHOWCASE_STEP_DESKTOP;
      const currentSide = sideRef.current;
      for (let i = 0; i < count; i += 1) {
        const el = itemRefs.current[i];
        if (!el) continue;
        const distance = shortestSignedDistance(i, position, count);
        const style = showcaseItemStyle(distance, currentStep);
        el.style.transformOrigin = style.transformOrigin;
        el.style.transform = style.transform;
        el.style.opacity = String(style.opacity);
        el.style.zIndex = String(style.zIndex);
        el.style.filter = style.filter;
        const isHero = Math.abs(distance) < 0.5;
        el.dataset.active = isActiveAttr(isHero);
        el.setAttribute("aria-hidden", isHero ? "false" : "true");
        el.style.pointerEvents = Math.abs(distance) <= currentSide + 0.2 ? "auto" : "none";
        el.style.visibility = Math.abs(distance) > currentSide + 0.9 ? "hidden" : "visible";
      }
    },
    [count],
  );

  const stopAnimation = useCallback(() => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  const settleActive = useCallback(
    (position: number) => {
      const next = wrapIndex(Math.round(position), count);
      positionRef.current = next;
      applyLayout(next);
      setActive((prev) => (prev === next ? prev : next));
    },
    [applyLayout, count],
  );

  const animateTo = useCallback(
    (target: number) => {
      stopAnimation();
      const start = positionRef.current;
      if (Math.abs(target - start) < 0.001) {
        settleActive(target);
        return;
      }
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        settleActive(target);
        return;
      }
      const started = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - started) / SHOWCASE_DURATION_MS);
        const next = start + (target - start) * easeBrand(t);
        positionRef.current = next;
        applyLayout(next);
        if (t < 1) {
          animRef.current = requestAnimationFrame(tick);
          return;
        }
        animRef.current = null;
        settleActive(target);
      };
      animRef.current = requestAnimationFrame(tick);
    },
    [applyLayout, settleActive, stopAnimation],
  );

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      animateTo(shortestTarget(positionRef.current, next, count));
    },
    [animateTo, count],
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setSide(mq.matches ? SIDE_DESKTOP : 1);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useLayoutEffect(() => {
    applyLayout(positionRef.current);
  });

  useEffect(() => () => stopAnimation(), [stopAnimation]);

  useEffect(() => {
    const rail = pillRailRef.current;
    const pill = pillRefs.current[active];
    if (!rail || !pill) return;
    rail.scrollTo({
      left: pill.offsetLeft - (rail.clientWidth - pill.clientWidth) / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [active]);

  function slotWidthPx(stage: HTMLDivElement): number {
    return Math.max(1, stage.clientWidth * (step / 100));
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    stopAnimation();
    dragStartX.current = event.clientX;
    dragOrigin.current = positionRef.current;
    velocityRef.current = 0;
    lastMove.current = { x: event.clientX, t: event.timeStamp };
    didDragRef.current = false;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStartX.current === null) return;
    const deltaX = event.clientX - dragStartX.current;
    if (!didDragRef.current && Math.abs(deltaX) >= DRAG_CLICK_PX) {
      didDragRef.current = true;
    }
    const dt = event.timeStamp - lastMove.current.t;
    const slot = slotWidthPx(event.currentTarget);
    if (dt > 0) {
      velocityRef.current = (lastMove.current.x - event.clientX) / dt / slot;
    }
    lastMove.current = { x: event.clientX, t: event.timeStamp };
    positionRef.current = dragOrigin.current - deltaX / slot;
    applyLayout(positionRef.current);
  }

  function resetPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStartX.current = null;
    setIsDragging(false);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStartX.current === null) return;
    const target = snapFromDrag(
      dragOrigin.current,
      positionRef.current,
      velocityRef.current,
    );
    resetPointer(event);
    animateTo(target);
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStartX.current === null) return;
    resetPointer(event);
    animateTo(Math.round(positionRef.current));
  }

  function suppressDraggedClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!didDragRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    didDragRef.current = false;
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(active + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(active - 1);
    }
  }

  if (count === 0) return null;
  const current = items[active];
  const copy = drugCopy(current.drug, locale);
  // 規格與分類都還沒確認時整行不顯示，避免「規格待確認 · 待確認」像頁面沒做完。
  const metaLine =
    [known(copy.spec), known(copy.drugClass)].filter(Boolean).join(" · ") || null;

  return (
    <div className="product-showcase-canvas relative">
      <div className="relative px-5 pb-7 pt-8 sm:px-8 sm:pb-9 sm:pt-10">
        {eyebrow && <p className="shop-kicker mb-2 text-center text-oxblood">{eyebrow}</p>}
        {title && (
          <h2 className="editorial-display m-0 text-center text-[28px] leading-[1.2] text-ink sm:text-[38px]">
            {title}
          </h2>
        )}

        {/* 品項膠囊：只切換主角，不濾清單。手機單排橫向捲動。 */}
        <div
          ref={pillRailRef}
          className="-mx-5 mt-4 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:mt-2 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0"
        >
          {items.map((item, i) => (
            <button
              key={item.drug.slug}
              ref={(node) => {
                pillRefs.current[i] = node;
              }}
              type="button"
              onClick={() => go(i)}
              aria-current={i === active}
              className="h-11 max-w-[164px] shrink-0 text-[13px] font-medium"
            >
              <span
                className={`flex h-8 max-w-full items-center truncate border px-3.5 transition-colors motion-reduce:transition-none ${
                  i === active
                    ? "border-forest bg-forest text-paper"
                    : "border-line-strong bg-paper text-ink-2 hover:border-forest hover:text-forest"
                }`}
              >
                {drugCopy(item.drug, locale).name}
              </span>
            </button>
          ))}
        </div>

        <div
          ref={stageRef}
          role="group"
          aria-roledescription={locale === "en" ? "carousel" : "輪播"}
          aria-label={locale === "en" ? "Featured products" : "精選品項"}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onClickCapture={suppressDraggedClick}
          onDragStart={(event) => event.preventDefault()}
          data-dragging={isDragging}
          className="product-showcase-stage relative mt-5 cursor-grab touch-pan-y select-none outline-offset-4 active:cursor-grabbing"
        >
          {items.map((item, i) => {
            const distance = shortestSignedDistance(i, active, count);
            const isActive = i === active;
            const { cutout } = item;
            if (!cutout) return null;
            const altImage = item.drug.image;
            return (
              <button
                key={item.drug.slug}
                ref={(node) => {
                  itemRefs.current[i] = node;
                }}
                type="button"
                tabIndex={-1}
                aria-hidden={!isActive}
                data-showcase-index={i}
                data-active={isActive}
                onClick={() => go(i)}
                className="product-showcase-item absolute bottom-0 left-1/2 block border-0 bg-transparent p-0"
                style={showcaseItemStyle(distance, step)}
              >
                <span className="product-showcase-packshot-frame relative block">
                  <Image
                    src={cutout.src}
                    alt={
                      locale === "en"
                        ? (altImage?.altEn ?? item.drug.nameEn ?? item.drug.name)
                        : (altImage?.alt ?? item.drug.name)
                    }
                    width={cutout.width}
                    height={cutout.height}
                    sizes="(min-width: 768px) 230px, 180px"
                    {...(Math.abs(distance) <= 1
                      ? i === active
                        ? { priority: true as const }
                        : { loading: "eager" as const }
                      : { loading: "lazy" as const })}
                    draggable={false}
                    className="product-showcase-packshot"
                  />
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 sm:mt-1" aria-live="polite">
          <div className="mx-auto min-w-0 max-w-[520px] text-center">
            <p className="m-0 text-[19px] font-bold leading-[1.35] text-ink sm:text-[22px]">
              {copy.name}
            </p>
            {metaLine && (
              <p className="mx-auto mb-0 mt-1.5 max-w-[460px] text-[14px] leading-[1.6] text-muted">
                {metaLine}
              </p>
            )}
            <p className="mx-auto mb-0 mt-1 line-clamp-2 max-w-[460px] text-[13px] leading-[1.6] text-muted-2">
              {copy.nutritionFocus}
            </p>
            {hrefPrefix && (
              <Link
                href={`${hrefPrefix}/${current.drug.slug}${hrefQuery}`}
                className="action-secondary mt-3.5 inline-flex min-h-11 items-center px-4 text-xs font-medium"
              >
                {locale === "en" ? "View item →" : "看這一項 →"}
              </Link>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-4">
          <ArrowButton
            dir="prev"
            label={locale === "en" ? "Previous product" : "上一項"}
            onClick={() => go(active - 1)}
          />
          <div className="flex gap-1.5" aria-hidden>
            {items.map((item, i) => (
              <span
                key={item.drug.slug}
                className={`transition-colors motion-reduce:transition-none ${
                  i === active ? "h-[3px] w-7 bg-ink sm:w-8" : "h-px w-5 bg-line-strong sm:w-6"
                }`}
              />
            ))}
          </div>
          <ArrowButton
            dir="next"
            label={locale === "en" ? "Next product" : "下一項"}
            onClick={() => go(active + 1)}
          />
        </div>
      </div>
    </div>
  );
}

function isActiveAttr(isHero: boolean): "true" | "false" {
  return isHero ? "true" : "false";
}

function ArrowButton({
  dir,
  label,
  onClick,
}: {
  dir: "prev" | "next";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="product-showcase-arrow flex h-11 w-11 shrink-0 items-center justify-center border border-line-strong bg-paper text-[16px] text-ink-2 transition-colors hover:border-forest hover:text-forest"
    >
      <span aria-hidden>{dir === "prev" ? "‹" : "›"}</span>
    </button>
  );
}
