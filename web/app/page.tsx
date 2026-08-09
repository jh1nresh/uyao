import type { Metadata } from "next";
import Link from "next/link";

import { CrossMark } from "@/components/CrossMark";
import { HeroLoop, type HeroLoopCopy } from "@/components/landing/HeroLoop";
import { PilotCtaForm, type PilotFormCopy } from "@/components/landing/PilotCtaForm";

/**
 * 公司 landing（design: `uYao Landing.dc.html`，spec: company-landing-page.md
 * + company-landing-page-yc-en-adjustment.md）。
 * `/` 說清楚問題、閉環、證據與試點；消費者 app 在 /app，英文 YC 版在 /en。
 * 誠實原則：未驗證的一律標 prototype／示範資料，evidence 逐項標 ✓／○；
 * 尚無 active partner，status line 一律用 recruiting 版本。
 */
export const metadata: Metadata = {
  title: { absolute: "uYao — 獨立藥局的 AI Operating System" },
  description:
    "uYao 主動處理獨立藥局的庫存、效期與附近需求，只把必要決策交給藥師批准。",
  alternates: {
    canonical: "/",
    languages: { "zh-TW": "/", en: "/en", "x-default": "/" },
  },
  openGraph: {
    title: "uYao — 獨立藥局的 AI Operating System",
    description:
      "uYao 主動處理獨立藥局的庫存、效期與附近需求，只把必要決策交給藥師批准。",
    locale: "zh_TW",
    url: "/",
  },
};

const HERO_COPY: HeroLoopCopy = {
  flowLabel: "SUPPLY → ACTION → OUTCOME",
  badge: "PROTOTYPE · 示範資料",
  scanTitle: "SCAN EVENT · box/connector",
  lineHeader: "LINE 訊息 · prototype",
  cardTitle: "這批藥的退貨窗口即將關閉",
  cardMetaLines: ["批號 TW881 · EXP 2026-11", "退貨規則：待藥師／供應商確認"],
  primaryBtn: "開始辦退貨",
  secondaryBtns: ["這批賣得掉", "資料不正確"],
  receiptTitle: "OUTCOME RECEIPT",
  statusLabel: "狀態",
  statusValue: "藥師已確認",
  resultLabel: "結果",
  resultValue: "等待真實金額回寫",
};

const FORM_COPY: PilotFormCopy = {
  locale: "zh",
  nameLabel: "藥局名稱 *",
  areaLabel: "所在區域",
  contactLabel: "聯絡方式（LINE ID 或電話）*",
  problemsLegend: "目前最常遇到的問題（選填）",
  problems: [
    "過期／報廢",
    "錯過退貨窗口",
    "進貨過量",
    "經常缺貨",
    "不知道附近需求",
    "其他",
  ].map((v) => ({ value: v, label: v })),
  submit: "申請試點",
  submitting: "送出中…",
  requiredError: "請填寫藥局名稱與聯絡方式。",
  genericError: "連線失敗，請稍後再試",
  successTitle: "已收到申請",
  successBody:
    "我們會透過你留下的聯絡方式跟你約時間，聊掃描流程與退貨窗口怎麼在你的店裡跑起來。",
};

/** Evidence ladder — ✓ 只給 repo／測試／實際證據支持的項目，更新時附日期。 */
const EVIDENCE_DATE = "2026-08-09";
const EVIDENCE = [
  { done: false, label: "問題來自共同創辦人的藥業現場經驗（整理中）" },
  { done: true, label: "已建立早期藥局合作入口" },
  { done: true, label: "Barcode parser／offline event pipeline／Consumer Web prototype" },
  { done: false, label: "真實藥盒 DataMatrix field check" },
  { done: false, label: "第一台 Box 現場安裝" },
  { done: false, label: "第一筆 pharmacist-approved action" },
  { done: false, label: "第一筆避免報廢、追回退貨或新增成交" },
  { done: false, label: "第一家付費藥局" },
] as const;

const POS_ROWS = [
  { pos: "已完成的銷售", uyao: "因缺貨而離開的附近需求" },
  { pos: "人工維護的效期欄位", uyao: "掃描取得的批次／效期證據與待確認項目" },
  { pos: "歷史庫存與報表", uyao: "該退、該減、該補或該確認的 action queue" },
] as const;

