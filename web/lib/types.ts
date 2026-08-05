/** 藥品分類 — v1 消費端只呈現成藥/指示藥/非藥品，處方藥不進這個型別。 */
export type DrugClass = "成藥" | "乙類成藥" | "指示藥" | "非藥品";

export type CategorySlug = "patch" | "ointment" | "otc-staple";

export interface Category {
  slug: CategorySlug;
  name: string;
}

/** 目前開放的服務區 —— 跟藥局獲客名單（`data/prospects-*.csv`）的範圍一致。 */
export type AreaSlug = "zhongshan" | "xinyi";

export interface Area {
  slug: AreaSlug;
  /** 完整名稱，如「台北市中山區」 */
  name: string;
  /** 短名，chip 與列表用，如「中山區」 */
  shortName: string;
}

export interface Drug {
  slug: string;
  name: string;
  /** 英文/商品代號，藥品頁 header 用 mono 呈現 */
  nameEn?: string;
  form: string;
  /** 規格，如「20 片/盒」 */
  spec: string;
  /** 衛福部許可證字號。還沒接藥證開放資料，一律空字串 —— 空的就不顯示，
   *  絕不填假號碼：那是可查證的政府識別碼。 */
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

/**
 * `listed` = 在政府開放資料裡、頁面已建立，但還沒裝盒子，因此沒有任何
 * 庫存或價格。`live` = 有掃描流。目前全部是 listed。
 */
export type StoreStatus = "live" | "listed";

/**
 * 營業時段的來源，決定標題要怎麼寫：
 * - `google` → 真正的營業時間
 * - `nhi`    → 健保「固定看診時段」。這是**健保調劑時段不是營業時間**，
 *              門市通常開得更久，所以標題不能寫「營業時間」。
 * - `none`   → 兩邊都沒有
 */
export type HoursSource = "google" | "nhi" | "none";

export interface Store {
  slug: string;
  name: string;
  /** 所在服務區。使用者切換地區時，只有同區的藥局算「附近」。 */
  area: AreaSlug;
  /** 行政區中文名，混區列表要標出來 */
  district: string;
  address: string;
  /** 已正規化成可直接撥的格式；開放資料沒填就是空字串 */
  phone: string;
  owner: string;

  /** 健保署醫事機構代碼 —— 唯一穩定的鍵，改店名也不會變 */
  nhiCode: string | null;
  nhiContracted: boolean;
  /**
   * 健保合約終止日（已過）。可能只是退出健保、也可能整間收掉 ——
   * 開放資料分不出來，要靠 `businessStatus` 定奪，所以絕不寫成「已歇業」。
   */
  nhiTerminatedOn: string | null;

  lat: number | null;
  lng: number | null;
  /**
   * 距所在區中心的公尺數 —— v1 沒有真的定位。跨區不可互相比較。
   * 還沒跑 Google Places 補座標前是 null。
   */
  distanceM: number | null;

  placeId: string | null;
  /** Google 的 businessStatus，`OPERATIONAL` 以外都要在頁面上標示 */
  businessStatus: string | null;

  mapsUrl: string;
  hours: OpeningHours[];
  hoursSource: HoursSource;
  notes: string[];
  status: StoreStatus;
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
