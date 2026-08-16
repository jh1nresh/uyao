"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import {
  RESERVATION_INTAKE_STORAGE_KEY,
  createReservationIntakeDraft,
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
    const draft = createReservationIntakeDraft(query, drugSlug);
    if (!draft) return;
    try {
      sessionStorage.setItem(RESERVATION_INTAKE_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // 隱私模式或儲存額度不足時仍可繼續找藥，只是不自動帶入搜尋脈絡。
    }
  }

  return (
    <Link href={href} className={className} onClick={rememberSearch}>
      {children}
    </Link>
  );
}
