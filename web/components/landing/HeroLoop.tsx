"use client";

import { useEffect, useState } from "react";

import { CrossMark } from "@/components/CrossMark";

/**
 * Hero 的 Supply → Action → Outcome 閉環視覺。
 * 一次性的三段進場（200ms 起、每段 +240ms）；prefers-reduced-motion
 * 或無 JS 時三段直接完整可見 —— 敘事不靠動畫成立。
 */
export function HeroLoop() {
  const [step, setStep] = useState(3);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setStep(0);
    const timers = [1, 2, 3].map((s, i) =>
      window.setTimeout(() => setStep(s), 200 + i * 240),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const fx = (n: number) =>
    `transition-[opacity,transform] duration-[180ms] ease-out ${
      step >= n ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
    }`;

  return (
    <div className="min-w-0">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <span className="num text-[12px] font-medium tracking-[.08em] text-muted">
          SUPPLY → ACTION → OUTCOME
        </span>
        <span className="num border border-green px-2 py-[3px] text-[11px] font-medium text-green">
          PROTOTYPE · 示範資料
        </span>
      </div>

      <div className={fx(1)}>
        <div className="relative overflow-hidden border border-line-strong bg-surface px-[18px] py-4">
          <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-green" />
          <div className="num mb-2 text-[12px] font-medium text-muted">
            SCAN EVENT · box/connector
          </div>
          <div className="num grid grid-cols-[auto,1fr] gap-x-[18px] text-[13.5px] font-medium leading-[1.9] text-ink">
            <span className="text-muted">GTIN</span>
            <span>04713243990117</span>
            <span className="text-muted">LOT</span>
            <span>TW881</span>
            <span className="text-muted">EXP</span>
            <span>2026-11</span>
            <span className="text-muted">TS</span>
            <span>2026-08-09 14:32:07</span>
          </div>
        </div>
      </div>

      <div className="num flex justify-center py-1.5 text-[13px] text-line-strong" aria-hidden>
        ↓
      </div>

      <div className={fx(2)}>
        <div className="border border-line-strong bg-white">
          <div className="flex items-center gap-2 border-b border-line px-[18px] py-2.5">
            <CrossMark size={18} />
            <span className="text-[13px] font-bold">uYao</span>
            <span className="num ml-auto text-[11px] font-medium text-muted">
              LINE 訊息 · prototype
            </span>
          </div>
          <div className="px-[18px] py-4">
            <p className="m-0 text-[16px] font-bold leading-[1.6]">
              這批藥的退貨窗口即將關閉
            </p>
            <div className="num my-2.5 mb-4 text-[12.5px] font-medium leading-[1.9] text-ink-2">
              批號 TW881 · EXP 2026-11
              <br />
              退貨規則：待藥師／供應商確認
            </div>
            <div className="grid gap-2">
              <span className="bg-green px-3 py-[11px] text-center text-[14px] font-bold text-white">
                開始辦退貨
              </span>
              <span className="border border-line-strong px-3 py-2.5 text-center text-[14px] text-ink">
                這批賣得掉
              </span>
              <span className="border border-line-strong px-3 py-2.5 text-center text-[14px] text-ink">
                資料不正確
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="num flex justify-center py-1.5 text-[13px] text-line-strong" aria-hidden>
        ↓
      </div>

      <div className={fx(3)}>
        <div className="num border border-dashed border-line-strong bg-surface px-[18px] py-3.5 text-[12.5px] font-medium leading-[2]">
          <div className="tracking-[.08em] text-muted">OUTCOME RECEIPT</div>
          <div className="mt-1 grid grid-cols-[auto,1fr] gap-x-[18px]">
            <span className="text-muted">狀態</span>
            <span className="font-semibold text-green">藥師已確認</span>
            <span className="text-muted">結果</span>
            <span>等待真實金額回寫</span>
          </div>
        </div>
      </div>
    </div>
  );
}
