import { randomInt } from "node:crypto";

import { NextResponse } from "next/server";

import { identifyAgent } from "@/lib/agent-auth";
import { normalizeAdSource } from "@/lib/attribution";
import { logConsole } from "@/lib/box";
import { getDrug, getStore, previewOffers, storesForDrug } from "@/lib/data";
import { partnersForProduct } from "@/lib/partners";
import { hoursSummary } from "@/lib/hours";
import { drugCopy } from "@/lib/i18n";
import { stockBadge } from "@/lib/stock";
import { checkReservation } from "@/lib/rate-limit";
import { getStoreDemoSandbox, STORE_DEMO_SANDBOX_SLUG } from "@/lib/store-demo";
import { sendStorePush } from "@/lib/store-push";
import { appendRecord } from "@/lib/record";
import { parseReservationIntake } from "@/lib/reservation-intake";
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

export const runtime = "nodejs";

/** 藥局按下確認後保留的時數（SLL-R pickup-first）。 */
const HOLD_HOURS = 4;

interface Body {
  drugSlug?: unknown;
  storeSlug?: unknown;
  contact?: unknown;
  demo?: unknown;
  intake?: unknown;
  /** UTM／click id 歸因，見 lib/attribution.ts。使用者可控，一律當不可信輸入。 */
  source?: unknown;
}

