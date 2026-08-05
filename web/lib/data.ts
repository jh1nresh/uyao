import { compareByFreshness, stockBadge } from "./stock";
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
 * v1 資料層：固定 fixture + 純函式查詢。
 * 正式版把這裡換成 API（庫存/效期來自盒子掃描流，價格由藥局自報），
 * 上層 component 的介面不用動。
 */

/**
 * 開放中的服務區。範圍跟藥局獲客名單一致（`data/prospects-taipei-zhongshan-xinyi.csv`）
 * —— 盒子先鋪這兩區，消費端就只開這兩區。
 */
export const AREAS: Area[] = [
  { slug: "zhongshan", name: "台北市中山區", shortName: "中山區" },
  { slug: "xinyi", name: "台北市信義區", shortName: "信義區" },
];

export const DEFAULT_AREA: AreaSlug = "zhongshan";

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
  { slug: "patch", name: "痠痛貼布" },
  { slug: "ointment", name: "軟膏／藥膏" },
  { slug: "otc-staple", name: "常備成藥" },
];

const DRUGS: Drug[] = [
  {
    slug: "salonpas-ae",
    name: "撒隆巴斯®-愛涼 貼布",
    nameEn: "SALONPAS-AE",
    form: "貼布",
    spec: "20 片/盒",
    licenseNo: "衛署藥製字第012345號",
    drugClass: "指示藥",
    category: "patch",
    ingredients: ["水楊酸甲酯", "l-薄荷腦"],
    indications: ["肌肉痠痛", "扭傷", "腰痛"],
  },
  {
    slug: "golden-cross-patch",
    name: "金十字酸痛貼布",
    form: "貼布",
    spec: "20 片/盒",
    licenseNo: "衛署藥製字第024680號",
    drugClass: "成藥",
    category: "patch",
    ingredients: ["水楊酸甲酯", "l-薄荷腦"],
    indications: ["肌肉痠痛", "肩頸僵硬"],
  },
  {
    slug: "cool-relief-patch",
    name: "痠痛必貼 涼感貼布",
    form: "貼布",
    spec: "10 片/盒",
    licenseNo: "衛署藥製字第031415號",
    drugClass: "成藥",
    category: "patch",
    ingredients: ["水楊酸甲酯", "l-薄荷腦"],
    indications: ["肌肉痠痛", "運動後不適"],
  },
  {
    slug: "mentholatum-ad",
    name: "曼秀雷敦 AD 軟膏",
    nameEn: "MENTHOLATUM AD",
    form: "軟膏",
    spec: "90g",
    licenseNo: "衛署藥製字第017253號",
    drugClass: "乙類成藥",
    category: "ointment",
    ingredients: ["尿囊素", "dl-樟腦"],
    indications: ["皮膚乾癢", "止癢"],
  },
  {
    slug: "jimu-spray",
    name: "肌樂 涼感噴劑",
    form: "噴劑",
    spec: "130ml",
    licenseNo: "衛署藥製字第008642號",
    drugClass: "指示藥",
    category: "patch",
    ingredients: ["水楊酸甲酯", "薄荷腦"],
    indications: ["肌肉痠痛", "疲勞"],
  },
  {
    slug: "green-oil",
    name: "綠油精",
    form: "液劑",
    spec: "10ml",
    licenseNo: "衛署成製字第000123號",
    drugClass: "乙類成藥",
    category: "otc-staple",
    ingredients: ["薄荷腦", "樟腦", "尤加利油"],
    indications: ["頭痛", "暈車", "蚊蟲叮咬"],
  },
  {
    slug: "white-flower-oil",
    name: "白花油 5 號",
    form: "液劑",
    spec: "20ml",
    licenseNo: "衛署成製字第000456號",
    drugClass: "乙類成藥",
    category: "otc-staple",
    ingredients: ["薄荷腦", "水楊酸甲酯", "尤加利油"],
    indications: ["頭痛", "蚊蟲叮咬"],
  },
  {
    slug: "povidone-iodine",
    name: "優碘軟膏",
    form: "軟膏",
    spec: "10g",
    licenseNo: "衛署藥製字第005566號",
    drugClass: "指示藥",
    category: "ointment",
    ingredients: ["聚維酮碘"],
    indications: ["傷口消毒"],
  },
  {
    slug: "artificial-tears",
    name: "護立康 人工淚液",
    form: "點眼液",
    spec: "15ml",
    licenseNo: "—",
    drugClass: "非藥品",
    category: "otc-staple",
    ingredients: ["玻尿酸鈉"],
    indications: ["眼睛乾澀"],
  },
];

