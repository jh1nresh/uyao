import type { AreaSlug } from "./types";

/** 在目前路由保留既有查詢，只更新服務區。 */
export function withArea(pathname: string, search: string, area: AreaSlug): string {
  const params = new URLSearchParams(search);
  params.set("area", area);
  return `${pathname}?${params.toString()}`;
}
