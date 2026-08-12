import generated from "./stores.generated.json";
import { compareByFreshness, stockBadge } from "./stock";
import { matchSymptom } from "./symptoms";
import { drugCopy } from "./i18n";
import type {
  Area,
  AreaSlug,
  Category,
  CategorySlug,
  Drug,
  Offer,
  StockBadgeSpec,
  Store,
} from "./types";

/**
 * 資料層：藥局是真的，庫存還不是。
 *
 * 藥局來自 `stores.generated.json` —— 食藥署 + 健保署開放資料，跑
 * `python3 -m pharmabox.seed` 重新產生，不要手改。
 *
 * 庫存與價格來自盒子的掃描流。目前**沒有任何一家裝盒子**，所以 OFFERS
 * 是空的，每家藥局的徽章都是「？ 請預留確認」。這不是待辦事項，是這個
 * 產品現在真實的狀態 —— 徽章系統本來就是為這個狀態設計的。
 */

/**
 * 首波收錄店家所在的服務區。合作狀態另由 partners.ts 明確標示；不論是否
 * 合作，都不代表已安裝盒子或已有即時庫存。
 */
export const AREAS: Area[] = [
  { slug: "datong", name: "台北市大同區", shortName: "大同區" },
  { slug: "linkou", name: "新北市林口區", shortName: "林口區" },
  { slug: "luzhou", name: "新北市蘆洲區", shortName: "蘆洲區" },
  { slug: "xinzhuang", name: "新北市新莊區", shortName: "新莊區" },
  { slug: "zhongshan", name: "台北市中山區", shortName: "中山區" },
  { slug: "xitun", name: "台中市西屯區", shortName: "西屯區" },
];

export const DEFAULT_AREA: AreaSlug = "datong";

/** 跨區的頁面（搜尋、品類）用這個標範圍，不能只寫其中一區。 */
export const SERVICE_AREA_LABEL = AREAS.map((a) => a.shortName).join("、");

export function getArea(slug: AreaSlug): Area {
  return AREAS.find((a) => a.slug === slug) ?? AREAS[0];
}

/** 把網址上的 ?area= 收斂成合法值，亂填就退回預設區。 */
export function toAreaSlug(raw: string | undefined): AreaSlug {
  return AREAS.some((a) => a.slug === raw) ? (raw as AreaSlug) : DEFAULT_AREA;
}

export const CATEGORIES: Category[] = [
  { slug: "partner-item", name: "合作藥局品項" },
];

const DRUGS: Drug[] = [
  {
    slug: "hugu-gaishu-100",
    name: "護谷鈣素",
    form: "劑型待確認",
    spec: "100粒",
    licenseNo: "",
    drugClass: "待確認",
    category: "partner-item",
    ingredients: [],
    indications: [],
  },
  {
    slug: "shengkangning-150",
    name: "勝康寧",
    form: "劑型待確認",
    spec: "150粒",
    licenseNo: "",
    drugClass: "待確認",
    category: "partner-item",
    ingredients: [],
    indications: [],
  },
  {
    slug: "entineng-230",
    name: "恩體能",
    form: "劑型待確認",
    spec: "230粒",
    licenseNo: "",
    drugClass: "待確認",
    category: "partner-item",
    ingredients: [],
    indications: [],
  },
  {
    slug: "jinjiweichang-60",
    name: "進磯為常",
    form: "劑型待確認",
    spec: "60粒",
    licenseNo: "",
    drugClass: "待確認",
    category: "partner-item",
    ingredients: [],
    indications: [],
  },
  {
    slug: "keqiqing-capsule",
    name: "克氣清咳嗽膠囊",
    form: "膠囊",
    spec: "規格待確認",
    licenseNo: "",
    drugClass: "待確認",
    category: "partner-item",
    ingredients: [],
    indications: [],
  },
  {
    slug: "huzhikang-60",
    name: "護智康",
    form: "劑型待確認",
    spec: "60粒",
    licenseNo: "",
    drugClass: "待確認",
    category: "partner-item",
    ingredients: [],
    indications: [],
  },
  {
    slug: "huzhikang-150",
    name: "護智康",
    form: "劑型待確認",
    spec: "150粒",
    licenseNo: "",
    drugClass: "待確認",
    category: "partner-item",
    ingredients: [],
    indications: [],
  },
];

const STORES: Store[] = generated.stores as Store[];

/**
 * 目前沒有任何一家藥局裝盒子，所以沒有任何 offer。
 * 有掃描流之後這裡改成從 API 讀，上層查詢函式不用動。
 */
const OFFERS: Offer[] = [];

