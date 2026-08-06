"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { StockBadge } from "./StockBadge";
import { formatPrice } from "@/lib/format";
import { hoursSummary } from "@/lib/hours";
import type { NotifyResult, StockBadgeSpec, Store } from "@/lib/types";

export interface ReserveTarget {
  drug: { slug: string; name: string; spec: string };
  store: Store;
  priceTwd: number;
  badge: StockBadgeSpec;
}

/** 記住上次填的號碼，不要每次預留都重打一次。 */
const PHONE_KEY = "uyao.phone";

interface Success {
  /** 取貨頁的不可猜網址 key */
  token?: string;
  code: string;
  holdHours: number;
  /** 只有示範模式會拿到 —— 藥局到底有沒有被通知 */
  notify?: NotifyResult;
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
  const [contact, setContact] = useState("");
  const [remembered, setRemembered] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Success | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
   * 裝置的主人自己填的。帶回來之後送出鈕直接可按，等於一鍵預留。
   */
  useEffect(() => {
    if (success) return;
    try {
      const saved = localStorage.getItem(PHONE_KEY);
      if (saved) {
        setContact(saved);
        setRemembered(true);
        return; // 已經有值就不要搶焦點，讓他直接按送出
      }
    } catch {
      /* 隱私模式讀不到就當沒存過 */
    }
    inputRef.current?.focus();
  }, [success]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
          ...(demo ? { demo: true } : {}),
        }),
      });
      const data = (await res.json()) as {
        code?: string;
        token?: string;
        holdHours?: number;
        notify?: NotifyResult;
        error?: string;
      };
      if (!res.ok || !data.code) {
        setError(data.error ?? "送出失敗，請再試一次");
        return;
      }
      try {
        localStorage.setItem(PHONE_KEY, contact.trim());
      } catch {
        /* 存不起來不影響這次預留 */
      }
      setSuccess({
        code: data.code,
        token: data.token,
        holdHours: data.holdHours ?? 4,
        notify: data.notify,
      });
    } catch {
      setError("連線失敗，請確認網路後再試");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={success ? "預留已送出" : `預留 ${target.drug.name}`}
    >
      <button
        type="button"
        aria-label="關閉"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(26,36,32,.32)]"
      />
      <div
        className={`sheet-in relative flex w-full max-w-[420px] flex-col gap-3.5 border-t-2 bg-white px-5 pb-6 pt-[18px] sm:border-x sm:border-b ${
          success ? "border-green" : "border-t-ink sm:border-x-line-strong sm:border-b-line-strong"
        }`}
      >
        {success ? (
          <SuccessBody target={target} success={success} onClose={onClose} />
        ) : (
          <>
            <div className="mx-auto -mt-1.5 h-1 w-9 bg-line-strong sm:hidden" />
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-[18px] font-black">預留 · {target.store.name}</h2>
              <p className="text-[13px] text-muted">
                {target.store.district} · {hoursSummary(target.store)}
              </p>
            </div>

            <div className="flex items-center gap-2.5 border border-line px-3.5 py-2.5 text-[15px]">
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {target.drug.name} {target.drug.spec}
                </div>
                <StockBadge badge={target.badge} className="mt-0.5 text-[13px]" />
              </div>
              <div className="num font-semibold">{formatPrice(target.priceTwd)}</div>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-1.5">
              <label htmlFor="reserve-contact" className="text-xs font-bold">
                手機號碼{" "}
                <span className="font-normal text-muted-2">藥局確認後聯絡你，到店對尾號</span>
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
                className="h-[46px] border-[1.5px] border-ink px-3.5 text-sm outline-none placeholder:text-muted-2"
              />
              {remembered && (
                <button
                  type="button"
                  onClick={() => {
                    setContact("");
                    setRemembered(false);
                    inputRef.current?.focus();
                  }}
                  className="self-start text-[11px] text-muted-2 underline"
                >
                  這是你上次用的號碼 · 換一個
                </button>
              )}
              {error && (
                <p role="alert" className="text-[13px] font-medium text-ink">
                  {error}
                </p>
              )}
              <p className="mt-1 text-[13px] leading-[1.6] text-muted">
                藥局按下確認後為你保留 <b className="text-ink">4 小時</b>
                ，到店付款取貨。兩次未取將暫停預留權限。
              </p>
              <button
                type="submit"
                disabled={pending || contact.trim() === ""}
                className="mt-1.5 h-12 bg-green text-[16px] font-bold tracking-[.1em] text-white hover:bg-green-hover disabled:bg-line-strong disabled:text-white"
              >
                {pending ? "送出中…" : "送出預留"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const NOTIFY_UI: Record<NotifyResult, { ok: boolean; label: string; body: string }> = {
  sent: {
    ok: true,
    label: "已推播給藥局的 LINE",
    body: "老闆按下「有貨，確認保留」之後，取貨憑證頁會變成「已確認保留」。閉環到那裡才算合上。",
  },
  unbound: {
    ok: false,
    label: "這家藥局還沒綁定 LINE",
    body: "沒有人會收到這筆。用要收通知的帳號傳店名給官方帳號、核可之後再按一次。",
  },
  not_configured: {
    ok: false,
    label: "LINE 未設定",
    body: "少了 LINE_CHANNEL_ACCESS_TOKEN 或 LINE_CHANNEL_SECRET，這個環境推不出任何訊息。",
  },
  failed: {
    ok: false,
    label: "推播被 LINE 擋下",
    body: "綁定與設定都在，是 LINE API 回了錯誤。log 裡有狀態碼：配額、好友關係、或訊息格式。",
  },
};

/**
 * 示範專用的閉環診斷。
 *
 * 在藥局老闆面前沒有時間翻 log —— 你說「你的 LINE 會響」，沒響的時候
 * 畫面卻一切正常，當場沒有任何線索。這一條把後端的推播結果直接講出來。
 * 只有 demo 模式的回應帶 `notify`，所以真單不會看到它。
 */
function NotifyStrip({ notify }: { notify: NotifyResult }) {
  const ui = NOTIFY_UI[notify];
  return (
    <div
      className={`border px-3.5 py-2.5 text-[12.5px] leading-[1.6] ${
        ui.ok ? "border-green-tint-line bg-green-tint" : "border-line-strong bg-surface"
      }`}
    >
      <div className="flex items-baseline gap-1.5 font-bold">
        <span aria-hidden className={ui.ok ? "text-green" : "text-ink"}>
          {ui.ok ? "✓" : "⚠"}
        </span>
        <span className={ui.ok ? "text-green" : "text-ink"}>{ui.label}</span>
        <span className="ml-auto text-[10.5px] font-medium tracking-[.08em] text-muted-2">
          示範診斷
        </span>
      </div>
      <p className="mt-1 text-muted">{ui.body}</p>
    </div>
  );
}

function SuccessBody({
  target,
  success,
  onClose,
}: {
  target: ReserveTarget;
  success: Success;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2.5">
        <div
          aria-hidden
          className="flex h-[26px] w-[26px] items-center justify-center border-2 border-green text-sm font-black text-green"
        >
          ✓
        </div>
        <h2 className="text-[18px] font-black">預留已送出</h2>
      </div>
      {/* 不能寫「會用 LINE 通知你」—— 消費者端還沒有任何推播管道（只留手機、
          沒有簡訊、沒接 LINE）。他唯一會知道結果的方式是取貨憑證頁自己更新，
          所以這裡要把人推到那一頁去，而不是叫他等一則不會來的訊息。 */}
      <p className="-mt-1.5 text-[14px] leading-[1.6] text-muted">
        等{target.store.name}確認（通常 10 分鐘內）— 確認後保留 {success.holdHours}{" "}
        小時。我們不會另外傳訊息給你，請開啟下面的取貨憑證頁留著，狀態會在那裡自己更新。
      </p>

      {success.notify && <NotifyStrip notify={success.notify} />}

      <div className="flex flex-col items-center gap-1 border border-line bg-surface p-4">
        <div className="text-[13px] font-medium text-muted-2">取貨碼</div>
        <div className="num text-[34px] font-semibold tracking-[.12em]">{success.code}</div>
        <div className="text-center text-xs text-ink-2">
          {target.drug.name} · <span className="num">{formatPrice(target.priceTwd)}</span> 到店付款
        </div>
      </div>

      <div className="border border-line px-3.5 py-3 text-[14px] leading-[1.6]">
        <div className="font-bold">{target.store.name}</div>
        <div className="text-muted">
          {target.store.address}
          <br />
          {hoursSummary(target.store)}
        </div>
      </div>

      {success.token && (
        // 這張 sheet 關掉就沒了 —— 給一個可截圖、可加書籤的永久網址，
        // 藥局確認後回來看狀態就會變。
        <a
          href={`/r/${success.token}`}
          className="border border-line-strong px-3.5 py-2.5 text-center text-[14px] font-medium text-ink no-underline hover:border-green hover:text-green"
        >
          開啟取貨憑證（可截圖保存）→
        </a>
      )}

      <div className="flex gap-2.5">
        <a
          href={target.store.mapsUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="flex h-[46px] flex-1 items-center justify-center bg-green text-sm font-bold text-white no-underline hover:bg-green-hover"
        >
          開啟導航
        </a>
        <Link
          href="/"
          className="flex h-[46px] flex-1 items-center justify-center border border-line-strong text-sm font-medium text-ink no-underline"
        >
          回到搜尋
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
        className="text-center text-xs text-muted-2 underline"
      >
        取消這筆預留
      </button>
    </>
  );
}
