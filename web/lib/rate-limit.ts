import * as kv from "./kv";

/**
 * 速率限制。
 *
 * 為什麼需要：`/api/reservations` 是完全公開的，而每一筆成功的預留都會
 * **推一則 LINE 訊息到藥局老闆的手機**。沒有節流的話，一個 for 迴圈就能
 * 把他的聊天室洗版洗到他把我們封鎖 —— 那是這個產品最不能失去的東西。
 *
 * 示範頁（/store/[slug]/preview）不需要真實庫存就能產生預留，而且網址
 * 是公開可猜的；即使只進 sandbox，也不能讓它把示範 inbox 洗滿。
 *
 * 沒有 KV 時一律放行（fail open）。這是防濫用不是防資料外洩，
 * 為了它讓正常使用者無法預留是本末倒置。
 */

export interface RateLimit {
  ok: boolean;
  /** 還要等幾秒才能再試。ok 為 true 時無意義。 */
  retryAfterSec: number;
}

const OK: RateLimit = { ok: true, retryAfterSec: 0 };

async function hit(key: string, limit: number, windowSec: number): Promise<RateLimit> {
  try {
    const n = await kv.incr(`rl:${key}`, windowSec);
    return n > limit ? { ok: false, retryAfterSec: windowSec } : OK;
  } catch {
    return OK; // fail open
  }
}

/** Vercel 會帶 x-forwarded-for；取第一個（最靠近使用者的那個）。 */
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for") ?? "";
  return xff.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/**
 * 預留的節流。兩層都要過：
 * - 同一支手機：一小時 5 筆。正常人不會在一小時內預留五次以上。
 * - 同一個 IP：一小時 20 筆。放寬是因為公司/學校會共用出口 IP。
 */
export async function checkReservation(
  request: Request,
  phone: string,
  demo = false,
): Promise<RateLimit> {
  const ip = clientIp(request);

  // 示範單另外從嚴。`demo` 是從 request body 來的，任何人送 {"demo":true}
  // 就能跳過「這家有沒有這個品項」的正式檢查。它只會進 sandbox，不會碰
  // 真實藥局，但仍要避免 inbox 被公開流量洗滿。手機號只驗格式不驗真偽，
  // 所以真正的閘門是 IP；現場 3 次/小時足夠完成一輪展示。
  if (demo) {
    const byDemo = await hit(`res:d:${ip}`, 3, 3600);
    if (!byDemo.ok) return byDemo;
  }

  const byPhone = await hit(`res:p:${phone}`, 5, 3600);
  if (!byPhone.ok) return byPhone;
  return hit(`res:i:${ip}`, 20, 3600);
}

/** 表單類端點（需求訊號、試點申請）。這些不會觸發推播，門檻放寬。 */
export async function checkForm(request: Request, scope: string): Promise<RateLimit> {
  return hit(`${scope}:i:${clientIp(request)}`, 30, 3600);
}

export interface SupportRateLimit extends RateLimit {
  unavailable?: boolean;
}

/**
 * 真人支援會真的寄信，不能像一般表單在 KV 故障時無限制放行。
 * 每個登入帳號 5 筆／小時、每個 IP 10 筆／小時；節流服務壞掉就明確暫停。
 */
export async function checkSupport(
  request: Request,
  userId: string,
): Promise<SupportRateLimit> {
  const safeUserId = Buffer.from(userId).toString("base64url");
  const ip = clientIp(request);
  try {
    const byUser = await kv.incr(`rl:support:u:${safeUserId}`, 3600);
    if (byUser > 5) return { ok: false, retryAfterSec: 3600 };
    const byIp = await kv.incr(`rl:support:i:${ip}`, 3600);
    return byIp > 10 ? { ok: false, retryAfterSec: 3600 } : OK;
  } catch {
    return { ok: false, retryAfterSec: 60, unavailable: true };
  }
}
