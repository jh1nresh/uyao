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
  const payload = await res.json() as { result?: unknown; error?: unknown };
  if (
    !payload
    || typeof payload !== "object"
    || Array.isArray(payload)
    || "error" in payload
    || !("result" in payload)
  ) {
    throw new Error("KV command failed");
  }
  return payload.result;
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

/** 附加到 list 尾端。`keepLast = null` 用於本來就有生命週期清理的 active index。 */
export async function append(key: string, value: string, keepLast: number | null = 2000): Promise<void> {
  if (useMemory()) {
    const next = [...(memory.get(key) ?? "").split("\n").filter(Boolean), value];
    memory.set(key, (keepLast === null ? next : next.slice(-keepLast)).join("\n") + "\n");
    return;
  }
  if (config()) {
    await command(["RPUSH", key, value]);
    if (keepLast !== null) await command(["LTRIM", key, -keepLast, -1]);
    return;
  }
  const p = filePath(key);
  await mkdir(path.dirname(p), { recursive: true });
  if (keepLast !== null) {
    const current = await readFile(p, "utf8").catch(() => "");
    const next = [...current.split("\n").filter(Boolean), value].slice(-keepLast);
    await writeFile(p, `${next.join("\n")}\n`, "utf8");
    return;
  }
  const { appendFile } = await import("node:fs/promises");
  await appendFile(p, `${value}\n`, "utf8");
}

/** 移除 list 裡所有相同值。索引清理失敗時讀取端仍會以資料本身過濾。 */
export async function removeFromList(key: string, value: string): Promise<void> {
  if (useMemory()) {
    const next = (memory.get(key) ?? "").split("\n").filter((item) => item && item !== value);
    memory.set(key, next.length ? `${next.join("\n")}\n` : "");
    return;
  }
  if (config()) {
    await command(["LREM", key, 0, value]);
    return;
  }
  const p = filePath(key);
  const current = await readFile(p, "utf8").catch(() => "");
  const next = current.split("\n").filter((item) => item && item !== value);
  await writeFile(p, next.length ? `${next.join("\n")}\n` : "", "utf8");
}

/** 一次讀多筆，避免 inbox 對每個 token 做一輪網路往返。 */
export async function getMany(keys: string[]): Promise<(string | null)[]> {
  if (!keys.length) return [];
  if (useMemory()) return keys.map((key) => memory.get(key) ?? null);
  if (config()) {
    const result = await command(["MGET", ...keys]);
    if (!Array.isArray(result) || result.length !== keys.length || result.some(
      (value) => value !== null && typeof value !== "string",
    )) {
      throw new Error("KV MGET returned an invalid result");
    }
    return result;
  }
  return Promise.all(keys.map((key) => get(key)));
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
    const result = await command(["LRANGE", key, -n, -1]);
    if (!Array.isArray(result) || result.some((value) => typeof value !== "string")) {
      throw new Error("KV LRANGE returned an invalid result");
    }
    return result;
  }
  try {
    const raw = await readFile(filePath(key), "utf8");
    return raw.split("\n").filter(Boolean).slice(-n);
  } catch {
    return [];
  }
}

/** 讀完整個受生命週期管理的 list；只適用於 active index，不能用於歷史掃描。 */
export async function listAll(key: string): Promise<string[]> {
  if (useMemory()) return (memory.get(key) ?? "").split("\n").filter(Boolean);
  if (config()) {
    const result = await command(["LRANGE", key, 0, -1]);
    if (!Array.isArray(result) || result.some((value) => typeof value !== "string")) {
      throw new Error("KV LRANGE returned an invalid result");
    }
    return result;
  }
  try {
    return (await readFile(filePath(key), "utf8")).split("\n").filter(Boolean);
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
