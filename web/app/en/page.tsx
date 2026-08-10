import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { BrandMark } from "@/components/BrandMark";
import { SHOP_URL } from "@/lib/shop";
import { HeroLoop, type HeroLoopCopy } from "@/components/landing/HeroLoop";
import { PilotCtaForm, type PilotFormCopy } from "@/components/landing/PilotCtaForm";

/**
 * English YC/company landing（spec: company-landing-page-yc-en-adjustment.md）。
 * 不是中文逐字翻譯：hero 加 category eyebrow，section 縮成核心五段。
 * 與 `/` 共用 HeroLoop／PilotCtaForm 與視覺系統，anchor（how/pilot）
 * 兩邊一致供語言切換保留位置。evidence ladder 2026-08-09 依 founder
 * 決定先下架（等有真實 pilot 進度再回來）。
 * 尚無 active partner → status line 固定 recruiting 版本。
 */
export const metadata: Metadata = {
  title: { absolute: "uYao — The AI Operating System for Independent Pharmacies" },
  description:
    "uYao turns inventory, expiry, and local demand into pharmacist-approved return, reorder, and reservation workflows.",
  alternates: {
    canonical: "/en",
    languages: { "zh-TW": "/", en: "/en", "x-default": "/" },
  },
  openGraph: {
    title: "uYao — The AI Operating System for Independent Pharmacies",
    description:
      "uYao turns inventory, expiry, and local demand into pharmacist-approved return, reorder, and reservation workflows.",
    locale: "en_US",
    url: "/en",
  },
};

const HERO_COPY: HeroLoopCopy = {
  flowLabel: "SUPPLY → ACTION → OUTCOME",
  badge: "PROTOTYPE · EXAMPLE DATA",
  scanTitle: "SCAN EVENT · box/connector",
  lineHeader: "LINE ACTION · prototype",
  cardTitle: "Return window approaching",
  cardMetaLines: ["Batch TW881 · EXP 2026-11", "Supplier return rule: confirmation required"],
  primaryBtn: "Start return",
  secondaryBtns: ["This batch will sell", "Incorrect data"],
  receiptTitle: "OUTCOME RECEIPT",
  statusLabel: "Status",
  statusValue: "Pharmacist confirmed",
  resultLabel: "Result",
  resultValue: "Awaiting verified outcome",
};

const FORM_COPY: PilotFormCopy = {
  locale: "en",
  nameLabel: "Pharmacy name *",
  areaLabel: "Area",
  contactLabel: "Contact (LINE ID, phone, or email) *",
  problemsLegend: "Most frequent problems (optional)",
  // value 送 API 的中文 canonical 白名單值；label 顯示英文。
  problems: [
    { value: "過期／報廢", label: "Expired stock / disposal waste" },
    { value: "錯過退貨窗口", label: "Missed return windows" },
    { value: "進貨過量", label: "Overstock" },
    { value: "經常缺貨", label: "Frequent stockouts" },
    { value: "不知道附近需求", label: "No view of nearby demand" },
    { value: "其他", label: "Other" },
  ],
  submit: "Join the pilot",
  submitting: "Submitting…",
  requiredError: "Please provide your pharmacy name and contact.",
  genericError: "Something went wrong — please try again.",
  successTitle: "Application received",
  successBody:
    "We’ll reach out via the contact you left to schedule a conversation about scanning and return windows in your pharmacy.",
};

const POS_ROWS = [
  { pos: "Completed sales", uyao: "Nearby demand lost to stockouts" },
  { pos: "Manually maintained expiry fields", uyao: "Scanned batch and expiry evidence" },
  { pos: "Historical inventory reports", uyao: "Return, reduce, reorder, and verify actions" },
] as const;

const FLOW: { n: string; title: string; body: string; hot?: boolean }[] = [
  { n: "01", title: "Observe supply", body: "Capture item, batch, expiry, and movement signals" },
  {
    n: "02",
    title: "Sense demand",
    body: "Capture failed searches, notifications, reservations, and pickups",
  },
  {
    n: "03",
    title: "Run the workflow",
    body: "Starts with deterministic rules, then prepares the next action for pharmacist approval using available operational context",
    hot: true,
  },
  {
    n: "04",
    title: "Preserve authority",
    body: "Pharmacists approve, reject, or correct critical decisions in LINE",
  },
  {
    n: "05",
    title: "Record outcomes",
    body: "Track returns, avoided waste, reduced overstock, or completed reservations",
  },
];