const FLOW: { n: string; title: string; body: string; hot?: boolean }[] = [
  { n: "01", title: "Supply observer", body: "Box／connector 取得品項、批次、效期與移動訊號" },
  { n: "02", title: "Demand sensor", body: "Consumer Web 取得搜尋落空、通知、預留與取貨需求" },
  {
    n: "03",
    title: "Action agent",
    body: "從可驗證規則開始，結合現有營運 context 準備下一步行動，交由藥師批准",
    hot: true,
  },
  { n: "04", title: "Pharmacist approval", body: "藥師在 LINE 批准、拒絕或修正" },
  { n: "05", title: "Outcome receipt", body: "記錄退貨、避免報廢、減少積壓或新增成交結果" },
];

const ACTION_CHIPS = ["VERIFY", "RETURN", "REDUCE", "REORDER", "RESERVE"] as const;

const TIMELINE = [
  { label: "進貨掃描", note: "GTIN · LOT · EXP" },
  { label: "效期／批次確認" },
  { label: "退貨窗口 approaching", note: "待確認供應商退貨規則", hot: true },
  { label: "LINE action", note: "開始辦退貨？" },
  { label: "藥師回覆" },
  { label: "outcome pending / verified", last: true },
] as const;

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1160px] px-5 sm:px-8">{children}</div>;
}

