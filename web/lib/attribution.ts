/**
 * 廣告歸因來源。
 *
 * 為什麼需要：投錢之前必須答得出「這筆需求訊號是哪則廣告帶來的」。
 * 沒有這一層，只會看到 demand 記錄在漲，分不清是廣告還是自然流量
 * ——訊號成本就算不出來（specs/ads-launch-v1.md §8）。
 *
 * 邊界（與 specs/demand-capture.md 的承諾一致，不能放寬）：
 *   - 只讀網址上的 UTM 與平台 click id，加上 referrer 的**主機名**與落地路徑
 *   - 不記 IP、不做指紋、不放 cookie；瀏覽器端只用 sessionStorage，關掉分頁就沒了
 *   - referrer 只留 hostname——完整 referrer URL 可能夾帶別站的查詢字串
 *
 * 這個檔案只放純函式，瀏覽器那一半在 `lib/attribution-client.ts`。
 */

/** 廣告平台自己帶的 click id。有它就一定是付費點擊，比 utm 可靠。 */
export const CLICK_ID_KEYS = ["gclid", "fbclid", "ttclid", "msclkid"] as const;

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

/** 單一欄位上限。廣告平台的 utm 值不該長到這種程度，超過就是灌水或誤用。 */
const MAX_VALUE = 120;
/** 整包欄位數上限，擋掉塞滿未知 key 的請求。 */
const MAX_KEYS = 12;

export type UtmKey = (typeof UTM_KEYS)[number];
export type ClickIdKey = (typeof CLICK_ID_KEYS)[number];

export type AdSource = Partial<Record<UtmKey | ClickIdKey, string>> & {
  /** referrer 的主機名，沒有 referrer（直接輸入網址／App 內開啟）就沒有這個欄位 */
  referrer?: string;
  /** 落地頁路徑，不含查詢字串 */
  landing?: string;
};

const ALLOWED = new Set<string>([...UTM_KEYS, ...CLICK_ID_KEYS]);

function clean(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().slice(0, MAX_VALUE) : "";
}

/** 有沒有任何一個欄位可以證明「這是一次廣告點擊」。 */
export function isPaidClick(source: AdSource | null | undefined): boolean {
  if (!source) return false;
  if (CLICK_ID_KEYS.some((k) => source[k])) return true;
  return Boolean(source.utm_source || source.utm_medium || source.utm_campaign);
}

/** 兩筆歸因是不是同一個廣告來源——用來決定 session 內要不要覆蓋。 */
export function sameCampaign(a: AdSource | null, b: AdSource | null): boolean {
  if (!a || !b) return a === b;
  return UTM_KEYS.every((k) => (a[k] ?? "") === (b[k] ?? ""))
    && CLICK_ID_KEYS.every((k) => (a[k] ?? "") === (b[k] ?? ""));
}

/**
 * 從網址與 referrer 抽出歸因。
 *
 * 完全沒有可記的東西時回 null——直接輸入網址、沒有 referrer、沒有 utm，
 * 記一個空物件只會讓 jsonl 變髒，分析時還要多一層判斷。
 */
export function parseAdSource(url: string, referrer = ""): AdSource | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const source: AdSource = {};
  for (const key of [...UTM_KEYS, ...CLICK_ID_KEYS]) {
    const value = clean(parsed.searchParams.get(key));
    if (value) source[key] = value;
  }

  // referrer 只留主機名。完整 URL 可能帶著別站的查詢字串，那不是我們該存的東西。
  if (referrer) {
    try {
      const host = new URL(referrer).hostname;
      if (host && host !== parsed.hostname) source.referrer = host.slice(0, MAX_VALUE);
    } catch {
      /* 壞掉的 referrer 直接忽略，不是錯誤 */
    }
  }

  const landing = parsed.pathname.slice(0, MAX_VALUE);
  if (landing && landing !== "/") source.landing = landing;

  return Object.keys(source).length > 0 ? source : null;
}

/**
 * 伺服器端收斂：POST body 裡的 `source` 是使用者可控的，一律當不可信輸入。
 *
 * 白名單之外的 key 直接丟掉——這裡不是給前端自由加欄位的地方，
 * 放行等於讓任何人往 demand.jsonl 灌任意內容。
 */
export function normalizeAdSource(raw: unknown): AdSource | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const input = raw as Record<string, unknown>;
  const source: AdSource = {};
  let count = 0;

  for (const [key, value] of Object.entries(input)) {
    if (count >= MAX_KEYS) break;
    if (!ALLOWED.has(key) && key !== "referrer" && key !== "landing") continue;
    const cleaned = clean(value);
    if (!cleaned) continue;
    source[key as UtmKey] = cleaned;
    count += 1;
  }

  return Object.keys(source).length > 0 ? source : null;
}
