"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * 取貨頁的取消按鈕。
 *
 * 兩段式（先問再取消）而不是直接執行：這個動作會讓藥局把留在櫃檯的商品
 * 放回去，誤觸的代價落在別人身上。但也不用做成 modal —— 一句確認就夠，
 * 不值得為它蓋一層遮罩。
 */
export function CancelReservation({
  token,
  confirmed,
}: {
  token: string;
  /** 藥局已經確認過。取消的話商品要從櫃檯放回去，講清楚。 */
  confirmed: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function cancel() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? "取消失敗，請再試一次");
        return;
      }
      router.refresh();
    } catch {
      setError("連線失敗，請確認網路後再試");
    } finally {
      setPending(false);
    }
  }

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="mt-3 text-[13px] text-muted-2 underline"
      >
        取消這筆預留
      </button>
    );
  }

  return (
    <div className="mt-3 border border-line-strong bg-surface px-3.5 py-3">
      <p className="text-[13px] leading-[1.7] text-ink">
        確定要取消嗎？
        {confirmed && (
          <span className="text-muted">
            {" "}
            藥局已經把商品留在櫃檯了，取消後他會放回架上。
          </span>
        )}
      </p>
      {error && (
        <p role="alert" className="mt-1 text-[13px] font-medium text-ink">
          {error}
        </p>
      )}
      <div className="mt-2.5 flex gap-2.5">
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="h-11 flex-1 border border-line-strong bg-paper text-[14px] font-medium text-ink disabled:text-muted-2"
        >
          {pending ? "取消中…" : "確定取消"}
        </button>
        <button
          type="button"
          onClick={() => setAsking(false)}
          disabled={pending}
          className="h-11 flex-1 bg-green text-[14px] font-bold text-white"
        >
          不取消，保留
        </button>
      </div>
    </div>
  );
}
