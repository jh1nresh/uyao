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
  priceTwd: number;
  contactKind: "phone";
  contact: string;
  status: ReservationStatus;
  createdAt: string;
  /** 藥局確認的時間；未確認是 null */
  confirmedAt: string | null;
  holdHours: number;
  /** 業務示範（/store/[slug]/preview）產生的單。真單不會有這個欄位。 */
  demo?: true;
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
