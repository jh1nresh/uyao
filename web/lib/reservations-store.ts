import { randomBytes } from "node:crypto";

import * as kv from "./kv";

/**
 * 預留的可讀取儲存。
 *
 * `record.ts` 是「只寫出去」的 sink —— 資料送到 webhook 就沒了，讀不回來。
 * 但取貨頁要回答「這筆確認了沒」，那必須讀得到，所以需要另一層。
 *
 * 兩個 driver，跟 record.ts 同一套思路：
 *   kv    設了 KV_REST_API_URL / KV_REST_API_TOKEN 就用（Vercel KV / Upstash，
 *         純 REST 呼叫，不用裝 SDK）
 *   file  本機 dev 寫 .data/reservations/。線上必定失敗（唯讀檔案系統），
 *         這是預期的
 *
 * 沒有任何 driver 可用時，取貨頁會顯示「查不到這筆預留」而不是假裝成功 ——
 * 讓人拿著一張看起來正常的頁面去店裡撲空，比直接說查不到更糟。
 */

export type ReservationStatus =
  | "pending_store_confirm"
  | "confirmed"
  | "rejected_no_stock"
  | "cancelled_by_user";

export interface StoredReservation {
  /** 網址用的不可猜 token。取貨碼只有 26,000 種組合，直接當網址會被爆搜出別人的電話。 */
  token: string;
  /** 給櫃檯唸的標籤，如 A-347 */
  code: string;
  drugSlug: string;
  drugName: string;
  drugSpec: string;
  storeSlug: string;
  storeName: string;
  storeAddress: string;
  storeMapsUrl: string;
  storeHours: string;
  /** 藥局遲遲沒回覆時，消費者要打的號碼 */
  storePhone: string;
  priceTwd: number;
  contactKind: "phone";
  contact: string;
  status: ReservationStatus;
  createdAt: string;
  /** 藥局確認的時間；未確認是 null */
  confirmedAt: string | null;
  /** 已經催過藥局的時間。有值就不再重複催。 */
  remindedAt?: string;
  holdHours: number;
  /** 業務示範（/store/[slug]/preview）產生的單。真單不會有這個欄位。 */
  demo?: true;
}

/**
 * 藥局遲遲不回覆是真實會發生的事 —— 老闆在忙，卡片沉下去了。
 * LINE 不提供已讀回報，所以我們無從得知，只能靠時間推斷。
 *
 * 兩個門檻刻意錯開：先催藥局，再叫消費者打電話。倒過來的話，
 * 消費者會在藥局根本還沒被提醒的時候就先被推去打電話。
 */
export const REMIND_STORE_AFTER_MIN = 15;
export const TELL_CONSUMER_AFTER_MIN = 25;

export function minutesSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 60000;
}

export function newToken(): string {
  return randomBytes(12).toString("base64url");
}

/** 到店辨識用：只給尾三碼，不要在頁面上重印完整號碼。 */
export function contactTail(r: Pick<StoredReservation, "contact">): string {
  return r.contact.slice(-3);
}

// ── 對外 ────────────────────────────────────────────────────────────

// 保留 7 天就夠 —— 預留只有 4 小時效期，多留幾天是給人回頭查
const TTL = 7 * 24 * 3600;

const set = (key: string, value: string) => kv.set(key, value, TTL);
const get = (key: string) => kv.get(key);

export const isStoreAvailable = kv.isAvailable;

export async function saveReservation(r: StoredReservation): Promise<void> {
  await set(`r:${r.token}`, JSON.stringify(r));
  // postback 只帶得回取貨碼，需要一條 code → token 的索引
  await set(`c:${r.code}`, r.token);
}

export async function getByToken(token: string): Promise<StoredReservation | null> {
  const raw = await get(`r:${token}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredReservation;
  } catch {
    return null;
  }
}

export async function getByCode(code: string): Promise<StoredReservation | null> {
  const token = await get(`c:${code}`);
  return token ? getByToken(token) : null;
}

/** 覆寫整筆。給 cron 標記「已催過」用。 */
export async function save(r: StoredReservation): Promise<void> {
  await set(`r:${r.token}`, JSON.stringify(r));
}

/** 掃出所有預留。只給 cron 用 —— KEYS 在 key 多時很貴，別放進使用者路徑。 */
export async function allPending(): Promise<StoredReservation[]> {
  const ks = await kv.keys("r:").catch(() => []);
  const out: StoredReservation[] = [];
  for (const k of ks) {
    const raw = await kv.get(k).catch(() => null);
    if (!raw) continue;
    try {
      const r = JSON.parse(raw) as StoredReservation;
      if (r.status === "pending_store_confirm") out.push(r);
    } catch {
      /* 壞掉的那筆跳過，不要讓整個 cron 掛掉 */
    }
  }
  return out;
}

/** 藥局按下確認／沒貨時呼叫。查不到就回 null，呼叫端自己決定怎麼處理。 */
export async function updateStatus(
  code: string,
  status: ReservationStatus,
): Promise<StoredReservation | null> {
  const r = await getByCode(code);
  if (!r) return null;
  const next: StoredReservation = {
    ...r,
    status,
    confirmedAt: status === "confirmed" ? new Date().toISOString() : r.confirmedAt,
  };
  await set(`r:${next.token}`, JSON.stringify(next));
  return next;
}
