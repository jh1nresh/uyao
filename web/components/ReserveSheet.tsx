"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { StockBadge } from "./StockBadge";
import { useLocale } from "./LocaleProvider";
import { captureAdSource } from "@/lib/attribution-client";
import { known } from "@/lib/pending";
import { PRICE_NOTICE } from "@/lib/pricing";
import { hoursSummary } from "@/lib/hours";
import { localizedPath } from "@/lib/i18n";
import {
  RESERVATION_INTAKE_ALLERGENS_MAX,
  RESERVATION_INTAKE_NOTE_MAX,
  RESERVATION_INTAKE_STORAGE_KEY,
  readReservationIntakeDraft,
} from "@/lib/reservation-intake";
import { SHOP_URL } from "@/lib/shop";
import type { StockBadgeSpec, Store } from "@/lib/types";

export interface ReserveTarget {
  drug: { slug: string; name: string; spec: string };
  store: Store;
  /** 掃描流帶出的價格；沒有裝盒子的店是 null，價格由門市報。 */
  priceTwd: number | null;
  /** 沒有掃描紀錄時省略 —— 不要塞一個假的 tier 進來充數。 */
  badge?: StockBadgeSpec;
}

/** 記住上次填的號碼，不要每次預留都重打一次。 */
const PHONE_KEY = "uyao.phone";

interface Success {
  /** 取貨頁的不可猜網址 key */
  token?: string;
  code: string;
  holdHours: number;
  intakeShared: boolean;
}

/**
 * 預留 bottom sheet（SLL-R pickup-first）。
 * 沒有購物車、沒有結帳 — 送出的是「請藥局保留」，到店付款。
 */
