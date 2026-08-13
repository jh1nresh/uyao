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
  { slug: "miaoli", name: "苗栗縣苗栗市", shortName: "苗栗市" },
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
    aliases: ["轉谷護谷鈣素", "TRANSBONE", "GLUCALINE MCHC"],
    form: "軟膠囊",
    spec: "100粒",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: ["MCHC鈣", "葡萄糖胺", "軟骨膠原", "維生素D3", "磷", "鎂"],
    indications: [],
    nutritionFocus: "骨骼與關節營養補給",
    nutritionFocusEn: "Bone and joint nutrition",
    searchTerms: ["骨骼保養", "關節保養", "補鈣", "行動力保養"],
    source: {
      label: "弘鎰貿易產品資料",
      url: "https://horngda.com/products/",
    },
  },
  {
    slug: "shengkangning-150",
    name: "勝康寧",
    aliases: ["GENTALIN", "勝康寧膠囊"],
    form: "膠囊",
    spec: "150粒",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: ["南瓜子油", "南瓜子粉", "油菜籽油花粉", "大豆卵磷脂", "芸香葉"],
    indications: [],
    nutritionFocus: "男性日常保養與營養補給",
    nutritionFocusEn: "Daily nutrition for men's wellness",
    searchTerms: ["男性保養", "熟齡男性保養", "銀髮保養"],
    source: {
      label: "富康活力藥局商品資料",
      url: "https://shop.fu-kang.com/product_detail?product_sn=2217",
    },
  },
  {
    slug: "entineng-230",
    name: "恩體能",
    aliases: ["恩體能-GPH", "恩體能山楂膠囊", "ANTI-NEL GPH"],
    form: "膠囊",
    spec: "230粒",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: ["山楂萃取液"],
    indications: [],
    nutritionFocus: "山楂配方的循環日常保養",
    nutritionFocusEn: "Hawthorn-based daily circulation wellness",
    searchTerms: ["循環保養", "心血管保養", "山楂營養補給"],
    source: {
      label: "大墩藥局商品資料",
      url: "https://mall.iopenmall.tw/010419/index.php?action=product_detail&prod_no=P1041909447429",
    },
  },
  {
    slug: "jinjiweichang-60",
    name: "進磯為常-D",
    aliases: ["進磯為常", "進磯為常D", "松花青素酵素"],
    form: "膠囊",
    spec: "60粒",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: ["松花青素", "綜合酵素"],
    indications: [],
    nutritionFocus: "綜合酵素營養補給",
    nutritionFocusEn: "Mixed-enzyme nutrition supplement",
    searchTerms: ["酵素補充", "綜合酵素", "日常營養補給"],
    source: {
      label: "康鈺藥局產品資料",
      url: "https://www.pharmintw.com/product_cg369256.html",
    },
  },
  {
    slug: "keqiqing-capsule",
    name: "克氣清膠囊",
    aliases: ["克氣清咳嗽膠囊", "克氣清", "合氣清", "LAKALIN"],
    form: "軟膠囊",
    spec: "規格待確認",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: ["薄荷油", "甘草", "療肺草", "百里香萃取", "接骨木萃取", "鼠尾草萃取", "紫蘇葉"],
    indications: [],
    nutritionFocus: "呼吸道日常保養",
    nutritionFocusEn: "Daily respiratory wellness",
    searchTerms: ["呼吸道保養", "換季保養", "粉塵環境保養"],
    source: {
      label: "麗登藥妝產品資料",
      url: "https://www.citycare.com.tw/product/lakalin-sp02/",
    },
  },
  {
    // 合作藥局確認的只有品名與規格；150 粒來源不能延伸到這個 60 粒 SKU。
    slug: "huzhikang-60",
    name: "護智慷",
    aliases: ["護智康"],
    form: "劑型待確認",
    spec: "60粒",
    licenseNo: "",
    drugClass: "待確認",
    category: "partner-item",
    ingredients: [],
    indications: [],
    nutritionFocus: "營養補充定位待確認",
    nutritionFocusEn: "Nutrition positioning pending verification",
    searchTerms: [],
  },
  {
    slug: "huzhikang-150",
    name: "護智慷",
    aliases: ["護智康", "PROMETAN-G"],
    form: "軟膠囊",
    spec: "150粒",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: ["磷脂醯絲胺酸", "L-絲胺酸", "大豆油", "卵磷脂"],
    indications: [],
    nutritionFocus: "PS 磷脂醯絲胺酸營養補給",
    nutritionFocusEn: "Phosphatidylserine nutrition",
    searchTerms: ["思緒保養", "腦部營養補給", "專注保養"],
    source: {
      label: "歐頤康實體藥局商品資料",
      url: "https://www.rakuten.com.tw/shop/oecom/product/2064750/",
    },
  },
  {
    slug: "top-fish-oil-60",
    name: "TOP高單位頂級魚油軟膠囊",
    aliases: ["TOP高單位頂級魚油", "TOP FISH OIL SOFTGEL"],
    form: "軟膠囊",
    spec: "60顆",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: ["魚油", "維生素E"],
    indications: [],
    nutritionFocus: "魚油與維生素 E 營養補給",
    nutritionFocusEn: "Fish oil and vitamin E nutrition",
    searchTerms: ["魚油", "營養補給"],
    source: {
      label: "承霖興業產品資料",
      url: "https://chanlin.tw/Product_detail-68",
    },
  },
  {
    slug: "guanlihu-60",
    name: "關立護",
    aliases: ["關立護錠"],
    form: "劑型待確認",
    spec: "60錠",
    licenseNo: "",
    drugClass: "待確認",
    category: "partner-item",
    ingredients: [],
    indications: [],
    nutritionFocus: "營養補充定位待確認",
    nutritionFocusEn: "Nutrition positioning pending verification",
    searchTerms: [],
  },
  {
    slug: "kimura-tiancheng-60",
    name: "木村 添誠膠囊食品",
    aliases: ["木村添誠", "添誠膠囊食品"],
    form: "劑型待確認",
    spec: "60粒",
    licenseNo: "",
    drugClass: "待確認",
    category: "partner-item",
    ingredients: [],
    indications: [],
    nutritionFocus: "營養補充定位待確認",
    nutritionFocusEn: "Nutrition positioning pending verification",
    searchTerms: [],
  },
  {
    slug: "shuwei-600-fish-oil-60",
    name: "舒維-600魚油",
    aliases: ["舒維600魚油", "舒維－600魚油", "舒維魚油膠囊", "EPA 600 CAPSULES"],
    form: "膠囊",
    spec: "60粒",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: ["魚油", "維生素E", "大豆油"],
    indications: [],
    nutritionFocus: "魚油營養補給",
    nutritionFocusEn: "Fish oil nutrition",
    searchTerms: ["魚油", "EPA", "DHA", "營養補給"],
    source: {
      label: "輸入錠狀膠囊狀食品查驗登記資料",
      url: "https://data.zhupiter.com/oddt/18807807/%E8%88%92%E7%B6%AD%E9%AD%9A%E6%B2%B9%E8%86%A0%E5%9B%8A/",
    },
  },
  {
    slug: "baiyi-capsule-60",
    name: "百益膠囊食品",
    aliases: ["百益膠囊"],
    form: "膠囊",
    spec: "60粒",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: ["山藥子粉", "藍莓粉", "決明子粉", "大豆卵磷脂", "枸杞子粉", "菊花粉", "紅藻萃取物"],
    indications: [],
    nutritionFocus: "多種植物來源成分的日常營養補給",
    nutritionFocusEn: "Daily nutrition from a blend of plant-derived ingredients",
    searchTerms: ["日常營養補給", "藍莓", "枸杞", "菊花"],
    source: {
      label: "康健知識庫產品資料",
      url: "https://kb.commonhealth.com.tw/supplements/3835.html",
    },
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

/**
 * 完整品名／別名優先於症狀詞分流。例：「克氣清咳嗽膠囊」是店家提供的
 * 完整舊品名，不能因為字串裡有「咳嗽」就被誤判成只在描述症狀；單獨搜
 * 「咳嗽」仍然會走安全分流。
 */
export function exactDrugMatches(query: string): Drug[] {
  const q = normalizeSearchText(query.trim());
  if (!q) return [];

  return DRUGS.filter((drug) => {
    const names = [drug.name, ...drug.aliases, drug.nameEn ?? ""];
    return names.some((name) => {
      if (!name) return false;
      const normalizedName = normalizeSearchText(name);
      return q === normalizedName || q === normalizeSearchText(`${name} ${drug.spec}`);
    });
  });
}

/** 搜尋：品名 / 英文名 / 規格 / 成分 / 適應症 都吃。 */
function haystack(d: Drug): string {
  const en = drugCopy(d, "en");
  return normalizeSearchText([
    d.name,
    `${d.name} ${d.spec}`,
    ...d.aliases,
    d.nameEn ?? "",
    d.form,
    d.spec,
    ...d.ingredients,
    ...d.indications,
    d.nutritionFocus,
    ...d.searchTerms,
    en.name,
    `${en.name} ${en.spec}`,
    en.form,
    en.spec,
    ...en.ingredients,
    ...en.indications,
    d.nutritionFocusEn,
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

  const exact = exactDrugMatches(raw);
  if (exact.length > 0) return exact;

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
