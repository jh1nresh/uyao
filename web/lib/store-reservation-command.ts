export type StoreReservationAction = "confirm" | "reject" | "pickup";

export interface StoreReservationCommand {
  action: StoreReservationAction;
  code: string;
}

type ReservationQuestionStatus =
  | "pending_store_confirm"
  | "confirmed"
  | "rejected_no_stock"
  | "cancelled_by_user"
  | "picked_up"
  | "expired";

export interface StoreReservationQuestionItem {
  code: string;
  drugName: string;
  status: ReservationQuestionStatus;
}

const COMMANDS: Array<[StoreReservationAction, RegExp]> = [
  ["confirm", /^(?:確認|確認有貨|有貨|confirm|confirm in stock|in stock)\s*([a-z])[-\s]?(\d{3})$/i],
  ["reject", /^(?:缺貨|沒貨|無庫存|回報無庫存|reject|out of stock)\s*([a-z])[-\s]?(\d{3})$/i],
  ["pickup", /^(?:完成|已取|已領|取貨完成|picked up|complete pickup|complete)\s*([a-z])[-\s]?(\d{3})$/i],
];

/** Deterministic Store OS commands: auditable actions, not free-form LLM intent. */
export function parseStoreReservationCommand(input: string): StoreReservationCommand | null {
  const cleaned = input.trim();
  for (const [action, pattern] of COMMANDS) {
    const match = pattern.exec(cleaned);
    if (match) return { action, code: `${match[1].toUpperCase()}-${match[2]}` };
  }
  return null;
}

const STATUS_LABELS: Record<ReservationQuestionStatus, string> = {
  pending_store_confirm: "待確認",
  confirmed: "已確認",
  rejected_no_stock: "無庫存",
  cancelled_by_user: "已取消",
  picked_up: "已取貨",
  expired: "已逾期",
};

const STATUS_LABELS_EN: Record<ReservationQuestionStatus, string> = {
  pending_store_confirm: "Pending confirmation",
  confirmed: "Confirmed",
  rejected_no_stock: "Out of stock",
  cancelled_by_user: "Cancelled",
  picked_up: "Picked up",
  expired: "Expired",
};

function normalizedCode(input: string): string | null {
  const match = /([a-z])[-\s]?(\d{3})/i.exec(input);
  return match ? `${match[1].toUpperCase()}-${match[2]}` : null;
}

/** Read-only Store OS questions. Answers come only from the current store's loaded reservations. */
export function answerStoreReservationQuestion(
  input: string,
  reservations: StoreReservationQuestionItem[],
  locale: "zh" | "en" = "zh",
): string | null {
  const cleaned = input.trim().replace(/[？?。！!]+$/g, "");
  if (!cleaned) return null;

  if (locale === "en") {
    const code = normalizedCode(cleaned);
    if (code && /\b(?:status|progress|check|lookup|look up)\b/i.test(cleaned)) {
      const reservation = reservations.find((item) => item.code.toUpperCase() === code);
      return reservation
        ? `${code} is “${reservation.drugName}.” Current status: ${STATUS_LABELS_EN[reservation.status]}.`
        : `I couldn't find ${code}. I can only check recent reservations currently loaded for this store.`;
    }

    if (/\bhow many\b.*\b(?:pending|awaiting confirmation)\b|\b(?:pending|awaiting confirmation)\b.*\bhow many\b/i.test(cleaned)) {
      const pending = reservations.filter((item) => item.status === "pending_store_confirm");
      return pending.length === 0
        ? "There are no reservations awaiting confirmation."
        : `There ${pending.length === 1 ? "is" : "are"} ${pending.length} ${pending.length === 1 ? "reservation" : "reservations"} awaiting confirmation: ${pending.map((item) => item.code).join(", ")}.`;
    }

    if (/\bhow many\b.*\b(?:reservations?|orders?)\b|\b(?:reservations?|orders?)\b.*\bhow many\b/i.test(cleaned)) {
      const pending = reservations.filter((item) => item.status === "pending_store_confirm").length;
      const confirmed = reservations.filter((item) => item.status === "confirmed").length;
      return `${reservations.length} recent ${reservations.length === 1 ? "reservation is" : "reservations are"} loaded: ${pending} awaiting confirmation and ${confirmed} confirmed.`;
    }

    if (/\b(?:list|show|what|which)\b.*\b(?:active|current|open)?\s*(?:reservation|order|code)s?\b/i.test(cleaned)) {
      const active = reservations.filter((item) => (
        item.status === "pending_store_confirm" || item.status === "confirmed"
      ));
      return active.length === 0
        ? "There are no active reservation codes."
        : `${active.length} active ${active.length === 1 ? "reservation" : "reservations"}: ${active.map((item) => `${item.code} (${STATUS_LABELS_EN[item.status]})`).join(", ")}.`;
    }

    return null;
  }

  const code = normalizedCode(cleaned);
  if (code && /(?:狀態|進度|怎麼樣|如何|查詢|查一下|哪一筆)/.test(cleaned)) {
    const reservation = reservations.find((item) => item.code.toUpperCase() === code);
    return reservation
      ? `${code} 是「${reservation.drugName}」，目前狀態：${STATUS_LABELS[reservation.status]}。`
      : `找不到 ${code}；我只能查詢這間門市目前載入的近期單號。`;
  }

  if (/(?:幾筆|多少筆).*(?:待確認)|(?:待確認).*(?:幾筆|多少筆)/.test(cleaned)) {
    const pending = reservations.filter((item) => item.status === "pending_store_confirm");
    return pending.length === 0
      ? "目前沒有等待確認的預留單。"
      : `目前有 ${pending.length} 筆待確認：${pending.map((item) => item.code).join("、")}。`;
  }

  if (/(?:幾筆|多少筆).*(?:預留|單號|訂單)|(?:預留|單號|訂單).*(?:幾筆|多少筆)/.test(cleaned)) {
    const pending = reservations.filter((item) => item.status === "pending_store_confirm").length;
    const confirmed = reservations.filter((item) => item.status === "confirmed").length;
    return `目前載入 ${reservations.length} 筆近期預留，其中 ${pending} 筆待確認、${confirmed} 筆已確認。`;
  }

  if (/(?:目前|現在).*(?:什麼|哪些|所有).*(?:單號|預留|訂單)|(?:有什麼|有哪些).*(?:單號|預留|訂單)/.test(cleaned)) {
    const active = reservations.filter((item) => (
      item.status === "pending_store_confirm" || item.status === "confirmed"
    ));
    return active.length === 0
      ? "目前沒有進行中的預留單號。"
      : `目前有 ${active.length} 筆進行中：${active.map((item) => `${item.code}（${STATUS_LABELS[item.status]}）`).join("、")}。`;
  }

  return null;
}
