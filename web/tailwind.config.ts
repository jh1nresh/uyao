import type { Config } from "tailwindcss";

/**
 * Warm editorial system shared by the company landing and consumer product.
 * Forest owns primary actions; green stays the live/status accent.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        forest: "rgb(var(--color-forest) / <alpha-value>)",
        "brand-surface": "rgb(var(--color-brand-surface) / <alpha-value>)",
        "brand-surface-strong": "rgb(var(--color-brand-surface-strong) / <alpha-value>)",
        "on-dark": "rgb(var(--color-on-dark) / <alpha-value>)",
        "ink-2": "rgb(var(--color-ink-2) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        // Secondary copy is still visually quieter than `muted`, but remains
        // readable at 4.71:1 on the primary ivory background.
        "muted-2": "rgb(var(--color-muted-2) / <alpha-value>)",
        stale: "rgb(var(--color-stale) / <alpha-value>)",
        green: "rgb(var(--color-green) / <alpha-value>)",
        "green-hover": "rgb(var(--color-green-hover) / <alpha-value>)",
        "green-tint": "rgb(var(--color-green-tint) / <alpha-value>)",
        "green-tint-line": "rgb(var(--color-green-tint-line) / <alpha-value>)",
        oxblood: "rgb(var(--color-oxblood) / <alpha-value>)",
        "oxblood-tint": "rgb(var(--color-oxblood-tint) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        "warning-tint": "rgb(var(--color-warning-tint) / <alpha-value>)",
        "warning-line": "rgb(var(--color-warning-line) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        "line-strong": "rgb(var(--color-line-strong) / <alpha-value>)",
        "line-soft": "rgb(var(--color-line-soft) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-hover": "rgb(var(--color-surface-hover) / <alpha-value>)",
        canvas: "rgb(var(--color-canvas) / <alpha-value>)",
        ivory: "rgb(var(--color-ivory) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        sage: "rgb(var(--color-sage) / <alpha-value>)",
        "map-bg": "rgb(var(--color-map-bg) / <alpha-value>)",
        "map-grid": "rgb(var(--color-map-grid) / <alpha-value>)",
      },
      // 基準字級整體上調：原本全站最常用的是 11px，對「找藥的人」太小。
      // xs/sm 是 token（用了 48 次），在這裡改一次就全站生效。
      fontSize: {
        xs: ["14px", { lineHeight: "1.55" }],
        sm: ["15px", { lineHeight: "1.6" }],
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        serif: ["var(--font-serif)", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        none: "0",
      },
    },
  },
  plugins: [],
};

export default config;
