import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

/**
 * v1 沒有資料庫，表單與需求訊號落地成 jsonl。
 *
 * ⚠️ 這在 Vercel 上寫不進去 —— `/var/task` 是唯讀的，`mkdir` 直接 ENOENT。
 * 之前三個 route 各自 try/catch 只印錯誤不印內容，結果是**線上每一筆都靜默遺失**：
 * API 回 200、畫面顯示成功、資料進垃圾桶。
 *
 * 在接上真正的儲存（KV / Postgres / webhook）之前，這裡至少保證資料還撈得回來：
 * 寫檔失敗就把整筆印成單行 JSON，前綴 `UYAO_RECORD`，可以用
 * `vercel logs <url> --json` 撈出來（見 `python3 -m pharmabox.demand --vercel`）。
 *
 * log 保留期有限，這是止血不是解法。
 */
export type RecordKind = "demand" | "pilot" | "reservations";

export const LOG_SENTINEL = "UYAO_RECORD";

export async function appendRecord(kind: RecordKind, record: object): Promise<void> {
  const line = `${JSON.stringify(record)}\n`;
  try {
    const file = path.join(process.cwd(), ".data", `${kind}.jsonl`);
    await mkdir(path.dirname(file), { recursive: true });
    await appendFile(file, line, "utf8");
  } catch (err) {
    // 先把資料本身印出來（單行、可解析），再印失敗原因
    console.log(`${LOG_SENTINEL} ${kind} ${JSON.stringify(record)}`);
    console.error(
      `[${kind}] 寫檔失敗，已改記 log —— 這不是持久化，接上真正的儲存前資料只在 log 保留期內有效`,
      err instanceof Error ? err.message : err,
    );
  }
}
