import * as kv from "./kv";

/**
 * 批號效期這一側：盒子掃到 GS1 AI 17（效期）／AI 10（批號）之後，雲端把
 * 「這家店這支藥的這個批號，效期是哪天」記下來，並算出藥商退貨窗口。
 *
 * 為什麼獨立於 `box.ts`：`box.ts` 記的是「最後一次被掃到」（新鮮度訊號，
 * 一支藥一筆）；這裡記的是批號層級的事實（一支藥可以有多個批號並存）。
 * 兩者的 key 空間、TTL 與語意都不同，混在一起會讓效期被新的掃描覆蓋掉。
 *
 * 誠實邊界與 `box.ts` 同一條：**只記效期，不記數量。** 盒子看得到
 * 「這個批號存在過」，看不到架上還剩幾盒。所以退貨窗口警報講的是
 * 「這個批號快關窗了」，不是「你有 N 盒要退」。
 *
 * KV 邊界（`kv.ts` 開頭那條規矩）：這裡存的是 point lookup 的 key-value，
 * 每個 (store, drug, batch) 一筆、有 TTL、有數量上限，不是掃描事件流。
 * 要做跨店統計或時間序列分析時，該加 Postgres 而不是掃這裡的 key。
 */

/** 藥商退貨窗口預設在效期前 180 天關閉。實際天數各藥商不同 —— README
 *  的 open thread「藥商退貨條件蒐集」就是在收這個數字。收齊之前用一個
 *  可調的預設值，而不是把 180 硬寫進判斷式。 */
const DEFAULT_RETURN_WINDOW_DAYS = 180;

/** 剩幾天內算「該行動了」。這個門檻決定盒子什麼時候亮燈。 */
const DEFAULT_ALERT_DAYS = 30;

/** 效期最遠只留 3 年 —— 再遠的批號現在不需要提醒，過期的也該自己消失。 */
const LOT_TTL = 3 * 365 * 24 * 3600;

const DAY_MS = 86_400_000;

export function returnWindowDays(): number {
  const raw = Number(process.env.BOX_RETURN_WINDOW_DAYS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_RETURN_WINDOW_DAYS;
}

export function alertDays(): number {
  const raw = Number(process.env.BOX_RETURN_ALERT_DAYS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_ALERT_DAYS;
}

/**
 * GS1 AI 17 只有 YYMMDD，日可以是 00（代表「該月最後一天」）。Python 端
 * 的 `parse_gs1_date` 已經處理過，送上來是 ISO `YYYY-MM-DD`。這裡只驗形狀，
 * 不再猜世紀 —— 解析責任留在單一位置。
 */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseExpiry(value: unknown): string | null {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return null;
  const t = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(t)) return null;
  // Date.parse 會把 2026-02-31 收成 3/3，回頭比對才擋得掉不存在的日期
  return new Date(t).toISOString().slice(0, 10) === value ? value : null;
}

/** 批號：GS1 AI 10 最長 20 字元。收窄字元集，因為它會進 KV key。 */
export function normalizeBatch(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 20) return null;
  return /^[A-Za-z0-9._-]+$/.test(trimmed) ? trimmed : null;
}

export type LotStatus =
  /** 退貨窗口還開著，還沒到該提醒的時候 */
  | "open"
  /** 退貨窗口即將關閉 —— 這是唯一需要藥師行動的狀態 */
  | "closing"
  /** 退貨窗口已關，但還沒過期：還能賣，退不掉了 */
  | "window_closed"
  /** 已過期：這批要報廢 */
  | "expired";

export interface LotRecord {
  storeSlug: string;
  drugSlug: string;
  batch: string;
  /** ISO YYYY-MM-DD */
  expiry: string;
  /** 第一次掃到這個批號的時間 */
  firstSeenAt: string;
  lastSeenAt: string;
  demo: boolean;
}

export interface LotAssessment extends LotRecord {
  /** 退貨窗口關閉日 ISO */
  returnWindowClosesAt: string;
  /** 距離窗口關閉還有幾天（負數 = 已關） */
  daysUntilWindowCloses: number;
  daysUntilExpiry: number;
  status: LotStatus;
  /** 藥師需要行動嗎 —— 盒子亮不亮燈看這個 */
  needsAction: boolean;
}

function lotKey(storeSlug: string, drugSlug: string, batch: string): string {
  return `lot:${storeSlug}:${drugSlug}:${batch}`;
}