const STORES: Store[] = [
  // ── 中山區 ──────────────────────────────────────────────────────
  {
    slug: "huimin",
    name: "惠民藥局",
    area: "zhongshan",
    address: "台北市中山區南京東路二段 96 號",
    phone: "02-2507-1234",
    distanceM: 350,
    isOpen: true,
    openLabel: "營業中 · 至 21:30",
    openShort: "營業中",
    hours: [
      { label: "週一–週六", hours: "09:00–21:30" },
      { label: "週日", hours: "公休" },
    ],
    notes: ["藥師駐店", "健保特約"],
    lastSyncLabel: "今日 14:20",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=惠民藥局+台北市中山區南京東路二段96號",
    mapPos: { x: 44, y: 46 },
  },
  {
    slug: "anxintang",
    name: "安心堂藥局",
    area: "zhongshan",
    address: "台北市中山區林森北路 320 號",
    phone: "02-2531-5566",
    distanceM: 750,
    isOpen: true,
    openLabel: "營業中 · 至 22:00",
    openShort: "營業中",
    hours: [
      { label: "週一–週日", hours: "09:00–22:00" },
    ],
    notes: ["藥師駐店"],
    lastSyncLabel: "今日 13:05",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=安心堂藥局+台北市中山區林森北路320號",
    mapPos: { x: 62, y: 30 },
  },
  {
    slug: "changchun",
    name: "長春大藥局",
    area: "zhongshan",
    address: "台北市中山區長春路 145 號",
    phone: "02-2542-3344",
    distanceM: 1200,
    isOpen: true,
    openLabel: "營業中 · 至 21:00",
    openShort: "營業中",
    hours: [
      { label: "週一–週六", hours: "10:00–21:00" },
      { label: "週日", hours: "10:00–18:00" },
    ],
    notes: ["藥師駐店", "健保特約"],
    lastSyncLabel: "3 天前 11:15",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=長春大藥局+台北市中山區長春路145號",
    mapPos: { x: 24, y: 62 },
  },

  // ── 信義區 ──────────────────────────────────────────────────────
  {
    slug: "jiancheng",
    name: "建成藥局",
    area: "xinyi",
    address: "台北市信義區松高路 30 號",
    phone: "02-2723-8899",
    distanceM: 480,
    isOpen: false,
    openLabel: "已打烊 · 明 09:00",
    openShort: "已打烊",
    hours: [
      { label: "週一–週五", hours: "09:00–20:00" },
      { label: "週六", hours: "09:00–17:00" },
      { label: "週日", hours: "公休" },
    ],
    notes: ["健保特約"],
    lastSyncLabel: "2 天前 19:40",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=建成藥局+台北市信義區松高路30號",
    mapPos: { x: 70, y: 58 },
  },
  {
    slug: "songde",
    name: "松德藥局",
    area: "xinyi",
    address: "台北市信義區信義路五段 15 號",
    phone: "02-2758-4321",
    distanceM: 620,
    isOpen: true,
    openLabel: "營業中 · 至 22:00",
    openShort: "營業中",
    hours: [
      { label: "週一–週六", hours: "09:00–22:00" },
      { label: "週日", hours: "10:00–18:00" },
    ],
    notes: ["藥師駐店", "健保特約"],
    lastSyncLabel: "今日 15:10",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=松德藥局+台北市信義區信義路五段15號",
    mapPos: { x: 38, y: 34 },
  },
  {
    slug: "fuxing",
    name: "福星藥局",
    area: "xinyi",
    address: "台北市信義區基隆路一段 178 號",
    phone: "02-2765-7788",
    distanceM: 1600,
    isOpen: true,
    openLabel: "營業中 · 至 20:30",
    openShort: "營業中",
    hours: [
      { label: "週一–週六", hours: "09:30–20:30" },
      { label: "週日", hours: "公休" },
    ],
    notes: ["健保特約"],
    lastSyncLabel: "尚無掃描紀錄",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=福星藥局+台北市信義區基隆路一段178號",
    mapPos: { x: 16, y: 26 },
  },
];

