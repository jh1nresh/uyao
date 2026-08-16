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
  | "cancelled_by_user"
  | "picked_up"
  | "expired";

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
  /** 藥局回報已交付的時間。有值代表這筆圓滿結束，不該再催也不算放鳥。 */
  pickedUpAt?: string;
  /** 已經催過藥局的時間。有值就不再重複催。 */
  remindedAt?: string;
  holdHours: number;
  /** 逾期的時間。有值代表已經被 cron 掃過，不會重複處理。 */
  expiredAt?: string;
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

/**
 * 藥局一直不回覆的話，這筆也不能永遠掛著。給的時間比保留時數寬鬆 ——
 * 藥局可能只是隔天早上才看到訊息。
 */
export const EXPIRE_UNANSWERED_AFTER_HOURS = 12;

/**
 * 放鳥幾次要停權。文案上寫「兩次」，這裡就是兩次 —— 不能讓畫面上的規則
 * 是空話。只算「藥局已經確認、東西真的留在櫃檯」卻沒去拿的那種；藥局
 * 從沒確認的不算消費者的錯。
 */
export const NO_SHOW_LIMIT = 2;
const NO_SHOW_TTL = 90 * 24 * 3600;

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

function storeReservationKey(storeSlug: string): string {
  // 不放在 `r:` namespace，避免 cron 的 active reservation 掃描把 Redis list
  // 當成單筆 JSON GET，產生 WRONGTYPE。
  return `store-reservations:${Buffer.from(storeSlug, "utf8").toString("base64url")}`;
}

export const isStoreAvailable = kv.isAvailable;

export async function saveReservation(r: StoredReservation): Promise<void> {
  await set(`r:${r.token}`, JSON.stringify(r));
  // postback 只帶得回取貨碼，需要一條 code → token 的索引
  await set(`c:${r.code}`, r.token);
  // Store OS 的 inbox 不能在每次請求掃完整個 KV。只在新單建立時附加一次，
  // 讀取時再以 token 取最新狀態；舊 token 過期後會自然被略過。
  await kv.append(storeReservationKey(r.storeSlug), r.token, 500);
}

export interface StoreReservationSummary {
  code: string;
  drugName: string;
  drugSpec: string;
  priceTwd: number;
  contactTail: string;
  status: ReservationStatus;
  createdAt: string;
  confirmedAt: string | null;
}

/**
 * 只回傳該門市的最小 inbox 欄位。完整電話與 consumer capability token
 * 永遠不離開 server，demo 單也不混進正式店務。
 */
export async function listStoreReservations(
  storeSlug: string,
  limit = 50,
): Promise<StoreReservationSummary[]> {
  const tokens = await kv.lastN(storeReservationKey(storeSlug), Math.min(Math.max(limit, 1), 100));
  const out: StoreReservationSummary[] = [];
  const seen = new Set<string>();

  for (const token of [...tokens].reverse()) {
    if (seen.has(token)) continue;
    seen.add(token);
    const reservation = await getByToken(token).catch(() => null);
    if (!reservation || reservation.storeSlug !== storeSlug || reservation.demo) continue;
    out.push({
      code: reservation.code,
      drugName: reservation.drugName,
      drugSpec: reservation.drugSpec,
      priceTwd: reservation.priceTwd,
      contactTail: contactTail(reservation),
      status: reservation.status,
      createdAt: reservation.createdAt,
      confirmedAt: reservation.confirmedAt,
    });
  }
  return out;
}

/**
 * 取一個目前沒被佔用的取貨碼。
 *
 * `A-347` 只有 26,000 種組合，而 code → token 的索引是直接覆寫的。撞到的話
 * 藥局按「確認 A-347」會確認到**別人的那筆** —— 靜默的資料錯亂，不會報錯，
 * 只會讓某個人的藥被別人領走。100 筆同時活躍就有 17% 機率撞到。
 *
 * 撞了就重抽。抽不到就讓呼叫端知道，不要硬塞一個會蓋掉別人的碼。
 */
export async function reserveUniqueCode(
  generate: () => string,
  attempts = 8,
): Promise<string | null> {
  for (let i = 0; i < attempts; i += 1) {
    const code = generate();
    const taken = await get(`c:${code}`).catch(() => null);
    if (!taken) return code;
  }
  return null;
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

/**
 * 掃出還在流程中的預留（待確認 + 已確認）。只給 cron 用 ——
 * KEYS 在 key 多時很貴，別放進使用者請求的路徑上。
 */
export async function allActive(): Promise<StoredReservation[]> {
  const ks = await kv.keys("r:").catch(() => []);
  const out: StoredReservation[] = [];
  for (const k of ks) {
    const raw = await kv.get(k).catch(() => null);
    if (!raw) continue;
    try {
      const r = JSON.parse(raw) as StoredReservation;
      if (r.status === "pending_store_confirm" || r.status === "confirmed") out.push(r);
      // picked_up 是終態，不進 cron 的掃描範圍
    } catch {
      /* 壞掉的那筆跳過，不要讓整個 cron 掛掉 */
    }
  }
  return out;
}

/**
 * 這筆該逾期了嗎？已確認的算保留時數，沒回覆的給比較寬鬆的窗口。
 *
 * 已交付（picked_up）與所有終態都不會逾期 —— 少了這一條，每一筆**成功**
 * 的取貨最後都會推一則假的「逾期未取」給藥局，而且在真的來拿貨的消費者
 * 身上記一次放鳥。
 */
export function isExpired(r: StoredReservation): boolean {
  if (r.status === "confirmed" && r.confirmedAt) {
    return minutesSince(r.confirmedAt) > r.holdHours * 60;
  }
  if (r.status === "pending_store_confirm") {
    return minutesSince(r.createdAt) > EXPIRE_UNANSWERED_AFTER_HOURS * 60;
  }
  return false;
}

// ── 放鳥計數 ────────────────────────────────────────────────────────
//
// 用手機號當鍵。沒有登入所以這是我們唯一穩定的識別，換號碼就能繞過 ——
// 但這個機制的目的是讓「常態性放鳥」有成本，不是防堵刻意規避的人。

export async function noShowCount(phone: string): Promise<number> {
  const raw = await kv.get(`noshow:${phone}`).catch(() => null);
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

export async function bumpNoShow(phone: string): Promise<number> {
  const next = (await noShowCount(phone)) + 1;
  await kv.set(`noshow:${phone}`, String(next), NO_SHOW_TTL);
  return next;
}

/** 藥局按下確認／沒貨時呼叫。查不到就回 null，呼叫端自己決定怎麼處理。 */
export async function updateStatus(
  code: string,
  status: ReservationStatus,
): Promise<StoredReservation | null> {
  const r = await getByCode(code);
  if (!r) return null;
  const now = new Date().toISOString();
  const next: StoredReservation = {
    ...r,
    status,
    confirmedAt: status === "confirmed" ? now : r.confirmedAt,
    pickedUpAt: status === "picked_up" ? now : r.pickedUpAt,
  };
  await set(`r:${next.token}`, JSON.stringify(next));
  return next;
}
