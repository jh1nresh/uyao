import type { Config } from "tailwindcss";

/**
 * Tokens are lifted verbatim from the design doc (`消費端 Web.dc.html`).
 * 白底墨字、單一綠 accent — 不新增第二個彩色。
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1A2420",
        "ink-2": "#3D4A43",
        muted: "#5C6B62",
        "muted-2": "#8A968D",
        stale: "#6B7A70",
        green: "#0B7A3E",
        "green-hover": "#096632",
        "green-tint": "#EAF4EE",
        "green-tint-line": "#BFDCCB",
        line: "#DCE3DE",
        "line-strong": "#C2CCC5",
        "line-soft": "#EDF1EC",
        surface: "#F7F9F6",
        "surface-hover": "#FAFCF9",
        canvas: "#EEF1ED",
        "map-bg": "#E9EDE8",
        "map-grid": "#DFE5DE",
      },
      // 基準字級整體上調：原本全站最常用的是 11px，對「找藥的人」太小。
      // xs/sm 是 token（用了 48 次），在這裡改一次就全站生效。
      fontSize: {
        xs: ["13px", { lineHeight: "1.5" }],
        sm: ["15px", { lineHeight: "1.6" }],
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
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
