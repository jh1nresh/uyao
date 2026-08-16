"use client";

import { useState } from "react";

import type { Locale } from "@/lib/i18n";

const INPUT =
  "h-11 min-w-0 border border-line-strong bg-paper px-3 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-green";

type PilotCopy = {
  nameLabel: string;
  namePlaceholder: string;
  areaLabel: string;
  areaPlaceholder: string;
  contactLabel: string;
  contactPlaceholder: string;
  workflowLegend: string;
  workflowOptions: { value: string; label: string }[];
  requiredError: string;
  genericError: string;
  connectionError: string;
  submit: string;
  submitting: string;
  note: string;
  successTitle: string;
  successBody: string;
};

const COPY: Record<Locale, PilotCopy> = {
  zh: {
    nameLabel: "藥局名稱",
    namePlaceholder: "例如：中山藥局",
    areaLabel: "所在區域",
    areaPlaceholder: "例如：台北市中山區",
    contactLabel: "電子郵件或電話",
    contactPlaceholder: "請留下方便聯絡的方式",
    workflowLegend: "最想先處理的流程（可複選）",
    workflowOptions: [
      { value: "過期／報廢", label: "效期與報廢" },
      { value: "錯過退貨窗口", label: "退貨窗口" },
      { value: "進貨過量", label: "進貨過量" },
      { value: "經常缺貨", label: "經常缺貨" },
      { value: "不知道附近需求", label: "附近需求" },
      { value: "其他", label: "其他流程" },
    ],
    requiredError: "請填寫藥局名稱與聯絡方式。",
    genericError: "目前無法送出，請稍後再試。",
    connectionError: "連線失敗，請稍後再試。",
    submit: "送出試點申請",
    submitting: "送出中…",
    note: "送出的是聯絡意願，不會建立帳號或啟動任何藥局操作。",
    successTitle: "已收到試點申請",
    successBody: "我們會用你留下的方式聯絡，先一起選定一個反覆發生的店務流程。試點沿用既有工具，不要求先更換系統。",
  },
  en: {
    nameLabel: "Pharmacy name",
    namePlaceholder: "Example: Zhongshan Pharmacy",
    areaLabel: "Area",
    areaPlaceholder: "Example: Zhongshan, Taipei",
    contactLabel: "Email or phone",
    contactPlaceholder: "Best way to reach you",
    workflowLegend: "Workflow to start with (select any)",
    workflowOptions: [
      { value: "過期／報廢", label: "Expiry and disposal" },
      { value: "錯過退貨窗口", label: "Return windows" },
      { value: "進貨過量", label: "Overstock" },
      { value: "經常缺貨", label: "Frequent stockouts" },
      { value: "不知道附近需求", label: "Nearby demand" },
      { value: "其他", label: "Another workflow" },
    ],
    requiredError: "Enter the pharmacy name and a contact method.",
    genericError: "Could not submit. Please try again.",
    connectionError: "Connection failed. Please try again.",
    submit: "Submit pilot application",
    submitting: "Submitting…",
    note: "This sends a contact request only. It does not create an account or start pharmacy operations.",
    successTitle: "Application received",
    successBody: "We will contact you to choose one recurring pharmacy workflow. The pilot keeps your existing tools and does not require a system replacement.",
  },
};

/**
 * 藥局試點申請 — 供給側的唯一表單。
 * 送出的是聯絡意圖，沒有帳號、沒有金流，也不觸發任何正式店務。
 */
export function PilotForm({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [contact, setContact] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function toggleProblem(value: string) {
    setProblems((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (!name.trim() || !contact.trim()) {
      setError(copy.requiredError);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/pilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, area, contact, problems }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(locale === "zh" && data.error ? data.error : copy.genericError);
        return;
      }
      setDone(true);
      setName("");
      setArea("");
      setContact("");
      setProblems([]);
    } catch {
      setError(copy.connectionError);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="border border-green-tint-line bg-green-tint px-5 py-5 text-[15px] leading-[1.7] text-ink-2">
        <div className="font-bold text-ink">{copy.successTitle}</div>
        <p className="mb-0 mt-2">{copy.successBody}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1.5 text-[13px] font-medium text-muted" htmlFor="pilot-name">
          <span>{copy.nameLabel}</span>
          <input
            id="pilot-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={copy.namePlaceholder}
            aria-required="true"
            aria-invalid={Boolean(error) && !name.trim()}
            className={INPUT}
          />
        </label>
        <label className="grid min-w-0 gap-1.5 text-[13px] font-medium text-muted" htmlFor="pilot-area">
          <span>{copy.areaLabel}</span>
          <input
            id="pilot-area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder={copy.areaPlaceholder}
            className={INPUT}
          />
        </label>
      </div>

      <label className="grid min-w-0 gap-1.5 text-[13px] font-medium text-muted" htmlFor="pilot-contact">
        <span>{copy.contactLabel}</span>
        <input
          id="pilot-contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={copy.contactPlaceholder}
          aria-required="true"
          aria-invalid={Boolean(error) && !contact.trim()}
          className={INPUT}
        />
      </label>

      <fieldset className="m-0 grid gap-3 border-0 p-0">
        <legend className="p-0 text-[13px] font-medium text-muted">{copy.workflowLegend}</legend>
        <div className="flex flex-wrap gap-2">
          {copy.workflowOptions.map((option) => {
            const selected = problems.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleProblem(option.value)}
                className={`min-h-11 border px-3.5 text-[13px] transition-[background-color,border-color,transform] duration-150 active:scale-[.98] ${
                  selected
                    ? "border-forest bg-brand-surface text-on-dark"
                    : "border-line-strong bg-paper text-ink-2 hover:border-forest"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && <p role="alert" className="m-0 text-[13px] font-medium text-oxblood">{error}</p>}

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending}
          className="action-primary min-h-12 flex-none px-6 text-[15px]"
        >
          {pending ? copy.submitting : copy.submit}
        </button>
        <p className="m-0 max-w-[38em] text-[12px] leading-[1.6] text-muted-2">{copy.note}</p>
      </div>
    </form>
  );
}
