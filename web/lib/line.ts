import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * LINE Messaging API —— 藥局端的通知迴路。
 *
 * 為什麼先做藥局端而不是消費者端：消費者收到的是**結果**，藥局收到的是
 * **迴路**。沒有藥局端通知，預留送出去就沒人看得到，整個產品是斷的。
 * 而且藥局端不需要 LINE Login —— 老闆加官方帳號好友就有 userId，
 * 消費者端才需要處理登入與綁定。
 */

const API = "https://api.line.me/v2/bot";

export function channelSecret(): string {
  return process.env.LINE_CHANNEL_SECRET ?? "";
}

function accessToken(): string {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
}

export function isConfigured(): boolean {
  return Boolean(channelSecret() && accessToken());
}

/**
 * 驗證 `x-line-signature`。
 *
 * 兩個地方不能省：
 * 1. 必須用**原始 body 字串**算，不能先 JSON.parse 再 stringify ——
 *    重新序列化後的位元組跟 LINE 簽的不一樣，永遠對不上。
 * 2. 必須用 timingSafeEqual，不能用 `===` —— 逐字元比較會洩漏出正確
 *    前綴長度，讓人可以一個位元組一個位元組地把簽章猜出來。
 */
export function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = channelSecret();
  if (!secret || !signature) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  let got: Buffer;
  try {
    got = Buffer.from(signature, "base64");
  } catch {
    return false;
  }
  // timingSafeEqual 長度不同會 throw，先擋掉
  if (got.length !== expected.length) return false;
  return timingSafeEqual(got, expected);
}

// ── 綁定 ────────────────────────────────────────────────────────────
//
// userId → storeSlug。試點階段只有個位數藥局，用環境變數就夠，不值得為此
// 生一套資料庫；Vercel 的檔案系統是唯讀的，寫檔也存不住。
//
//   LINE_STORE_BINDINGS={"Uxxxxxxxx":"惠民藥局"}
//
// 藥局在 LINE 傳店名 → 我們比對出唯一一家 → 把 userId 與店名記進 record
// sink（會跳到你的通知）→ 你把它加進這個環境變數。半自動是刻意的：
// 綁錯等於把某家藥局的預留單推給別人看。

export function bindings(): Record<string, string> {
  const raw = process.env.LINE_STORE_BINDINGS;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    console.error("[line] LINE_STORE_BINDINGS 不是合法 JSON，當成沒有綁定");
  }
  return {};
}

export function storeForUser(userId: string): string | undefined {
  return bindings()[userId];
}

export function userForStore(storeSlug: string): string | undefined {
  return Object.entries(bindings()).find(([, slug]) => slug === storeSlug)?.[0];
}

// ── 送訊息 ──────────────────────────────────────────────────────────

async function post(path: string, body: object): Promise<void> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken()}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    // 不要把 token 帶進錯誤訊息
    throw new Error(`LINE ${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

export async function reply(replyToken: string, messages: object[]): Promise<void> {
  await post("/message/reply", { replyToken, messages });
}

export async function push(to: string, messages: object[]): Promise<void> {
  await post("/message/push", { to, messages });
}

export function text(s: string): object {
  return { type: "text", text: s };
}

// ── 訊息內容 ────────────────────────────────────────────────────────

export interface ReservationNotice {
  code: string;
  drugName: string;
  drugSpec: string;
  priceTwd: number;
  storeName: string;
  contactKind: "phone" | "line";
  contact: string;
  holdHours: number;
  /** 業務示範產生的預留 —— 訊息上必須標示，不能讓藥局以為是真單。 */
  demo?: boolean;
}

const INK = "#1A2420";
const GREEN = "#0B7A3E";
const MUTED = "#5C6B62";

function row(label: string, value: string): object {
  return {
    type: "box",
    layout: "baseline",
    spacing: "sm",
    contents: [
      { type: "text", text: label, color: MUTED, size: "sm", flex: 2 },
      { type: "text", text: value, wrap: true, color: INK, size: "sm", flex: 5 },
    ],
  };
}

/**
 * 藥局收到的預留單。兩顆按鈕就是整個迴路 ——
 * 按了才會產生消費者那端的通知。
 */
export function reservationFlex(n: ReservationNotice): object {
  return {
    type: "flex",
    altText: `${n.demo ? "【示範】" : ""}預留 ${n.code}：${n.drugName}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        backgroundColor: GREEN,
        contents: [
          { type: "text", text: n.demo ? "新的預留（示範）" : "新的預留", color: "#FFFFFF", weight: "bold", size: "sm" },
          { type: "text", text: n.code, color: "#FFFFFF", weight: "bold", size: "xxl" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: n.drugName, weight: "bold", size: "md", wrap: true, color: INK },
          { type: "text", text: n.drugSpec, size: "xs", color: MUTED },
          { type: "separator", margin: "md" },
          row("售價", `NT$${n.priceTwd}`),
          row("聯絡", n.contactKind === "phone" ? n.contact : `LINE ${n.contact}`),
          row("保留", `確認後 ${n.holdHours} 小時`),
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: GREEN,
            action: {
              type: "postback",
              label: "有貨，確認保留",
              data: `action=confirm&code=${encodeURIComponent(n.code)}`,
              displayText: `確認保留 ${n.code}`,
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "沒貨",
              data: `action=reject&code=${encodeURIComponent(n.code)}`,
              displayText: `${n.code} 沒貨`,
            },
          },
        ],
      },
    },
  };
}
