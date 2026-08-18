"use client";

import { useState } from "react";

import { captureAdSource } from "@/lib/attribution-client";

/** 問題選項的 canonical value（中文），與 /api/pilot 的白名單同步，改一邊記得改另一邊。 */
export interface PilotFormCopy {
  locale: "zh" | "en";
  nameLabel: string;
  areaLabel: string;
  contactLabel: string;
  problemsLegend: string;
  /** value 一律送中文 canonical 值進 API；label 依 locale 顯示。 */
  problems: { value: string; label: string }[];
  submit: string;
  submitting: string;
  requiredError: string;
  genericError: string;
  successTitle: string;
  successBody: string;
}

const INPUT =
  "min-h-11 box-border border border-line-strong bg-paper px-3.5 py-3 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-green";

/**
 * 公司 landing 的試點申請表單（zh／en 共用）。
 * 與 /pharmacy 的 PilotForm 打同一個 /api/pilot，多帶選填的 problems；
 * 沒有帳號、沒有金流，送出的只是聯絡意圖。
 */
export function PilotCtaForm({ copy }: { copy: PilotFormCopy }) {
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [contact, setContact] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  function toggle(value: string) {
    setPicked((p) =>
      p.includes(value) ? p.filter((x) => x !== value) : [...p, value],
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    if (!name.trim() || !contact.trim()) {
      setError(copy.requiredError);
      return;
    }
    setError(null);
    setStatus("loading");
    try {
      const res = await fetch("/api/pilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, area, contact, problems: picked, source: captureAdSource() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        // API 的錯誤訊息是中文；英文頁一律退回 locale 版 generic 訊息。
        setError(copy.locale === "zh" && data.error ? data.error : copy.genericError);
        setStatus("idle");
        return;
      }
      setStatus("success");
    } catch {
      setError(copy.genericError);
      setStatus("idle");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-start gap-3.5 bg-green-tint p-7">
        <span className="flex-none text-[18px] text-green" aria-hidden>
          ✓
        </span>
        <div>
          <p className="m-0 text-[16px] font-bold">{copy.successTitle}</p>
          <p className="m-0 mt-2 text-[14.5px] leading-[1.8] text-ink-2">
            {copy.successBody}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-[14px] text-ink-2">
          {copy.nameLabel}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-required="true"
            aria-invalid={Boolean(error) && !name.trim()}
            aria-describedby={error ? "pilot-form-error" : undefined}
            className={INPUT}
          />
        </label>
        <label className="grid gap-2 text-[14px] text-ink-2">
          {copy.areaLabel}
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className={INPUT}
          />
        </label>
      </div>
      <label className="grid gap-2 text-[14px] text-ink-2">
        {copy.contactLabel}
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          aria-required="true"
          aria-invalid={Boolean(error) && !contact.trim()}
          aria-describedby={error ? "pilot-form-error" : undefined}
          className={INPUT}
        />
      </label>

      <fieldset className="m-0 grid gap-2.5 border-0 p-0 text-[14px] text-ink-2">
        <legend className="mb-2.5 p-0">{copy.problemsLegend}</legend>
        <div className="flex flex-wrap gap-2">
          {copy.problems.map(({ value, label }) => {
            const active = picked.includes(value);
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(value)}
                className={`min-h-11 whitespace-nowrap border px-3.5 py-2 text-[14px] transition-[background-color,border-color,transform] duration-150 active:translate-y-px ${
                  active
                    ? "border-forest bg-brand-surface text-on-dark"
                    : "border-line-strong bg-paper text-ink-2 hover:border-forest"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <p id="pilot-form-error" role="alert" className="m-0 text-[14px] font-medium text-oxblood">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="action-primary min-h-12 justify-self-start px-8 py-[15px] text-[16px]"
      >
        {status === "loading" ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}
