"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { isSmoothScrollHome } from "@/lib/motion";

import type Lenis from "lenis";

/**
 * Home-page motion grammar for the company site and consumer shop.
 *
 * Wheel input gets a small amount of damping, while touch remains native.
 * Content is never hidden without JS and reduced-motion users get the final
 * state immediately with the browser's default scrolling.
 *
 * Lenis 只服務滑鼠滾輪（syncTouch: false），所以觸控裝置整包都不載：手機上它
 * 不改變任何捲動行為，卻要付 bundle + rAF 迴圈的錢。桌機也改成 hydration 之後
 * 才 dynamic import，避免它躺在 first paint 的關鍵路徑上。
 * section 的進場揭示不再依賴 Lenis 的 scroll 事件，改掛原生 scroll，兩種裝置一致。
 */
export function MotionSystem() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isSmoothScrollHome(pathname)) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    const root = document.documentElement;
    root.classList.add("motion-ready");

    const sections = Array.from(document.querySelectorAll<HTMLElement>("section"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.motionVisible = "true";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12%", threshold: 0.08 },
    );

    const revealPassedSections = () => {
      for (const section of sections) {
        if (section.getBoundingClientRect().top < window.innerHeight * 0.88) {
          section.dataset.motionVisible = "true";
          observer.unobserve(section);
        }
      }
    };

    for (const section of sections) {
      section.dataset.motionSection = "true";
      if (section.getBoundingClientRect().top < window.innerHeight * 0.88) {
        section.dataset.motionVisible = "true";
      } else {
        observer.observe(section);
      }
    }
    // observer 的 threshold 0.08 對「比視窗還高的 section」永遠達不到 —— 之前是
    // Lenis 的 scroll 事件在補這一刀。Lenis 現在不一定存在（觸控裝置完全不載，
    // 桌機也要等 dynamic import），所以改掛原生 scroll：Lenis 的平滑捲動最後
    // 也是走 window.scrollTo，同一個 listener 兩種情況都收得到。
    window.addEventListener("scroll", revealPassedSections, { passive: true });

    let lenis: Lenis | null = null;
    let disposed = false;
    if (window.matchMedia("(pointer: fine)").matches) {
      void import("lenis").then(({ default: LenisCtor }) => {
        if (disposed) return;
        lenis = new LenisCtor({
          autoRaf: true,
          anchors: true,
          duration: 1.2,
          lerp: 0.1,
          smoothWheel: true,
          syncTouch: false,
          wheelMultiplier: 0.9,
        });
      });
    }

    return () => {
      disposed = true;
      window.removeEventListener("scroll", revealPassedSections);
      observer.disconnect();
      lenis?.destroy();
      root.classList.remove("motion-ready");
      for (const section of sections) {
        delete section.dataset.motionSection;
        delete section.dataset.motionVisible;
      }
    };
  }, [pathname]);

  return null;
}