// ── 示範模式（業務用） ──────────────────────────────────────────────
//
// 拿去跟藥局老闆談的時候，要讓他看到「裝上盒子之後**你這家店**長什麼樣」。
// 所以 `?preview=1` 會用藥品目錄替該店生出一份示範庫存 —— 頁面上一定
// 同時掛示範橫幅，而且永遠不會出現在正式頁面。

/** FNV-1a。同一家店每次產出同一份示範資料，不依賴時鐘也不會每次重整就跳動。 */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

const PREVIEW_BASE_PRICE: Record<string, number> = {
  "hugu-gaishu-100": 120,
  "shengkangning-150": 150,
  "entineng-230": 230,
  "jinjiweichang-60": 100,
  "keqiqing-capsule": 120,
  "huzhikang-60": 100,
  "huzhikang-150": 150,
};

export function previewOffers(storeSlug: string): Offer[] {
  return DRUGS.flatMap((d) => {
    const h = hash(`${storeSlug}:${d.slug}`);
    if (h % 10 < 2) return []; // 兩成品項這家店沒進貨
    const base = PREVIEW_BASE_PRICE[d.slug] ?? 100;
    return [{
      drugSlug: d.slug,
      storeSlug,
      priceTwd: base + ((h >> 8) % 5) * 2 - 4,
      // Preview availability and price are synthetic, but availability starts unknown.
      // Only a receiving event from the demo pipeline may upgrade this signal.
      daysSinceScan: null,
    }];
  });
}

// ── 查詢 ────────────────────────────────────────────────────────────

export interface StoreRow {
  store: Store;
  priceTwd: number;
  daysSinceScan: number | null;
  badge: StockBadgeSpec;
}

export interface DrugRow {
  drug: Drug;
  priceTwd: number;
  daysSinceScan: number | null;
  badge: StockBadgeSpec;
  store: Store;
}

export function getDrug(slug: string): Drug | undefined {
  return DRUGS.find((d) => d.slug === slug);
}

/**
 * slug 是中文（在地搜尋用中文網址對 SEO 有利），而 Next 給的 params.slug
 * 有時是 percent-encoded、有時已解碼 —— 靜態產生跟實際請求走的路徑不同。
 * 兩種都要能查到，不然會出現「metadata 找得到但頁面 404」。
 */
function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug; // 壞掉的 % 序列會 throw，原樣退回讓它自然查不到
  }
}

export function getStore(slug: string): Store | undefined {
  const decoded = decodeSlug(slug);
  return STORES.find((s) => s.slug === slug || s.slug === decoded);
}

export function allDrugs(): Drug[] {
  return DRUGS;
}

export function allStores(): Store[] {
  return STORES;
}

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/** 藥品頁：附近有這個藥的藥局，依 新鮮度 → 距離 → 價格 排序。 */
export function storesForDrug(drugSlug: string, area?: AreaSlug): StoreRow[] {
  return OFFERS.filter((o) => o.drugSlug === drugSlug)
    .flatMap((o) => {
      const store = getStore(o.storeSlug);
      if (!store || (area && store.area !== area)) return [];
      return [{
        store,
        priceTwd: o.priceTwd,
        daysSinceScan: o.daysSinceScan,
        badge: stockBadge(o.daysSinceScan),
      }];
    })
    .sort(compareByFreshness);
}

/** 這一區的藥局，近的排前面（還沒補座標的排後面）。 */
export function storesInArea(area: AreaSlug): Store[] {
  return STORES.filter((s) => s.area === area).sort(
    (a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity),
  );
}

export function storeCount(): number {
  return STORES.length;
}

/**
 * 藥局頁：本店有貨商品，同樣依新鮮度排序。
 * `preview` 只給業務示範用，正式頁面永遠是 false。
 */
export function drugsForStore(storeSlug: string, preview = false): DrugRow[] {
  const store = getStore(storeSlug);
  if (!store) return [];
  const source = preview ? previewOffers(storeSlug) : OFFERS;
  return source.filter((o) => o.storeSlug === storeSlug)
    .flatMap((o) => {
      const drug = getDrug(o.drugSlug);
      if (!drug) return [];
      return [{
        drug,
        store,
        priceTwd: o.priceTwd,
        daysSinceScan: o.daysSinceScan,
        badge: stockBadge(o.daysSinceScan),
      }];
    })
    .sort(compareByFreshness);
}

export interface Alternative {
  drug: Drug;
  /** 附近有貨（掃描紀錄在 7 天內）的店家數 */
  storesWithStock: number;
  fromPriceTwd: number;
}

