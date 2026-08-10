"use client";

import { useState } from "react";

const INPUT =
  "h-11 min-w-0 border border-line-strong bg-paper px-3 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-green";

/**
 * 藥局試點申請 — 供給側的唯一表單。
 * 跟 ReserveSheet 一樣：送出的是聯絡意圖，沒有帳號、沒有金流。
 */
export function PilotForm() {
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
        setError(data.error ?? "送出失敗，請稍後再試");
        return;
      }
      setDone(true);
      setName("");
      setArea("");
      setContact("");
    } catch {
      setError("連線失敗，請稍後再試");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="border border-green-tint-line bg-green-tint px-4 py-3.5 text-[15px] leading-[1.7] text-ink-2">
        <div className="font-bold text-ink">已收到申請</div>
        我們會用你留的聯絡方式跟你約時間，帶盒子過去接掃描器 —— 現場大約 5 分鐘，
        店內流程不用改。
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="pilot-name">
          藥局名稱
        </label>
        <input
          id="pilot-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="藥局名稱"
          className={`${INPUT} sm:flex-[2]`}
        />
        <label className="sr-only" htmlFor="pilot-area">
          區域
        </label>
        <input
          id="pilot-area"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="區域（如：台北中山）"
          className={`${INPUT} sm:flex-[2]`}
        />
        <label className="sr-only" htmlFor="pilot-contact">
          LINE ID 或電話
        </label>
        <input
          id="pilot-contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="LINE ID 或電話"
          className={`${INPUT} sm:flex-[2]`}
        />
        <button
          type="submit"
          disabled={pending}
          className="h-11 flex-none bg-green px-[18px] text-[15px] font-bold text-white hover:bg-green-hover disabled:opacity-60 sm:h-9"
        >
          {pending ? "送出中…" : "申請免費試點"}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-[13px] text-ink">
          {error}
        </p>
      )}
      <p className="text-[13px] leading-[1.6] text-muted-2">
        免費試點期間不收費，也不綁約。盒子借你用，不合適就寄回。
      </p>
    </form>
  );
}
