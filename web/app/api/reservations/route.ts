import { randomInt } from "node:crypto";

import { NextResponse } from "next/server";

import { getDrug, getStore, previewOffers, storesForDrug } from "@/lib/data";
import { hoursSummary } from "@/lib/hours";
import { stockBadge } from "@/lib/stock";
import { userForStore } from "@/lib/bindings";
import { isConfigured, push, reservationFlex } from "@/lib/line";
import { appendRecord } from "@/lib/record";
import {
  newToken,
  saveReservation,
  updateStatus,
  type StoredReservation,
} from "@/lib/reservations-store";

export const runtime = "nodejs";

/** 藥局按下確認後保留的時數（SLL-R pickup-first）。 */
const HOLD_HOURS = 4;

interface Body {
  drugSlug?: unknown;
  storeSlug?: unknown;
  contact?: unknown;
  demo?: unknown;
}

/**
 * 手機 09xxxxxxxx（可含 - 或空白）。
 *
 * 只收手機、不收 LINE ID，因為它同時扛兩件事：
 * 1. 到店核對的尾號 —— LINE ID 沒有「尾號」可對，問「前四碼是什麼」
 *    在櫃檯很怪，而且對方通常記不精確
 * 2. 藥局要聯絡時的唯一管道（消費者端還沒接 LINE 推播）
 */
function normalizeContact(raw: string): { kind: "phone"; value: string } | null {
  const digits = raw.trim().replace(/[\s-]/g, "");
  return /^09\d{8}$/.test(digits) ? { kind: "phone", value: digits } : null;
}

function pickupCode(): string {
  const letter = String.fromCharCode(65 + randomInt(26));
  return `${letter}-${String(randomInt(1000)).padStart(3, "0")}`;
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

  // 業務示範（/store/[slug]/preview）：庫存是模擬的，改對 previewOffers 驗證。
  // 整筆 record 與 LINE 推播都會標示 demo —— 示範單絕不能混進真單。
  const demo = body.demo === true;
  const offer = demo
    ? (() => {
        const o = previewOffers(storeSlug).find((x) => x.drugSlug === drugSlug);
        return o ? { priceTwd: o.priceTwd, badge: stockBadge(o.daysSinceScan) } : undefined;
      })()
    : storesForDrug(drugSlug).find((r) => r.store.slug === storeSlug);
  if (!offer) {
    return NextResponse.json({ error: "這家藥局沒有這個品項" }, { status: 404 });
  }

  const contact = normalizeContact(rawContact);
  if (!contact) {
    return NextResponse.json(
      { error: "請填手機號碼（09 開頭 10 碼）" },
      { status: 422 },
    );
  }

  const code = pickupCode();
  const token = newToken();
  const record: StoredReservation = {
    token,
    code,
    drugSlug,
    drugName: drug.name,
    drugSpec: drug.spec,
    storeSlug,
    storeName: store.name,
    storeAddress: store.address,
    storeMapsUrl: store.mapsUrl,
    storeHours: hoursSummary(store),
    priceTwd: offer.priceTwd,
    contactKind: contact.kind,
    contact: contact.value,
    status: "pending_store_confirm",
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    holdHours: HOLD_HOURS,
    // 示範單不能混進真單 —— 取貨頁也要看得出來
    ...(demo ? { demo: true as const } : {}),
  };

  // 兩個去處各有職責：record sink 是給你看的通知，store 是取貨頁要讀的。
  await appendRecord("reservations", { ...record, stockTier: offer.badge.tier });
  try {
    await saveReservation(record);
  } catch (err) {
    // 存不起來 = 取貨頁會查不到。不擋下預留（藥局那端還是會收到），
    // 但一定要吵，因為消費者拿到的連結會是死的。
    console.error("[reservations] 寫入 store 失敗，取貨頁將查不到", code, String(err).slice(0, 200));
  }

  // 推給藥局。推不出去不能讓消費者的預留失敗 —— 那筆已經進 record sink，
  // 你還是看得到，只是要人工通知藥局。
  const lineUser = await userForStore(storeSlug);
  if (lineUser && isConfigured()) {
    try {
      await push(lineUser, [
        reservationFlex({
          code,
          drugName: drug.name,
          drugSpec: drug.spec,
          priceTwd: offer.priceTwd,
          storeName: store.name,
          contactKind: contact.kind,
          contact: contact.value,
          holdHours: HOLD_HOURS,
          demo,
        }),
      ]);
    } catch (err) {
      console.error("[reservations] 推播給藥局失敗", code, String(err).slice(0, 200));
    }
  } else if (!lineUser) {
    console.log(`[reservations] ${storeSlug} 尚未綁定 LINE，${code} 需人工通知`);
  }

  return NextResponse.json({
    code,
    token,
    holdHours: HOLD_HOURS,
    priceTwd: offer.priceTwd,
    store: {
      slug: store.slug,
      name: store.name,
      address: store.address,
      distanceM: store.distanceM,
      hours: hoursSummary(store),
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

  await appendRecord("reservations", { code, status: "cancelled_by_user", cancelledAt: new Date().toISOString() });
  await updateStatus(code, "cancelled_by_user").catch(() => null);
  return NextResponse.json({ code, status: "cancelled" });
}
