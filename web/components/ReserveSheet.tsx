"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { StockBadge } from "./StockBadge";
import { formatPrice } from "@/lib/format";
import { hoursSummary } from "@/lib/hours";
import type { StockBadgeSpec, Store } from "@/lib/types";

export interface ReserveTarget {
  drug: { slug: string; name: string; spec: string };
  store: Store;
  priceTwd: number;
  badge: StockBadgeSpec;
}

interface Success {
  /** 取貨頁的不可猜網址 key */
  token?: string;
  code: string;
  holdHours: number;
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

  useEffect(() => {
    if (!success) inputRef.current?.focus();
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
      const data = (await res.json()) as { code?: string; token?: string; holdHours?: number; error?: string };
      if (!res.ok || !data.code) {
        setError(data.error ?? "送出失敗，請再試一次");
        return;
      }
      setSuccess({ code: data.code, token: data.token, holdHours: data.holdHours ?? 4 });
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
              <h2 className="text-[17px] font-black">預留 · {target.store.name}</h2>
              <p className="text-[11px] text-muted">
                {target.store.district} · {hoursSummary(target.store)}
              </p>
            </div>

            <div className="flex items-center gap-2.5 border border-line px-3.5 py-2.5 text-[13px]">
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {target.drug.name} {target.drug.spec}
                </div>
                <StockBadge badge={target.badge} className="mt-0.5 text-[11px]" />
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
                autoComplete="tel"
                className="h-[46px] border-[1.5px] border-ink px-3.5 text-sm outline-none placeholder:text-muted-2"
              />
              {error && (
                <p role="alert" className="text-[11.5px] font-medium text-ink">
                  {error}
                </p>
              )}
              <p className="mt-1 text-[11.5px] leading-[1.6] text-muted">
                藥局按下確認後為你保留 <b className="text-ink">4 小時</b>
                ，到店付款取貨。兩次未取將暫停預留權限。
              </p>
              <button
                type="submit"
                disabled={pending || contact.trim() === ""}
                className="mt-1.5 h-12 bg-green text-[15px] font-bold tracking-[.1em] text-white hover:bg-green-hover disabled:bg-line-strong disabled:text-white"
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
        <h2 className="text-[17px] font-black">預留已送出</h2>
      </div>
      <p className="-mt-1.5 text-[12.5px] leading-[1.6] text-muted">
        等{target.store.name}確認（通常 10 分鐘內）— 確認後保留 {success.holdHours}{" "}
        小時，會用 LINE 通知你。
      </p>

      <div className="flex flex-col items-center gap-1 border border-line bg-surface p-4">
        <div className="text-[11px] font-medium text-muted-2">取貨碼</div>
        <div className="num text-[34px] font-semibold tracking-[.12em]">{success.code}</div>
        <div className="text-center text-xs text-ink-2">
          {target.drug.name} · <span className="num">{formatPrice(target.priceTwd)}</span> 到店付款
        </div>
      </div>

      <div className="border border-line px-3.5 py-3 text-[12.5px] leading-[1.6]">
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
          className="border border-line-strong px-3.5 py-2.5 text-center text-[12.5px] font-medium text-ink no-underline hover:border-green hover:text-green"
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
            body: JSON.stringify({ code: success.code }),
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
