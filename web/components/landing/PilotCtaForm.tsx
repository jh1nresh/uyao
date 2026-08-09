"use client";

import { useState } from "react";

/** 問題選項 — 與 /api/pilot 的白名單同步，改一邊記得改另一邊。 */
const PROBLEM_OPTIONS = [
  "過期／報廢",
  "錯過退貨窗口",
  "進貨過量",
  "經常缺貨",
  "不知道附近需求",
  "其他",
] as const;

const INPUT =
  "min-h-11 box-border border border-ink-2 bg-white/5 px-3.5 py-3 text-[15px] text-white outline-none placeholder:text-[#7d8a7e] focus:border-green";

/**
 * 公司 landing 的試點申請表單（深色 end-cap 版）。
 * 與 /pharmacy 的 PilotForm 打同一個 /api/pilot，多帶選填的 problems；
 * 沒有帳號、沒有金流，送出的只是聯絡意圖。
 */
export function PilotCtaForm() {
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [contact, setContact] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  function toggle(label: string) {
    setPicked((p) =>
      p.includes(label) ? p.filter((x) => x !== label) : [...p, label],
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    if (!name.trim() || !contact.trim()) {
      setError("請填寫藥局名稱與聯絡方式。");
      return;
    }
    setError(null);
    setStatus("loading");
    try {
      const res = await fetch("/api/pilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, area, contact, problems: picked }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "送出失敗，請稍後再試");
        setStatus("idle");
        return;
      }
      setStatus("success");
    } catch {
      setError("連線失敗，請稍後再試");
      setStatus("idle");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-start gap-3.5 border border-green p-7">
        <span className="flex-none text-[18px] text-[#3DD68C]" aria-hidden>
          ✓
        </span>
        <div>
          <p className="m-0 text-[16px] font-bold">已收到申請</p>
          <p className="m-0 mt-2 text-[14.5px] leading-[1.8] text-[#A9B5AA]">
            我們會透過你留下的聯絡方式跟你約時間，聊掃描流程與退貨窗口怎麼在你的店裡跑起來。
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-[13.5px] text-[#A9B5AA]">
          藥局名稱 *
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT}
          />
        </label>
        <label className="grid gap-2 text-[13.5px] text-[#A9B5AA]">
          所在區域
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className={INPUT}
          />
        </label>
      </div>
      <label className="grid gap-2 text-[13.5px] text-[#A9B5AA]">
        聯絡方式（LINE ID 或電話）*
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className={INPUT}
        />
      </label>

      <fieldset className="m-0 grid gap-2.5 border-0 p-0 text-[13.5px] text-[#A9B5AA]">
        <legend className="mb-2.5 p-0">目前最常遇到的問題（選填）</legend>
        <div className="flex flex-wrap gap-2">
          {PROBLEM_OPTIONS.map((label) => {
            const active = picked.includes(label);
            return (
              <button
                key={label}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(label)}
                className={`min-h-[38px] whitespace-nowrap border px-3.5 py-2 text-[13.5px] transition-colors duration-150 ${
                  active
                    ? "border-green bg-green text-white"
                    : "border-ink-2 bg-transparent text-[#A9B5AA] hover:border-[#A9B5AA]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="m-0 text-[14px] text-[#F2B8B5]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="min-h-12 justify-self-start bg-green px-8 py-[15px] text-[16px] font-bold text-white transition-colors duration-150 hover:bg-[#0C8A46] disabled:opacity-60"
      >
        {status === "loading" ? "送出中…" : "申請試點"}
      </button>
    </form>
  );
}
