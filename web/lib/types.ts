/**
 * 藥品分類。處方藥不進這個型別。
 *
 * 甲乙類的區分是法規上的分水嶺：**只有乙類成藥可以網路零售**
 * （衛福部 104 年公告《網路零售乙類成藥注意事項》），甲類成藥與指示藥
 * 都不行。
 *
 * 「待確認」是刻意保留的值：食藥署的許可證開放資料只到「成藥」，
 * 不分甲乙，所以公開資料無法判定。在有權威來源之前寧可不標，
 * 標錯比不標更糟 —— 那是可被引用的法規分類。
 */
export type DrugClass =
  | "甲類成藥"
  | "乙類成藥"
  | "指示藥"
  | "非藥品"
  | "待確認";

export type CategorySlug = "partner-item";

export interface Category {
  slug: CategorySlug;
  name: string;
}

/** 目前開放的服務區 —— 跟藥局獲客名單（`data/prospects-*.csv`）的範圍一致。 */
export type AreaSlug =
  | "datong"
  | "linkou"
  | "luzhou"
  | "xinzhuang"
  | "zhongshan"
  | "xinyi"
  | "xitun"
  | "miaoli"
  | "yilan"
  | "luodong";

export interface Area {
  slug: AreaSlug;
  /** 縣市層級，如「臺北市」或「苗栗縣」，供跨區清單分組。 */
  countyCity: string;
  /** 完整名稱，如「台北市中山區」 */
  name: string;
  /** 短名，chip 與列表用，如「中山區」 */
  shortName: string;
}

export interface Drug {
  slug: string;
  name: string;
  /** 常見舊字、通路名或英文商品名；只用於搜尋，不取代畫面上的正式品名。 */
  aliases: string[];
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
  /** 藥品核准適應症。一般食品不得填入保健訴求，所以這批品項保持空陣列。 */
  indications: string[];
  /** 一般食品的營養補充／日常保養定位，不是治療用途或核准適應症。 */
  nutritionFocus: string;
  nutritionFocusEn: string;
  /** 供 deterministic search 使用的保養需求詞；不可放疾病或治療宣稱。 */
  searchTerms: string[];
  /** 合作藥局提供的品牌／製造／供應資訊；未提供時不猜。 */
  manufacturer?: string;
  /** 成品產地文字照資料來源保留；原料來源不得改寫成成品產地。 */
  origin?: string;
  /** 公開核對頁面，或合作藥局提供資料的來源標記。 */
  source?: {
    label: string;
    url?: string;
    kind?: "public" | "partner";
  };
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
export type HoursSource = "google" | "nhi" | "partner" | "none";

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

/**
 * 預留成立後，「藥局到底有沒有被通知」的結果。
 *
 * 只在示範模式回傳給前端 —— 正式路徑吐這個等於公開哪些藥局已經上線。
 * 存在的理由是示範現場沒有時間翻 log：閉環有沒有合上要當場看得見。
 */
export type NotifyResult =
  /** 已寫入獨立 uYao Store demo sandbox，不觸發真實藥局 LINE */
  | "sandboxed"
  /** 已推給藥局的 LINE */
  | "sent"
  /** 這家藥局還沒綁 LINE，不會有人收到 */
  | "unbound"
  /** LINE_CHANNEL_ACCESS_TOKEN / SECRET 沒設 */
  | "not_configured"
  /** 綁了也設了，但 LINE API 擋下來（配額、好友關係、訊息格式）*/
  | "failed";

/** 一筆「某藥在某店」的完整可顯示資料 */
export interface Listing {
  drug: Drug;
  store: Store;
  priceTwd: number;
  badge: StockBadgeSpec;
}
