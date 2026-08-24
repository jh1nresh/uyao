"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import {
  RESERVATION_INTAKE_STORAGE_KEY,
  SHOP_SEARCH_INTAKE_STORAGE_KEY,
  createReservationIntakeDraft,
  readShopSearchIntakeDraft,
} from "@/lib/reservation-intake";

export function SearchResultLink({
  href,
  drugSlug,
  query,
  className,
  children,
}: {
  href: string;
  drugSlug: string;
  query: string;
  className?: string;
  children: ReactNode;
}) {
  function rememberSearch() {
    try {
      const searchDraft = readShopSearchIntakeDraft(
        sessionStorage.getItem(SHOP_SEARCH_INTAKE_STORAGE_KEY),
        query,
      );
      const draft = createReservationIntakeDraft(
        query,
        drugSlug,
        searchDraft?.capturedAt,
        searchDraft ?? undefined,
      );
      if (!draft) return;
      sessionStorage.setItem(RESERVATION_INTAKE_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // 隱私模式或儲存額度不足時仍可繼續找藥，只是不自動帶入搜尋與過敏回答。
    }
  }

  return (
    <Link href={href} className={className} onClick={rememberSearch}>
      {children}
    </Link>
  );
}
