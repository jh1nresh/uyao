import { RESERVATION_INTAKE_QUERY_MAX } from "./reservation-intake";

export const SHOP_SEARCH_CONVERSATION_STORAGE_KEY = "uyao.shop-search-conversation";
const MAX_TURNS = 4;
const SUMMARY_MAX = 240;

export interface ShopSearchConversationTurn {
  query: string;
  summary: string;
}

function cleanTurn(value: unknown): ShopSearchConversationTurn | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const turn = value as Partial<ShopSearchConversationTurn>;
  if (typeof turn.query !== "string" || typeof turn.summary !== "string") return null;
  const query = turn.query.trim().slice(0, RESERVATION_INTAKE_QUERY_MAX);
  const summary = turn.summary.trim().slice(0, SUMMARY_MAX);
  return query && summary ? { query, summary } : null;
}

export function advanceShopSearchConversation(
  raw: string | null,
  current: ShopSearchConversationTurn,
): { previous: ShopSearchConversationTurn[]; turns: ShopSearchConversationTurn[] } {
  let turns: ShopSearchConversationTurn[] = [];
  try {
    const values = raw ? JSON.parse(raw) : [];
    if (Array.isArray(values)) turns = values.flatMap((value) => cleanTurn(value) ?? []);
  } catch {
    // Corrupt per-tab history starts a fresh bounded thread.
  }

  const next = cleanTurn(current);
  if (!next) return { previous: [], turns: [] };
  const latest = turns.at(-1);
  if (!latest || latest.query !== next.query || latest.summary !== next.summary) turns.push(next);
  turns = turns.slice(-MAX_TURNS);
  return { previous: turns.slice(0, -1), turns };
}
