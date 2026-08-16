export type PublicTheme = "light" | "dark";

export const PUBLIC_THEME_STORAGE_KEY = "uyao-public-theme";
export const PUBLIC_THEME_COOKIE = "uyao-theme";

export function isPublicTheme(value: unknown): value is PublicTheme {
  return value === "light" || value === "dark";
}

/** Runs before paint so the landing and Shop do not flash the wrong theme. */
export const PUBLIC_THEME_INIT_SCRIPT = `(() => {
  try {
    const cookie = document.cookie.match(/(?:^|; )${PUBLIC_THEME_COOKIE}=(light|dark)(?:;|$)/)?.[1];
    const stored = localStorage.getItem("${PUBLIC_THEME_STORAGE_KEY}");
    const theme = cookie === "light" || cookie === "dark"
      ? cookie
      : stored === "light" || stored === "dark"
        ? stored
        : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
})();`;
