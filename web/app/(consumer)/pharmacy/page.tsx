import type { Metadata } from "next";

import { PilotForm } from "@/components/PilotForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import type { Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { indexablePageRobots } from "@/lib/seo-server";

type PharmacyPageCopy = {
  title: string;
  description: string;
  kicker: string;
  heroTitle: string;
  heroBody: string;
  facts: { value: string; unit: string; label: string }[];
  workflowTitle: string;
  workflowBody: string;
  workflow: { number: string; title: string; body: string }[];
  boundaryTitle: string;
  boundaryBody: string;
  boundaries: { label: string; body: string }[];
  applicationTitle: string;
  applicationBody: string;
  partnerTitle: string;
  partnerBody: string;
};

const COPY: Record<Locale, PharmacyPageCopy> = {
  zh: {
    title: "藥局 Agent 試點｜從一個真實店務流程開始｜uYao",
    description: "從一間藥局、一個反覆發生的店務流程開始；uYao 沿用現有工具，讓 Agent 整理工作並在關鍵決定前等待藥師批准。",
    kicker: "藥局試點",
    heroTitle: "先把一個店務流程，交給你的 Agent 團隊。",
    heroBody: "uYao 把掃描、效期、預留與補貨訊號整理成同一張工作單。店長 Agent 協調角色；遇到採購、退貨或其他關鍵決定時停下來，等藥師批准。",
    facts: [
      { value: "1", unit: "個流程", label: "先選一個會反覆發生的真實店務工作" },
      { value: "現有", unit: "工具", label: "沿用藥局的掃描器與通訊流程" },
      { value: "藥師", unit: "批准", label: "關鍵決定不交給 Agent 自行送出" },
    ],
    workflowTitle: "沿用現在的工具，先跑通一張工作單。",
    workflowBody: "試點不要求先換掉既有系統，也不從一整套後台開始。我們會一起選定一個痛點，把來源、Agent 分工、人員確認與實際結果串成可重播的流程。",
    workflow: [
      { number: "01", title: "接入現有訊號", body: "從掃描、預留或人工更正中，選一個已經存在的來源。" },
      { number: "02", title: "店長整理工作", body: "把來源、差異與下一步整理成同一張工作單。" },
      { number: "03", title: "角色分工接力", body: "庫存、採購與結帳 Agent 只處理各自需要的狀態。" },
      { number: "04", title: "藥師決定並留存結果", body: "需要人員批准時停下來，處理後記錄實際結果。" },
    ],
    boundaryTitle: "Agent 負責整理與協調，不代替藥師。",
    boundaryBody: "試點的重點不是讓系統自行決定，而是減少追資料、重複整理與漏掉下一步的時間。",
    boundaries: [
      { label: "可以先做", body: "整理來源、標出差異、準備固定草稿與提醒需要處理的工作。" },
      { label: "必須停下", body: "採購送出、退貨確認、品項判斷與其他高影響決定。" },
      { label: "留下結果", body: "每一步保留來源、人員回覆與最後結果，供下一次檢查。" },
    ],
    applicationTitle: "選一個你真的想解決的流程。",
    applicationBody: "留下藥局與聯絡方式，再勾選最常發生的問題。我們會先一起確認流程與可驗證結果，不會直接開通正式操作。",
    partnerTitle: "已經是合作藥局？",
    partnerBody: "試點會一起確認哪些提醒適合留在日常通訊流程，哪些工作需要進 Store OS 查看來源、草稿與批准狀態。",
  },
  en: {
    title: "Pharmacy Agent pilot | Start with one real workflow | uYao",
    description: "Start with one pharmacy and one recurring workflow. uYao keeps existing tools, organizes the work with Agents, and waits for pharmacist approval before consequential actions.",
    kicker: "PHARMACY PILOT",
    heroTitle: "Give one pharmacy workflow to your Agent team.",
    heroBody: "uYao organizes scan, expiry, reservation, and reorder signals into one WorkItem. The Manager Agent coordinates roles and stops for pharmacist approval before returns, purchasing, or other consequential decisions.",
    facts: [
      { value: "1", unit: "workflow", label: "Start with one recurring pharmacy job" },
      { value: "Existing", unit: "tools", label: "Keep the pharmacy scanner and communication flow" },
      { value: "Pharmacist", unit: "approval", label: "Agents do not submit consequential decisions alone" },
    ],
    workflowTitle: "Keep your tools. Prove one complete WorkItem.",
    workflowBody: "The pilot does not begin with a system replacement or another daily dashboard. We choose one pain point and connect its source, Agent roles, human checkpoint, and real outcome into a replayable workflow.",
    workflow: [
      { number: "01", title: "Use an existing signal", body: "Start with a scan, reservation, or manual correction that already exists." },
      { number: "02", title: "Let the Manager organize it", body: "Keep the source, discrepancy, and next step in one WorkItem." },
      { number: "03", title: "Hand work across roles", body: "Inventory, Purchasing, and Checkout Agents see only the state they need." },
      { number: "04", title: "Approve and record the outcome", body: "Stop for staff approval, then record what actually happened." },
    ],
    boundaryTitle: "Agents organize and coordinate. Pharmacists decide.",
    boundaryBody: "The pilot is not about autonomous pharmacy decisions. It reduces time spent chasing evidence, rebuilding context, and missing the next step.",
    boundaries: [
      { label: "Agents can prepare", body: "Organize sources, flag discrepancies, prepare fixed drafts, and surface work that needs attention." },
      { label: "Agents must stop", body: "Supplier submission, return confirmation, product judgment, and other consequential decisions." },
      { label: "The workflow records", body: "Sources, staff responses, and the final outcome remain available for review." },
    ],
    applicationTitle: "Choose a workflow you actually want to fix.",
    applicationBody: "Leave the pharmacy and contact details, then select the problems that happen most often. We first confirm the workflow and a verifiable outcome; this does not activate live operations.",
    partnerTitle: "Already a partner pharmacy?",
    partnerBody: "The pilot defines which reminders stay in the pharmacy's normal communication flow and which tasks open in Store OS for sources, drafts, and approval state.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = COPY[locale];
  return {
    title: { absolute: copy.title },
    description: copy.description,
    alternates: {
      canonical: locale === "en" ? "/en/pharmacy" : "/zh-tw/pharmacy",
      languages: {
        "zh-TW": "/zh-tw/pharmacy",
        en: "/en/pharmacy",
        "x-default": "/zh-tw/pharmacy",
      },
    },
    robots: await indexablePageRobots(),
  };
}

export default async function PharmacyPage() {
  const locale = await getRequestLocale();
  const copy = COPY[locale];

  return (
    <>
      <SiteHeader showSearch={false} />

      <section className="shop-shell max-w-[1040px] py-14 sm:py-20">
        <p className="shop-kicker mb-4">{copy.kicker}</p>
        <h1 className="editorial-display m-0 max-w-[13em] text-[42px] leading-[1.12] sm:text-[58px]">
          {copy.heroTitle}
        </h1>
        <p className="mb-0 mt-6 max-w-[48em] text-[16px] leading-[1.85] text-muted sm:text-[17px]">
          {copy.heroBody}
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {copy.facts.map((fact) => (
            <div key={fact.label} className="border-t-2 border-green pt-4">
              <div className="flex items-baseline gap-2">
                <span className="editorial-display text-[32px] leading-none text-ink">{fact.value}</span>
                <span className="text-[14px] font-bold text-ink">{fact.unit}</span>
              </div>
              <p className="mb-0 mt-3 text-[13px] leading-[1.6] text-muted">{fact.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="shop-shell max-w-[1040px] py-12 sm:py-16">
          <div className="max-w-[48em]">
            <h2 className="editorial-display m-0 text-[32px] leading-[1.25] sm:text-[38px]">{copy.workflowTitle}</h2>
            <p className="mb-0 mt-5 text-[15px] leading-[1.85] text-ink-2">{copy.workflowBody}</p>
          </div>
          <div className="mt-10 grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
            {copy.workflow.map((step) => (
              <div key={step.number} className="border-b border-r border-line bg-paper p-5">
                <span className="num text-[10px] font-bold text-green">{step.number}</span>
                <h3 className="mb-0 mt-5 text-[16px] font-bold text-ink">{step.title}</h3>
                <p className="mb-0 mt-3 text-[13px] leading-[1.7] text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-ivory">
        <div className="shop-shell grid max-w-[1040px] gap-10 py-12 sm:py-16 lg:grid-cols-[.9fr_1.1fr] lg:gap-16">
          <div>
            <h2 className="editorial-display m-0 text-[32px] leading-[1.25] sm:text-[38px]">{copy.boundaryTitle}</h2>
            <p className="mb-0 mt-5 text-[15px] leading-[1.85] text-ink-2">{copy.boundaryBody}</p>
          </div>
          <div className="border-t border-line-strong">
            {copy.boundaries.map((item) => (
              <div key={item.label} className="grid gap-2 border-b border-line-strong py-5 sm:grid-cols-[150px_1fr] sm:gap-5">
                <strong className="text-[13px] text-oxblood">{item.label}</strong>
                <p className="m-0 text-[14px] leading-[1.7] text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-paper">
        <div className="shop-shell max-w-[1040px] py-12 sm:py-16">
          <div className="max-w-[46em]">
            <h2 className="editorial-display m-0 text-[32px] leading-[1.25] sm:text-[38px]">{copy.applicationTitle}</h2>
            <p className="mb-0 mt-4 text-[14px] leading-[1.8] text-muted">{copy.applicationBody}</p>
          </div>
          <div className="mt-8 border border-line-strong bg-ivory p-5 sm:p-7">
            <PilotForm locale={locale} />
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="shop-shell max-w-[1040px] py-8">
          <div className="border-l-2 border-green bg-surface px-5 py-4 text-[15px] leading-[1.75] text-ink-2">
            <div className="mb-1 font-bold text-ink">{copy.partnerTitle}</div>
            {copy.partnerBody}
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
