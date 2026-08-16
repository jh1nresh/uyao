import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * 極簡 KV。兩個 driver：
 *   upstash  設了 KV_REST_API_URL / KV_REST_API_TOKEN 就用（純 REST，不裝 SDK）
 *   file     本機 dev 寫 .data/kv/。線上必定失敗（Vercel 檔案系統唯讀），這是預期的
 *
 * 刻意只做 get/set/del/list —— 這裡存的是預留、綁定、需求訊號，都是
 * key-value 形狀。**盒子的掃描流不要進這裡**：那是 store × drug × 時間的
 * 關聯資料，要 join 要 group by，屆時該加 Postgres 而不是把它塞進 Redis。
 */

/**
 * 測試用的記憶體 driver。沒有它的話單元測試會去寫 `.data/`，測試之間
 * 互相污染（實測踩過：節流測試被前一輪的計數影響，結果非單調）。
 */
const memory = new Map<string, string>();
const useMemory = () => process.env.NODE_ENV === "test";

export function __resetForTests(): void {
  memory.clear();
}

function config(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

export function isAvailable(): boolean {
  return Boolean(config()) || process.env.NODE_ENV !== "production";
}

async function command(args: (string | number)[]): Promise<unknown> {
  const cfg = config();
  if (!cfg) throw new Error("KV 未設定");
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${cfg.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`KV ${res.status}`);
  return ((await res.json()) as { result?: unknown }).result;
}

function filePath(key: string): string {
  // key 只會是 base64url、取貨碼、subscription hash 這類字元，還是擋一下路徑穿越
  const safe = key.replace(/[^A-Za-z0-9_:.-]/g, "_");
  return path.join(process.cwd(), ".data", "kv", `${safe}.json`);
}

export async function get(key: string): Promise<string | null> {
  if (useMemory()) return memory.get(key) ?? null;
  if (config()) {
    const r = await command(["GET", key]);
    return typeof r === "string" ? r : null;
  }
  try {
    return await readFile(filePath(key), "utf8");
  } catch {
    return null;
  }
}

export async function set(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (useMemory()) {
    memory.set(key, value);
    return;
  }
  if (config()) {
    await command(ttlSeconds ? ["SET", key, value, "EX", ttlSeconds] : ["SET", key, value]);
    return;
  }
  const p = filePath(key);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, value, "utf8");
}

/** 只在 key 不存在時寫入；用於會觸發外部動作的 idempotency claim。 */
export async function setIfAbsent(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<boolean> {
  if (useMemory()) {
    if (memory.has(key)) return false;
    memory.set(key, value);
    return true;
  }
  if (config()) {
    const result = await command(["SET", key, value, "NX", "EX", ttlSeconds]);
    return result === "OK";
  }
  const existing = await get(key);
  if (existing !== null) return false;
  await set(key, value, ttlSeconds);
  return true;
}

export async function del(key: string): Promise<void> {
  if (useMemory()) {
    memory.delete(key);
    return;
  }
  if (config()) {
    await command(["DEL", key]);
    return;
  }
  try {
    const { unlink } = await import("node:fs/promises");
    await unlink(filePath(key));
  } catch {
    /* 本來就不存在 */
  }
}

/** 附加到 list 尾端，並修剪長度上限 —— 需求訊號用，不需要無限成長。 */
export async function append(key: string, value: string, keepLast = 2000): Promise<void> {
  if (useMemory()) {
    memory.set(key, (memory.get(key) ?? "") + value + "\n");
    return;
  }
  if (config()) {
    await command(["RPUSH", key, value]);
    await command(["LTRIM", key, -keepLast, -1]);
    return;
  }
  const p = filePath(key);
  await mkdir(path.dirname(p), { recursive: true });
  const { appendFile } = await import("node:fs/promises");
  await appendFile(p, `${value}\n`, "utf8");
}

/**
 * 原子遞增，回傳遞增後的值。第一次遞增時才設 TTL —— 每次都設會讓
 * 一直有請求的人永遠不過期，等於沒有限制。
 */
export async function incr(key: string, ttlSeconds: number): Promise<number> {
  if (useMemory()) {
    const next = Number(memory.get(key) ?? 0) + 1;
    memory.set(key, String(next));
    return next;
  }
  if (config()) {
    const n = Number(await command(["INCR", key]));
    if (n === 1) await command(["EXPIRE", key, ttlSeconds]);
    return n;
  }
  // 本機退回讀改寫。不是原子的，但 dev 沒有併發問題。
  const cur = Number((await get(key)) ?? 0);
  const next = cur + 1;
  await set(key, String(next));
  return next;
}

/** 讀 list 尾端最新 n 筆（append 的讀取端）。舊到新排列。 */
export async function lastN(key: string, n: number): Promise<string[]> {
  if (useMemory()) {
    return (memory.get(key) ?? "").split("\n").filter(Boolean).slice(-n);
  }
  if (config()) {
    const r = await command(["LRANGE", key, -n, -1]);
    return Array.isArray(r) ? (r as string[]) : [];
  }
  try {
    const raw = await readFile(filePath(key), "utf8");
    return raw.split("\n").filter(Boolean).slice(-n);
  } catch {
    return [];
  }
}

/**
 * 掃出符合 prefix 的 key。**只給後台／低頻使用** —— Redis 的 SCAN 在
 * key 多的時候很貴，不要放進使用者請求的路徑上。
 */
export async function keys(prefix: string): Promise<string[]> {
  if (useMemory()) return [...memory.keys()].filter((k) => k.startsWith(prefix));
  if (config()) {
    const r = await command(["KEYS", `${prefix}*`]);
    return Array.isArray(r) ? (r as string[]) : [];
  }
  try {
    const dir = path.join(process.cwd(), ".data", "kv");
    const safe = prefix.replace(/[^A-Za-z0-9_:.-]/g, "_");
    return (await readdir(dir))
      .filter((f) => f.startsWith(safe) && f.endsWith(".json"))
      .map((f) => f.slice(0, -5));
  } catch {
    return [];
  }
}
