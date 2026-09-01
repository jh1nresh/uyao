import { NextResponse } from "next/server";

import { drugMatchForGtin, logConsole, recordReceivingScan } from "@/lib/box";
import { getDrug, getStore } from "@/lib/data";
import { drugCopy } from "@/lib/i18n";
import { assessLot, normalizeBatch, parseExpiry, recordLot } from "@/lib/lots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 盒子（或 dev_cli 模擬器）的上傳端點。吃 `pharmabox.spool.Uploader` 的
 * 原生格式，Python 那側一行都不用改：
 *
 *   { "device_id": "...", "events": [ { "id", "ts", "kind", "payload" } ] }
 *
 * payload 是 ParsedScan.to_dict()：{ raw, symbology, gtin, expiry, batch, serial }。
 *
 * 信任邊界在 BOX_API_KEY：拿到 key 的裝置我們都當自己人（key 是我們自己
 * 燒進盒子的）。device_id 只拿來對應到藥局，不是驗證。
 */

/** 單批上限。Uploader 的 batch_size 是 100，給寬一點但別讓人灌爆 KV。 */
const MAX_EVENTS = 500;

interface IncomingEvent {
  id?: unknown;
  ts?: unknown;
  kind?: unknown; // receiving | dispensing | unknown
  payload?: {
    gtin?: unknown;
    symbology?: unknown;
    raw?: unknown;
    /** GS1 AI 17，Python 端已解析成 ISO YYYY-MM-DD */
    expiry?: unknown;
    /** GS1 AI 10 */
    batch?: unknown;
  };
}

function authorized(request: Request): boolean {
  const key = process.env.BOX_API_KEY;
  if (key) return request.headers.get("authorization") === `Bearer ${key}`;
  if (process.env.NODE_ENV === "production") {
    // fail closed，理由同 cron：沒設 key 不能退化成裸奔
    console.error("[box] BOX_API_KEY 未設定，拒收上傳。");
    return false;
  }
  return true; // 本機開發方便用
}

/**
 * device_id → 藥局。正式是 BOX_DEVICE_BINDINGS（JSON，燒盒子時登記）；
 * 模擬時直接拿藥局 slug 當 device_id 就通，不用先設 env。
 */
function storeSlugForDevice(deviceId: string): string | null {
  try {
    const parsed = JSON.parse(process.env.BOX_DEVICE_BINDINGS ?? "{}") as Record<
      string,
      string
    >;
    if (typeof parsed[deviceId] === "string") return parsed[deviceId];
  } catch {
    console.error("[box] BOX_DEVICE_BINDINGS 不是合法 JSON，忽略");
  }
  return getStore(deviceId) ? deviceId : null;
}

