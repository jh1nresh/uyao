"use client";

import { useEffect, useState } from "react";

import {
  SHOP_SEARCH_CONVERSATION_STORAGE_KEY,
  advanceShopSearchConversation,
  type ShopSearchConversationTurn,
} from "@/lib/search-conversation";

export function SearchConversationHistory({
  query,
  summary,
  locale,
}: ShopSearchConversationTurn & { locale: "zh" | "en" }) {
  const [previous, setPrevious] = useState<ShopSearchConversationTurn[]>([]);

  useEffect(() => {
    try {
      const next = advanceShopSearchConversation(
        sessionStorage.getItem(SHOP_SEARCH_CONVERSATION_STORAGE_KEY),
        { query, summary },
      );
      sessionStorage.setItem(SHOP_SEARCH_CONVERSATION_STORAGE_KEY, JSON.stringify(next.turns));
      setPrevious(next.previous);
    } catch {
      setPrevious([]);
    }
  }, [query, summary]);

  if (previous.length === 0) return null;
  return (
    <ol className="mb-5 mt-0 grid list-none gap-3 p-0" aria-label={locale === "en" ? "Earlier questions" : "先前對話"}>
      {previous.map((turn, index) => (
        <li key={`${turn.query}-${index}`} className="medicine-cabinet-previous-turn grid gap-2">
          <p className="medicine-cabinet-user-message mb-0 ml-auto max-w-[760px] px-4 py-3 text-[14px] font-semibold leading-[1.6] text-ink sm:px-5">
            {turn.query}
          </p>
          <p className="medicine-cabinet-answer-summary mb-0 max-w-[760px] px-4 py-3 text-[13px] leading-[1.65] text-muted sm:px-5">
            <span className="mr-2 font-bold text-forest">uYao</span>
            {turn.summary}
          </p>
        </li>
      ))}
    </ol>
  );
}
