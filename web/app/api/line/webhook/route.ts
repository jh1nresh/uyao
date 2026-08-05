import { NextResponse } from "next/server";

import { allStores } from "@/lib/data";
import {
  isConfigured,
  reply,
  storeForUser,
  text,
  verifySignature,
} from "@/lib/line";
import { appendRecord } from "@/lib/record";
import { updateStatus } from "@/lib/reservations-store";

export const runtime = "nodejs";

/**
 * LINE webhook（藥局端）。
 *
 * LINE 對非 200 會重送，而且重送不保證只有一次 —— 所以除了簽章驗證失敗
 * 以外一律回 200，處理失敗記進 log 就好。讓 LINE 一直重送不會讓壞掉的
 * 事件變好，只會放大問題。
 */

const HELP =
  "這裡是「有藥」的藥局通知。\n\n" +
  "請直接傳你的藥局全名（例如：惠民藥局），我們比對後幫你綁定。\n" +
  "綁定完成後，有人預留你店裡的商品就會推到這個聊天室，按一下就能確認。";

interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
  postback?: { data?: string };
}

/** 藥局傳店名 → 在 166 家裡找。刻意不做模糊比對：綁錯等於把預留單推給別人。 */
function matchStores(query: string) {
  const q = query.trim();
  if (q.length < 2) return [];
  const all = allStores();
  const exact = all.filter((s) => s.name === q);
  if (exact.length > 0) return exact;
  return all.filter((s) => s.name.includes(q) || q.includes(s.name));
}

async function onBindRequest(userId: string, replyToken: string, query: string) {
  const already = storeForUser(userId);
  if (already) {
    await reply(replyToken, [text(`你已經綁定「${already}」。要改綁請直接聯絡我們。`)]);
    return;
  }

  const found = matchStores(query);
  if (found.length === 0) {
    await reply(replyToken, [
      text(
        `找不到「${query}」。\n\n` +
          "目前只開放台北市中山區與信義區的藥局，請傳衛福部登記的藥局全名。" +
          "如果你的藥局不在這兩區，回覆「其他區」我們會記下來。",
      ),
    ]);
    return;
  }
  if (found.length > 1) {
    const list = found.slice(0, 5).map((s) => `・${s.name}（${s.address}）`).join("\n");
    await reply(replyToken, [text(`找到多家，請傳完整店名：\n${list}`)]);
    return;
  }

  const store = found[0];
  // 綁定是半自動的：這筆會跳到通知，由人確認後寫進 LINE_STORE_BINDINGS。
  // 自動綁定的風險是有人冒用店名，把別家的預留單接走。
  await appendRecord("line_bind", {
    userId,
    storeSlug: store.slug,
    storeName: store.name,
    address: store.address,
    requestedAt: new Date().toISOString(),
  });

  await reply(replyToken, [
    text(
      `收到，${store.name}。\n${store.address}\n\n` +
        "我們確認後會完成綁定（通常一個工作天內），完成後你會在這裡收到一則通知。",
    ),
  ]);
}

async function onPostback(userId: string, replyToken: string, data: string) {
  const params = new URLSearchParams(data);
  const action = params.get("action");
  const code = params.get("code");
  if (!code || (action !== "confirm" && action !== "reject")) return;

  const storeSlug = storeForUser(userId);

  // 更新可讀取的那份 —— 消費者的取貨頁讀的是這裡
  const updated = await updateStatus(
    code,
    action === "confirm" ? "confirmed" : "rejected_no_stock",
  ).catch(() => null);

  await appendRecord("reservations", {
    code,
    storeSlug: storeSlug ?? null,
    lineUserId: userId,
    status: action === "confirm" ? "confirmed_by_store" : "rejected_no_stock",
    at: new Date().toISOString(),
  });

  if (!updated) {
    // 查不到那筆 —— 大多是儲存沒設好，或已經過期。要講實話，
    // 不能讓藥局以為系統記下了。
    await reply(replyToken, [
      text(`收到，但系統查不到 ${code} 這筆預留（可能已過期）。我們會人工確認，請先不要處理。`),
    ]);
    return;
  }

  const tail =
    updated.contactKind === "phone" ? updated.contact.slice(-3) : updated.contact.slice(0, 4);
  await reply(replyToken, [
    text(
      action === "confirm"
        ? `${code} 已確認保留。\n\n請把商品留在櫃檯，消費者會報「${code}」來取，尾號 ${tail}。\n保留 ${updated.holdHours} 小時。`
        : `${code} 已回報沒貨。\n\n我們會通知消費者改找別家，這筆不用再處理。`,
    ),
  ]);
}

export async function POST(request: Request) {
  // 一定要拿原始字串來驗簽 —— 重新序列化的位元組跟 LINE 簽的不一樣
  const raw = await request.text();

  if (!verifySignature(raw, request.headers.get("x-line-signature"))) {
    // 這是唯一回非 200 的情況：簽章錯代表不是 LINE 送的
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let events: LineEvent[] = [];
  try {
    events = (JSON.parse(raw) as { events?: LineEvent[] }).events ?? [];
  } catch {
    return NextResponse.json({ ok: true });
  }

  for (const e of events) {
    const userId = e.source?.userId;
    const token = e.replyToken;
    if (!userId || !token) continue;

    try {
      if (e.type === "follow") {
        await reply(token, [text(HELP)]);
      } else if (e.type === "message" && e.message?.type === "text") {
        await onBindRequest(userId, token, e.message.text ?? "");
      } else if (e.type === "postback") {
        await onPostback(userId, token, e.postback?.data ?? "");
      }
    } catch (err) {
      // 回 200 讓 LINE 別重送；資料本身已經進 record sink 了
      console.error("[line] 事件處理失敗", e.type, String(err).slice(0, 200));
    }
  }

  return NextResponse.json({ ok: true });
}

/** 給你自己確認設定有沒有生效用的，不吐任何機密。 */
export async function GET() {
  return NextResponse.json({
    configured: isConfigured(),
    boundStores: Object.keys(
      (() => {
        try {
          return JSON.parse(process.env.LINE_STORE_BINDINGS ?? "{}") as object;
        } catch {
          return {};
        }
      })(),
    ).length,
  });
}