const KIND_LABEL: Record<string, string> = {
  receiving: "進貨",
  dispensing: "售出",
  unknown: "未分類",
};
const KIND_LABEL_EN: Record<string, string> = {
  receiving: "receiving",
  dispensing: "dispensing",
  unknown: "unclassified",
};

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { device_id?: unknown; events?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const deviceId = typeof body.device_id === "string" ? body.device_id : "";
  const events = Array.isArray(body.events)
    ? (body.events.slice(0, MAX_EVENTS) as IncomingEvent[])
    : [];
  if (!deviceId || events.length === 0) {
    return NextResponse.json({ error: "device_id 與 events 必填" }, { status: 400 });
  }

  const storeSlug = storeSlugForDevice(deviceId);
  const store = storeSlug ? getStore(storeSlug) : undefined;
  if (!store) {
    // 收下但講明白 —— 掉單不行，但也不能默默算給不知道哪家店
    logConsole("⚠️", `裝置 ${deviceId} 未綁定藥局，收到 ${events.length} 筆掃描先擱置`, `Device ${deviceId} is not bound to a pharmacy; ${events.length} scan event(s) were held for review`);
    return NextResponse.json({ accepted: events.length, matched: 0, unbound: true });
  }

  let matched = 0;
  let unknownGtin = 0;
  let lotsRecorded = 0;
  let lotsActionable = 0;

  for (const e of events) {
    const kind = typeof e.kind === "string" ? e.kind : "unknown";
    const gtin = typeof e.payload?.gtin === "string" ? e.payload.gtin : null;
    const kindLabel = KIND_LABEL[kind] ?? kind;
    const kindLabelEn = KIND_LABEL_EN[kind] ?? kind;

    if (!gtin) {
      // 健保碼、EAN 讀不出 GTIN 的那些 —— 記一筆但不動庫存訊號
      logConsole("📦", `${store.name} 掃描 1 筆（${kindLabel}）→ 無 GTIN，略過比對`, `${store.name} scanned one ${kindLabelEn} event without a GTIN; catalog matching was skipped`);
      continue;
    }

    const match = drugMatchForGtin(gtin);
    const drug = match ? getDrug(match.drugSlug) : undefined;
    if (!drug || !match) {
      // 目錄沒有的品項本身就是訊號：藥局在賣我們沒收錄的東西
      unknownGtin += 1;
      logConsole("❓", `${store.name} 掃到目錄外 GTIN ${gtin}（${kindLabel}）→ 待建檔`, `${store.name} scanned uncatalogued GTIN ${gtin} during ${kindLabelEn}; item setup is required`);
      continue;
    }
    const { drugSlug } = match;

    if (kind === "receiving") {
      await recordReceivingScan(storeSlug!, drugSlug, match.demo).catch((err) =>
        console.error("[box] 進貨掃描狀態寫入失敗", String(err).slice(0, 200)),
      );
    }
    const drugNameEn = drugCopy(drug, "en").name;
    matched += 1;
    const demoPrefix = match.demo ? "[示範] " : "";
    const demoPrefixEn = match.demo ? "[DEMO] " : "";

    // ── 批號效期 ────────────────────────────────────────────────────
    //
    // README 標成「最值錢」的那個洞：錯過藥商退貨窗口。條碼裡有 AI 17 時
    // 才記得起來 —— 台灣藥品一維條碼不含效期，所以這裡的覆蓋率就是
    // P0 field check 要量的那個數字。沒有效期不是錯誤，是常態。
    const expiry = parseExpiry(e.payload?.expiry);
    const batch = normalizeBatch(e.payload?.batch);
    if (expiry && batch) {
      try {
        const { record, isNew, expiryConflict } = await recordLot({
          storeSlug: storeSlug!,
          drugSlug,
          batch,
          expiry,
          demo: match.demo,
        });
        lotsRecorded += 1;
        const lot = assessLot(record);
        if (lot.needsAction) lotsActionable += 1;

        if (expiryConflict) {
          // 同一批號兩個效期 —— 解析錯誤或藥廠重用批號，兩種都要人看
          logConsole(
            "⚠️",
            `${demoPrefix}${store.name}「${drug.name}」批號 ${batch} 效期衝突：原記 ${expiryConflict}，本次掃到 ${expiry}，已以本次為準`,
            `${demoPrefixEn}${store.name} “${drugNameEn}” batch ${batch} has conflicting expiry dates: ${expiryConflict} on record, ${expiry} scanned now; the newer value was kept`,
            { demo: match.demo },
          );
        } else if (isNew) {
          logConsole(
            lot.needsAction ? "⏳" : "🗓️",
            lot.needsAction
              ? `${demoPrefix}${store.name}「${drug.name}」批號 ${batch} 退貨窗口 ${lot.daysUntilWindowCloses} 天後關閉（效期 ${expiry}）→ 需要藥師決定`
              : `${demoPrefix}${store.name}「${drug.name}」批號 ${batch} 效期 ${expiry}，退貨窗口 ${lot.returnWindowClosesAt} 關閉`,
            lot.needsAction
              ? `${demoPrefixEn}${store.name} “${drugNameEn}” batch ${batch} return window closes in ${lot.daysUntilWindowCloses} day(s) (expiry ${expiry}); a pharmacist decision is required`
              : `${demoPrefixEn}${store.name} “${drugNameEn}” batch ${batch} expires ${expiry}; return window closes ${lot.returnWindowClosesAt}`,
            { demo: match.demo },
          );
        }
      } catch (err) {
        // 效期寫入失敗不能讓整批 ingest 掉單 —— 掃描本身已經記下了
        console.error("[box] 批號效期寫入失敗", String(err).slice(0, 200));
      }
    }

    logConsole(
      "🧠",
      kind === "receiving"
        ? `${demoPrefix}${store.name} 掃到「${drug.name}」（進貨）→ ${match.demo ? "示範供應訊號" : "供應訊號"}更新：今日進貨掃描`
        : `${demoPrefix}${store.name} 掃到「${drug.name}」（${kindLabel}）→ 記錄${match.demo ? "示範" : ""}品項移動，不宣稱仍有庫存`,
      kind === "receiving"
        ? `${demoPrefixEn}${store.name} scanned “${drugNameEn}” during receiving → ${match.demo ? "demo supply signal" : "supply signal"} updated: received today`
        : `${demoPrefixEn}${store.name} scanned “${drugNameEn}” during ${kind} → ${match.demo ? "demo " : ""}movement recorded; availability was not asserted`,
      { demo: match.demo },
    );
  }

  return NextResponse.json({
    accepted: events.length,
    matched,
    unknownGtin,
    lotsRecorded,
    lotsActionable,
  });
}

/** 設定自檢，不吐機密。 */
export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.BOX_API_KEY),
  });
}
