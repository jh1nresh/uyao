"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { isSmoothScrollHome } from "@/lib/motion";

/**
 * Home-page motion grammar for the company site and consumer shop.
 *
 * Wheel input gets a small amount of damping, while touch remains native.
 * Content is never hidden without JS and reduced-motion users get the final
 * state immediately with the browser's default scrolling.
 */
export function MotionSystem() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isSmoothScrollHome(pathname)) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    const root = document.documentElement;
    root.classList.add("motion-ready");

    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      duration: 1.2,
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.9,
    });

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
    lenis.on("scroll", revealPassedSections);

    return () => {
      lenis.off("scroll", revealPassedSections);
      observer.disconnect();
      lenis.destroy();
      root.classList.remove("motion-ready");
      for (const section of sections) {
        delete section.dataset.motionSection;
        delete section.dataset.motionVisible;
      }
    };
  }, [pathname]);

  return null;
}
