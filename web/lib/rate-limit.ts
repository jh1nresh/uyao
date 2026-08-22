import * as kv from "./kv";

/**
 * 速率限制。
 *
 * 為什麼需要：`/api/reservations` 是完全公開的，而每一筆成功的預留都會
 * **進 Store OS 並可能推播到店家裝置**。沒有節流的話，一個 for 迴圈就能
 * 把他的聊天室洗版洗到他把我們封鎖 —— 那是這個產品最不能失去的東西。
 *
 * 示範頁（/demo/uyao-demo）不需要真實庫存就能產生預留，而且網址
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

export interface CountedRateLimit extends RateLimit {
  limit: number;
  remaining: number;
  resetSec: number;
}

const OK: RateLimit = { ok: true, retryAfterSec: 0 };

/** Public catalog/pharmacy reads. Generous on purpose: these payloads are already on the pages. */
export const PUBLIC_READ_LIMIT = 120;
export const PUBLIC_READ_WINDOW_SEC = 3600;
export const PUBLIC_READ_POLICY = "public-read";

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
/**
 * Agent 每小時的預留額度。
 *
 * 比 IP 的 20 次寬很多，因為一支 agent 背後是很多人；但仍然有上限 ——
 * 金鑰外流或 agent 跑迴圈時，藥局的收件匣不該被灌爆。
 */
const AGENT_HOURLY_LIMIT = 200;

export async function checkReservation(
  request: Request,
  phone: string,
  demo = false,
  /** 帶了有效金鑰的 agent 代號；有值就用自己的桶，不吃共用 IP 額度。 */
  agentId?: string,
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

  // 每支手機的額度一律要過，跟呼叫者是誰無關 —— 這一條保護的是號碼被冒用
  // 的消費者，不是我們的基礎設施。agent 也不能繞。
  const byPhone = await hit(`res:p:${phone}`, 5, 3600);
  if (!byPhone.ok) return byPhone;

  // 伺服器端的 agent 所有使用者共用一個出口 IP，20 次/小時會在正常使用下
  // 就撞牆。認得出身分就改用自己的桶。
  if (agentId) return hit(`res:a:${agentId}`, AGENT_HOURLY_LIMIT, 3600);
  return hit(`res:i:${ip}`, 20, 3600);
}

/** 表單類端點（需求訊號、試點申請）。這些不會觸發推播，門檻放寬。 */
export async function checkForm(request: Request, scope: string): Promise<RateLimit> {
  return hit(`${scope}:i:${clientIp(request)}`, 30, 3600);
}

/**
 * Read-only public GETs. Fail open when KV is missing so a catalog fetch
 * still works on a laptop; the headers still advertise the policy.
 */
export async function checkPublicRead(request: Request): Promise<CountedRateLimit> {
  const limit = PUBLIC_READ_LIMIT;
  const resetSec = PUBLIC_READ_WINDOW_SEC;
  try {
    const used = await kv.incr(`rl:pub:${clientIp(request)}`, resetSec);
    const remaining = Math.max(0, limit - used);
    if (used > limit) {
      return { ok: false, retryAfterSec: resetSec, limit, remaining: 0, resetSec };
    }
    return { ok: true, retryAfterSec: 0, limit, remaining, resetSec };
  } catch {
    return { ok: true, retryAfterSec: 0, limit, remaining: limit, resetSec };
  }
}

export function rateLimitHeaders(result: CountedRateLimit): Record<string, string> {
  return {
    "RateLimit-Policy": `"${PUBLIC_READ_POLICY}";q=${result.limit};w=${result.resetSec}`,
    RateLimit: `"${PUBLIC_READ_POLICY}";r=${result.remaining};t=${result.resetSec}`,
    // Compatibility fields for clients that still implement the older drafts.
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(result.resetSec),
  };
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
