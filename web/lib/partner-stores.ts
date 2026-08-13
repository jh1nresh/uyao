import { allStores } from "./data";
import { PARTNER_PHARMACIES } from "./partners";

export interface PartnerStoreItem {
  readonly name: string;
  readonly district: string;
}

const storesBySlug = new Map(allStores().map((store) => [store.slug, store]));

/**
 * 首頁合作藥局列只使用人工確認的 partner slug；行政區沿用店家資料來源，
 * 避免在 landing 另外維護一份可能漂移的區域名單。
 */
export const PARTNER_STORE_ITEMS: readonly PartnerStoreItem[] = Object.values(
  PARTNER_PHARMACIES,
).map((partner) => {
  const store = storesBySlug.get(partner.storeSlug);
  if (!store) {
    throw new Error(`Missing store data for partner pharmacy: ${partner.storeSlug}`);
  }

  return { name: store.name, district: store.district };
});