export default function CompanyLandingPage() {
  return (
    <div className="min-w-[320px] text-ink">
      <nav className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur-[6px]">
        <Container>
          <div className="flex h-[68px] items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2.5 text-ink no-underline">
              <CrossMark />
              <span className="text-[19px] font-black tracking-[.01em]">uYao</span>
            </Link>
            <div className="flex items-center gap-4 text-[15px] sm:gap-7">
              <a href="#how" className="hidden text-ink no-underline hover:text-green md:inline">
                怎麼運作
              </a>
              <a href="#progress" className="hidden text-ink no-underline hover:text-green md:inline">
                目前進度
              </a>
              <Link href="/app" className="hidden text-ink no-underline hover:text-green md:inline">
                附近找藥
              </Link>
              <a
                href="#pilot"
                className="bg-green px-5 py-2.5 text-[15px] font-bold text-white no-underline hover:bg-green-hover"
              >
                申請試點
              </a>
              <span className="num text-[13px] text-muted">
                <span aria-current="true" className="font-semibold text-ink">
                  中
                </span>
                {" / "}
                <Link href="/en" className="text-muted no-underline hover:text-green">
                  EN
                </Link>
              </span>
            </div>
          </div>
        </Container>
      </nav>

      {/* Hero：先賣結果，visual 是一條真實 action loop */}
      <header className="border-b border-line bg-white">
        <Container>
          <div className="grid items-start gap-12 py-14 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:pb-16 lg:pt-[88px]">
            <div>
              <h1 className="m-0 text-[clamp(34px,4.5vw,56px)] font-black leading-[1.28] tracking-[.005em] [text-wrap:pretty]">
                少丟貨，少缺貨。
                <br />
                讓每一盒庫存跟附近需求連起來。
              </h1>
              <p className="mb-0 mt-7 max-w-[34em] text-[17px] leading-[1.85] text-ink-2">
                uYao
                連接店內庫存、效期與附近需求，主動準備並推進退貨、補貨與預留工作，只把必要決策交給藥師批准。
              </p>
              <div className="mt-9 flex flex-wrap gap-3.5">
                <a
                  href="#pilot"
                  className="box-border inline-flex min-h-11 items-center whitespace-nowrap bg-green px-8 py-[15px] text-[16px] font-bold text-white no-underline hover:bg-green-hover"
                >
                  申請試點
                </a>
                <Link
                  href="/app"
                  className="box-border inline-flex min-h-11 items-center whitespace-nowrap border border-line-strong px-8 py-[15px] text-[16px] font-medium text-ink no-underline hover:border-green hover:text-green"
                >
                  附近找藥
                </Link>
              </div>
              <p className="mb-0 mt-11 flex items-center gap-2.5 border-t border-line pt-5 text-[14px] text-muted">
                <span className="h-2 w-2 flex-none bg-green" aria-hidden />
                正在招募獨立藥局，一起驗證第一條現場閉環。
              </p>
            </div>
            <HeroLoop copy={HERO_COPY} />
          </div>
        </Container>
      </header>

      {/* 為什麼 POS 還是不夠 — comparison strip */}
      <section className="border-b border-line bg-surface">
        <Container>
          <div className="py-16 sm:py-[88px]">
            <h2 className="mb-10 mt-0 text-[clamp(26px,3vw,34px)] font-black leading-[1.4] [text-wrap:pretty]">
              POS 記錄交易；uYao 告訴你下一步。
            </h2>
            <div className="border border-line-strong bg-white">
              <div className="hidden border-b border-line sm:grid sm:grid-cols-[1fr,1.2fr]">
                <div className="num border-r border-line px-6 py-3.5 text-[12px] font-medium tracking-[.08em] text-muted">
                  現有系統通常看見
                </div>
                <div className="num px-6 py-3.5 text-[12px] font-medium tracking-[.08em] text-green">
                  uYao 補上的訊號與行動
                </div>
              </div>
              {POS_ROWS.map((row, i) => (
                <div
                  key={row.pos}
                  className={`grid sm:grid-cols-[1fr,1.2fr] ${
                    i < POS_ROWS.length - 1 ? "border-b border-line" : ""
                  }`}
                >
                  <div className="bg-surface px-6 pb-3 pt-4 text-[16px] text-muted sm:border-r sm:border-line sm:py-[22px]">
                    <span className="num mb-1 block text-[11px] font-medium tracking-[.08em] sm:hidden">
                      現有系統通常看見
                    </span>
                    {row.pos}
                  </div>
                  <div className="px-6 pb-4 pt-3 text-[16px] leading-[1.7] sm:py-[22px]">
                    <span className="num mb-1 block text-[11px] font-medium tracking-[.08em] text-green sm:hidden">
                      uYao 補上的訊號與行動
                    </span>
                    <span className="mr-2 font-bold text-green" aria-hidden>
                      ＋
                    </span>
                    {row.uyao}
                  </div>
                </div>
              ))}
            </div>
            <p className="mb-0 mt-[18px] text-[14px] text-muted">
              uYao 不取代 POS、健保申報或藥師判斷；它補上缺失的訊號與行動層。
            </p>
          </div>
        </Container>
      </section>

      {/* 一個完整閉環 — 不對稱五步流程，03 加重 */}
      <section id="how" className="scroll-mt-[68px] border-b border-line">
        <Container>
          <div className="py-16 sm:py-[88px]">
            <h2 className="mb-10 mt-0 text-[clamp(26px,3vw,34px)] font-black leading-[1.4] [text-wrap:pretty] sm:mb-14">
              不是 dashboard，是一條完成工作的閉環。
            </h2>
            <div className="grid border-t-2 border-ink lg:grid-cols-[1fr,1fr,1.5fr,1fr,1fr]">
              {FLOW.map((step, i) => (
                <div
                  key={step.n}
                  className={
                    step.hot
                      ? "-mt-0.5 border-t-2 border-green bg-surface p-6 lg:border-r lg:border-r-line lg:py-7"
                      : `border-b border-line px-6 py-6 last:border-b-0 lg:border-b-0 lg:py-7 ${
                          i < FLOW.length - 1 ? "lg:border-r lg:border-r-line" : ""
                        } ${i === 0 ? "lg:pl-0" : ""} ${i === FLOW.length - 1 ? "lg:pr-0" : ""}`
                  }
                >
                  <div
                    className={`num text-[13px] font-medium ${step.hot ? "text-green" : "text-muted"}`}
                  >
                    {step.n}
                  </div>
                  <h3 className="mb-2 mt-2.5 text-[17px] font-bold">{step.title}</h3>
                  <p className="m-0 text-[14.5px] leading-[1.75] text-ink-2">{step.body}</p>
                  {step.hot && (
                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      {ACTION_CHIPS.map((chip) => (
                        <span
                          key={chip}
                          className="num border border-green px-2 py-[3px] text-[11.5px] font-medium text-green"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* 第一個 wedge — return-window timeline */}
      <section className="border-b border-line bg-white">
        <Container>
          <div className="grid items-center gap-10 py-16 sm:py-[88px] lg:grid-cols-2 lg:gap-14">
            <div>
              <h2 className="mb-5 mt-0 text-[clamp(26px,3vw,34px)] font-black leading-[1.4] [text-wrap:pretty]">
                先在藥品變成報廢成本前行動。
              </h2>
              <p className="m-0 max-w-[32em] text-[16.5px] leading-[1.85] text-ink-2">
                第一個試點從退貨窗口開始：確認批次與效期、對照藥商規則、提前交給藥師處理，最後記下是否成功退貨或避免報廢。
              </p>
            </div>
            <div className="border border-line-strong bg-surface p-7">
              <div className="num mb-5 text-[12px] font-medium tracking-[.08em] text-muted">
                RETURN-WINDOW TIMELINE
              </div>
              <div className="grid text-[14.5px]">
                {TIMELINE.map((t) => (
                  <div key={t.label} className="flex items-stretch gap-3.5">
                    <div className="flex w-3.5 flex-none flex-col items-center" aria-hidden>
                      <span
                        className={`mt-[5px] h-2.5 w-2.5 flex-none border ${
                          "hot" in t && t.hot
                            ? "border-green bg-green"
                            : "border-line-strong bg-white"
                        }`}
                      />
                      {!("last" in t && t.last) && <span className="w-px flex-1 bg-line-strong" />}
                    </div>
                    <div className={"last" in t && t.last ? "pb-0" : "pb-5"}>
                      <span
                        className={
                          "hot" in t && t.hot ? "font-bold text-green" : "text-ink"
                        }
                      >
                        {t.label}
                      </span>
                      {"note" in t && t.note && (
                        <span className="num mt-0.5 block text-[12px] font-medium text-muted">
                          {t.note}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 需求端不是附加功能 */}
      <section className="border-b border-line bg-surface">
        <Container>
          <div className="grid items-center gap-10 py-16 sm:py-[88px] lg:grid-cols-2 lg:gap-14">
            <div className="lg:order-2">
              <h2 className="mb-5 mt-0 text-[clamp(26px,3vw,34px)] font-black leading-[1.4] [text-wrap:pretty]">
                不只看昨天賣了什麼，也看今天附近的人找不到什麼。
              </h2>
              <p className="m-0 max-w-[32em] text-[16.5px] leading-[1.85] text-ink-2">
                當附近使用者搜尋、找不到、留下到貨通知或完成預留，uYao
                把這些需求訊號帶回藥局，協助判斷該補什麼，而不是只靠歷史銷量猜測。
              </p>
              <p className="mb-0 mt-4 text-[13.5px] text-muted">
                公開頁只呈現彙總；不暴露個人聯絡方式或其他藥局資料。
              </p>
            </div>
            <div className="min-w-0 lg:order-1">
              <div className="border border-line-strong bg-white p-3">
                {/* 資產缺口誠實留白：等 Consumer Web 真實截圖，不用假 dashboard 充數 */}
                <div className="num flex h-[240px] items-center justify-center border border-dashed border-line-strong bg-surface px-6 text-center text-[12.5px] font-medium leading-[1.8] text-muted sm:h-[340px]">
                  缺：Consumer Web 真實搜尋／落空通知截圖
                </div>
              </div>
              <div className="num mt-3.5 flex flex-wrap items-center gap-2 text-[12px] font-medium text-muted">
                <span>搜尋一支藥</span>
                <span className="text-line-strong">→</span>
                <span className="text-green">inventory_miss</span>
                <span className="text-line-strong">→</span>
                <span>留下通知</span>
                <span className="text-line-strong">→</span>
                <span>彙總成藥局 action signal</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* LINE action proof */}
      <section className="border-b border-line">
        <Container>
          <div className="py-16 sm:py-[88px]">
            <div className="max-w-[38em]">
              <h2 className="mb-5 mt-0 text-[clamp(26px,3vw,34px)] font-black leading-[1.4]">
                藥師不用再開一個後台。
              </h2>
              <p className="mb-12 mt-0 text-[16.5px] leading-[1.85] text-ink-2">
                uYao 主動把要處理的事送到
                LINE。藥師只需批准、拒絕或修正；每次回覆都讓下一次建議更準確。
              </p>
            </div>
            <div className="grid max-w-[860px] gap-8 sm:grid-cols-2">
              <div className="border border-line-strong">
                <div className="flex items-center justify-between bg-surface px-[18px] py-2.5 shadow-[inset_0_-1px_0_#DCE3DE]">
                  <span className="num text-[12px] font-medium tracking-[.06em] text-muted">
                    RETURN REVIEW
                  </span>
                  <span className="num border border-[#C9A227] px-[7px] py-0.5 text-[11px] font-medium text-[#8A6A00]">
                    規則待確認
                  </span>
                </div>
                <div className="p-[18px]">
                  <div className="num mb-4 text-[13px] font-medium leading-[1.9] text-ink-2">
                    批號 TW881
                    <br />
                    退貨規則：待藥師／供應商確認
                  </div>
                  <div className="grid gap-2">
                    <span className="bg-green px-3 py-[11px] text-center text-[14px] font-bold text-white">
                      開始辦退貨
                    </span>
                    <span className="border border-line-strong px-3 py-2.5 text-center text-[14px]">
                      這批賣得掉
                    </span>
                    <span className="border border-line-strong px-3 py-2.5 text-center text-[14px]">
                      資料不正確
                    </span>
                  </div>
                </div>
              </div>
              <div className="border border-line-strong">
                <div className="flex items-center justify-between bg-surface px-[18px] py-2.5 shadow-[inset_0_-1px_0_#DCE3DE]">
                  <span className="num text-[12px] font-medium tracking-[.06em] text-muted">
                    REORDER REVIEW
                  </span>
                  <span className="num border border-[#C9A227] px-[7px] py-0.5 text-[11px] font-medium text-[#8A6A00]">
                    示範資料
                  </span>
                </div>
                <div className="p-[18px]">
                  <div className="num mb-4 text-[13px] font-medium leading-[1.9] text-ink-2">
                    綠油精目前缺貨
                    <br />
                    附近需求：示範資料
                  </div>
                  <div className="grid gap-2">
                    <span className="bg-green px-3 py-[11px] text-center text-[14px] font-bold text-white">
                      我會補貨，開放預留
                    </span>
                    <span className="border border-line-strong px-3 py-2.5 text-center text-[14px]">
                      這支不進了
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p className="mb-0 mt-7 max-w-[40em] text-[13.5px] text-muted">
              產品核心是結構化 action 與結果，不是聊天。藥師的每個按鈕回覆都會寫回 outcome
              receipt。
            </p>
          </div>
        </Container>
      </section>

      {/* 目前進度與證據等級 */}
      <section id="progress" className="scroll-mt-[68px] border-b border-line bg-surface">
        <Container>
          <div className="grid gap-10 py-16 sm:py-[88px] lg:grid-cols-2 lg:gap-14">
            <div>
              <h2 className="mb-5 mt-0 text-[clamp(26px,3vw,34px)] font-black leading-[1.4]">
                我們正在證明第一筆真實結果。
              </h2>
              <p className="m-0 max-w-[30em] text-[16.5px] leading-[1.85] text-ink-2">
                不做永遠不更新的假 traction。已完成的標 ✓，還沒做到的標 ○，全部公開。
              </p>
              <p className="num mb-0 mt-6 text-[12.5px] font-medium text-muted">
                Evidence as of {EVIDENCE_DATE} · source: repo / pilot records
              </p>
            </div>
            <ul className="m-0 list-none border border-line-strong bg-white p-0 py-3">
              {EVIDENCE.map((row) => (
                <li
                  key={row.label}
                  className="flex items-baseline gap-4 px-6 py-[11px] text-[15.5px]"
                >
                  <span
                    className={`num w-[18px] flex-none text-center text-[15px] font-medium ${
                      row.done ? "text-green" : "text-line-strong"
                    }`}
                    aria-hidden
                  >
                    {row.done ? "✓" : "○"}
                  </span>
                  <span className={`leading-[1.6] ${row.done ? "text-ink" : "text-muted"}`}>
                    <span className="sr-only">{row.done ? "已完成：" : "尚未完成："}</span>
                    {row.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* Pilot CTA — 全頁唯一深色 end-cap */}
      <section id="pilot" className="scroll-mt-[68px] bg-ink text-white">
        <Container>
          <div className="grid gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="mb-5 mt-0 text-[clamp(28px,3.2vw,38px)] font-black leading-[1.4] [text-wrap:pretty]">
                先從一家藥局、一條退貨閉環開始。
              </h2>
              <p className="m-0 max-w-[30em] text-[16.5px] leading-[1.9] text-[#A9B5AA]">
                我們正在找願意一起驗證掃描流程、退貨窗口與 LINE action
                的獨立藥局。試點不要求更換 POS，也不碰病患或處方個資。
              </p>
            </div>
            <PilotCtaForm copy={FORM_COPY} />
          </div>
        </Container>
      </section>

      <footer className="border-t border-line bg-white">
        <Container>
          <div className="flex flex-wrap items-start justify-between gap-8 py-12">
            <div className="flex items-center gap-2.5">
              <CrossMark size={22} />
              <span className="text-[16px] font-black">uYao</span>
            </div>
            <div className="flex gap-7 text-[14.5px]">
              <Link href="/app" className="text-green hover:text-green-hover">
                附近找藥
              </Link>
              <a href="#pilot" className="text-green hover:text-green-hover">
                申請試點
              </a>
              <a href="mailto:hello@uyao.tw" className="text-green hover:text-green-hover">
                聯絡方式
              </a>
            </div>
            <p className="m-0 max-w-[36em] flex-[1_1_100%] text-[13px] leading-[1.8] text-muted">
              uYao
              不進行藥品網路販售；消費者服務僅協助查詢、預留與到店取貨，實際交付由藥師完成。
            </p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
