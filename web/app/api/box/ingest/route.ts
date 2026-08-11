import { NextResponse } from "next/server";

import { drugSlugForGtin, logConsole, recordReceivingScan } from "@/lib/box";
import { getDrug, getStore } from "@/lib/data";
import { drugCopy } from "@/lib/i18n";

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
  payload?: { gtin?: unknown; symbology?: unknown; raw?: unknown };
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

    const drugSlug = drugSlugForGtin(gtin);
    const drug = drugSlug ? getDrug(drugSlug) : undefined;
    if (!drug || !drugSlug) {
      // 目錄沒有的品項本身就是訊號：藥局在賣我們沒收錄的東西
      unknownGtin += 1;
      logConsole("❓", `${store.name} 掃到目錄外 GTIN ${gtin}（${kindLabel}）→ 待建檔`, `${store.name} scanned uncatalogued GTIN ${gtin} during ${kindLabelEn}; item setup is required`);
      continue;
    }

    if (kind === "receiving") {
      await recordReceivingScan(storeSlug!, drugSlug).catch((err) =>
        console.error("[box] 進貨掃描狀態寫入失敗", String(err).slice(0, 200)),
      );
    }
    const drugNameEn = drugCopy(drug, "en").name;
    matched += 1;
    logConsole(
      "🧠",
      kind === "receiving"
        ? `${store.name} 掃到「${drug.name}」（進貨）→ 供應訊號更新：今日進貨掃描`
        : `${store.name} 掃到「${drug.name}」（${kindLabel}）→ 記錄品項移動，不宣稱仍有庫存`,
      kind === "receiving"
        ? `${store.name} scanned “${drugNameEn}” during receiving → supply signal updated: received today`
        : `${store.name} scanned “${drugNameEn}” during ${kind} → movement recorded; availability was not asserted`,
    );
  }

  return NextResponse.json({ accepted: events.length, matched, unknownGtin });
}

/** 設定自檢，不吐機密。 */
export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.BOX_API_KEY),
  });
}
