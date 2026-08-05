import { NextResponse } from "next/server";

import { appendRecord } from "@/lib/record";

export const runtime = "nodejs";

interface Body {
  name?: unknown;
  area?: unknown;
  contact?: unknown;
}

/** 只取字串、去頭尾空白、限長 — 藥局名/區域是自由輸入，不做格式假設。 */
function field(raw: unknown, max: number): string {
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
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

  await appendRecord("pilot", {
    name,
    area,
    contact,
    createdAt: new Date().toISOString(),
    status: "pending_contact" as const,
  });

  return NextResponse.json({ ok: true });
}