const OFFERS: Offer[] = [
  // 撒隆巴斯®-愛涼 貼布
  { drugSlug: "salonpas-ae", storeSlug: "huimin", priceTwd: 129, daysSinceScan: 0 },
  { drugSlug: "salonpas-ae", storeSlug: "anxintang", priceTwd: 135, daysSinceScan: 0 },
  { drugSlug: "salonpas-ae", storeSlug: "jiancheng", priceTwd: 139, daysSinceScan: 2 },
  { drugSlug: "salonpas-ae", storeSlug: "changchun", priceTwd: 125, daysSinceScan: 3 },
  { drugSlug: "salonpas-ae", storeSlug: "fuxing", priceTwd: 120, daysSinceScan: null },
  { drugSlug: "salonpas-ae", storeSlug: "songde", priceTwd: 132, daysSinceScan: 0 },

  // 金十字酸痛貼布
  { drugSlug: "golden-cross-patch", storeSlug: "huimin", priceTwd: 115, daysSinceScan: 3 },
  { drugSlug: "golden-cross-patch", storeSlug: "anxintang", priceTwd: 118, daysSinceScan: 0 },
  { drugSlug: "golden-cross-patch", storeSlug: "changchun", priceTwd: 122, daysSinceScan: 1 },
  { drugSlug: "golden-cross-patch", storeSlug: "jiancheng", priceTwd: 120, daysSinceScan: 0 },

  // 痠痛必貼 涼感貼布
  { drugSlug: "cool-relief-patch", storeSlug: "jiancheng", priceTwd: 99, daysSinceScan: 2 },
  { drugSlug: "cool-relief-patch", storeSlug: "anxintang", priceTwd: 105, daysSinceScan: 0 },
  { drugSlug: "cool-relief-patch", storeSlug: "songde", priceTwd: 102, daysSinceScan: 0 },

  // 曼秀雷敦 AD 軟膏
  { drugSlug: "mentholatum-ad", storeSlug: "anxintang", priceTwd: 180, daysSinceScan: 0 },
  { drugSlug: "mentholatum-ad", storeSlug: "huimin", priceTwd: 185, daysSinceScan: 0 },
  { drugSlug: "mentholatum-ad", storeSlug: "changchun", priceTwd: 176, daysSinceScan: 4 },
  { drugSlug: "mentholatum-ad", storeSlug: "songde", priceTwd: 178, daysSinceScan: 0 },

  // 肌樂 涼感噴劑
  { drugSlug: "jimu-spray", storeSlug: "jiancheng", priceTwd: 210, daysSinceScan: 0 },
  { drugSlug: "jimu-spray", storeSlug: "huimin", priceTwd: 215, daysSinceScan: null },

  // 綠油精
  { drugSlug: "green-oil", storeSlug: "huimin", priceTwd: 75, daysSinceScan: 0 },
  { drugSlug: "green-oil", storeSlug: "fuxing", priceTwd: 72, daysSinceScan: null },
  { drugSlug: "green-oil", storeSlug: "songde", priceTwd: 73, daysSinceScan: 0 },

  // 白花油 5 號
  { drugSlug: "white-flower-oil", storeSlug: "huimin", priceTwd: 90, daysSinceScan: 2 },
  { drugSlug: "white-flower-oil", storeSlug: "changchun", priceTwd: 88, daysSinceScan: 5 },
  { drugSlug: "white-flower-oil", storeSlug: "songde", priceTwd: 92, daysSinceScan: 1 },

  // 優碘軟膏
  { drugSlug: "povidone-iodine", storeSlug: "changchun", priceTwd: 65, daysSinceScan: 0 },
  { drugSlug: "povidone-iodine", storeSlug: "huimin", priceTwd: 68, daysSinceScan: 0 },
  { drugSlug: "povidone-iodine", storeSlug: "songde", priceTwd: 66, daysSinceScan: 0 },

  // 護立康 人工淚液
  { drugSlug: "artificial-tears", storeSlug: "huimin", priceTwd: 120, daysSinceScan: 0 },
  { drugSlug: "artificial-tears", storeSlug: "anxintang", priceTwd: 115, daysSinceScan: 1 },
  { drugSlug: "artificial-tears", storeSlug: "songde", priceTwd: 118, daysSinceScan: 0 },
];

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

export function getStore(slug: string): Store | undefined {
  return STORES.find((s) => s.slug === slug);
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
export function storesForDrug(drugSlug: string): StoreRow[] {
  return OFFERS.filter((o) => o.drugSlug === drugSlug)
    .flatMap((o) => {
      const store = getStore(o.storeSlug);
      if (!store) return [];
      return [{
        store,
        priceTwd: o.priceTwd,
        daysSinceScan: o.daysSinceScan,
        badge: stockBadge(o.daysSinceScan),
      }];
    })
    .sort(compareByFreshness);
}

/** 藥局頁：本店有貨商品，同樣依新鮮度排序。 */
export function drugsForStore(storeSlug: string): DrugRow[] {
  const store = getStore(storeSlug);
  if (!store) return [];
  return OFFERS.filter((o) => o.storeSlug === storeSlug)
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
export function alternativesFor(drugSlug: string): Alternative[] {
  const drug = getDrug(drugSlug);
  if (!drug) return [];
  const signature = [...drug.ingredients].sort().join("|");

  return DRUGS.filter(
    (d) => d.slug !== drug.slug && [...d.ingredients].sort().join("|") === signature,
  )
    .flatMap((d) => {
      const rows = storesForDrug(d.slug);
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

/** 搜尋：品名 / 英文名 / 成分 / 適應症 都吃。 */
export function searchDrugs(query: string): Drug[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return DRUGS.filter((d) =>
    [d.name, d.nameEn ?? "", d.form, ...d.ingredients, ...d.indications]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
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
export function drugSummary(drugSlug: string): DrugSummary | undefined {
  const drug = getDrug(drugSlug);
  if (!drug) return undefined;
  const rows = storesForDrug(drugSlug);
  return {
    drug,
    storeCount: rows.length,
    bestBadge: rows[0]?.badge ?? stockBadge(null),
    nearestStore: rows[0]?.store ?? null,
    fromPriceTwd: rows.length > 0 ? Math.min(...rows.map((r) => r.priceTwd)) : null,
  };
}

/** 藥局頁 header 的「N 項」。 */
export function storeItemCount(storeSlug: string): number {
  return OFFERS.filter((o) => o.storeSlug === storeSlug).length;
}