export function ReserveSheet({
  target,
  onClose,
  demo = false,
}: {
  target: ReserveTarget;
  onClose: () => void;
  /** 業務示範：庫存是模擬的，後端走 previewOffers 驗證並整筆標示 demo。 */
  demo?: boolean;
}) {
  const locale = useLocale();
  const [contact, setContact] = useState("");
  const [remembered, setRemembered] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Success | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [allergyStatus, setAllergyStatus] = useState<"" | "none" | "has_allergies">("");
  const [allergens, setAllergens] = useState("");
  const [shareIntake, setShareIntake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const allergyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  /**
   * 不要每次預留都重打一次號碼。
   *
   * 存在 localStorage 而不是後端：這樣不需要登入，而號碼本來就是這台
   * 裝置的主人自己填的。過敏回答仍需每次重新詢問，不能沿用上次答案。
   */
  useEffect(() => {
    if (success) return;
    try {
      const saved = localStorage.getItem(PHONE_KEY);
      if (saved) {
        setContact(saved);
        setRemembered(true);
      }
    } catch {
      /* 隱私模式讀不到就當沒存過 */
    }
    allergyRef.current?.focus();
  }, [success]);

  useEffect(() => {
    try {
      const draft = readReservationIntakeDraft(
        sessionStorage.getItem(RESERVATION_INTAKE_STORAGE_KEY),
        target.drug.slug,
      );
      if (draft) setSearchQuery(draft.searchQuery);
    } catch {
      // sessionStorage 不可用時，仍可在下方手動補充需求。
    }
  }, [target.drug.slug]);

  const allergyIncomplete = allergyStatus === "" || (allergyStatus === "has_allergies" && !allergens.trim());
  const needsIntakeConsent = !allergyIncomplete && !shareIntake;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (allergyIncomplete || !shareIntake) {
      setError(locale === "en"
        ? "Answer the allergy question and consent to share it with the pharmacist."
        : "請回答過敏問題，並同意提供給藥師查看。");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          drugSlug: target.drug.slug,
          storeSlug: target.store.slug,
          contact,
          source: captureAdSource(),
          intake: {
            allergyStatus,
            ...(allergyStatus === "has_allergies" ? { allergens: allergens.trim() } : {}),
            ...(searchQuery ? { searchQuery } : {}),
            ...(requestNote.trim() ? { note: requestNote } : {}),
            consent: true,
          },
          ...(demo ? { demo: true } : {}),
        }),
      });
      const data = (await res.json()) as {
        code?: string;
        token?: string;
        holdHours?: number;
        intakeShared?: boolean;
        error?: string;
      };
      if (!res.ok || !data.code) {
        setError(locale === "en" ? "Could not submit the reservation. Please try again." : data.error ?? "送出失敗，請再試一次");
        return;
      }
      try {
        localStorage.setItem(PHONE_KEY, contact.trim());
        sessionStorage.removeItem(RESERVATION_INTAKE_STORAGE_KEY);
      } catch {
        /* 存不起來不影響這次預留 */
      }
      setSuccess({
        code: data.code,
        token: data.token,
        holdHours: data.holdHours ?? 4,
        intakeShared: data.intakeShared === true,
      });
    } catch {
      setError(locale === "en" ? "Connection failed. Check your network and try again." : "連線失敗，請確認網路後再試");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={success ? (locale === "en" ? "Reservation sent" : "預留已送出") : locale === "en" ? `Reserve ${target.drug.name}` : `預留 ${target.drug.name}`}
    >
      <button
        type="button"
        aria-label={locale === "en" ? "Close" : "關閉"}
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(26,36,32,.32)]"
      />
      <div
        className={`sheet-in relative flex max-h-[calc(100dvh-1rem)] w-full max-w-[420px] flex-col gap-3.5 overflow-y-auto border-t-2 bg-paper px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[18px] sm:max-h-[calc(100dvh-2rem)] sm:border-x sm:border-b sm:pb-6 ${
          success ? "border-green" : "border-t-ink sm:border-x-line-strong sm:border-b-line-strong"
        }`}
      >
        {success ? (
          <SuccessBody target={target} success={success} onClose={onClose} demo={demo} />
        ) : (
          <>
            <div className="mx-auto -mt-1.5 h-1 w-9 bg-line-strong sm:hidden" />
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-[18px] font-black">{locale === "en" ? "Reserve" : "預留"} · {target.store.name}</h2>
              <p className="text-[13px] text-muted">
                {target.store.district} · {hoursSummary(target.store, locale)}
              </p>
            </div>

            <div className="flex items-center gap-2.5 border border-line px-3.5 py-2.5 text-[15px]">
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {target.drug.name} {known(target.drug.spec) ?? ""}
                </div>
                {target.badge ? (
                  <StockBadge badge={target.badge} className="mt-0.5 text-[13px]" />
                ) : (
                  // 沒有掃描紀錄就直說這是一次請求，不是有貨保證。
                  <div className="mt-0.5 text-[13px] text-muted">
                    {locale === "en"
                      ? "The pharmacy confirms stock after you send this"
                      : "送出後由藥局確認有無現貨"}
                  </div>
                )}
              </div>
              <div className="text-[13px] text-muted-2">{locale === "en" ? "Price confirmed in store" : PRICE_NOTICE}</div>
            </div>

            <section className="border border-line bg-surface px-3.5 py-3" aria-labelledby="reservation-intake-heading">
              <div className="flex items-baseline justify-between gap-3">
                <h3 id="reservation-intake-heading" className="m-0 text-[13px] font-bold text-ink">
                  {locale === "en" ? "Context for the pharmacist" : "給藥師的需求脈絡"}
                </h3>
                <span className="text-[10.5px] font-medium tracking-[.06em] text-muted-2">
                  {locale === "en" ? "STORE OS ONLY" : "只在 STORE OS 顯示"}
                </span>
              </div>

              <fieldset className="mt-3 border border-line-strong bg-ivory px-3 py-3">
                <legend className="px-1 text-[12px] font-bold text-ink">
                  {locale === "en" ? "Any known medication, food, or other allergies? (required)" : "是否有已知的藥物、食物或其他過敏？（必填）"}
                </legend>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 border border-line bg-paper px-3 text-[12.5px] text-ink">
                    <input
                      type="radio"
                      ref={allergyRef}
                      name="reservation-allergy-status"
                      value="none"
                      required
                      checked={allergyStatus === "none"}
                      onChange={() => {
                        setAllergyStatus("none");
                        setAllergens("");
                      }}
                      className="h-4 w-4 accent-forest"
                    />
                    {locale === "en" ? "No known allergies" : "目前沒有已知過敏"}
                  </label>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 border border-line bg-paper px-3 text-[12.5px] text-ink">
                    <input
                      type="radio"
                      name="reservation-allergy-status"
                      value="has_allergies"
                      checked={allergyStatus === "has_allergies"}
                      onChange={() => setAllergyStatus("has_allergies")}
                      className="h-4 w-4 accent-forest"
                    />
                    {locale === "en" ? "Yes, I have allergies" : "有已知過敏"}
                  </label>
                </div>
                {allergyStatus === "has_allergies" && (
                  <label className="mt-2.5 block text-[12px] font-bold text-ink" htmlFor="reservation-allergens">
                    {locale === "en" ? "List known allergens (required)" : "請填寫已知過敏原（必填）"}
                    <input
                      id="reservation-allergens"
                      value={allergens}
                      required
                      onChange={(event) => setAllergens(event.target.value)}
                      maxLength={RESERVATION_INTAKE_ALLERGENS_MAX}
                      placeholder={locale === "en" ? "For example: penicillin, peanuts" : "例如：青黴素、花生"}
                      className="mt-1.5 h-11 w-full border border-line-strong bg-paper px-3 text-[13px] font-normal text-ink outline-none placeholder:text-muted-2 focus:border-forest"
                    />
                  </label>
                )}
              </fieldset>

              {searchQuery && (
                <div className="mt-2.5 border-l-2 border-green pl-2.5 text-[13px] leading-[1.55]">
                  <span className="block text-[11px] font-bold text-muted-2">
                    {locale === "en" ? "Shop search" : "Shop 原始搜尋"}
                  </span>
                  <span className="text-ink">{searchQuery}</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="ml-2 min-h-11 text-[11px] text-muted underline"
                  >
                    {locale === "en" ? "Do not attach" : "不要附上"}
                  </button>
                </div>
              )}

              <label htmlFor="reservation-intake-note" className="mt-2.5 block text-[12px] font-bold text-ink">
                {locale === "en" ? "Symptoms or help requested (optional)" : "症狀或希望藥師協助的事情（選填）"}
              </label>
              <textarea
                id="reservation-intake-note"
                value={requestNote}
                onChange={(event) => setRequestNote(event.target.value)}
                maxLength={RESERVATION_INTAKE_NOTE_MAX}
                rows={3}
                placeholder={locale === "en" ? "For example: started three days ago; please advise in store" : "例如：最近三天開始不舒服，希望到店請藥師協助判斷"}
                className="mt-1.5 w-full resize-none border border-line-strong bg-ivory px-3 py-2 text-[13px] leading-[1.55] text-ink outline-none placeholder:text-muted-2 focus:border-forest"
              />

              <label className="mt-2.5 flex cursor-pointer items-start gap-2 text-[12.5px] leading-[1.55] text-ink-2">
                <input
                  type="checkbox"
                  checked={shareIntake}
                  onChange={(event) => setShareIntake(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-forest"
                />
                <span>
                  {locale === "en"
                    ? "I agree to share my allergy answer and the description above with this pharmacy for its pharmacist to review."
                    : "我同意把過敏回答與上述描述提供給這間藥局，讓藥師查看。"}
                </span>
              </label>
              <p className="mb-0 mt-2 text-[11.5px] leading-[1.55] text-muted">
                {locale === "en"
                  ? "This is not an online diagnosis or medicine recommendation. The allergy answer and context stay inside the signed-in Store OS and expire with the reservation record."
                  : "這不是線上診斷或用藥推薦；過敏回答與需求內容只留在登入後的 Store OS，並會隨預留資料到期。"}
              </p>
            </section>

            <form onSubmit={submit} className="flex flex-col gap-1.5">
              <label htmlFor="reserve-contact" className="text-xs font-bold">
                {locale === "en" ? "Mobile number" : "手機號碼"}{" "}
                <span className="font-normal text-muted-2">{locale === "en" ? "Used for pharmacy confirmation and pickup verification" : "藥局確認後聯絡你，到店對尾號"}</span>
              </label>
              <input
                id="reserve-contact"
                ref={inputRef}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="09xx-xxx-xxx"
                // type + inputMode 決定手機會不會跳數字鍵盤；
                // name/autoComplete 決定作業系統的自動填入認不認得這一欄
                type="tel"
                name="tel"
                inputMode="tel"
                autoComplete="tel"
                className="h-[46px] border-[1.5px] border-ink bg-ivory px-3.5 text-sm outline-none placeholder:text-muted-2"
              />
              {remembered && (
                <button
                  type="button"
                  onClick={() => {
                    setContact("");
                    setRemembered(false);
                    inputRef.current?.focus();
                  }}
                  className="inline-flex min-h-11 items-center self-start text-[11px] text-muted underline"
                >
                  {locale === "en" ? "Saved number · Use another" : "這是你上次用的號碼 · 換一個"}
                </button>
              )}
              {error && (
                <p role="alert" className="text-[13px] font-medium text-ink">
                  {error}
                </p>
              )}
              {allergyIncomplete && (
                <p className="text-[12px] font-medium text-oxblood" aria-live="polite">
                  {locale === "en" ? "Answer the required allergy question before sending." : "送出前請完成必填的過敏問題。"}
                </p>
              )}
              {needsIntakeConsent && (
                <p className="text-[12px] font-medium text-oxblood" aria-live="polite">
                  {locale === "en" ? "Consent is required to share the allergy answer with the pharmacist." : "請先勾選同意，才會把過敏回答提供給藥師。"}
                </p>
              )}
              <p className="mt-1 text-[13px] leading-[1.6] text-muted">
                {demo
                  ? locale === "en" ? "This creates a demo order in the uYao Store sandbox. No real pharmacy is contacted and no pickup is required." : "這會在 uYao Store 沙盒建立一筆示範單，不會聯絡真實藥局，也不需要實際取貨。"
                  : locale === "en" ? <>The pharmacy holds the item for <b className="text-ink">4 hours</b> after confirmation. Pay in store. Two no-shows pause reservation access.</> : <>藥局按下確認後為你保留 <b className="text-ink">4 小時</b>，到店付款取貨。兩次未取將暫停預留權限。</>}
              </p>
              <button
                type="submit"
                disabled={pending || contact.trim() === "" || allergyIncomplete || !shareIntake}
                className="action-primary mt-1.5 h-12 text-[16px] tracking-[.1em] disabled:shadow-none"
              >
                {pending ? (locale === "en" ? "Submitting…" : "送出中…") : (locale === "en" ? "Send reservation" : "送出預留")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function SuccessBody({
  target,
  success,
  onClose,
  demo,
}: {
  target: ReserveTarget;
  success: Success;
  onClose: () => void;
  demo: boolean;
}) {
  const locale = useLocale();
  return (
    <>
      <div className="flex items-center gap-2.5">
        <div
          aria-hidden
          className="flex h-[26px] w-[26px] items-center justify-center border-2 border-green text-sm font-black text-green"
        >
          ✓
        </div>
        <h2 className="text-[18px] font-black">{locale === "en" ? "Reservation sent" : "預留已送出"}</h2>
      </div>
      {/* 消費者端還沒有任何推播管道（只留手機、沒有簡訊）。他唯一會知道
          結果的方式是取貨憑證頁自己更新，
          所以這裡要把人推到那一頁去，而不是叫他等一則不會來的訊息。 */}
      <p className="-mt-1.5 text-[14px] leading-[1.6] text-muted">
        {demo
          ? locale === "en" ? "The same code is now in the demo Store OS inbox. This is a sandbox order, so no real pickup is required." : "相同單號現在已送進 Demo Store OS inbox。這是沙盒示範單，不需要實際取貨。"
          : locale === "en" ? `Waiting for ${target.store.name} to confirm, usually within 10 minutes. The hold lasts ${success.holdHours} hours after confirmation. Keep the pickup receipt open; its status updates automatically.` : <>等{target.store.name}確認（通常 10 分鐘內）— 確認後保留 {success.holdHours} 小時。我們不會另外傳訊息給你，請開啟下面的取貨憑證頁留著，狀態會在那裡自己更新。</>}
      </p>

      {success.intakeShared && (
        <div className="border border-green-tint-line bg-green-tint px-3.5 py-2.5 text-[12.5px] leading-[1.6] text-ink-2">
          <b className="font-bold text-green">
            {locale === "en" ? "Context shared with Store OS" : "需求脈絡已附在單號上"}
          </b>
          <p className="mb-0 mt-1 text-muted">
            {locale === "en"
              ? "The pharmacy can review your allergy answer, Shop search, and note before confirming; the pharmacist still decides what is appropriate in store."
              : "藥局確認前可以看到你的過敏回答、Shop 搜尋與補充描述；實際適合的藥品或服務仍由藥師在門市判斷。"}
          </p>
        </div>
      )}

      <div className="flex flex-col items-center gap-1 border border-line bg-surface p-4">
        <div className="text-[13px] font-medium text-muted-2">{locale === "en" ? "Pickup code" : "取貨碼"}</div>
        <div className="num text-[34px] font-semibold tracking-[.12em]">{success.code}</div>
        <div className="text-center text-xs text-ink-2">
          {target.drug.name} · {demo ? (locale === "en" ? "Demo only · no pickup" : "僅供示範 · 無需取貨") : (locale === "en" ? "Pharmacist confirms; pay in store" : "到店由藥師確認並付款")}
        </div>
      </div>

      <div className="border border-line px-3.5 py-3 text-[14px] leading-[1.6]">
        <div className="font-bold">{target.store.name}</div>
        <div className="text-muted">
          {target.store.address}
          <br />
          {hoursSummary(target.store, locale)}
        </div>
      </div>

      {success.token && (
        // 這張 sheet 關掉就沒了 —— 給一個可截圖、可加書籤的永久網址，
        // 藥局確認後回來看狀態就會變。
        <a
          href={localizedPath(`/r/${success.token}`, locale)}
          className="action-secondary px-3.5 text-center text-[14px] font-medium"
        >
          {locale === "en" ? "Open pickup receipt →" : "開啟取貨憑證（可截圖保存）→"}
        </a>
      )}

      <div className="flex gap-2.5">
        {!demo && (
          <a
            href={target.store.mapsUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="action-primary h-[46px] flex-1 px-3 text-sm"
          >
            {locale === "en" ? "Open directions" : "開啟導航"}
          </a>
        )}
        <Link
          href={`${SHOP_URL}${localizedPath("/", locale)}`}
          className="action-secondary h-[46px] flex-1 px-3 text-sm font-medium"
        >
          {locale === "en" ? "Back to search" : "回到搜尋"}
        </Link>
      </div>
      <button
        type="button"
        onClick={() => {
          void fetch("/api/reservations", {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token: success.token }),
          }).catch(() => {
            /* 取消是 best-effort：藥局端沒收到確認也會自然過期 */
          });
          onClose();
        }}
        className="inline-flex min-h-11 items-center justify-center text-center text-xs text-muted underline"
      >
        {locale === "en" ? "Cancel this reservation" : "取消這筆預留"}
      </button>
    </>
  );
}
