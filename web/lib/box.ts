import * as kv from "./kv";
import { stockBadge } from "./stock";
import type { StockBadgeSpec } from "./types";

/**
 * 盒子掃描流的雲端這一側：收下 ingest 進來的掃描事件、維護「這家店這支藥
 * 最後一次被掃到是什麼時候」，以及餵 /console 的決策流水。
 *
 * 誠實邊界跟 stock.ts 同一條：**只記掃描新鮮度，不記數量。** 盒子看得到
 * 「有東西被掃過」，看不到架上還剩幾盒 —— 數量是估計值，不進系統。
 */

// ── GTIN → 藥品 ─────────────────────────────────────────────────────
//
// 示範用對照表。這些 GTIN 是**編出來的測試碼**（04712345678901 這種連號
// 一眼假），只給模擬掃描用 —— 目錄裡的 Drug 不放 gtin 欄位，理由跟
// licenseNo 一樣：那是可查證的識別碼，寧缺勿假。真實對照要靠試點藥局
// 第一次掃到時人工建檔（掃描器打出來的 GTIN + 藥師說這是哪支藥）。
const SIM_GTIN_TO_DRUG: Record<string, string> = {
  "04712345678901": "hugu-gaishu-100",
  "04712345678902": "shengkangning-150",
  "04712345678903": "entineng-230",
  "04712345678904": "jinjiweichang-60",
  "04712345678905": "keqiqing-capsule",
};
export interface GtinDrugMatch {
  drugSlug: string;
  /** 目前唯一對照表是編造的 demo GTIN，不能被誤當成真實商品主檔。 */
  demo: true;
}

/** GTIN-14 與 EAN-13 差在前導 0 —— 比對一律去掉前導 0。 */
export function drugMatchForGtin(gtin: string): GtinDrugMatch | null {
  const norm = gtin.replace(/^0+/, "");
  for (const [g, slug] of Object.entries(SIM_GTIN_TO_DRUG)) {
    if (g.replace(/^0+/, "") === norm) return { drugSlug: slug, demo: true };
  }
  return null;
}

// ── 掃描狀態 ────────────────────────────────────────────────────────

// 徽章邏輯 7 天就降回「待確認」，狀態多留幾週是給 console 回顧用
const SCAN_TTL = 30 * 24 * 3600;

interface StoredScanSignal {
  at: string;
  kind: "receiving";
  demo: boolean;
}

export async function recordReceivingScan(
  storeSlug: string,
  drugSlug: string,
  demo = false,
): Promise<void> {
  const signal: StoredScanSignal = { at: new Date().toISOString(), kind: "receiving", demo };
  await kv.set(`scan:${storeSlug}:${drugSlug}`, JSON.stringify(signal), SCAN_TTL);
}

export interface ScanRow {
  storeSlug: string;
  drugSlug: string;
  lastScanAt: string;
  daysSinceScan: number;
  badge: StockBadgeSpec;
  kind: "receiving";
  demo: boolean;
}

/** console 用的現況總表。走 KEYS，不要放進消費者請求的路徑上。 */
export async function scanSummary(): Promise<ScanRow[]> {
  const ks = await kv.keys("scan:").catch(() => []);
  const rows: ScanRow[] = [];
  for (const k of ks) {
    const raw = await kv.get(k).catch(() => null);
    if (!raw) continue;
    let signal: StoredScanSignal;
    let hasExplicitDemo = false;
    try {
      const parsed = JSON.parse(raw) as Partial<StoredScanSignal>;
      if (!parsed.at || parsed.kind !== "receiving") continue;
      hasExplicitDemo = typeof parsed.demo === "boolean";
      signal = {
        at: parsed.at,
        kind: "receiving",
        // 舊資料沒有 demo 欄位；目前舊對照表只有假 GTIN，對到那些 slug 時
        // 寧可標示範，不能把歷史 demo 誤升格成真實進貨。
        demo: parsed.demo === true,
      };
    } catch {
      // Existing local demo state stored only the ISO timestamp.
      signal = { at: raw, kind: "receiving", demo: true };
    }
    // key 形狀是 scan:<store>:<drug>，兩個 slug 本身都不含冒號
    const [, storeSlug, drugSlug] = k.split(":");
    if (!storeSlug || !drugSlug) continue;
    const days = (Date.now() - new Date(signal.at).getTime()) / 86_400_000;
    rows.push({
      storeSlug,
      drugSlug,
      lastScanAt: signal.at,
      daysSinceScan: days,
      badge: stockBadge(days),
      kind: "receiving",
      // 在 demo 欄位加入之前，唯一可寫入目錄 slug 的 GTIN 對照就是假碼。
      // 舊 `{at, kind}` 訊號一律保守標示範，避免歷史 demo 被誤升格成真實進貨。
      demo: signal.demo || !hasExplicitDemo,
    });
  }
  return rows.sort((a, b) => b.lastScanAt.localeCompare(a.lastScanAt));
}

// ── 決策流水 ────────────────────────────────────────────────────────
//
// /console 的資料源。每一行都是系統**真的做了**的事 —— 這裡不是行銷
// 動畫，是把原本埋在 console.error 和 LINE 聊天室裡的決策攤到看得見
// 的地方。所以規矩只有兩條：做了才記，記的不含個資（手機號碼禁入）。

const LOG_KEY = "console:log";
const LOG_KEEP = 500;

export interface ConsoleEvent {
  at: string;
  /** 一個 emoji，讓流水掃一眼就分得出訊號類型 */
  icon: string;
  msg: string;
  msgEn?: string;
  demo?: true;
}

/**
 * fire-and-forget：console 流水斷了不能拖垮正事（預留、推播）。
 * 但失敗要出聲 —— 靜默吞錯誤這個坑踩過一次了。
 */
export function logConsole(
  icon: string,
  msg: string,
  msgEn?: string,
  options: { demo?: boolean } = {},
): void {
  const e: ConsoleEvent = {
    at: new Date().toISOString(),
    icon,
    msg,
    msgEn,
    ...(options.demo ? { demo: true as const } : {}),
  };
  kv.append(LOG_KEY, JSON.stringify(e), LOG_KEEP).catch((err) =>
    console.error("[console] 流水寫入失敗", String(err).slice(0, 200)),
  );
}

/** 新到舊。給 /console 與 feed API 用。 */
export async function recentEvents(n = 200): Promise<ConsoleEvent[]> {
  const lines = await kv.lastN(LOG_KEY, n).catch(() => []);
  const out: ConsoleEvent[] = [];
  for (const line of lines) {
    try {
      const e = JSON.parse(line) as ConsoleEvent;
      if (e.at && e.msg) out.push(e);
    } catch {
      /* 壞行跳過 */
    }
  }
  return out.reverse();
}
