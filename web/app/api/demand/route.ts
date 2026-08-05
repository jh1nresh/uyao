import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { AREAS, DEFAULT_AREA, getDrug } from "@/lib/data";
import type { AreaSlug } from "@/lib/types";

export const runtime = "nodejs";

const LOG_PATH = path.join(process.cwd(), ".data", "demand.jsonl");

/**
 * 落空的搜尋 —— 這個產品最值錢的訊號：一筆帶地點與時間、已經證明存在的需求。
 *
 * `catalog_miss`   查詢對不到目錄裡任何一支藥 → 該補的品項
 * `inventory_miss` 藥在目錄裡但沒有藥局有庫存 → 該裝盒子的區域
 *
 * 目前 OFFERS 是空的，所以每一次藥品頁瀏覽都是 inventory_miss。
 */
type Kind = "catalog_miss" | "inventory_miss";

interface Body {
  kind?: unknown;
  query?: unknown;
  drugSlug?: unknown;
  area?: unknown;
  contact?: unknown;
}

function str(raw: unknown, max: number): string {
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

function toArea(raw: unknown): AreaSlug {
  return AREAS.some((a) => a.slug === raw) ? (raw as AreaSlug) : DEFAULT_AREA;
}

async function append(record: object) {
  try {
    await mkdir(path.dirname(LOG_PATH), { recursive: true });
    await appendFile(LOG_PATH, `${JSON.stringify(record)}\n`, "utf8");
  } catch (err) {
    console.error("[demand] 寫入失敗", err);
  }
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }

  const kind = body.kind === "catalog_miss" || body.kind === "inventory_miss"
    ? (body.kind as Kind)
    : null;
  if (!kind) {
    return NextResponse.json({ error: "kind 不合法" }, { status: 422 });
  }

  // 原始輸入照原樣存 —— 正規化（同義詞／錯字／症狀→成分）是之後的事，
  // 可能會用 LLM 離線重跑歷史資料，這裡把原話丟掉就永遠補不回來。
  const query = str(body.query, 100);
  const drugSlug = str(body.drugSlug, 80);

  if (kind === "catalog_miss" && !query) {
    return NextResponse.json({ error: "缺少查詢內容" }, { status: 422 });
  }
  if (kind === "inventory_miss" && !getDrug(drugSlug)) {
    return NextResponse.json({ error: "找不到這個藥品" }, { status: 404 });
  }

  await append({
    at: new Date().toISOString(),
    kind,
    query,
    ...(kind === "inventory_miss" ? { drugSlug } : {}),
    area: toArea(body.area),
    // 只有主動登記才有；被動記錄不帶任何個資
    ...(str(body.contact, 80) ? { contact: str(body.contact, 80) } : {}),
  });

  return NextResponse.json({ ok: true });
}