/** 天數一律無條件捨去到整天，避免同一天因為時分秒不同得到不同答案。 */
function daysBetween(fromMs: number, toMs: number): number {
  return Math.floor((toMs - fromMs) / DAY_MS);
}

export function assessLot(record: LotRecord, now: Date = new Date()): LotAssessment {
  const expiryMs = Date.parse(`${record.expiry}T00:00:00Z`);
  const closesMs = expiryMs - returnWindowDays() * DAY_MS;
  // 用 UTC 當日零點比較，否則同一天內反覆呼叫會得到不同天數
  const nowMs = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);

  const daysUntilWindowCloses = daysBetween(nowMs, closesMs);
  const daysUntilExpiry = daysBetween(nowMs, expiryMs);

  let status: LotStatus;
  if (daysUntilExpiry < 0) status = "expired";
  else if (daysUntilWindowCloses < 0) status = "window_closed";
  else if (daysUntilWindowCloses <= alertDays()) status = "closing";
  else status = "open";

  return {
    ...record,
    returnWindowClosesAt: new Date(closesMs).toISOString().slice(0, 10),
    daysUntilWindowCloses,
    daysUntilExpiry,
    status,
    // 只有 closing 需要行動。已關窗與已過期是壞消息，但按按鈕也救不回來，
    // 不該佔用「需要你」佇列 —— 那會讓藥師學會忽略那盞燈。
    needsAction: status === "closing",
  };
}

/**
 * 記下一個批號。同一批號重複掃只更新 `lastSeenAt`，保留 `firstSeenAt`。
 *
 * 效期衝突時以**新的為準但出聲**：同一批號不該有兩個效期，出現代表
 * 掃描解析錯誤或藥廠重用批號，兩種都需要人看，不能靜默覆蓋。
 */
export async function recordLot(input: {
  storeSlug: string;
  drugSlug: string;
  batch: string;
  expiry: string;
  demo: boolean;
  at?: string;
}): Promise<{ record: LotRecord; isNew: boolean; expiryConflict: string | null }> {
  const at = input.at ?? new Date().toISOString();
  const key = lotKey(input.storeSlug, input.drugSlug, input.batch);

  let existing: LotRecord | null = null;
  try {
    const raw = await kv.get(key);
    if (raw) existing = JSON.parse(raw) as LotRecord;
  } catch {
    // 壞資料當作沒有 —— 重掃就會補回來，不值得讓 ingest 失敗
    existing = null;
  }

  const expiryConflict =
    existing && existing.expiry !== input.expiry ? existing.expiry : null;

  const record: LotRecord = {
    storeSlug: input.storeSlug,
    drugSlug: input.drugSlug,
    batch: input.batch,
    expiry: input.expiry,
    firstSeenAt: existing?.firstSeenAt ?? at,
    lastSeenAt: at,
    demo: input.demo,
  };

  await kv.set(key, JSON.stringify(record), LOT_TTL);
  return { record, isNew: !existing, expiryConflict };
}

/**
 * 一家店的所有批號評估。走 KEYS，**只給 Store OS 後台與 cron 用**，
 * 不要放進消費者請求路徑（理由同 `box.ts` 的 scanSummary）。
 */
export async function lotsForStore(
  storeSlug: string,
  now: Date = new Date(),
): Promise<LotAssessment[]> {
  const ks = await kv.keys(`lot:${storeSlug}:`).catch(() => []);
  const out: LotAssessment[] = [];
  for (const k of ks) {
    const raw = await kv.get(k).catch(() => null);
    if (!raw) continue;
    try {
      const rec = JSON.parse(raw) as LotRecord;
      if (!rec.expiry || !rec.batch || !rec.drugSlug) continue;
      out.push(assessLot(rec, now));
    } catch {
      /* 壞行跳過 */
    }
  }
  // 最急的排前面
  return out.sort((a, b) => a.daysUntilWindowCloses - b.daysUntilWindowCloses);
}

/** 盒子那顆燈要不要亮 —— 只算真實訊號，示範批號不觸發實體警報。 */
export async function actionableLotCount(
  storeSlug: string,
  now: Date = new Date(),
): Promise<number> {
  const lots = await lotsForStore(storeSlug, now);
  return lots.filter((l) => l.needsAction && !l.demo).length;
}
