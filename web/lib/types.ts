/** 藥品分類 — v1 消費端只呈現成藥/指示藥/非藥品，處方藥不進這個型別。 */
export type DrugClass = "成藥" | "乙類成藥" | "指示藥" | "非藥品";

export type CategorySlug = "patch" | "ointment" | "otc-staple";

export interface Category {
  slug: CategorySlug;
  name: string;
}

export interface Drug {
  slug: string;
  name: string;
  /** 英文/商品代號，藥品頁 header 用 mono 呈現 */
  nameEn?: string;
  form: string;
  /** 規格，如「20 片/盒」 */
  spec: string;
  licenseNo: string;
  drugClass: DrugClass;
  category: CategorySlug;
  /** 主成分；同成分替代品用這組字串比對 */
  ingredients: string[];
  indications: string[];
}

export interface OpeningHours {
  label: string;
  hours: string;
}

export interface Store {
  slug: string;
  name: string;
  address: string;
  phone: string;
  /** 與使用者的距離（公尺）。v1 定位固定在台北市大安區。 */
  distanceM: number;
  isOpen: boolean;
  /** 營業中 → 打烊時間；已打烊 → 下次開門 */
  openLabel: string;
  openShort: string;
  hours: OpeningHours[];
  notes: string[];
  /** 庫存最後與盒子同步的時間，藥局頁顯示 */
  lastSyncLabel: string;
  mapsUrl: string;
  /** 示意地圖上的相對位置（%），正式版接圖資後由經緯度換算 */
  mapPos: { x: number; y: number };
}

export interface Offer {
  drugSlug: string;
  storeSlug: string;
  /** 藥局自報價（新台幣）。實際以門市為準。 */
  priceTwd: number;
  /**
   * 距最近一次盒子掃描到這個品項的天數；null = 該店沒有近期掃描紀錄。
   * 正式版由掃描流的 timestamp 換算，這裡用固定值讓 render 不依賴時鐘。
   */
  daysSinceScan: number | null;
}

export type StockTier = "fresh" | "stale" | "unknown";

export interface StockBadgeSpec {
  tier: StockTier;
  char: "●" | "○" | "？";
  text: string;
  /** 藥局頁 grid 用的短標籤 */
  shortText: string;
}

/** 一筆「某藥在某店」的完整可顯示資料 */
export interface Listing {
  drug: Drug;
  store: Store;
  priceTwd: number;
  badge: StockBadgeSpec;
}