/** 同成分替代品 — 沒貨時的出路。比對主成分集合完全相同的其他品項。 */
export function alternativesFor(drugSlug: string, area?: AreaSlug): Alternative[] {
  const drug = getDrug(drugSlug);
  if (!drug || drug.ingredients.length === 0) return [];
  const signature = [...drug.ingredients].sort().join("|");

  return DRUGS.filter(
    (d) =>
      d.slug !== drug.slug &&
      d.ingredients.length > 0 &&
      [...d.ingredients].sort().join("|") === signature,
  )
    .flatMap((d) => {
      const rows = storesForDrug(d.slug, area);
      const inStock = rows.filter((r) => r.badge.tier !== "unknown");
      if (inStock.length === 0) return [];
      return [{
        drug: d,
        storesWithStock: inStock.length,
        fromPriceTwd: Math.min(...inStock.map((r) => r.priceTwd)),
      }];
    })
    .sort((a, b) => b.storesWithStock - a.storesWithStock);
}

/** 首頁「附近現在有貨」：只收今日掃描確認的品項，一個藥只出現一次（取最近的店）。 */
/** 「附近現在有貨」——只看使用者所在區，跨區的距離不可比。 */
export function nearbyInStock(area: AreaSlug = DEFAULT_AREA, limit = 6): DrugRow[] {
  const seen = new Set<string>();
  return OFFERS.filter((o) => o.daysSinceScan !== null && o.daysSinceScan < 1)
    .flatMap((o) => {
      const drug = getDrug(o.drugSlug);
      const store = getStore(o.storeSlug);
      if (!drug || !store || store.area !== area) return [];
      return [{
        drug,
        store,
        priceTwd: o.priceTwd,
        daysSinceScan: o.daysSinceScan,
        badge: stockBadge(o.daysSinceScan),
      }];
    })
    .sort(compareByFreshness)
    .filter((r) => {
      if (seen.has(r.drug.slug)) return false;
      seen.add(r.drug.slug);
      return true;
    })
    .slice(0, limit);
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
}

/** 搜尋：品名 / 英文名 / 規格 / 成分 / 適應症 都吃。 */
function haystack(d: Drug): string {
  const en = drugCopy(d, "en");
  return normalizeSearchText([
    d.name,
    `${d.name} ${d.spec}`,
    d.nameEn ?? "",
    d.form,
    d.spec,
    ...d.ingredients,
    ...d.indications,
    en.name,
    `${en.name} ${en.spec}`,
    en.form,
    en.spec,
    ...en.ingredients,
    ...en.indications,
  ]
    .join(" "));
}

/**
 * 搜尋：品名 / 英文名 / 規格 / 成分 / 適應症 都吃。空白不影響比對，讓店家
 * 貼來的「護谷鈣素100粒」和畫面上的「護谷鈣素 100粒」都能找到同一項。
 *
 * `refer` 類回空陣列，由頁面顯示安全提醒，不自行對應商品。
 */
export function searchDrugs(query: string): Drug[] {
  const raw = query.trim();
  if (!raw) return [];

  const hit = matchSymptom(raw);
  if (hit?.kind === "refer") return [];

  const terms = hit?.kind === "expand" ? hit.terms : [raw];
  const seen = new Set<string>();
  const out: Drug[] = [];
  for (const t of terms) {
    const q = normalizeSearchText(t);
    for (const d of DRUGS) {
      if (!seen.has(d.slug) && haystack(d).includes(q)) {
        seen.add(d.slug);
        out.push(d);
      }
    }
  }
  return out;
}

export function drugsInCategory(slug: CategorySlug): Drug[] {
  return DRUGS.filter((d) => d.category === slug);
}

export interface DrugSummary {
  drug: Drug;
  storeCount: number;
  /** 最新鮮的那家（rows 已排序，取第一筆） */
  bestBadge: StockBadgeSpec;
  nearestStore: Store | null;
  fromPriceTwd: number | null;
}

/** 搜尋 / 品類列表用的一行摘要。 */
export function drugSummary(drugSlug: string, area?: AreaSlug): DrugSummary | undefined {
  const drug = getDrug(drugSlug);
  if (!drug) return undefined;
  const rows = storesForDrug(drugSlug, area);
  return {
    drug,
    storeCount: rows.length,
    bestBadge: rows[0]?.badge ?? stockBadge(null),
    nearestStore: rows[0]?.store ?? null,
    fromPriceTwd: rows.length > 0 ? Math.min(...rows.map((r) => r.priceTwd)) : null,
  };
}

/** 藥局頁 header 的「N 項」。 */
export function storeItemCount(storeSlug: string, preview = false): number {
  const source = preview ? previewOffers(storeSlug) : OFFERS;
  return source.filter((o) => o.storeSlug === storeSlug).length;
}
