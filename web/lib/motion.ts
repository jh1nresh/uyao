const SMOOTH_SCROLL_HOME_PATHS = new Set(["/", "/zh-tw", "/en"]);

/** Company and shop share these public home paths through host-based rewrites. */
export function isSmoothScrollHome(pathname: string): boolean {
  return SMOOTH_SCROLL_HOME_PATHS.has(pathname);
}
