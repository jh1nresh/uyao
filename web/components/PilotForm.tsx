"use client";

import { useState } from "react";
import { useLocale } from "./LocaleProvider";

const INPUT =
  "h-11 min-w-0 border border-line-strong bg-paper px-3 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-green";

/**
 * 藥局試點申請 — 供給側的唯一表單。
 * 跟 ReserveSheet 一樣：送出的是聯絡意圖，沒有帳號、沒有金流。
 */
export function PilotForm() {
  const locale = useLocale();
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [contact, setContact] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/pilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, area, contact }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(locale === "en" ? "Could not submit. Please try again." : data.error ?? "送出失敗，請稍後再試");
        return;
      }
      setDone(true);
      setName("");
      setArea("");
      setContact("");
    } catch {
      setError(locale === "en" ? "Connection failed. Please try again." : "連線失敗，請稍後再試");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="border border-green-tint-line bg-green-tint px-4 py-3.5 text-[15px] leading-[1.7] text-ink-2">
        <div className="font-bold text-ink">{locale === "en" ? "Application received" : "已收到申請"}</div>
        {locale === "en" ? "We will contact you to schedule a five-minute scanner setup. Your in-store workflow stays the same." : "我們會用你留的聯絡方式跟你約時間，帶盒子過去接掃描器 —— 現場大約 5 分鐘，店內流程不用改。"}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
        <label className="grid min-w-0 gap-1 text-[12px] font-medium text-muted" htmlFor="pilot-name">
          <span>{locale === "en" ? "Pharmacy name" : "藥局名稱"}</span>
          <input
            id="pilot-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={locale === "en" ? "Example: Zhongshan Pharmacy" : "例如：中山藥局"}
            className={INPUT}
          />
        </label>
        <label className="grid min-w-0 gap-1 text-[12px] font-medium text-muted" htmlFor="pilot-area">
          <span>{locale === "en" ? "Area" : "區域"}</span>
          <input
            id="pilot-area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder={locale === "en" ? "Example: Zhongshan, Taipei" : "例如：台北中山"}
            className={INPUT}
          />
        </label>
        <label className="grid min-w-0 gap-1 text-[12px] font-medium text-muted" htmlFor="pilot-contact">
          <span>{locale === "en" ? "Email or phone" : "Email 或電話"}</span>
          <input
            id="pilot-contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={locale === "en" ? "Best way to reach you" : "方便聯絡的方式"}
            className={INPUT}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="action-primary h-11 flex-none text-[15px] sm:col-span-2 lg:col-span-1"
        >
          {pending ? (locale === "en" ? "Submitting…" : "送出中…") : (locale === "en" ? "Apply for a free pilot" : "申請免費試點")}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-[13px] text-ink">
          {error}
        </p>
      )}
      <p className="text-[13px] leading-[1.6] text-muted-2">
        {locale === "en" ? "The pilot is free with no contract. Return the box if it is not a fit." : "免費試點期間不收費，也不綁約。盒子借你用，不合適就寄回。"}
      </p>
    </form>
  );
}
