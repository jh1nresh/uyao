import type { Store } from "./types";

export const STORE_DEMO_SANDBOX_SLUG = "uyao-demo";

/**
 * A synthetic storefront used only by the sales demo. It deliberately lives
 * outside data.ts so it can never enter partner listings, SEO pages, or maps.
 */
export const STORE_DEMO_STORE: Store = {
  slug: STORE_DEMO_SANDBOX_SLUG,
  name: "uYao Demo 藥局",
  area: "datong",
  district: "示範環境",
  address: "線上示範環境（非實體門市）",
  phone: "",
  owner: "uYao Demo",
  nhiCode: null,
  nhiContracted: false,
  nhiTerminatedOn: null,
  lat: null,
  lng: null,
  distanceM: null,
  placeId: null,
  businessStatus: null,
  mapsUrl: "https://store.uyaohealth.com/",
  hours: [
    { label: "星期一至星期日", hours: "09:00–21:00" },
  ],
  hoursSource: "partner",
  notes: ["所有門市、供應與價格資料皆為示範"],
  status: "listed",
};

export function getStoreDemoSandbox(storeSlug: string): Store | undefined {
  return isStoreDemoSandbox(storeSlug) ? STORE_DEMO_STORE : undefined;
}

export function isStoreDemoSandbox(storeSlug: string): boolean {
  return storeSlug === STORE_DEMO_SANDBOX_SLUG;
}