const ACTION_CHIPS = ["VERIFY", "RETURN", "REDUCE", "REORDER", "RESERVE"] as const;

const TIMELINE = [
  { label: "Intake scan", note: "GTIN · LOT · EXP" },
  { label: "Batch and expiry check" },
  { label: "Return window approaching", note: "Supplier return rule: confirmation required", hot: true },
  { label: "LINE action", note: "Start return?" },
  { label: "Pharmacist response" },
  { label: "Outcome pending / verified", last: true },
] as const;

const PILOT_AREAS = ["Datong", "Linkou", "Xinzhuang", "Zhongshan"] as const;

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1160px] px-5 sm:px-8">{children}</div>;
}

export default function EnglishLandingPage() {
  return (
    <div className="min-w-[320px] text-ink">
      <nav className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur-[6px]">
        <Container>
          <div className="flex h-[68px] items-center justify-between gap-6">
            <Link href="/en" className="flex items-center gap-2.5 text-ink no-underline">
              <BrandMark />
              <span className="text-[19px] font-black tracking-[.01em]">uYao</span>
            </Link>
            <div className="flex items-center gap-4 text-[15px] sm:gap-7">
              <a href="#how" className="hidden text-ink no-underline hover:text-green md:inline">
                How it works
              </a>
              <a href={SHOP_URL} className="hidden text-ink no-underline hover:text-green md:inline">
                Consumer search
              </a>
              <a
                href="#pilot"
                className="whitespace-nowrap bg-green px-5 py-2.5 text-[15px] font-bold text-white no-underline hover:bg-green-hover"
              >
                Join the pilot
              </a>
              <span className="num text-[13px] text-muted">
                <Link href="/" className="text-muted no-underline hover:text-green">
                  中
                </Link>
                {" / "}
                <span aria-current="true" className="font-semibold text-ink">
                  EN
                </span>
              </span>
            </div>
          </div>
        </Container>
      </nav>

      {/* Hero — category 先講清楚，visual 用同一條 action loop */}
      <header className="border-b border-line bg-white">
        <Container>
          <div className="py-14 sm:py-20 lg:pb-16 lg:pt-20">
            <p className="num m-0 mb-5 text-[12.5px] font-medium tracking-[.14em] text-green">
              AI OPERATING SYSTEM FOR INDEPENDENT PHARMACIES
            </p>
            {/* H1 橫跨全寬：exact copy 在 516px 半欄放不進兩行（spec 上限），
                所以只有下方 subtext/CTA + visual 走 split。 */}
            <h1 className="m-0 max-w-[19em] text-[clamp(29px,8.2vw,60px)] font-black leading-[1.16] tracking-[.005em] [text-wrap:balance] lg:text-[clamp(48px,4.6vw,60px)]">
              Turn every inventory signal into completed work.
            </h1>
            <div className="mt-8 grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
              <div>
                <p className="m-0 max-w-[32em] text-[17px] leading-[1.75] text-ink-2">
                  uYao handles returns, reordering, and reservations from inventory, expiry, and
                  local demand—with pharmacists approving critical decisions.
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-3.5">
                  <a
                    href="#pilot"
                    className="box-border inline-flex min-h-11 items-center whitespace-nowrap bg-green px-8 py-[15px] text-[16px] font-bold text-white no-underline hover:bg-green-hover"
                  >
                    Join the pilot
                  </a>
                  <a
                    href={SHOP_URL}
                    className="box-border inline-flex min-h-11 items-center whitespace-nowrap border border-line-strong px-8 py-[15px] text-[16px] font-medium text-ink no-underline hover:border-green hover:text-green"
                  >
                    See the consumer product
                  </a>
                </div>
                <p className="mb-0 mt-11 flex items-center gap-2.5 border-t border-line pt-5 text-[14px] text-muted">
                  <span className="h-2 w-2 flex-none bg-green" aria-hidden />
                  We’re recruiting independent pharmacies to validate the first end-to-end
                  workflow.
                </p>
              </div>
              <HeroLoop copy={HERO_COPY} />
            </div>
          </div>
        </Container>
      </header>

      <section
        className="border-b border-line bg-surface"
        aria-labelledby="pilot-areas-heading"
      >
        <Container>
          <div className="py-8 sm:py-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="pilot-areas-heading" className="m-0 text-[17px] font-black">
                First-wave pilot focus across four Greater Taipei districts
              </h2>
              <p className="m-0 text-[13px] text-muted">
                On-site workflow interviews and pilot-fit assessment are underway
              </p>
            </div>
            <div className="mt-5 grid border-l border-t border-line-strong bg-white sm:grid-cols-4">
              {PILOT_AREAS.map((area) => (
                <div
                  key={area}
                  className="flex min-h-[70px] items-center border-b border-r border-line-strong px-4 py-3 text-[15px] font-bold text-ink"
                >
                  <span className="mr-2 text-green" aria-hidden>
                    ＋
                  </span>
                  {area}
                </div>
              ))}
            </div>
            <p className="mb-0 mt-3 text-[12.5px] leading-[1.7] text-muted">
              Area focus does not imply a formal partnership, installed hardware, or live
              inventory.
            </p>
          </div>
        </Container>
      </section>

      {/* Why POS is not enough */}
      <section className="border-b border-line bg-surface">
        <Container>
          <div className="py-16 sm:py-[88px]">
            <h2 className="mb-10 mt-0 text-[clamp(26px,3vw,34px)] font-black leading-[1.35] [text-wrap:pretty]">
              POS records transactions. uYao runs the next workflow.
            </h2>
            <div className="border border-line-strong bg-white">
              <div className="hidden border-b border-line sm:grid sm:grid-cols-[1fr,1.2fr]">
                <div className="num border-r border-line px-6 py-3.5 text-[12px] font-medium tracking-[.08em] text-muted">
                  Existing systems see
                </div>
                <div className="num px-6 py-3.5 text-[12px] font-medium tracking-[.08em] text-green">
                  uYao adds
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
                      Existing systems see
                    </span>
                    {row.pos}
                  </div>
                  <div className="px-6 pb-4 pt-3 text-[16px] leading-[1.7] sm:py-[22px]">
                    <span className="num mb-1 block text-[11px] font-medium tracking-[.08em] text-green sm:hidden">
                      uYao adds
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
              uYao complements POS, reimbursement systems, and pharmacist judgment; it does not
              replace them.
            </p>
          </div>
        </Container>
      </section>

      {/* The operating system loop */}
      <section id="how" className="scroll-mt-[68px] border-b border-line">
        <Container>
          <div className="py-16 sm:py-[88px]">
            <h2 className="mb-10 mt-0 text-[clamp(26px,3vw,34px)] font-black leading-[1.35] [text-wrap:pretty] sm:mb-14">
              One operating loop from signal to outcome.
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
                  <p className="m-0 text-[14.5px] leading-[1.7] text-ink-2">{step.body}</p>
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

      {/* Starting wedge */}
      <section className="border-b border-line bg-white">
        <Container>
          <div className="grid items-center gap-10 py-16 sm:py-[88px] lg:grid-cols-2 lg:gap-14">
            <div>
              <h2 className="mb-5 mt-0 text-[clamp(26px,3vw,34px)] font-black leading-[1.35] [text-wrap:pretty]">
                Start before inventory becomes waste.
              </h2>
              <p className="m-0 max-w-[32em] text-[16.5px] leading-[1.8] text-ink-2">
                uYao starts with return windows: verify the batch and expiry, check supplier
                rules, prepare the action, and track the result.
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
                        className={"hot" in t && t.hot ? "font-bold text-green" : "text-ink"}
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

      {/* Product proof */}
      <section className="border-b border-line bg-surface">
        <Container>
          <div className="py-16 sm:py-[88px]">
            <h2 className="mb-12 mt-0 text-[clamp(26px,3vw,34px)] font-black leading-[1.35] [text-wrap:pretty]">
              Built around actions, not another dashboard.
            </h2>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              <div className="relative overflow-hidden border border-line-strong bg-white px-[18px] py-4">
                <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-green" />
                <div className="num mb-2 text-[12px] font-medium text-muted">
                  SCAN EVENT · parser output
                </div>
                <div className="num grid grid-cols-[auto,1fr] gap-x-[18px] text-[13px] font-medium leading-[1.9] text-ink">
                  <span className="text-muted">GTIN</span>
                  <span>04713243990117</span>
                  <span className="text-muted">LOT</span>
                  <span>TW881</span>
                  <span className="text-muted">EXP</span>
                  <span>2026-11</span>
                </div>
              </div>
              <div className="border border-line-strong bg-white">
                <div className="flex items-center gap-2 border-b border-line px-[18px] py-2.5">
                  <BrandMark size={18} />
                  <span className="text-[13px] font-bold">uYao</span>
                  <span className="num ml-auto text-[11px] font-medium text-muted">
                    LINE ACTION · prototype
                  </span>
                </div>
                <div className="px-[18px] py-3.5">
                  <p className="m-0 text-[14.5px] font-bold leading-[1.5]">
                    Return window approaching
                  </p>
                  <div className="mt-3 grid gap-1.5">
                    <span className="bg-green px-3 py-2 text-center text-[13px] font-bold text-white">
                      Start return
                    </span>
                    <span className="border border-line-strong px-3 py-1.5 text-center text-[13px]">
                      This batch will sell
                    </span>
                  </div>
                </div>
              </div>
              <div className="num border border-dashed border-line-strong bg-white px-[18px] py-3.5 text-[12.5px] font-medium leading-[2]">
                <div className="tracking-[.08em] text-muted">OUTCOME RECEIPT</div>
                <div className="mt-1 grid grid-cols-[auto,1fr] gap-x-3.5">
                  <span className="text-muted">Status</span>
                  <span className="font-semibold text-green">Pharmacist confirmed</span>
                  <span className="text-muted">Result</span>
                  <span>Awaiting verified outcome</span>
                </div>
              </div>
              <div className="flex flex-col border border-line-strong bg-white">
                <div className="num border-b border-line px-[18px] py-2.5 text-[11px] font-medium tracking-[.06em] text-muted">
                  CONSUMER DEMAND SIGNAL · LIVE PRODUCT
                </div>
                {/* 真實 Consumer Web 截圖，object-bottom 露出 inventory-miss + 到貨通知表單 */}
                <div className="relative h-[280px] overflow-hidden">
                  <Image
                    src="/landing/consumer-web.png"
                    alt="Live consumer product: a search for a medicine shows no verified stock nearby and offers a restock notification form"
                    width={1081}
                    height={1930}
                    className="absolute inset-0 h-full w-full object-cover object-bottom"
                  />
                </div>
              </div>
            </div>

          </div>
        </Container>
      </section>

      {/* Pilot CTA — 深色 end-cap */}
      <section id="pilot" className="scroll-mt-[68px] bg-ink text-white">
        <Container>
          <div className="grid gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="mb-5 mt-0 text-[clamp(28px,3.2vw,38px)] font-black leading-[1.3] [text-wrap:pretty]">
                Start with one pharmacy and one return workflow.
              </h2>
              <p className="m-0 max-w-[30em] text-[16.5px] leading-[1.85] text-[#A9B5AA]">
                We’re looking for independent pharmacies to validate scanning, return windows,
                and pharmacist-approved LINE actions—without replacing the POS.
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
              <BrandMark size={22} />
              <span className="text-[16px] font-black">uYao</span>
            </div>
            <div className="flex flex-wrap gap-7 text-[14.5px]">
              <a href={SHOP_URL} className="text-green hover:text-green-hover">
                Consumer search
              </a>
              <a href="#pilot" className="text-green hover:text-green-hover">
                Join the pilot
              </a>
              <a href="mailto:edwardhsieh0122@gmail.com" className="text-green hover:text-green-hover">
                edwardhsieh0122@gmail.com
              </a>
            </div>
            <p className="m-0 max-w-[38em] flex-[1_1_100%] text-[13px] leading-[1.8] text-muted">
              uYao does not sell medicines online. The consumer service supports search,
              reservation, and in-store pickup only, with pharmacists completing every handover.
            </p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
