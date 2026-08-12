import type { Metadata } from "next";
import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import { BrandMark } from "@/components/BrandMark";
import { JsonLd } from "@/components/JsonLd";
import { SHOP_URL } from "@/lib/shop";
import { organizationJsonLd, softwareApplicationJsonLd, webSiteJsonLd } from "@/lib/seo";
import { indexablePageRobots } from "@/lib/seo-server";
import { HeroLoop, type HeroLoopCopy } from "@/components/landing/HeroLoop";
import { PilotCtaForm, type PilotFormCopy } from "@/components/landing/PilotCtaForm";
import { CompanyFooter } from "@/components/landing/CompanyFooter";

/**
 * English YC/company landing（spec: company-landing-page-yc-en-adjustment.md）。
 * 不是中文逐字翻譯：hero 加 category eyebrow，section 縮成核心五段。
 * 與 `/` 共用 HeroLoop／PilotCtaForm 與視覺系統，anchor（how/pilot）
 * 兩邊一致供語言切換保留位置。evidence ladder 2026-08-09 依 founder
 * 決定先下架（等有真實 pilot 進度再回來）。
 * A partnership does not imply installed hardware, live inventory, product
 * availability, or medical endorsement.
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: "uYao | The AI Operating System for Independent Pharmacies" },
    description:
      "uYao turns inventory, expiry, and local demand into pharmacist-approved return, reorder, and reservation workflows.",
    alternates: {
      canonical: "/en",
      languages: { "zh-TW": "/zh-tw", en: "/en", "x-default": "/zh-tw" },
    },
    openGraph: {
      title: "uYao | The AI Operating System for Independent Pharmacies",
      description:
        "uYao turns inventory, expiry, and local demand into pharmacist-approved return, reorder, and reservation workflows.",
      locale: "en_US",
      url: "/en",
    },
    robots: await indexablePageRobots(),
  };
}

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
  genericError: "Something went wrong. Please try again.",
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

const PILOT_AREAS = ["Datong", "Linkou", "Luzhou", "Xinzhuang", "Zhongshan", "Xitun"] as const;
const EN_SHOP_URL = `${SHOP_URL.replace(/\/$/, "")}/en`;

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1240px] px-5 sm:px-8">{children}</div>;
}

export default function EnglishLandingPage() {
  return (
    <div className="min-w-[320px] bg-ivory text-ink">
      <JsonLd nodes={[organizationJsonLd(), webSiteJsonLd("en"), softwareApplicationJsonLd("en")]} />
      <nav className="sticky top-0 z-50 border-b border-line-strong bg-ivory text-ink">
        <Container>
          <div className="flex h-[72px] items-center justify-between gap-5 sm:h-20 sm:gap-6">
            <Link href="/en" className="flex min-h-11 flex-none items-center text-ink no-underline">
              <span className="flex items-center gap-1.5 sm:hidden">
                <BrandLogo height={32} />
              </span>
              <span className="hidden sm:block">
                <BrandLogo height={40} />
              </span>
            </Link>
            <div className="flex items-center gap-4 text-[15px] sm:gap-7">
              <a href="#how" className="hidden min-h-11 items-center text-ink no-underline hover:text-green md:inline-flex">
                How it works
              </a>
              <a href={EN_SHOP_URL} className="hidden min-h-11 items-center text-ink no-underline hover:text-green md:inline-flex">
                Consumer search
              </a>
              <a
                href="#pilot"
                className="action-primary whitespace-nowrap text-[15px]"
              >
                Join the pilot
              </a>
              <span className="num flex min-h-11 items-center text-[13px] text-muted">
                <Link href="/zh-tw" className="inline-flex min-h-11 items-center text-muted no-underline hover:text-green">
                  ZH-TW
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
      <header className="border-b border-line bg-ivory">
        <Container>
          <div className="grid items-center gap-14 py-16 sm:py-24 lg:min-h-[740px] lg:grid-cols-[1.08fr_.92fr] lg:gap-20 lg:py-24">
            <div>
              <p className="num mb-6 mt-0 text-[12px] font-semibold tracking-[.14em] text-oxblood">
                AI OPERATING SYSTEM FOR INDEPENDENT PHARMACIES
              </p>
              <h1 className="editorial-display m-0 max-w-[12em] text-[clamp(46px,5.4vw,74px)] leading-[1.08] [text-wrap:balance]">
                Turn every inventory signal into completed work.
              </h1>
              <p className="mb-0 mt-8 max-w-[35em] text-[17px] leading-[1.8] text-ink-2">
                  uYao handles returns, reordering, and reservations from inventory, expiry, and
                  local demand, with pharmacists approving critical decisions.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
                <a
                  href="#pilot"
                  className="action-primary box-border min-h-[54px] whitespace-nowrap px-9 py-4 text-[16px]"
                >
                  Join the pilot
                </a>
                <a
                  href={EN_SHOP_URL}
                  className="inline-flex min-h-11 items-center whitespace-nowrap border-b border-forest py-2 text-[15px] font-semibold text-forest no-underline hover:border-green hover:text-green"
                >
                  See the consumer product →
                </a>
              </div>
              <p className="mb-0 mt-12 flex items-center gap-2.5 text-[13.5px] text-muted">
                <span className="h-2 w-2 flex-none rounded-full bg-green" aria-hidden />
                We’re recruiting independent pharmacies to validate the first end-to-end workflow.
              </p>
            </div>
            <HeroLoop copy={HERO_COPY} />
          </div>
        </Container>
      </header>

      <section
        className="border-b border-line bg-paper"
        aria-labelledby="pilot-areas-heading"
      >
        <Container>
          <div className="py-8 sm:py-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="pilot-areas-heading" className="m-0 text-[17px] font-black">
                First-wave service and pilot coverage across six districts
              </h2>
              <p className="m-0 text-[13px] text-muted">
                Four partner pharmacy locations; workflow trials and recruitment continue
              </p>
            </div>
            <div className="mt-5 grid border-l border-t border-line bg-paper sm:grid-cols-3 lg:grid-cols-6">
              {PILOT_AREAS.map((area) => (
                <div
                  key={area}
                  className="flex min-h-[70px] items-center border-b border-r border-line-strong px-4 py-3 text-[15px] font-bold text-ink"
                >
                  <span className="mr-2 text-oxblood" aria-hidden>
                    ＋
                  </span>
                  {area}
                </div>
              ))}
            </div>
            <p className="mb-0 mt-3 text-[12.5px] leading-[1.7] text-muted">
              Partnership does not imply installed hardware or live inventory; public
              listings in other areas do not imply partnership.
            </p>
          </div>
        </Container>
      </section>

      <section className="border-b border-line bg-ivory" aria-labelledby="partner-heading-en">
        <Container>
          <div className="grid gap-6 py-10 sm:grid-cols-[.8fr,1.2fr] sm:items-start sm:py-14">
            <div>
              <p className="num mb-3 mt-0 text-[11px] font-semibold tracking-[.14em] text-oxblood">
                BIOTECH PARTNER
              </p>
              <h2 id="partner-heading-en" className="editorial-display m-0 text-[30px] leading-[1.3] sm:text-[38px]">
                Partnership
              </h2>
            </div>
            <div className="border-l-2 border-green pl-5 sm:pl-7">
              <p className="m-0 text-[18px] font-bold text-ink">
                WE STRONG CO., LTD.（維淳有限公司／WeStrong）
              </p>
              <p className="mb-0 mt-3 max-w-[44em] text-[14.5px] leading-[1.8] text-ink-2">
                uYao and WE STRONG CO., LTD. have established a partnership. This public statement confirms the relationship only; it does not mean that any WE STRONG product is in stock, sold through uYao, or medically endorsed.
              </p>
              <p className="mb-0 mt-3 text-[13px] text-muted">
                Taiwan company ID: 16816971 ·{" "}
                <Link href="/zh-tw/evidence#partners" className="text-forest underline underline-offset-2 hover:text-green">
                  Partnership evidence
                </Link>
                {" · "}
                <a href="https://taiwanwestrong.com/info.html" className="text-forest underline underline-offset-2 hover:text-green">
                  Public website
                </a>
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Why POS is not enough */}
      <section className="border-b border-line bg-surface">
        <Container>
          <div className="py-16 sm:py-[88px]">
            <h2 className="editorial-display mb-10 mt-0 text-[clamp(30px,3.4vw,42px)] leading-[1.25] [text-wrap:pretty]">
              POS records transactions. uYao runs the next workflow.
            </h2>
            <div className="border border-line bg-paper">
              <div className="hidden border-b border-line sm:grid sm:grid-cols-[1fr,1.2fr]">
                <div className="num border-r border-line bg-surface px-6 py-3.5 text-[12px] font-medium tracking-[.08em] text-muted">
                  Existing systems see
                </div>
                <div className="num bg-sage px-6 py-3.5 text-[12px] font-semibold tracking-[.08em] text-forest">
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
                  <div className="bg-green-tint px-6 pb-4 pt-3 text-[16px] leading-[1.7] sm:py-[22px]">
                    <span className="num mb-1 block text-[11px] font-semibold tracking-[.08em] text-forest sm:hidden">
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
            <h2 className="editorial-display mb-10 mt-0 text-[clamp(30px,3.4vw,42px)] leading-[1.25] [text-wrap:pretty] sm:mb-14">
              One operating loop from signal to outcome.
            </h2>
            <div className="grid border-t-2 border-ink lg:grid-cols-[1fr,1fr,1.5fr,1fr,1fr]">
              {FLOW.map((step, i) => (
                <div
                  key={step.n}
                  className={
                    step.hot
                      ? "-mt-0.5 border-t-2 border-oxblood bg-oxblood-tint/35 p-6 lg:border-r lg:border-r-line lg:py-7"
                      : `border-b border-line px-6 py-6 last:border-b-0 lg:border-b-0 lg:py-7 ${
                          i < FLOW.length - 1 ? "lg:border-r lg:border-r-line" : ""
                        } ${i === 0 ? "lg:pl-0" : ""} ${i === FLOW.length - 1 ? "lg:pr-0" : ""}`
                  }
                >
                  <div
                    className={`num text-[13px] font-medium ${step.hot ? "text-oxblood" : "text-muted"}`}
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
                          className="num border border-oxblood px-2 py-[3px] text-[11.5px] font-medium text-oxblood"
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
      <section className="border-b border-line bg-paper">
        <Container>
          <div className="grid items-center gap-10 py-16 sm:py-[88px] lg:grid-cols-2 lg:gap-14">
            <div>
              <h2 className="editorial-display mb-5 mt-0 text-[clamp(30px,3.4vw,42px)] leading-[1.25] [text-wrap:pretty]">
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
                            : "border-line-strong bg-paper"
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

      {/* Demand is a first-class operating signal */}
      <section className="border-b border-line bg-surface">
        <Container>
          <div className="grid items-center gap-10 py-16 sm:py-[88px] lg:grid-cols-2 lg:gap-14">
            <div className="lg:order-2">
              <h2 className="editorial-display mb-5 mt-0 text-[clamp(30px,3.4vw,42px)] leading-[1.25] [text-wrap:pretty]">
                See what sold yesterday. See what nearby people can't find today.
              </h2>
              <p className="m-0 max-w-[32em] text-[16.5px] leading-[1.8] text-ink-2">
                When nearby people search, come up empty, leave a restock alert, or reserve, uYao
                sends those signals back to the pharmacy so it can reorder from live demand, not
                historical sales alone.
              </p>
              <p className="mb-0 mt-4 text-[13.5px] text-muted">
                Public views show aggregates only. They do not expose personal contact details or
                another pharmacy's data.
              </p>
            </div>
            <div className="min-w-0 lg:order-1">
              <div className="paper-elevation border border-line bg-paper p-3">
                <div className="num mb-2 flex items-center justify-between gap-3 px-1 pt-1 text-[11px] font-medium tracking-[.06em] text-muted">
                  <span>CONSUMER WEB · CURRENT CATALOG</span>
                  <span>shop.uyaohealth.com</span>
                </div>
                <div className="border border-line bg-ivory px-5 py-7 sm:px-7 sm:py-9">
                  <p className="num m-0 text-[11px] font-semibold tracking-[.1em] text-oxblood">
                    PARTNER-LISTED ITEM
                  </p>
                  <h3 className="editorial-display mb-0 mt-3 text-[30px] leading-[1.2] text-forest">
                    護谷鈣素 <span className="num text-[15px] font-medium text-muted">100 count</span>
                  </h3>
                  <div className="mt-5 grid border border-line bg-paper text-[13px] sm:grid-cols-2">
                    <div className="border-b border-line px-4 py-3 sm:border-b-0 sm:border-r">
                      <span className="block text-muted-2">Item source</span>
                      <b className="mt-1 block text-ink">Provided by partner pharmacies</b>
                    </div>
                    <div className="px-4 py-3">
                      <span className="block text-muted-2">Live inventory</span>
                      <b className="mt-1 block text-ink">Awaiting store confirmation</b>
                    </div>
                  </div>
                  <p className="mb-0 mt-4 text-[12.5px] leading-[1.7] text-muted">
                    Only the name and package size are confirmed. Price, availability, classification,
                    ingredients, and indications are not inferred.
                  </p>
                </div>
              </div>
              <div className="num mt-3.5 flex flex-wrap items-center gap-2 text-[12px] font-medium text-muted">
                <span>Search by product name or package size</span>
                <span className="text-line-strong">→</span>
                <span className="text-green">inventory_miss</span>
                <span className="text-line-strong">→</span>
                <span>leave an alert</span>
                <span className="text-line-strong">→</span>
                <span>aggregate into a pharmacy reorder signal</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Product proof */}
      <section className="border-b border-line">
        <Container>
          <div className="py-16 sm:py-[88px]">
            <h2 className="editorial-display mb-12 mt-0 text-[clamp(30px,3.4vw,42px)] leading-[1.25] [text-wrap:pretty]">
              Built around actions, not another dashboard.
            </h2>
            <div className="grid gap-6 md:grid-cols-[1fr_1.15fr_.85fr]">
              <div className="relative overflow-hidden border border-line bg-paper px-[18px] py-4">
                <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-oxblood" />
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
              <div className="border border-line bg-paper">
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
                    <span className="bg-forest px-3 py-2 text-center text-[13px] font-bold text-paper">
                      Start return
                    </span>
                    <span className="border border-line-strong px-3 py-1.5 text-center text-[13px]">
                      This batch will sell
                    </span>
                  </div>
                </div>
              </div>
              <div className="num border border-dashed border-line bg-paper px-[18px] py-3.5 text-[12.5px] font-medium leading-[2]">
                <div className="tracking-[.08em] text-muted">OUTCOME RECEIPT</div>
                <div className="mt-1 grid grid-cols-[auto,1fr] gap-x-3.5">
                  <span className="text-muted">Status</span>
                  <span className="font-semibold text-green">Pharmacist confirmed</span>
                  <span className="text-muted">Result</span>
                  <span>Awaiting verified outcome</span>
                </div>
              </div>
            </div>

          </div>
        </Container>
      </section>

      {/* Pilot CTA — 深色 end-cap */}
      <section id="pilot" className="scroll-mt-20 bg-forest text-white">
        <Container>
          <div className="grid gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="editorial-display mb-5 mt-0 text-[clamp(32px,3.6vw,44px)] leading-[1.2] [text-wrap:pretty]">
                Start with one pharmacy and one return workflow.
              </h2>
              <p className="m-0 max-w-[30em] text-[16.5px] leading-[1.85] text-[#A9B5AA]">
                We’re looking for independent pharmacies to validate scanning, return windows,
                and pharmacist-approved LINE actions without replacing the POS.
              </p>
            </div>
            <PilotCtaForm copy={FORM_COPY} />
          </div>
        </Container>
      </section>

      <CompanyFooter locale="en" />
    </div>
  );
}
