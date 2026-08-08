import { NextResponse } from "next/server";

import { logConsole } from "@/lib/box";
import { allStores } from "@/lib/data";
import {
  adminUserIds,
  approve,
  boundCount,
  isAdmin,
  requestBind,
  storeForUser,
} from "@/lib/bindings";
import { confirmedFlex, isConfigured, push, reply, text, verifySignature } from "@/lib/line";
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
  const already = await storeForUser(userId);
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
  // 仍然人工核可：任何人都能傳「惠民藥局」，自動綁定等於讓冒名者把
  // 那家的預留單接走。差別是核可從「改環境變數 + 重新部署」變成
  // 你在 LINE 回一句話。
  const pending = await requestBind(userId, store);
  await appendRecord("line_bind", { ...pending });

  await reply(replyToken, [
    text(
      `收到，${store.name}。\n${store.address}\n\n` +
        "我們核對後會開通，開通時你會在這裡收到通知。",
    ),
  ]);

  // 把核可指令直接送到你的 LINE，不用再開終端機
  const admins = adminUserIds();
  if (admins.length === 0) {
    console.error(
      `[line] ${pending.ref} 沒有可通知的管理員 —— LINE_ADMIN_USER_IDS 沒設或格式不對。` +
        "綁定申請只留在 record sink 裡。",
    );
  }
  for (const admin of admins) {
    try {
      await push(admin, [
        text(
          `🔗 綁定申請 ${pending.ref}\n${store.name}\n${store.address}\n\n` +
            `確認是本人的話，回覆：核准 ${pending.ref}`,
        ),
      ]);
    } catch (err) {
      // 送不到管理員 = 這筆申請沒人會核可。一定要留下痕跡。
      console.error(`[line] 核可通知送不到管理員（${pending.ref}）`, String(err).slice(0, 200));
    }
  }
}

/** 只有 LINE_ADMIN_USER_IDS 裡的人講「核准 B-42」才算數。 */
async function onAdminCommand(replyToken: string, body: string): Promise<boolean> {
  const m = /^(?:核准|核可|approve)\s+(B-\d{2})$/i.exec(body.trim());
  if (!m) return false;

  const done = await approve(m[1]);
  if (!done) {
    await reply(replyToken, [text(`找不到待核可的 ${m[1]}（可能已核可或已過期）。`)]);
    return true;
  }

  await reply(replyToken, [
    text(`✓ 已開通 ${done.storeName}。目前綁定 ${await boundCount()} 家。`),
  ]);
  // 通知藥局本人
  await push(done.userId, [
    text(
      `${done.storeName} 已開通。\n\n` +
        "之後有人預留你店裡的商品，會直接推到這個聊天室，按一下就能確認有貨或沒貨。",
    ),
  ]).catch(() => null);
  return true;
}

/** 「已領 K-123」／「已交付 K-123」。回 true 代表這則已經處理掉了。 */
async function onPickupCommand(
  userId: string,
  replyToken: string,
  body: string,
): Promise<boolean> {
  const m = /^(?:已領|已取|已交付|取走)\s*([A-Z]-\d{3})$/i.exec(body.trim());
  if (!m) return false;
  const code = m[1].toUpperCase();

  const store = await storeForUser(userId);
  if (!store) {
    await reply(replyToken, [text("你還沒綁定藥局，請先傳藥局全名。")]);
    return true;
  }

  const done = await updateStatus(code, "picked_up").catch(() => null);
  if (done && done.storeSlug !== store) {
    // 不是你的單就不能改 —— 取貨碼是共用碼空間，別家的也長一樣
    await reply(replyToken, [text(`${code} 不是${store}的預留單。`)]);
    return true;
  }
  await appendRecord("reservations", {
    code, storeSlug: store, lineUserId: userId,
    status: "picked_up", at: new Date().toISOString(),
  });
  await reply(replyToken, [
    text(done ? `✓ ${code} 已完成，感謝。` : `查不到 ${code}（可能已過期或碼有誤）。`),
  ]);
  return true;
}

