import { allDrugs, allStores, getDrug, getStore } from "./data";
import { drugCopy, areaCopy, type Locale } from "./i18n";
import { partnersForProduct } from "./partners";
import { known } from "./pending";
import { SHOP_URL } from "./shop";
import type { Drug, Store } from "./types";

/**
 * 公開讀取 API 的序列化層。
 *
 * 唯一規則：**只輸出頁面上已經公開的欄位，且不輸出任何供應狀態**。
 *
 * 刻意不輸出的欄位：
 *   Store.owner        負責藥師姓名。站上任何一頁都沒顯示，API 更不該
 *                      變成可以整批抓走人名的出口。
 *   Store.placeId      第三方識別碼，對讀者沒用途。
 *   Offer / priceTwd   uYao 沒有任何一家藥局的即時庫存，不得輸出價格、
 *                      供應狀態或 daysSinceScan —— 那會被當成現貨保證。
 */

export const PUBLIC_API_VERSION = "1.0.0";

export type CatalogItemPayload = {
  slug: string;
  url: string;
  name: string;
  nameEn?: string;
  /** 未查證的欄位整個不輸出 —— 不要送「規格待確認」這種佔位字串出去。 */
  form?: string;
  spec?: string;
  drugClass?: string;
  category: string;
  ingredients: string[];
  nutritionFocus: string;
  manufacturer?: string;
  origin?: string;
  licenseNo?: string;
  image?: { url: string; kind: "illustration" | "packshot"; alt: string };
  source?: { label: string; url?: string; kind?: "public" | "partner" };
};

export type CatalogItemDetailPayload = CatalogItemPayload & {
  dosage?: string;
  cautions?: string;
  /** 原廠標示逐條照抄，不是 uYao 的評價。 */
  labelHighlights?: { title: string; body: string }[];
  /**
   * 合作藥局自己確認**有販售**這個品項的店。
   *
   * 這不是供應狀態，也不是現貨保證 —— 是「這家店把這支列在自己的品項清單
   * 上」，跟品項頁上寫的同一件事。仍然不輸出價格、庫存與掃描新鮮度。
   *
   * 會輸出是因為少了它，讀 API 的一方（例如 LINE agent）拿不到 storeSlug 與
   * 電話，就沒辦法幫使用者接下去 —— 只能請他自己回網站點一次。
   *
   * 但列在這裡**不代表收得到線上預留**：那要看藥局有沒有在 Store OS 上接單
   * （lib/store-os-live.ts），目前一家都還沒有。`POST /api/reservations` 會回 409
   * 並附上電話，所以 agent 該做的是把電話講給使用者，不是重試。
   */
  availableAt?: PharmacyPayload[];
};

export type PharmacyPayload = {
  slug: string;
  url: string;
  name: string;
  area: string;
  district: string;
  address: string;
  phone?: string;
  nhiCode: string | null;
  nhiContracted: boolean;
  businessStatus: string | null;
  /** `nhi` 是健保調劑時段，不是營業時間 —— 消費端不得當成營業保證。 */
  hoursSource: Store["hoursSource"];
  hours: { label: string; hours: string }[];
  mapsUrl: string;
  location: { lat: number; lng: number } | null;
};

function itemUrl(slug: string, locale: Locale): string {
  return `${SHOP_URL}${locale === "en" ? "/en" : "/zh-tw"}/drug/${slug}`;
}

export function catalogItemPayload(drug: Drug, locale: Locale): CatalogItemPayload {
  const display = drugCopy(drug, locale);
  return {
    slug: drug.slug,
    url: itemUrl(drug.slug, drug.nameEn ? locale : "zh"),
    name: display.name,
    ...(drug.nameEn ? { nameEn: drug.nameEn } : {}),
    ...(known(display.form) ? { form: display.form } : {}),
    ...(known(display.spec) ? { spec: display.spec } : {}),
    ...(known(display.drugClass) ? { drugClass: display.drugClass } : {}),
    category: drug.category,
    ingredients: display.ingredients,
    nutritionFocus: known(locale === "en" ? drug.nutritionFocusEn : drug.nutritionFocus) ?? "",
    ...(known(drug.manufacturer) ? { manufacturer: drug.manufacturer } : {}),
    ...(known(drug.origin) ? { origin: drug.origin } : {}),
    // 許可證字號只在真的有值時輸出；沒接到藥證開放資料前一律空字串。
    ...(drug.licenseNo ? { licenseNo: drug.licenseNo } : {}),
    ...(drug.image
      ? {
          image: {
            url: `${SHOP_URL}${drug.image.src}`,
            kind: drug.image.kind,
            alt: locale === "en" ? drug.image.altEn : drug.image.alt,
          },
        }
      : {}),
    ...(drug.source ? { source: drug.source } : {}),
  };
}

export function catalogItemDetailPayload(
  drug: Drug,
  locale: Locale,
): CatalogItemDetailPayload {
  const label = drug.spec === "規格待確認" ? drug.name : `${drug.name} ${drug.spec}`;
  const availableAt = partnersForProduct(label)
    .map((partner) => getStore(partner.storeSlug))
    .filter((store): store is Store => store !== undefined)
    .map((store) => pharmacyPayload(store, locale));

  return {
    ...catalogItemPayload(drug, locale),
    ...(availableAt.length > 0 ? { availableAt } : {}),
    ...(drug.dosage ? { dosage: drug.dosage } : {}),
    ...(drug.cautions ? { cautions: drug.cautions } : {}),
    ...(drug.highlights?.length
      ? { labelHighlights: drug.highlights.map((h) => ({ title: h.title, body: h.body })) }
      : {}),
  };
}

export function pharmacyPayload(store: Store, locale: Locale): PharmacyPayload {
  const area = areaCopy({ slug: store.area, countyCity: "", name: "", shortName: "" }, locale);
  return {
    slug: store.slug,
    url: `${SHOP_URL}${locale === "en" ? "/en" : "/zh-tw"}/store/${store.slug}`,
    name: store.name,
    area: store.area,
    district: locale === "en" ? area.shortName || store.district : store.district,
    address: store.address,
    ...(store.phone ? { phone: store.phone } : {}),
    nhiCode: store.nhiCode,
    nhiContracted: store.nhiContracted,
    businessStatus: store.businessStatus,
    hoursSource: store.hoursSource,
    hours: store.hours.map((h) => ({ label: h.label, hours: h.hours })),
    mapsUrl: store.mapsUrl,
    location: store.lat !== null && store.lng !== null
      ? { lat: store.lat, lng: store.lng }
      : null,
  };
}

export function catalogPayload(locale: Locale): CatalogItemPayload[] {
  return allDrugs().map((drug) => catalogItemPayload(drug, locale));
}

export function catalogItem(slug: string, locale: Locale): CatalogItemDetailPayload | undefined {
  const drug = getDrug(slug);
  return drug ? catalogItemDetailPayload(drug, locale) : undefined;
}

export function pharmaciesPayload(locale: Locale, area?: string): PharmacyPayload[] {
  return allStores()
    .filter((store) => !area || store.area === area)
    .map((store) => pharmacyPayload(store, locale));
}

/** `?locale=en` 以外一律中文，避免無效值悄悄回傳空資料。 */
export function readLocale(raw: string | null): Locale {
  return raw === "en" ? "en" : "zh";
}
