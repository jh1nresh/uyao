import { randomInt } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getDrug, getStore, storesForDrug } from "@/lib/data";

export const runtime = "nodejs";

/** 藥局按下確認後保留的時數（SLL-R pickup-first）。 */
const HOLD_HOURS = 4;

const LOG_PATH = path.join(process.cwd(), ".data", "reservations.jsonl");

interface Body {
  drugSlug?: unknown;
  storeSlug?: unknown;
  contact?: unknown;
}

/** 手機 09xxxxxxxx（可含 - 或空白）或 LINE ID（4–20 碼英數底線句點）。 */
function normalizeContact(raw: string): { kind: "phone" | "line"; value: string } | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[\s-]/g, "");
  if (/^09\d{8}$/.test(digits)) return { kind: "phone", value: digits };
  if (/^[A-Za-z0-9._]{4,20}$/.test(trimmed)) return { kind: "line", value: trimmed };
  return null;
}

function pickupCode(): string {
  const letter = String.fromCharCode(65 + randomInt(26));
  return `${letter}-${String(randomInt(1000)).padStart(3, "0")}`;
}

async function append(record: object) {
  // v1 沒有資料庫：落地成 jsonl，之後換成藥局端 LINE bot 的 queue。
  try {
    await mkdir(path.dirname(LOG_PATH), { recursive: true });
    await appendFile(LOG_PATH, `${JSON.stringify(record)}\n`, "utf8");
  } catch (err) {
    console.error("[reservations] 寫入失敗", err);
  }
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }

  const drugSlug = typeof body.drugSlug === "string" ? body.drugSlug : "";
  const storeSlug = typeof body.storeSlug === "string" ? body.storeSlug : "";
  const rawContact = typeof body.contact === "string" ? body.contact : "";

  const drug = getDrug(drugSlug);
  const store = getStore(storeSlug);
  if (!drug || !store) {
    return NextResponse.json({ error: "找不到這個藥品或藥局" }, { status: 404 });
  }

  const offer = storesForDrug(drugSlug).find((r) => r.store.slug === storeSlug);
  if (!offer) {
    return NextResponse.json({ error: "這家藥局沒有這個品項" }, { status: 404 });
  }

  const contact = normalizeContact(rawContact);
  if (!contact) {
    return NextResponse.json(
      { error: "請填手機（09 開頭 10 碼）或 LINE ID" },
      { status: 422 },
    );
  }

  const code = pickupCode();
  const record = {
    code,
    drugSlug,
    storeSlug,
    contactKind: contact.kind,
    contact: contact.value,
    priceTwd: offer.priceTwd,
    stockTier: offer.badge.tier,
    createdAt: new Date().toISOString(),
    status: "pending_store_confirm" as const,
  };

  await append(record);

  return NextResponse.json({
    code,
    holdHours: HOLD_HOURS,
    priceTwd: offer.priceTwd,
    store: {
      slug: store.slug,
      name: store.name,
      address: store.address,
      distanceM: store.distanceM,
      openLabel: store.openLabel,
      mapsUrl: store.mapsUrl,
    },
    drug: { slug: drug.slug, name: drug.name, spec: drug.spec },
  });
}

/** 取消預留 — 消費者端只送出取消意圖，藥局端由 LINE bot 收到。 */
export async function DELETE(request: Request) {
  let code = "";
  try {
    const body = (await request.json()) as { code?: unknown };
    if (typeof body.code === "string") code = body.code;
  } catch {
    /* 空 body 也當成格式錯誤處理 */
  }

  if (!/^[A-Z]-\d{3}$/.test(code)) {
    return NextResponse.json({ error: "取貨碼格式錯誤" }, { status: 422 });
  }

  await append({ code, status: "cancelled_by_user", cancelledAt: new Date().toISOString() });
  return NextResponse.json({ code, status: "cancelled" });
}
