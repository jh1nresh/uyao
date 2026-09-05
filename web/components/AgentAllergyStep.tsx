"use client";

import { useState, type FormEvent } from "react";
import type { Locale } from "@/lib/i18n";
import {
  RESERVATION_INTAKE_ALLERGENS_MAX,
  createShopSearchIntakeDraft,
  type AllergyStatus,
  type ShopSearchIntakeDraft,
} from "@/lib/reservation-intake";

export type AgentAllergyAnswer = Pick<ShopSearchIntakeDraft, "allergyStatus" | "allergens" | "capturedAt">;

export function AgentAllergyStep({ locale, onConfirm }: {
  locale: Locale;
  onConfirm: (answer: AgentAllergyAnswer) => void;
}) {
  const [status, setStatus] = useState<"" | AllergyStatus>("");
  const [allergens, setAllergens] = useState("");
  const english = locale === "en";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!status) return;
    const draft = createShopSearchIntakeDraft("agent", status, allergens);
    if (draft) onConfirm({ allergyStatus: draft.allergyStatus, allergens: draft.allergens, capturedAt: draft.capturedAt });
  }

  return (
    <form onSubmit={submit} className="max-w-[680px] space-y-4 border-y border-line py-5" aria-label={english ? "Allergy check" : "過敏確認"}>
      <p className="m-0 font-mono text-[11px] font-semibold tracking-[0.08em] text-forest">uYao Agent</p>
      <fieldset>
        <legend className="mb-3 text-[16px] font-semibold leading-[1.7] text-ink">
          {english ? "First, do you have any known medicine, food, or other allergies?" : "先確認一下：你有已知的藥物、食物或其他過敏嗎？"}
        </legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {(["none", "has_allergies"] as const).map((value) => (
            <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 text-[14px] text-ink-2">
              <input type="radio" name="agent-allergy-status" value={value} required checked={status === value}
                onChange={() => { setStatus(value); if (value === "none") setAllergens(""); }} />
              {value === "none" ? (english ? "No known allergies" : "目前沒有已知過敏") : (english ? "I have known allergies" : "有已知過敏")}
            </label>
          ))}
        </div>
        {status === "has_allergies" && (
          <label className="mt-3 block text-[14px] text-ink" htmlFor="agent-allergens">
            {english ? "Which allergens do you know of?" : "你知道對哪些藥物、食物或物質過敏？"}
            <textarea id="agent-allergens" value={allergens} onChange={(event) => setAllergens(event.target.value)}
              required maxLength={RESERVATION_INTAKE_ALLERGENS_MAX} rows={2}
              placeholder={english ? "List known allergens only" : "只需填寫已知過敏原"}
              className="mt-2 block w-full resize-y border border-line-strong bg-paper p-3 text-[15px] text-ink focus:border-forest" />
          </label>
        )}
      </fieldset>
      <p className="m-0 text-[12px] leading-[1.7] text-muted">
        {english
          ? "This answer is saved in this tab and must be confirmed again after 30 minutes. It is not sent to the AI. Sharing it with a pharmacy requires a separate confirmation. It does not establish medicine suitability."
          : "回答僅在此分頁暫存，30 分鐘後須重新確認，不送給 AI；分享給藥局前會另行確認。完成回答不代表藥品適合使用。"}
      </p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <button type="submit" disabled={!status || (status === "has_allergies" && !allergens.trim())}
          className="action-primary min-h-11 px-5 text-[14px] disabled:opacity-45">
          {english ? "Confirm and continue" : "確認，繼續詢問"}
        </button>
        <a href="https://www.google.com/maps/search/?api=1&query=pharmacy" target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center text-[13px] font-semibold text-forest">
          {english ? "Unsure? Find a pharmacy on Maps ↗" : "不確定？在地圖找藥局詢問 ↗"}
        </a>
      </div>
    </form>
  );
}
