import { randomInt } from "node:crypto";

import * as kv from "./kv";

/**
 * 藥局 ↔ LINE userId 的綁定。
 *
 * 原本存在 `LINE_STORE_BINDINGS` 環境變數裡，代表**每談成一家藥局都要
 * 開終端機貼 JSON、再重新部署一次** —— 在藥局櫃檯前面做這件事很蠢。
 * 改成存 KV，核可流程仍然保留人工，只是變成你在 LINE 回一句話。
 *
 * 為什麼還要人工核可：任何人都能傳「惠民藥局」。自動綁定的話，冒名者
 * 就能把那家的預留單接走。核可一次的成本遠低於接錯的代價。
 *
 * 舊的環境變數仍然讀得到（KV 沒有時的 fallback），不會因為這次改動
 * 讓已經綁好的藥局斷掉。
 */

const PENDING_TTL = 7 * 24 * 3600;

export interface PendingBind {
  /** 給你在 LINE 回覆用的短碼，如 B-42 */
  ref: string;
  userId: string;
  storeSlug: string;
  storeName: string;
  address: string;
  requestedAt: string;
}

function envBindings(): Record<string, string> {
  const raw = process.env.LINE_STORE_BINDINGS;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    console.error("[bindings] LINE_STORE_BINDINGS 不是合法 JSON，忽略");
  }
  return {};
}

/** 你自己的 LINE userId，逗號分隔。只有這些人講的話會被當成核可指令。 */
export function isAdmin(userId: string): boolean {
  return (process.env.LINE_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(userId);
}

export async function storeForUser(userId: string): Promise<string | undefined> {
  const fromKv = await kv.get(`bind:user:${userId}`).catch(() => null);
  return fromKv ?? envBindings()[userId];
}

export async function userForStore(storeSlug: string): Promise<string | undefined> {
  const fromKv = await kv.get(`bind:store:${storeSlug}`).catch(() => null);
  if (fromKv) return fromKv;
  return Object.entries(envBindings()).find(([, slug]) => slug === storeSlug)?.[0];
}

export async function boundCount(): Promise<number> {
  const fromKv = await kv.keys("bind:user:").catch(() => []);
  return fromKv.length + Object.keys(envBindings()).length;
}

/** 藥局傳店名比對成功 → 建一筆待核可。回傳給你在 LINE 回覆用的短碼。 */
export async function requestBind(
  userId: string,
  store: { slug: string; name: string; address: string },
): Promise<PendingBind> {
  const ref = `B-${String(randomInt(100)).padStart(2, "0")}`;
  const pending: PendingBind = {
    ref,
    userId,
    storeSlug: store.slug,
    storeName: store.name,
    address: store.address,
    requestedAt: new Date().toISOString(),
  };
  await kv.set(`bind:pending:${ref}`, JSON.stringify(pending), PENDING_TTL);
  return pending;
}

export async function getPending(ref: string): Promise<PendingBind | null> {
  const raw = await kv.get(`bind:pending:${ref.toUpperCase()}`).catch(() => null);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingBind;
  } catch {
    return null;
  }
}

/** 核可 —— 雙向都寫，之後查誰是哪家、哪家是誰都是一次讀取。 */
export async function approve(ref: string): Promise<PendingBind | null> {
  const p = await getPending(ref);
  if (!p) return null;
  await kv.set(`bind:user:${p.userId}`, p.storeSlug);
  await kv.set(`bind:store:${p.storeSlug}`, p.userId);
  await kv.del(`bind:pending:${p.ref}`);
  return p;
}
