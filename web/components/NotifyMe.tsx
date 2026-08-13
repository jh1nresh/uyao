"use client";

import { useEffect, useRef, useState } from "react";

import { useLocale } from "./LocaleProvider";
import { AREAS } from "@/lib/data";
import { areaCopy } from "@/lib/i18n";
import type { AreaSlug } from "@/lib/types";

type Kind = "catalog_miss" | "inventory_miss";

const INPUT =
  "h-11 min-w-0 border border-line-strong bg-paper px-3 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-green";

/**
 * 落空搜尋的收口。
 *
 * 掛載時先送一筆被動紀錄（只有查詢內容／藥品／地區／時間，不帶個資），
 * 使用者願意留聯絡方式再送第二筆。這是站上最值錢的訊號 —— 一筆帶地點
 * 且已經證明存在的需求，而且不需要任何盒子上線就開始累積。
 */
export function NotifyMe({
  kind,
  query,
  drugSlug,
  drugName,
  area: routeArea,
}: {
  kind: Kind;
  /** 原始輸入，原樣送出不做正規化 */
  query: string;
  drugSlug?: string;
  drugName?: string;
  area: AreaSlug;
}) {
  const locale = useLocale();
  const [area, setArea] = useState<AreaSlug>(routeArea);
  const [contact, setContact] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const loggedKey = useRef("");

  useEffect(() => {
    setArea(routeArea);

    // StrictMode 會掛載兩次，用 key 擋掉重複紀錄；切區後則要記成另一筆需求。
    const key = `${kind}:${query}:${drugSlug ?? ""}:${routeArea}`;
    if (loggedKey.current === key) return;
    loggedKey.current = key;
    void fetch("/api/demand", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, query, drugSlug, area: routeArea }),
    }).catch(() => {
      /* 記錄失敗不該影響使用者，安靜吞掉 */
    });
  }, [kind, query, drugSlug, routeArea]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !contact.trim()) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/demand", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, query, drugSlug, area, contact }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(locale === "en" ? "Could not submit. Please try again." : data.error ?? "送出失敗，請稍後再試");
        return;
      }
      setDone(true);
      setContact("");
    } catch {
      setError(locale === "en" ? "Connection failed. Please try again." : "連線失敗，請稍後再試");
    } finally {
      setPending(false);
    }
  }

  const what = drugName ? `“${drugName}”` : query ? `“${query}”` : locale === "en" ? "this product" : "這支藥";

  if (done) {
    return (
      <div className="mt-2.5 border border-green-tint-line bg-green-tint px-4 py-3 text-[14px] leading-[1.7] text-ink-2">
        {locale === "en" ? <><b className="font-bold text-ink">Request saved.</b> We will notify you when a participating pharmacy in this area confirms {what}.</> : <><b className="font-bold text-ink">記下來了</b> —— 這一區有藥局裝上盒子、而且{what}有貨的時候，我們會通知你。</>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-2.5 border border-line px-4 py-3.5">
      <p className="text-[14px] font-bold text-ink">{locale === "en" ? "Notify me when available" : "有貨的時候通知我"}</p>
      {/* 沒有庫存流可以觸發通知，所以不能寫「有貨就通知」——
          只能承諾「有藥局裝上盒子而且有貨時」。 */}
      <p className="mt-0.5 text-[14px] leading-[1.6] text-muted">
        {locale === "en" ? `Leave a contact. We will notify you when a participating pharmacy in this area confirms ${what}.` : <>留個聯絡方式。這一區有藥局裝上盒子、而且{what}有貨時第一時間通知你。</>}
      </p>

      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="grid gap-1 text-[14px] font-medium text-muted" htmlFor="notify-area">
          <span>{locale === "en" ? "Your area" : "你在哪一區"}</span>
          <select
            id="notify-area"
            value={area}
            onChange={(e) => setArea(e.target.value as AreaSlug)}
            className={`${INPUT} flex-none`}
          >
            {AREAS.map((a) => (
              <option key={a.slug} value={a.slug}>
                {areaCopy(a, locale).shortName}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 flex-1 gap-1 text-[14px] font-medium text-muted" htmlFor="notify-contact">
          <span>Email 或 LINE ID</span>
          <input
            id="notify-contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
            placeholder="例如 name@example.com"
            className={INPUT}
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="action-primary h-11 flex-none text-[15px]"
        >
          {pending ? (locale === "en" ? "Submitting…" : "送出中…") : (locale === "en" ? "Notify me" : "通知我")}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[14px] text-ink">
          {error}
        </p>
      )}
    </form>
  );
}