async function onPostback(userId: string, replyToken: string, data: string) {
  const params = new URLSearchParams(data);
  const action = params.get("action");
  const code = params.get("code");
  if (!code || !["confirm", "reject", "pickup"].includes(action ?? "")) return;

  if (action === "pickup") {
    const done = await updateStatus(code, "picked_up").catch(() => null);
    if (done) {
      logConsole(
        "✅",
        `${done.demo ? "［示範］" : ""}${code} 藥局回報已交付 → 這筆圓滿結束，關閉催單與逾期`,
      );
    }
    await appendRecord("reservations", {
      code, lineUserId: userId, status: "picked_up", at: new Date().toISOString(),
    });
    await reply(replyToken, [
      text(
        done
          ? `✓ ${code} 已完成，感謝。這筆不會再有催單或逾期通知。`
          : `收到，但系統查不到 ${code}（可能已過期）。`,
      ),
    ]);
    return;
  }

  const storeSlug = await storeForUser(userId);

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

  if (updated) {
    const tag = updated.demo ? "［示範］" : "";
    logConsole(
      action === "confirm" ? "🟢" : "🔻",
      action === "confirm"
        ? `${tag}${code} 藥局確認有貨 → 開始保留 ${updated.holdHours} 小時，消費者取貨頁已翻牌`
        : `${tag}${code} 藥局回報沒貨 → 取貨頁已更新，缺貨記入需求訊號`,
    );
  }

  if (!updated) {
    // 查不到那筆 —— 大多是儲存沒設好，或已經過期。要講實話，
    // 不能讓藥局以為系統記下了。
    await reply(replyToken, [
      text(`收到，但系統查不到 ${code} 這筆預留（可能已過期）。我們會人工確認，請先不要處理。`),
    ]);
    return;
  }

  // 「沒貨」是這條鏈上最強的一筆需求訊號 —— 不是有人搜過，是**有人已經
  // 願意出門去買**，而且我們知道是哪家店缺哪一支。招募話術從「這區有 37 個
  // 人在找」升級成「有人指名要來你店裡買，你沒貨」。
  //
  // 不帶消費者的聯絡方式：需求訊號只需要方向性，跟 catalog_miss /
  // inventory_miss 的被動紀錄同一個規矩（見 specs/demand-capture.md）。
  if (action === "reject" && !updated.demo) {
    await appendRecord("demand", {
      at: new Date().toISOString(),
      kind: "rejected_no_stock",
      query: "",
      drugSlug: updated.drugSlug,
      storeSlug: updated.storeSlug,
      area: allStores().find((s) => s.slug === updated.storeSlug)?.area ?? null,
    });
  }

  const tail = updated.contact.slice(-3);
  if (action === "confirm") {
    // 帶「客人已取走」按鈕 —— 沒有它，成功取貨的單最後都會被誤判成逾期
    await reply(replyToken, [
      confirmedFlex({
        demo: updated.demo,
        code,
        drugName: updated.drugName,
        contactTail: tail,
        holdHours: updated.holdHours,
      }),
    ]);
    return;
  }

  await reply(replyToken, [
    text(
      false
        ? ""
        // 不能寫「我們會通知消費者」—— 消費者端沒有任何推播管道。
        // 他看到的是取貨憑證頁自己變成「這家沒貨」。
        : `${code} 已回報沒貨。\n\n消費者的取貨頁已經更新，這筆不用再處理。我們會把缺貨記下來。`,
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
        const body = e.message.text ?? "";
        // 卡片捲掉了還能用文字回報 —— 藥局的聊天室一天可能有幾十則訊息
        if (await onPickupCommand(userId, token, body)) continue;
        if (isAdmin(userId) && (await onAdminCommand(token, body))) continue;
        await onBindRequest(userId, token, body);
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
    boundStores: await boundCount(),
    // 不吐 id，只說有幾個合法的 —— 0 就代表核可通知會送不出去
    admins: adminUserIds().length,
  });
}
