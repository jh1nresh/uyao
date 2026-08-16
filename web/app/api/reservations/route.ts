import { randomInt } from "node:crypto";

import { NextResponse } from "next/server";

import { logConsole } from "@/lib/box";
import { getDrug, getStore, previewOffers, storesForDrug } from "@/lib/data";
import { hoursSummary } from "@/lib/hours";
import { drugCopy } from "@/lib/i18n";
import { stockBadge } from "@/lib/stock";
import { userForStore } from "@/lib/bindings";
import { isConfigured, push, reservationFlex, text } from "@/lib/line";
import { checkReservation } from "@/lib/rate-limit";
import { appendRecord } from "@/lib/record";
import {
  NO_SHOW_LIMIT,
  getByToken,
  newToken,
  reserveUniqueCode,
  noShowCount,
  save,
  saveReservation,
  type StoredReservation,
} from "@/lib/reservations-store";
import type { NotifyResult } from "@/lib/types";

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

  // 節流：每一筆成功預留都會推一則 LINE 到藥局老闆手機。沒有節流的話
  // 一個迴圈就能把他的聊天室洗版洗到封鎖我們。
  const rl = await checkReservation(request, contact.value, demo);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "預留太頻繁了，請稍後再試。" },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } },
    );
  }

  // 畫面上寫「兩次預留未取將暫停預留權限」，這裡就要真的擋 ——
  // 不能讓看得見的規則是空話。只算藥局已確認卻沒去拿的那種。
  const strikes = await noShowCount(contact.value).catch(() => 0);
  if (strikes >= NO_SHOW_LIMIT) {
    return NextResponse.json(
      {
        error:
          `這個號碼有 ${strikes} 次預留未取，暫時無法預留。` +
          "如果是誤判，請來信 edwardhsieh0122@gmail.com。",
      },
      { status: 403 },
    );
  }

  const code = await reserveUniqueCode(pickupCode);
  if (!code) {
    // 8 次都撞到代表活躍量已經接近碼空間上限，該加長取貨碼了
    console.error("[reservations] 取不到未使用的取貨碼，碼空間可能太小");
    return NextResponse.json({ error: "系統忙碌中，請稍後再試" }, { status: 503 });
  }
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
    storePhone: store.phone,
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
    // Demo 的唯一收件端就是 sandbox；寫不進去卻回成功，現場會拿到一個
    // Store OS 永遠看不到的單號。真單仍維持既有容錯：LINE 可能已能送達。
    console.error("[reservations] 寫入 store 失敗，取貨頁將查不到", code, String(err).slice(0, 200));
    if (demo) {
      return NextResponse.json({ error: "示範預留未送達，請再試一次" }, { status: 503 });
    }
  }

  // 真單推給藥局；demo 單只進 uYao Store sandbox。公開 preview 不得觸發
  // 任何真實藥局的 LINE，否則一個可猜網址就能製造假的店務工作。
  const demoTag = demo ? "［示範］" : "";
  logConsole("🛎", `${demoTag}收到預留 ${code}：${drug.name} → 路由到 ${store.name}`, `${demo ? "[DEMO] " : ""}Reservation ${code} received: ${drugCopy(drug, "en").name} → routed to ${store.name}`);

  let notify: NotifyResult;
  if (demo) {
    notify = "sandboxed";
    logConsole("🧪", `${code} 已送到 uYao Store 示範帳號`, `${code} was sent to the uYao Store sandbox`);
  } else {
    const lineUser = await userForStore(storeSlug);
    if (!lineUser) {
      notify = "unbound";
      console.log(`[reservations] ${storeSlug} 尚未綁定 LINE，${code} 需人工通知`);
      logConsole("⚠️", `${store.name} 未綁定 LINE，${code} 轉人工通知`, `${store.name} is not bound to LINE; ${code} requires manual notification`);
    } else if (!isConfigured()) {
      // 原本這條分支什麼都不印 —— 綁好了卻因為少一個環境變數而全靜音，
      // 是最難查的一種。
      notify = "not_configured";
      console.error(`[reservations] LINE 未設定（少 token 或 secret），${code} 推不出去`);
    } else {
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
          }),
        ]);
        notify = "sent";
        logConsole("📲", `${code} 已推播到 ${store.name} 的 LINE，等藥師按確認`, `${code} was sent to ${store.name} in LINE; awaiting pharmacist approval`);
      } catch (err) {
        notify = "failed";
        console.error("[reservations] 推播給藥局失敗", code, String(err).slice(0, 200));
        logConsole("🔴", `${code} 推播失敗，需人工聯絡 ${store.name}`, `${code} LINE delivery failed; ${store.name} requires manual contact`);
      }
    }
  }

  return NextResponse.json({
    code,
    token,
    holdHours: HOLD_HOURS,
    // 示範專用診斷。真單不帶這個欄位。
    ...(demo ? { notify } : {}),
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

/**
 * 取消預留。
 *
 * 認 token 不認取貨碼：取貨碼只有 26,000 種組合，用它當憑證等於讓任何人
 * 爆搜就能取消別人的預留。token 是 12 bytes 隨機值，而且只有拿到取貨頁
 * 連結的人才有。
 *
 * 一定要通知藥局 —— 已確認的預留代表商品已經留在櫃檯，不講他會空等
 * 四小時。這是取消流程裡唯一會實際造成他人損失的環節。
 */
export async function DELETE(request: Request) {
  let token = "";
  try {
    const body = (await request.json()) as { token?: unknown };
    if (typeof body.token === "string") token = body.token.trim();
  } catch {
    /* 空 body 也當成格式錯誤處理 */
  }

  if (!/^[A-Za-z0-9_-]{16,32}$/.test(token)) {
    return NextResponse.json({ error: "連結格式錯誤" }, { status: 422 });
  }

  const r = await getByToken(token).catch(() => null);
  if (!r) {
    return NextResponse.json({ error: "查不到這筆預留" }, { status: 404 });
  }
  if (r.status === "cancelled_by_user") {
    return NextResponse.json({ code: r.code, status: "cancelled" });
  }

  const wasConfirmed = r.status === "confirmed";
  await save({ ...r, status: "cancelled_by_user" });
  logConsole(
    "🚫",
    `${r.demo ? "［示範］" : ""}${r.code} 消費者取消` +
      (wasConfirmed ? " → 通知藥局把貨放回架上" : " → 通知藥局不用處理"),
    `${r.demo ? "[DEMO] " : ""}${r.code} consumer cancelled` +
      (wasConfirmed ? " → pharmacy told to return the item to the shelf" : " → pharmacy told no action is needed"),
  );
  await appendRecord("reservations", {
    code: r.code,
    storeSlug: r.storeSlug,
    status: "cancelled_by_user",
    wasConfirmed,
    cancelledAt: new Date().toISOString(),
  });

  // 已經回報沒貨的就別再吵藥局了，那筆他早就處理完。
  //
  // Demo 單從未送到真實藥局，因此取消也只能更新 sandbox，不能碰 LINE。
  if (!r.demo && r.status !== "rejected_no_stock") {
    const lineUser = await userForStore(r.storeSlug).catch(() => undefined);
    if (lineUser && isConfigured()) {
      try {
        await push(lineUser, [
          text(
            (r.demo ? "［示範］" : "") +
              (wasConfirmed
                ? `🚫 ${r.code} 已被消費者取消\n\n${r.drugName}\n` +
                  "已經留在櫃檯的話可以放回架上了，不用再等。"
                : `🚫 ${r.code} 已被消費者取消\n\n${r.drugName}\n不用處理了。`),
          ),
        ]);
      } catch (err) {
        console.error("[reservations] 取消通知推播失敗", r.code, String(err).slice(0, 200));
      }
    }
  }

  return NextResponse.json({ code: r.code, status: "cancelled" });
}
