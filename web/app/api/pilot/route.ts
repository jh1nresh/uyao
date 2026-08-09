import { NextResponse } from "next/server";

import { checkForm } from "@/lib/rate-limit";

import { appendRecord } from "@/lib/record";

export const runtime = "nodejs";

interface Body {
  name?: unknown;
  area?: unknown;
  contact?: unknown;
  problems?: unknown;
}

/** 與 landing PilotCtaForm 的選項同步 — 只收白名單內的值。 */
const PROBLEM_OPTIONS = [
  "過期／報廢",
  "錯過退貨窗口",
  "進貨過量",
  "經常缺貨",
  "不知道附近需求",
  "其他",
];

/** 只取字串、去頭尾空白、限長 — 藥局名/區域是自由輸入，不做格式假設。 */
function field(raw: unknown, max: number): string {
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

/** 藥局試點申請 — 供給側入口，跟消費端預留完全分開。 */
export async function POST(request: Request) {
  const rl = await checkForm(request, "pilot");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "送出太頻繁了，請稍後再試。" },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }

  const name = field(body.name, 60);
  const area = field(body.area, 40);
  const contact = field(body.contact, 60);
  const problems = Array.isArray(body.problems)
    ? [...new Set(body.problems.filter((p): p is string => PROBLEM_OPTIONS.includes(p as string)))]
    : [];

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
    problems,
    createdAt: new Date().toISOString(),
    status: "pending_contact" as const,
  });

  return NextResponse.json({ ok: true });
}
