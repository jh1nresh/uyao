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
        ink: "#1C2722",
        forest: "#17392C",
        "ink-2": "#3E4B44",
        muted: "#59665F",
        // Secondary copy is still visually quieter than `muted`, but remains
        // readable at 4.71:1 on the primary ivory background.
        "muted-2": "#606D66",
        stale: "#68766D",
        green: "#087B43",
        "green-hover": "#066737",
        "green-tint": "#E2EEE5",
        "green-tint-line": "#B8D2C0",
        oxblood: "#74352F",
        "oxblood-tint": "#E9D9D2",
        line: "#D2CDC1",
        "line-strong": "#B8B1A4",
        "line-soft": "#E2DCCF",
        surface: "#ECE7DB",
        "surface-hover": "#E5DFD2",
        canvas: "#E7E1D4",
        ivory: "#F2EFE6",
        paper: "#F8F4E9",
        sage: "#DCE7D9",
        "map-bg": "#E5E9E2",
        "map-grid": "#D9E0D7",
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
