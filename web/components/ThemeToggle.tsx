"use client";

import { useEffect, useRef, useState } from "react";

import {
  isPublicTheme,
  PUBLIC_THEME_COOKIE,
  PUBLIC_THEME_STORAGE_KEY,
  type PublicTheme,
} from "@/lib/public-theme";

function currentTheme(): PublicTheme {
  const value = document.documentElement.dataset.theme;
  if (isPublicTheme(value)) return value;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function persistTheme(theme: PublicTheme) {
  window.localStorage.setItem(PUBLIC_THEME_STORAGE_KEY, theme);
  const sharedDomain = window.location.hostname === "uyaohealth.com"
    || window.location.hostname.endsWith(".uyaohealth.com");
  document.cookie = `${PUBLIC_THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${
    sharedDomain ? "; Domain=.uyaohealth.com; Secure" : ""
  }`;
}

export function ThemeToggle({ locale }: { locale: "zh" | "en" }) {
  const [theme, setTheme] = useState<PublicTheme | null>(null);
  const transitionTimer = useRef<number | null>(null);

  useEffect(() => {
    setTheme(currentTheme());
    return () => {
      if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    };
  }, []);

  const dark = theme === "dark";
  const label = locale === "en"
    ? dark ? "Switch to light mode" : "Switch to dark mode"
    : dark ? "切換到淺色模式" : "切換到深色模式";

  function toggleTheme() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.add("theme-switching");
      if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
      transitionTimer.current = window.setTimeout(
        () => document.documentElement.classList.remove("theme-switching"),
        240,
      );
    }
    document.documentElement.dataset.theme = next;
    persistTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={dark}
      title={label}
      onClick={toggleTheme}
      className="relative inline-flex h-11 w-11 flex-none items-center justify-center border border-line-strong bg-paper text-forest transition-[background-color,border-color,color] duration-200 hover:border-forest hover:bg-surface"
    >
      <svg className="theme-toggle-sun h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 2.5V5M12 19V21.5M2.5 12H5M19 12H21.5M5.3 5.3 7.1 7.1M16.9 16.9 18.7 18.7M18.7 5.3 16.9 7.1M7.1 16.9 5.3 18.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
      <svg className="theme-toggle-moon h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M20.2 15.2A8 8 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
