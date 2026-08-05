import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const LOG_PATH = path.join(process.cwd(), ".data", "pilot.jsonl");

interface Body {
  name?: unknown;
  area?: unknown;
  contact?: unknown;
}

/** 只取字串、去頭尾空白、限長 — 藥局名/區域是自由輸入，不做格式假設。 */
function field(raw: unknown, max: number): string {
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

async function append(record: object) {
  // 跟 /api/reservations 一樣：v1 沒有資料庫，先落地成 jsonl。
  try {
    await mkdir(path.dirname(LOG_PATH), { recursive: true });
    await appendFile(LOG_PATH, `${JSON.stringify(record)}\n`, "utf8");
  } catch (err) {
    console.error("[pilot] 寫入失敗", err);
  }
}

/** 藥局試點申請 — 供給側入口，跟消費端預留完全分開。 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }

  const name = field(body.name, 60);
  const area = field(body.area, 40);
  const contact = field(body.contact, 60);

  if (!name) {
    return NextResponse.json({ error: "請填藥局名稱" }, { status: 422 });
  }
  if (!contact) {
    return NextResponse.json({ error: "請留 LINE ID 或電話，我們才能跟你聯繫" }, { status: 422 });
  }

  await append({
    name,
    area,
    contact,
    createdAt: new Date().toISOString(),
    status: "pending_contact" as const,
  });

  return NextResponse.json({ ok: true });
}
