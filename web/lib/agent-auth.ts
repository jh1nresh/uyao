/**
 * Agent 呼叫端的身分。
 *
 * 為什麼需要：預留的 IP 額度是 20 次/小時，那是照「一個瀏覽器 = 一個人」
 * 設計的。LINE agent 這種伺服器端呼叫，所有使用者共用一個出口 IP —— 二十
 * 個不同的人各留一次就會撞 429，而且那是**正常使用**，不是濫用。
 *
 * 所以帶了有效金鑰的呼叫走自己的額度桶，跟 IP 脫鉤。每支手機 5 次/小時的
 * 限制**不解除**：那一條保護的是被冒用號碼的消費者，跟呼叫者是誰無關。
 *
 * 金鑰只從環境變數讀，用逗號分隔多把 —— 一個 agent 一把，出事只換那一把，
 * 不必讓三個 agent 一起停擺。設定格式：
 *
 *     UYAO_AGENT_KEYS="line-care:sk_xxx,line-refill:sk_yyy"
 *
 * 冒號前是給紀錄看的代號（會進營運紀錄，不進消費者可見的預留內容），
 * 冒號後是金鑰本身。沒有設定就是沒有任何 agent 有權限 —— fail closed。
 */

export interface AgentIdentity {
  /** 給紀錄與額度桶用的代號，例如 `line-care`。不是祕密。 */
  id: string;
}

/** 請求要帶的標頭。用自訂標頭而不是 Authorization，才不會跟未來的使用者登入打架。 */
export const AGENT_KEY_HEADER = "x-uyao-agent-key";

function parseConfigured(): Map<string, string> {
  const raw = process.env.UYAO_AGENT_KEYS ?? "";
  const out = new Map<string, string>();
  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const at = trimmed.indexOf(":");
    // 沒寫代號的也收，但代號就只能是 unnamed —— 紀錄上會看不出是哪支 agent。
    const id = at > 0 ? trimmed.slice(0, at).trim() : "unnamed";
    const secret = at > 0 ? trimmed.slice(at + 1).trim() : trimmed;
    if (secret) out.set(secret, id);
  }
  return out;
}

/**
 * 逐字元比對到底，不要一不同就 return。
 *
 * 提早 return 會讓「猜對前幾個字」比「第一個字就錯」慢一點點，那個時間差
 * 足以一個字元一個字元把金鑰試出來。長度不同時仍然走完，避免長度本身洩漏。
 */
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i % (b.length || 1));
  }
  return diff === 0;
}

/**
 * 認出呼叫端的 agent 身分。沒帶金鑰或金鑰不對都回 null —— 呼叫端會退回
 * 一般的 IP 額度，而不是被拒絕。這個端點本來就是公開的，帶錯金鑰不該比
 * 不帶更慘。
 */
export function identifyAgent(request: Request): AgentIdentity | null {
  const presented = request.headers.get(AGENT_KEY_HEADER)?.trim();
  if (!presented) return null;

  for (const [secret, id] of parseConfigured()) {
    if (safeEqual(presented, secret)) return { id };
  }
  return null;
}
