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
 * 一次性的三段進場（200ms 起、每段 +240ms）；prefers-reduced-motion
 * 或無 JS 時三段直接完整可見 —— 敘事不靠動畫成立。
 */
export function HeroLoop({ copy }: { copy: HeroLoopCopy }) {
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
          {copy.flowLabel}
        </span>
        <span className="num border border-green px-2 py-[3px] text-[11px] font-medium text-green">
          {copy.badge}
        </span>
      </div>

      <div className={fx(1)}>
        <div className="relative overflow-hidden border border-line-strong bg-surface px-[18px] py-4">
          <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-green" />
          <div className="num mb-2 text-[12px] font-medium text-muted">{copy.scanTitle}</div>
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
            <BrandMark size={18} />
            <span className="text-[13px] font-bold">uYao</span>
            <span className="num ml-auto text-[11px] font-medium text-muted">
              {copy.lineHeader}
            </span>
          </div>
          <div className="px-[18px] py-4">
            <p className="m-0 text-[16px] font-bold leading-[1.6]">{copy.cardTitle}</p>
            <div className="num my-2.5 mb-4 text-[12.5px] font-medium leading-[1.9] text-ink-2">
              {copy.cardMetaLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
            <div className="grid gap-2">
              <span className="bg-green px-3 py-[11px] text-center text-[14px] font-bold text-white">
                {copy.primaryBtn}
              </span>
              {copy.secondaryBtns.map((label) => (
                <span
                  key={label}
                  className="border border-line-strong px-3 py-2.5 text-center text-[14px] text-ink"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="num flex justify-center py-1.5 text-[13px] text-line-strong" aria-hidden>
        ↓
      </div>

      <div className={fx(3)}>
        <div className="num border border-dashed border-line-strong bg-surface px-[18px] py-3.5 text-[12.5px] font-medium leading-[2]">
          <div className="tracking-[.08em] text-muted">{copy.receiptTitle}</div>
          <div className="mt-1 grid grid-cols-[auto,1fr] gap-x-[18px]">
            <span className="text-muted">{copy.statusLabel}</span>
            <span className="font-semibold text-green">{copy.statusValue}</span>
            <span className="text-muted">{copy.resultLabel}</span>
            <span>{copy.resultValue}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