/**
 * 手機 09xxxxxxxx（可含 - 或空白）。
 *
 * 只收手機，因為它同時扛兩件事：
 * 1. 到店核對的尾號
 * 2. 藥局要聯絡時的唯一管道（消費者端還沒有推播）
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
  const demo = body.demo === true;
  const intakeResult = parseReservationIntake(body.intake);
  if (!intakeResult.ok) {
    return NextResponse.json({ error: intakeResult.error }, { status: 422 });
  }

  const drug = getDrug(drugSlug);
  const store = demo ? getStoreDemoSandbox(storeSlug) : getStore(storeSlug);
  if (!drug || !store) {
    return NextResponse.json({ error: "找不到這個藥品或藥局" }, { status: 404 });
  }

  // 業務示範只接受獨立的 uyao-demo 身分，並以模擬 offer 驗證。
  // 整筆 record 都會標示 demo —— 示範單絕不能混進真單。
  const offer = demo
    ? (() => {
        const o = previewOffers(storeSlug).find((x) => x.drugSlug === drugSlug);
        return o ? { priceTwd: o.priceTwd, badge: stockBadge(o.daysSinceScan) } : undefined;
      })()
    : storesForDrug(drugSlug).find((r) => r.store.slug === storeSlug);

  // 掃描流是唯一能給出價格與新鮮度的來源，但目前沒有任何一家藥局裝盒子 ——
  // 只認 offer 的話，整站沒有一筆預留送得出去。
  //
  // 合作藥局自己確認過販售這個品項，就足以把「請幫我留一份」送到店裡：
  // 那是一次請求，不是一則有貨保證。價格與現貨仍由藥局在 Store OS 上確認，
  // 所以這種單的 priceTwd 是 null、庫存標示是 unknown —— 不猜、不填 0。
  const confirmedByPartner =
    !demo &&
    partnersForProduct(drug.spec === "規格待確認" ? drug.name : `${drug.name} ${drug.spec}`)
      .some((partner) => partner.storeSlug === storeSlug);

  if (!offer && !confirmedByPartner) {
    return NextResponse.json({ error: "這家藥局沒有這個品項" }, { status: 404 });
  }

  const priceTwd = offer ? offer.priceTwd : null;
  const stockTier = offer ? offer.badge.tier : ("unknown" as const);

  const contact = normalizeContact(rawContact);
  if (!contact) {
    return NextResponse.json(
      { error: "請填手機號碼（09 開頭 10 碼）" },
      { status: 422 },
    );
  }

  // 節流：每一筆成功預留都會進 Store OS，並可能觸發裝置通知。沒有節流的話
  // 一個迴圈就能洗滿店家的工作收件匣與已訂閱裝置。
  // 帶了有效金鑰的 agent 走自己的額度桶；認不出來就照一般 IP 額度走。
  const agent = identifyAgent(request);
  const rl = await checkReservation(request, contact.value, demo, agent?.id);
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
    priceTwd,
    contactKind: contact.kind,
    contact: contact.value,
    status: "pending_store_confirm",
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    holdHours: HOLD_HOURS,
    ...(intakeResult.intake ? { intake: intakeResult.intake } : {}),
    // 示範單不能混進真單 —— 取貨頁也要看得出來
    ...(demo ? { demo: true as const } : {}),
  };

  // 兩個去處各有職責：record sink 是營運紀錄，store 是 Store OS 與取貨頁要讀的。
  // 症狀／需求描述是健康脈絡，只留在受 Store OS 身分保護的 reservation KV。
  // record sink 可能接 webhook 或 log；絕不能因為新增欄位就把內容外送。
  // 歸因只進營運紀錄，不進 StoredReservation —— Store OS 與取貨頁是給藥師和
  // 消費者看的，他們不需要知道這個人是哪則廣告帶來的。
  //
  // 別跟 `intake.source` 搞混：那個是「這筆需求從哪個站內流程來的」
  // （shop_search 等），跟廣告歸因無關，而且它跟著 intake 一起被擋在 sink 外。
  const source = normalizeAdSource(body.source);

  const { intake: _privateIntake, ...recordWithoutIntake } = record;
  try {
    await saveReservation(record);
  } catch (err) {
    console.error("[reservations] 寫入 store 失敗，取貨頁將查不到", code, String(err).slice(0, 200));
    // Store OS 是唯一店務入口；寫不進去就不能假裝預留已送達。
    return NextResponse.json({ error: demo ? "示範預留未送達，請再試一次" : "預留未送達藥局，請再試一次" }, { status: 503 });
  }
  // agent 代號只進營運紀錄，不進 StoredReservation —— Store OS 與取貨頁是
  // 給藥師和消費者看的，他們不需要知道這筆是哪支 agent 送的。
  await appendRecord("reservations", {
    ...recordWithoutIntake,
    stockTier,
    ...(source ? { source } : {}),
    ...(agent ? { agent: agent.id } : {}),
  });

  // 預留已經安全寫入 Store OS；Web Push 只是離站提醒，失敗不影響 inbox。
  // Demo 單只提醒 uYao Store sandbox，不得觸發任何真實藥局裝置。
  const demoTag = demo ? "［示範］" : "";
  logConsole("🛎", `${demoTag}收到預留 ${code}：${drug.name} → 路由到 ${store.name}`, `${demo ? "[DEMO] " : ""}Reservation ${code} received: ${drugCopy(drug, "en").name} → routed to ${store.name}`);
  const pushTarget = demo ? STORE_DEMO_SANDBOX_SLUG : storeSlug;
  const pushResult = await sendStorePush(pushTarget, {
    title: demo ? "示範預留需要確認" : "新預留需要確認",
    body: `${code} · 請開啟 Store OS 查看`,
    tag: `reservation-${code}`,
  }).catch(() => ({ status: "failed" as const, sent: 0, failed: 1, removed: 0 }));
  if (pushResult.status === "sent") {
    logConsole("🔔", `${code} 已送到 Store OS 並推播 ${pushResult.sent} 台裝置`, `${code} reached Store OS and ${pushResult.sent} device notification(s)`);
  } else if (pushResult.status === "no_subscriptions") {
    logConsole("🗂", `${code} 已送到 Store OS；這家店尚未開啟裝置通知`, `${code} reached Store OS; device notifications are not enabled`);
  } else {
    console.error(`[reservations] Store OS Web Push 未送達 ${code}: ${pushResult.status}`);
  }

  // 推不出去 = 這筆躺在沒人看的收件匣裡。消費者那端有退路（25 分鐘後改叫他
  // 打電話、12 小時自動關單），但我們這端過去只有一行 log —— 真的有人預留
  // 卻沒人接，不該要翻 Vercel logs 才發現。示範單不算，那本來就沒有真藥局。
  if (pushResult.status !== "sent" && !demo) {
    await appendRecord("unreachable", {
      code,
      drugSlug,
      drugName: drug.name,
      storeSlug,
      storeName: store.name,
      storePhone: store.phone,
      pushStatus: pushResult.status,
      createdAt: record.createdAt,
    }).catch((err) => {
      console.error("[reservations] 無人接單訊號寫入失敗", code, String(err).slice(0, 200));
    });
  }

  return NextResponse.json({
    code,
    token,
    holdHours: HOLD_HOURS,
    intakeShared: Boolean(record.intake),
    priceTwd,
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

  // 已經回報沒貨的就別再提醒；其他取消會留在 Store OS，Web Push 是最佳努力。
  if (r.status !== "rejected_no_stock") {
    await sendStorePush(r.demo ? STORE_DEMO_SANDBOX_SLUG : r.storeSlug, {
      title: `${r.code} 已被消費者取消`,
      body: wasConfirmed ? "已保留的商品可以放回架上；請開啟 Store OS 查看" : "這筆不用處理；請開啟 Store OS 查看",
      tag: `reservation-${r.code}`,
    }).catch((err) => {
      console.error("[reservations] 取消 Web Push 失敗", r.code, String(err).slice(0, 200));
    });
  }

  return NextResponse.json({ code: r.code, status: "cancelled" });
}
