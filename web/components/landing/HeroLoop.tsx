"use client";

import { useEffect, useState } from "react";

import { BrandMark } from "@/components/BrandMark";

/** Hero 閉環的 locale-aware 文案；zh／en 版本分別由 app/page.tsx 與 app/en/page.tsx 提供。 */
export interface HeroLoopCopy {
  flowLabel: string;
  badge: string;
  scanTitle: string;
  lineHeader: string;
  cardTitle: string;
  cardMetaLines: string[];
  primaryBtn: string;
  secondaryBtns: string[];
  receiptTitle: string;
  statusLabel: string;
  statusValue: string;
  resultLabel: string;
  resultValue: string;
}

/**
 * Hero 的 Supply → Action → Outcome 閉環視覺。
 * 三段內容始終可見；動畫只把注意力從供給訊號帶到行動與結果。
 * 因此 hydration、無 JS 與 reduced motion 都不會先閃現再消失。
 */
export function HeroLoop({ copy }: { copy: HeroLoopCopy }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(3);
      return;
    }
    const timers = [1, 2, 3].map((s, i) =>
      window.setTimeout(() => setStep(s), 200 + i * 240),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-w-0">
      <div className="mb-3.5 flex items-center justify-between gap-3 px-1">
        <span className="num text-[12px] font-medium tracking-[.08em] text-muted">
          {copy.flowLabel}
        </span>
        <span className="num rounded-full bg-sage px-3 py-1.5 text-[11px] font-semibold tracking-[.04em] text-forest">
          {copy.badge}
        </span>
      </div>

      <div className="paper-elevation relative overflow-hidden border border-line bg-paper px-5 py-5 sm:px-7 sm:py-6">
        <div className="absolute inset-y-0 left-0 w-1 bg-green-tint-line" aria-hidden>
          <span
            className="hero-loop-progress block h-full origin-top bg-green transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{ transform: `scaleY(${step / 3})` }}
          />
        </div>

        <div className="border-b border-line pb-5">
          <div className="num mb-3 text-[11.5px] font-semibold tracking-[.08em] text-muted">
            {copy.scanTitle}
          </div>
          <div className="num grid grid-cols-[auto,1fr] gap-x-5 text-[13px] font-semibold leading-[1.9] text-ink">
            <span className="text-muted">GTIN</span><span>04713243990117</span>
            <span className="text-muted">LOT</span><span>TW881</span>
            <span className="text-muted">EXP</span><span>2026-11</span>
            <span className="text-muted">TS</span><span>2026-08-09 14:32:07</span>
          </div>
        </div>

        <div className="py-5">
          <div className="flex items-center gap-2">
            <BrandMark size={18} />
            <span className="text-[13px] font-bold">uYao</span>
            <span className="num ml-auto text-[11px] font-medium text-muted">
              {copy.lineHeader}
            </span>
          </div>
          <p className="mb-0 mt-5 text-[17px] font-bold leading-[1.6]">{copy.cardTitle}</p>
          <div className="num mb-4 mt-2 text-[12.5px] font-medium leading-[1.9] text-muted">
            {copy.cardMetaLines.map((line) => <div key={line}>{line}</div>)}
          </div>
          <div className="grid gap-2">
            <span
              className={`hero-loop-action bg-forest px-3 py-3 text-center text-[14px] font-bold text-paper transition-transform duration-300 ${
                step >= 2 ? "scale-[1.01]" : "scale-100"
              }`}
            >
              {copy.primaryBtn}
            </span>
            <div className="grid gap-2 sm:grid-cols-2">
              {copy.secondaryBtns.map((label) => (
                <span key={label} className="border border-line px-3 py-2.5 text-center text-[13px] text-ink">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="num relative border-t border-dashed border-line pt-4 text-[12px] font-medium leading-[1.9]">
          <span
            aria-hidden
            className={`hero-loop-result absolute right-0 top-4 h-2 w-2 rounded-full bg-green transition-[opacity,transform] duration-300 ${
              step >= 3 ? "scale-100 opacity-100" : "scale-50 opacity-0"
            }`}
          />
          <div className="tracking-[.08em] text-muted">{copy.receiptTitle}</div>
          <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
            <span><span className="mr-2 text-muted">{copy.statusLabel}</span><strong className="text-green">{copy.statusValue}</strong></span>
            <span><span className="mr-2 text-muted">{copy.resultLabel}</span>{copy.resultValue}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
