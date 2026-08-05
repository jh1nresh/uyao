import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import * as kv from "./kv";

/**
 * 表單與需求訊號的唯一出口。
 *
 * 為什麼不是單純寫檔：Vercel 的 `/var/task` 是唯讀的，`mkdir` 直接 ENOENT，
 * 結果是 API 回 200、畫面顯示成功、**資料靜默遺失**。所以這裡改成「送到所有
 * 設定好的 sink，全部失敗才退回 log」。
 *
 * 不變條件：**任何一筆資料都不會無聲消失。** 全部 sink 都失敗時一定會印出
 * 單行 `UYAO_RECORD <kind> {...}`，可以用
 * `vercel logs <url> --json | python3 -m pharmabox.demand --stdin` 撈回來。
 *
 * 目前實作的 sink：
 *   kv        設了 KV_REST_API_* 就用。這是線上唯一存得住的地方。
 *   fs        本機 dev 寫 `.data/<kind>.jsonl`。線上必定失敗，這是預期的。
 *   webhook   設了 `RECORD_WEBHOOK_URL` 就送。任何吃 JSON POST 的端點都行
 *             （Slack / Discord / Zapier / n8n / 自架）。
 *             `PILOT_WEBHOOK_URL` 可單獨覆蓋藥局試點申請 —— 那是掉單代價
 *             最高的一種，通常要送到會跳通知的地方。
 *
 * 要加 Postgres 就在 SINKS 多一個函式，其餘不用動。掃描流真的開始之後
 * 就是加它的時機 —— 那份資料要 join 要 group by，不該塞進 KV。
 */
export type RecordKind = "demand" | "pilot" | "reservations" | "line_bind";

export const LOG_SENTINEL = "UYAO_RECORD";

/** webhook 不能拖垮請求；送不出去就當這個 sink 失敗。 */
const WEBHOOK_TIMEOUT_MS = 3000;

function webhookUrl(kind: RecordKind): string | undefined {
  if (kind === "pilot" && process.env.PILOT_WEBHOOK_URL) {
    return process.env.PILOT_WEBHOOK_URL;
  }
  return process.env.RECORD_WEBHOOK_URL || undefined;
}

/** 給人看的一行摘要 —— webhook 收到的通常是聊天訊息，不是資料表。 */
function summarize(kind: RecordKind, record: Record<string, unknown>): string {
  if (kind === "pilot") {
    return `🏥 藥局試點申請：${record.name}（${record.area || "未填區域"}）· ${record.contact}`;
  }
  if (kind === "demand") {
    const what = record.drugSlug ? `${record.query}（${record.drugSlug}）` : record.query;
    const who = record.contact ? ` · 留了 ${record.contact}` : "";
    return `🔍 落空搜尋 [${record.kind}] ${what} @ ${record.area}${who}`;
  }
  if (kind === "line_bind") {
    // 綁定要人工確認，所以摘要要直接給出可貼進環境變數的那段
    return (
      `🔗 藥局要求綁定 LINE：${record.storeName}（${record.address}）\n` +
      `確認無誤後把這段併進 LINE_STORE_BINDINGS：` +
      `{"${record.userId}":"${record.storeSlug}"}`
    );
  }
  return `📦 預留 ${record.code ?? ""} ${record.drugSlug ?? ""} @ ${record.storeSlug ?? ""}`;
}

async function toFile(kind: RecordKind, record: object): Promise<void> {
  const file = path.join(process.cwd(), ".data", `${kind}.jsonl`);
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify(record)}\n`, "utf8");
}

async function toWebhook(kind: RecordKind, record: object): Promise<void> {
  const url = webhookUrl(kind);
  if (!url) throw new Error("no webhook configured");

  const text = summarize(kind, record as Record<string, unknown>);
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    // text 給 Slack、content 給 Discord、record 給程式讀 —— 一份 payload 三邊通吃
    body: JSON.stringify({ kind, text, content: text, record }),
    signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`webhook ${res.status}`);
}

/**
 * KV sink —— 線上唯一真正存得住的那個。
 * fs 在 Vercel 必定失敗（唯讀），webhook 要另外設，所以在有 KV 之前
 * 所有資料其實只活在會過期的 log 裡。
 */
async function toKv(kind: RecordKind, record: object): Promise<void> {
  if (!kv.isAvailable()) throw new Error("KV 未設定");
  await kv.append(`rec:${kind}`, JSON.stringify({ ...record, _at: new Date().toISOString() }));
}

const SINKS: Array<[string, (k: RecordKind, r: object) => Promise<void>]> = [
  ["kv", toKv],
  ["fs", toFile],
  ["webhook", toWebhook],
];

export async function appendRecord(kind: RecordKind, record: object): Promise<void> {
  const results = await Promise.allSettled(
    SINKS.map(([, write]) => write(kind, record)),
  );

  const failures = results
    .map((r, i) => (r.status === "rejected" ? `${SINKS[i][0]}: ${String(r.reason).slice(0, 120)}` : null))
    .filter((x): x is string => x !== null);

  if (failures.length < SINKS.length) {
    // 至少有一個 sink 收下了。線上通常是 webhook 成功、fs 失敗，
    // 那是預期狀況，不值得每筆都吵。
    return;
  }

  // 全滅 —— 一定要把資料本身印出來，這是最後一道防線
  console.log(`${LOG_SENTINEL} ${kind} ${JSON.stringify(record)}`);
  console.error(
    `[${kind}] 所有 sink 都失敗，資料只存在於這行 log（保留期有限，不是持久化）`,
    failures.join(" | "),
  );
}
