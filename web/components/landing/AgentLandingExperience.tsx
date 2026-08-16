"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Flame } from "@/components/avatar-lab/Flame";
import { Pepper } from "@/components/avatar-lab/Pepper";
import { Sapling } from "@/components/avatar-lab/Sapling";
import { Sprout } from "@/components/avatar-lab/Sprout";
import { CompanyFooter } from "@/components/landing/CompanyFooter";
import { SHOP_URL } from "@/lib/shop";

type Locale = "zh" | "en";
type AgentId = "manager" | "inventory" | "purchasing" | "checkout";
type AvatarVisualProps = {
  playing?: boolean;
  loop?: boolean;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
};

type AgentDefinition = {
  id: AgentId;
  name: string;
  description: string;
  state: string;
  summary: string;
  owns: string;
  boundary: string;
  color: string;
};

type LandingCopy = {
  nav: [string, string, string];
  shop: string;
  pilot: string;
  heroTitleBefore: string;
  heroTitleAfter: string;
  heroLead: string;
  heroSecondary: string;
  previewHint: string;
  demoData: string;
  needsYou: string;
  allWork: string;
  completed: string;
  workFlow: string;
  scanEvidence: string;
  organized: string;
  draftFixed: string;
  done: string;
  prepared: string;
  approval: string;
  command: string;
  commandButton: string;
  demoNote: string;
  demoSuccess: string;
  demoFallback: string;
  workTitle: string;
  evidenceSources: string;
  reorderDraft: string;
  orderStatus: string;
  notSubmitted: string;
  pharmacistControl: string;
  reviewDraft: string;
  truth: string;
  messageTitle: string;
  messageBody: string;
  you: string;
  agentReply: string;
  messagePlaceholder: string;
  send: string;
  manyTitle: string;
  manyBody: string;
  sharedTask: string;
  sources: string;
  boxes: string;
  authority: string;
  jobsTitle: string;
  owns: string;
  boundary: string;
  pilotTitle: string;
  pilotBody: string;
  pilotSteps: [string, string][];
  pilotButton: string;
  meetTitle: string;
  meetBody: string;
  meetPrimary: string;
  meetSecondary: string;
  agents: AgentDefinition[];
};

const AVATARS: Record<AgentId, ComponentType<AvatarVisualProps>> = {
  manager: Sprout,
  inventory: Sapling,
  purchasing: Flame,
  checkout: Pepper,
};

const COPY: Record<Locale, LandingCopy> = {
  zh: {
    nav: ["怎麼合作", "Agent 團隊", "角色權限"],
    shop: "找藥 Shop ↗",
    pilot: "申請試點",
    heroTitleBefore: "把",
    heroTitleAfter: "Agent 當成藥局裡的新同事。",
    heroLead:
      "交代店長 Agent，一起處理預留、庫存訊號與補貨草稿。四個角色可以分工，但高影響決定仍由藥師批准。",
    heroSecondary: "看 Agent 怎麼工作 ↓",
    previewHint: "點選左側 Agent 可切換角色",
    demoData: "PROTOTYPE · 示範資料",
    needsYou: "需要你",
    allWork: "全部工作",
    completed: "完成紀錄",
    workFlow: "這張工作正在怎麼走",
    scanEvidence: "核對掃描 8、結帳 6、人工更正 1",
    organized: "整理補貨判斷與人員確認點",
    draftFixed: "固定草稿尚未送出訂單",
    done: "已完成",
    prepared: "已整理",
    approval: "等你批准",
    command: "確認預留 UY-4821",
    commandButton: "交代店長",
    demoNote: "產品預覽：只展示 Demo 工作狀態與支援的預留指令。",
    demoSuccess: "Demo：已辨識支援的預留確認指令；正式操作仍需要已開通門市與登入權限。",
    demoFallback: "這個 Prototype 只展示支援的 Demo 指令，不執行正式店務。",
    workTitle: "葉黃素低庫存處理",
    evidenceSources: "證據來源",
    reorderDraft: "補貨草稿",
    orderStatus: "訂單狀態",
    notSubmitted: "尚未送出",
    pharmacistControl: "批准、拒絕或修正，都留在藥師手上。",
    reviewDraft: "查看固定草稿",
    truth: "訊號不是精確庫存；仍需藥局人員確認。",
    messageTitle: "像交代同事一樣，交代 Agent。",
    messageBody:
      "不用先學一套後台語言。從店長 Agent 開始，查看它整理的工作、詢問 Demo 狀態，或用支援的指令處理預留。",
    you: "你",
    agentReply: "已確認預留並留下處理紀錄。顧客仍需到店，由藥師確認適合的品項與服務。",
    messagePlaceholder: "繼續交代店長 Agent…",
    send: "送出 ↗",
    manyTitle: "一張工作單，讓多個 Agent 同時接力。",
    manyBody:
      "每個角色只看自己需要的狀態與證據。它們共享同一張 WorkItem，而不是各自產生互相矛盾的答案。",
    sharedTask: "WI-2031 · 葉黃素低庫存",
    sources: "3 個來源",
    boxes: "12 盒",
    authority: "藥師批准",
    jobsTitle: "每個 Agent 都有一份清楚的工作。",
    owns: "負責",
    boundary: "停在這裡",
    pilotTitle: "先跑通一個流程，再談更多功能。",
    pilotBody:
      "現在不是方案定價頁，而是試點階段。從一間藥局、一個現有工作流程開始，保留藥師批准與可追溯紀錄。",
    pilotSteps: [
      ["現有工具", "沿用藥局的掃描器與 LINE，不要求先換掉 POS。"],
      ["一個 WorkItem", "先選一個真實、會反覆發生的店務流程。"],
      ["可驗證結果", "每一步都有來源、批准與 OutcomeReceipt。"],
    ],
    pilotButton: "申請成為試點藥局",
    meetTitle: "先認識你的店長 Agent。",
    meetBody: "一位會整理店務、協調其他 Agent，並在需要藥師批准時停下來的 AI 同事。",
    meetPrimary: "和店長 Agent 開始試點",
    meetSecondary: "查看產品證據",
    agents: [
      {
        id: "manager",
        name: "店長 Agent",
        description: "統整跨角色工作 · 在線",
        state: "ONLINE",
        summary:
          "庫存 Agent 已完成來源核對；採購 Agent 準備好 12 盒補貨草稿。目前尚未送出，正在等你批准供應商與數量。",
        owns: "統整跨角色工作、預留與需要人員處理的下一步。",
        boundary: "不代表藥師批准採購或專業判斷。",
        color: "bg-green",
      },
      {
        id: "inventory",
        name: "庫存 Agent",
        description: "掃描與數量證據 · 處理中",
        state: "WORKING",
        summary:
          "我已核對三個來源：掃描 8、結帳 6、人工更正 1。這些是觀察證據，不代表精確庫存，仍需要藥局人員確認。",
        owns: "核對掃描、結帳與人工更正等數量證據。",
        boundary: "不把掃描次數寫成精確庫存。",
        color: "bg-[#2c7180]",
      },
      {
        id: "purchasing",
        name: "採購 Agent",
        description: "補貨草稿與供應商 · 等你批准",
        state: "APPROVAL",
        summary:
          "補貨草稿包含供應商、規格與 12 盒建議數量。目前只是固定草稿，尚未送出任何訂單。",
        owns: "依確認後資料準備固定的補貨草稿。",
        boundary: "沒有藥師批准，不送出供應商訂單。",
        color: "bg-[#e14b3b]",
      },
      {
        id: "checkout",
        name: "結帳 Agent",
        description: "交易、收據與對帳 · 待命",
        state: "STANDBY",
        summary:
          "這張補貨工作不需要交易、退款或收據操作。我會保持待命，不取得這張工作不需要的權限。",
        owns: "處理交易、收據與需要的對帳狀態。",
        boundary: "工作不需要交易權限時，就保持待命。",
        color: "bg-[#8f514d]",
      },
    ],
  },
  en: {
    nav: ["How it works", "Agent team", "Roles and authority"],
    shop: "Medicine finder ↗",
    pilot: "Join the pilot",
    heroTitleBefore: "Meet your",
    heroTitleAfter: "pharmacy Agent team.",
    heroLead:
      "Give the Manager Agent a task, then coordinate reservations, inventory signals, and reorder drafts. Four roles share the work; pharmacists still approve consequential decisions.",
    heroSecondary: "See how Agents work ↓",
    previewHint: "Select an Agent to switch roles",
    demoData: "PROTOTYPE · DEMO DATA",
    needsYou: "Needs you",
    allWork: "All work",
    completed: "Completed",
    workFlow: "How this WorkItem is moving",
    scanEvidence: "Checked scans 8, checkouts 6, manual corrections 1",
    organized: "Organized reorder logic and human checkpoints",
    draftFixed: "Fixed draft, no order submitted",
    done: "Complete",
    prepared: "Organized",
    approval: "Needs approval",
    command: "Confirm reservation UY-4821",
    commandButton: "Send to Manager",
    demoNote: "Product preview: shows Demo work states and one supported reservation command.",
    demoSuccess: "Demo: supported reservation command recognized. Live operation still requires an activated pharmacy and sign-in.",
    demoFallback: "This prototype only shows supported Demo commands; it does not perform live pharmacy operations.",
    workTitle: "Low-stock lutein follow-up",
    evidenceSources: "Evidence sources",
    reorderDraft: "Reorder draft",
    orderStatus: "Order status",
    notSubmitted: "Not submitted",
    pharmacistControl: "Approve, reject, or revise: the pharmacist stays in control.",
    reviewDraft: "Review fixed draft",
    truth: "Signals are not exact inventory; pharmacy staff still confirm.",
    messageTitle: "Message Agents like teammates.",
    messageBody:
      "Start with the Manager Agent. Review organized work, ask about Demo status, or use a supported command to handle a reservation.",
    you: "You",
    agentReply:
      "Reservation confirmed and recorded. The customer still visits the pharmacy, where a pharmacist confirms the appropriate product and service.",
    messagePlaceholder: "Message the Manager Agent…",
    send: "Send ↗",
    manyTitle: "Work with many Agents at once.",
    manyBody:
      "Each role sees only the state and evidence it needs. They share one WorkItem instead of producing conflicting answers.",
    sharedTask: "WI-2031 · Low-stock lutein",
    sources: "3 sources",
    boxes: "12 boxes",
    authority: "Pharmacist approval",
    jobsTitle: "Give each Agent a clear job.",
    owns: "Owns",
    boundary: "Boundary",
    pilotTitle: "Prove one workflow, then expand.",
    pilotBody:
      "This is a pilot, not a pricing page. Start with one pharmacy and one existing workflow, while preserving pharmacist approval and traceable records.",
    pilotSteps: [
      ["Existing tools", "Keep the pharmacy scanner and LINE workflow; no POS replacement required."],
      ["One WorkItem", "Choose one real pharmacy workflow that happens repeatedly."],
      ["Verifiable outcome", "Every step keeps its source, approval, and OutcomeReceipt."],
    ],
    pilotButton: "Join the pharmacy pilot",
    meetTitle: "Meet your Manager Agent.",
    meetBody:
      "An AI teammate that organizes pharmacy work, coordinates other Agents, and stops when pharmacist approval is required.",
    meetPrimary: "Start a pilot with the Manager Agent",
    meetSecondary: "See product evidence",
    agents: [
      {
        id: "manager",
        name: "Manager Agent",
        description: "Coordinates cross-role work · online",
        state: "ONLINE",
        summary:
          "The Inventory Agent checked the sources. The Purchasing Agent prepared a 12-box reorder draft. Nothing has been submitted; supplier and quantity still need your approval.",
        owns: "Coordinates cross-role work, reservations, and next steps that need staff.",
        boundary: "Does not stand in for pharmacist approval or professional judgment.",
        color: "bg-green",
      },
      {
        id: "inventory",
        name: "Inventory Agent",
        description: "Scan and quantity evidence · working",
        state: "WORKING",
        summary:
          "I checked three sources: scans 8, checkouts 6, manual correction 1. These are observations, not exact inventory; pharmacy staff still confirm.",
        owns: "Checks quantity evidence from scans, checkout, and manual corrections.",
        boundary: "Never treats scan counts as exact inventory.",
        color: "bg-[#2c7180]",
      },
      {
        id: "purchasing",
        name: "Purchasing Agent",
        description: "Reorder draft and supplier · needs approval",
        state: "APPROVAL",
        summary:
          "The reorder draft includes supplier, specification, and a suggested quantity of 12 boxes. It remains a fixed draft; no order has been submitted.",
        owns: "Prepares a fixed reorder draft from confirmed data.",
        boundary: "Submits no supplier order without pharmacist approval.",
        color: "bg-[#e14b3b]",
      },
      {
        id: "checkout",
        name: "Checkout Agent",
        description: "Transactions, receipts, reconciliation · standby",
        state: "STANDBY",
        summary:
          "This reorder task needs no transaction, refund, or receipt operation. I stay on standby without taking unnecessary authority.",
        owns: "Handles transaction, receipt, and reconciliation states when needed.",
        boundary: "Stays on standby when a task does not need transaction authority.",
        color: "bg-[#8f514d]",
      },
    ],
  },
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return reduced;
}

function Avatar({
  id,
  size,
  playing,
  className = "",
  style,
}: {
  id: AgentId;
  size: number | string;
  playing: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const Component = AVATARS[id];
  return (
    <Component
      playing={playing}
      loop
      size={size}
      className={`agent-theme-eyes ${className}`}
      style={style}
    />
  );
}

function StoreOsPreview({
  copy,
  locale,
  reducedMotion,
}: {
  copy: LandingCopy;
  locale: Locale;
  reducedMotion: boolean;
}) {
  const [selectedId, setSelectedId] = useState<AgentId>("manager");
  const [command, setCommand] = useState(copy.command);
  const [note, setNote] = useState(copy.demoNote);
  const selected = copy.agents.find((agent) => agent.id === selectedId) ?? copy.agents[0];
  const compactEnglish = locale === "en";

  const submitCommand = (event: FormEvent) => {
    event.preventDefault();
    setNote(command.trim() === copy.command ? copy.demoSuccess : copy.demoFallback);
  };

  return (
    <section className="mx-auto w-full max-w-[1080px] pb-24" aria-label="Store OS interactive product preview">
      <div className="num mb-3 flex items-center justify-between gap-4 text-[11px] font-semibold tracking-[.06em] text-muted">
        <span>STORE OS · INTERACTIVE PRODUCT PREVIEW</span>
        <span className="hidden sm:inline">{copy.previewHint}</span>
      </div>
      <div className="paper-elevation grid min-h-[560px] border border-line-strong bg-paper lg:h-[560px] lg:min-h-0 lg:grid-cols-[218px_1fr] lg:overflow-hidden">
        <aside className="border-b border-line-strong bg-brand-surface text-on-dark lg:border-b-0 lg:border-r">
          <div className="flex min-h-[68px] items-center gap-3 border-b border-on-dark/15 px-4">
            <Avatar id="manager" size={36} playing={!reducedMotion} />
            <strong className="text-[14px]">uYao Store OS</strong>
          </div>
          <div className="num px-4 pb-2 pt-5 text-[10px] tracking-[.1em] text-on-dark/55">AGENTS</div>
          <div className="grid grid-cols-4 lg:grid-cols-1">
            {copy.agents.map((agent) => {
              const active = agent.id === selected.id;
              return (
                <button
                  key={agent.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedId(agent.id)}
                  className={`flex min-h-[72px] items-center justify-center gap-3 border-l-2 px-2 text-left lg:justify-start lg:px-4 ${
                    active ? "border-green bg-on-dark/10" : "border-transparent hover:bg-on-dark/5"
                  }`}
                >
                  <Avatar id={agent.id} size={40} playing={active && !reducedMotion} />
                  <span className="hidden min-w-0 flex-1 lg:block">
                    <strong className="block truncate text-[13px]">{agent.name}</strong>
                    <small className="num mt-1 block text-[9px] text-on-dark/65">{agent.state}</small>
                  </span>
                  <span className={`hidden h-1.5 w-1.5 flex-none rounded-full lg:block ${agent.color}`} />
                </button>
              );
            })}
          </div>
          <div className="hidden border-t border-on-dark/15 px-4 py-4 text-[12px] lg:grid lg:gap-3">
            <span className="flex justify-between"><span>{copy.needsYou}</span><b>1</b></span>
            <span className="flex justify-between"><span>{copy.allWork}</span><b>4</b></span>
            <span className="flex justify-between"><span>{copy.completed}</span><b>6</b></span>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex min-h-[68px] items-center justify-between gap-4 border-b border-line px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar id={selected.id} size={42} playing={!reducedMotion} />
              <span className="min-w-0">
                <strong className="block truncate text-[14px]">{selected.name}</strong>
                <small className="block truncate text-[11px] text-muted">{selected.description}</small>
              </span>
            </div>
            <span className="num hidden bg-sage px-3 py-2 text-[9px] font-semibold text-forest sm:block">{copy.demoData}</span>
          </div>
          <div
            className={`grid min-h-[448px] lg:h-[448px] lg:min-h-0 lg:overflow-hidden ${
              compactEnglish ? "lg:grid-cols-[1fr_220px]" : "lg:grid-cols-[1fr_238px]"
            }`}
          >
            <div className="flex min-h-0 min-w-0 flex-col px-4 py-5 sm:px-6 lg:py-4">
              <span className="num text-[9px] font-semibold tracking-[.08em] text-muted">SHARED WORKITEM · WI-2031</span>
              <div className="mt-5 flex items-start gap-4 lg:mt-4">
                <Avatar id={selected.id} size={48} playing={!reducedMotion} />
                <div className="min-w-0">
                  <strong className="text-[13px]">{selected.name}</strong>
                  <p
                    className={`mb-0 mt-2 text-[13px] text-ink-2 ${
                      compactEnglish ? "lg:text-[12px] lg:leading-[1.55]" : "leading-[1.75]"
                    }`}
                  >
                    {selected.summary}
                  </p>
                </div>
              </div>
              <div className="mt-6 border-t border-line pt-5 lg:mt-4 lg:pt-4">
                <h2 className={`editorial-display m-0 ${compactEnglish ? "lg:text-[20px]" : "text-[22px]"}`}>{copy.workFlow}</h2>
                {([
                  ["inventory", copy.scanEvidence, copy.done],
                  ["manager", copy.organized, copy.prepared],
                  ["purchasing", copy.draftFixed, copy.approval],
                ] satisfies [AgentId, string, string][]).map(([id, text, state]) => {
                  const agent = copy.agents.find((item) => item.id === id)!;
                  return (
                    <div
                      key={id}
                      className={`grid grid-cols-[32px_1fr_auto] items-center gap-3 border-b border-line py-3 lg:py-2.5 ${
                        compactEnglish ? "text-[10px]" : "text-[11px]"
                      }`}
                    >
                      <Avatar id={id} size={28} playing={false} />
                      <span className="min-w-0"><b>{agent.name}</b><span className="ml-3 hidden text-muted sm:inline">{text}</span></span>
                      <b className={id === "purchasing" ? "text-warning" : "text-green"}>{state}</b>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={submitCommand} className="mt-auto flex border border-line-strong">
                <input
                  value={command}
                  onChange={(event) => setCommand(event.target.value)}
                  aria-label={copy.commandButton}
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[12px] outline-none"
                />
                <button type="submit" className="bg-brand-surface px-4 text-[11px] font-bold text-on-dark">{copy.commandButton}</button>
              </form>
              <p className="mb-0 mt-2 text-[10px] leading-[1.5] text-muted" aria-live="polite">{note}</p>
            </div>
            <aside
              className={`min-h-0 border-t border-line bg-ivory px-5 py-6 lg:border-l lg:border-t-0 ${
                compactEnglish ? "lg:px-4 lg:py-4" : ""
              }`}
            >
              <span className="num text-[9px] font-semibold tracking-[.08em] text-muted">NEEDS YOU</span>
              <h2
                className={`editorial-display leading-[1.25] ${
                  compactEnglish ? "mb-3 mt-2 text-[21px]" : "mb-5 mt-3 text-[24px]"
                }`}
              >
                {copy.workTitle}
              </h2>
              {[
                ["WorkItem", "WI-2031"],
                [copy.evidenceSources, "3"],
                [copy.reorderDraft, copy.boxes],
                [copy.orderStatus, copy.notSubmitted],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className={`flex justify-between gap-3 border-t border-line text-[11px] ${
                    compactEnglish ? "py-2" : "py-3"
                  }`}
                >
                  <span>{label}</span><b>{value}</b>
                </div>
              ))}
              <div className={`border border-warning-line bg-warning-tint ${compactEnglish ? "mt-3 p-3" : "mt-4 p-4"}`}>
                <span className="num text-[9px] font-bold text-warning">PHARMACIST APPROVAL</span>
                <strong
                  className={`block ${
                    compactEnglish ? "mt-2 text-[11px] leading-[1.45]" : "mt-3 text-[12px] leading-[1.55]"
                  }`}
                >
                  {copy.pharmacistControl}
                </strong>
                <button
                  type="button"
                  className={`w-full bg-brand-surface px-3 text-[11px] font-bold text-on-dark ${
                    compactEnglish ? "mt-3 min-h-9" : "mt-4 min-h-10"
                  }`}
                >
                  {copy.reviewDraft}
                </button>
              </div>
            </aside>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t border-line px-4 py-3 text-[9px] text-muted sm:px-6">
            <span>{copy.truth}</span><span>Prototype · no live supplier order</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterManager({ copy, locale, reducedMotion }: { copy: LandingCopy; locale: Locale; reducedMotion: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const introTimerRef = useRef<number | null>(null);
  const [entered, setEntered] = useState(reducedMotion);
  const [introPeeking, setIntroPeeking] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const pilotHref = locale === "en" ? "/en/pharmacy" : "/zh-tw/pharmacy";
  const evidenceHref = locale === "en" ? "/en/evidence" : "/zh-tw/evidence";

  useEffect(() => {
    if (reducedMotion) {
      setEntered(true);
      setIntroPeeking(false);
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setEntered(true);
        setIntroPeeking(true);
        introTimerRef.current = window.setTimeout(() => setIntroPeeking(false), 1400);
        observer.disconnect();
      },
      { threshold: 0.25 },
    );
    observer.observe(stage);
    return () => {
      observer.disconnect();
      if (introTimerRef.current !== null) window.clearTimeout(introTimerRef.current);
    };
  }, [reducedMotion]);

  const setEyeOffset = (x: number, y: number) => {
    avatarRef.current
      ?.querySelector("svg g[clip-path]")
      ?.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  };
  const followEyes = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.pointerType !== "mouse" || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
    setEyeOffset(x * 5, y * 3);
  };
  const peeking = !reducedMotion && (introPeeking || engaged);
  const peekState = reducedMotion ? "reduced" : !entered ? "hidden" : peeking ? "peeking" : "resting";
  const bodyOffset = reducedMotion ? 13 : !entered ? 34 : peeking ? -2 : 13;
  const engage = () => {
    if (!reducedMotion) setEngaged(true);
  };
  const rest = () => {
    setEngaged(false);
    setEyeOffset(0, 0);
  };

  return (
    <section id="meet-manager" className="overflow-hidden border-t border-line bg-paper">
      <div className="mx-auto flex min-h-[720px] max-w-[1240px] flex-col items-center px-5 pt-20 text-center sm:min-h-[940px] sm:px-8 sm:pt-28">
        <div className="relative z-10 max-w-[780px]">
          <span className="num text-[11px] font-bold tracking-[.1em] text-green">MEET YOUR FIRST AGENT</span>
          <h2 className="editorial-display mb-0 mt-4 text-[clamp(48px,6vw,80px)] leading-[1.04]">{copy.meetTitle}</h2>
          <p className="mx-auto mb-0 mt-6 max-w-[620px] text-[15px] leading-[1.8] text-muted sm:text-[16px]">{copy.meetBody}</p>
          <div className="mx-auto mt-8 flex max-w-[580px] flex-col justify-center gap-3 sm:flex-row">
            <Link href={pilotHref} className="action-primary min-h-[52px] px-6 text-[14px]">{copy.meetPrimary}</Link>
            <Link href={evidenceHref} className="action-secondary min-h-[52px] px-6 text-[14px]">{copy.meetSecondary}</Link>
          </div>
        </div>
        <div
          ref={stageRef}
          role="button"
          tabIndex={0}
          aria-label={locale === "en" ? "Wake the Manager Agent" : "叫店長 Agent 探頭"}
          aria-pressed={engaged}
          data-testid="footer-manager-stage"
          data-peek-state={peekState}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") engage();
          }}
          onPointerMove={followEyes}
          onPointerLeave={rest}
          onPointerUp={(event) => {
            if (event.pointerType !== "mouse" && !reducedMotion) setEngaged((current) => !current);
          }}
          onFocus={engage}
          onBlur={rest}
          onKeyDown={(event) => {
            if ((event.key === "Enter" || event.key === " ") && !reducedMotion) {
              event.preventDefault();
              setEngaged((current) => !current);
            }
          }}
          className="relative mt-8 h-[345px] w-full cursor-pointer overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-4 focus-visible:ring-offset-paper sm:mt-10 sm:h-[560px]"
        >
          <div
            ref={avatarRef}
            data-testid="footer-manager-body"
            className="absolute left-1/2 top-0 h-[540px] w-[540px] drop-shadow-[0_30px_28px_rgba(28,39,34,.10)] will-change-transform sm:h-[900px] sm:w-[900px]"
            style={{
              transform: `translate3d(-50%, ${bodyOffset}%, 0)`,
              transitionProperty: "transform",
              transitionDuration: reducedMotion ? "0ms" : peeking ? "520ms" : "260ms",
              transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          >
            <Avatar id="manager" size="100%" playing={!reducedMotion} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 border-t border-line bg-paper sm:h-14" aria-hidden />
        </div>
      </div>
    </section>
  );
}

export function AgentLandingExperience({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  const reducedMotion = useReducedMotion();
  const shopUrl = `${SHOP_URL.replace(/\/$/, "")}${locale === "en" ? "/en" : "/zh-tw"}`;
  const pilotHref = locale === "en" ? "/en/pharmacy" : "/zh-tw/pharmacy";
  const localeHref = locale === "en" ? "/zh-tw" : "/en";
  const localeLabel = locale === "en" ? "ZH" : "EN";
  const manager = useMemo(() => copy.agents[0], [copy]);

  return (
    <div className="min-w-[320px] bg-ivory text-ink">
      <nav className="sticky top-0 z-50 border-b border-line bg-ivory/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between gap-4 px-5 sm:h-[78px] sm:px-8">
          <Link href={locale === "en" ? "/en" : "/zh-tw"} className="flex min-h-11 items-center no-underline">
            <BrandLogo height={34} />
          </Link>
          <div className="hidden items-center gap-7 text-[13px] lg:flex">
            <a href="#message" className="min-h-11 content-center no-underline hover:text-green">{copy.nav[0]}</a>
            <a href="#many" className="min-h-11 content-center no-underline hover:text-green">{copy.nav[1]}</a>
            <a href="#jobs" className="min-h-11 content-center no-underline hover:text-green">{copy.nav[2]}</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle locale={locale} />
            <Link href={localeHref} className="num inline-flex min-h-11 items-center px-2 text-[11px] text-muted no-underline hover:text-green">{localeLabel}</Link>
            <a href={shopUrl} className="inline-flex min-h-11 items-center border border-forest px-3 text-[12px] font-bold text-forest no-underline sm:px-4 sm:text-[13px]">{copy.shop}</a>
            <Link href={pilotHref} className="action-primary hidden text-[13px] sm:inline-flex">{copy.pilot}</Link>
          </div>
        </div>
      </nav>

      <main>
        <header className="mx-auto flex min-h-[500px] max-w-[1120px] flex-col items-center justify-center px-5 py-16 text-center sm:min-h-[560px] sm:px-8 sm:py-20">
          <span className="num text-[11px] font-bold tracking-[.1em] text-green">uYao STORE OS · PROTOTYPE</span>
          <h1 className="editorial-display mb-0 mt-5 max-w-[980px] text-[clamp(46px,7vw,88px)] leading-[1.08]">
            {copy.heroTitleBefore}{" "}
            <Avatar id="manager" size="1.08em" playing={!reducedMotion} className="align-[-.2em]" />{" "}
            {copy.heroTitleAfter}
          </h1>
          <p className="mb-0 mt-7 max-w-[720px] text-[15px] leading-[1.8] text-muted sm:text-[17px]">{copy.heroLead}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={pilotHref} className="action-primary min-h-[52px] px-7 text-[14px]">{copy.pilot}</Link>
            <a href="#message" className="action-secondary min-h-[52px] px-7 text-[14px]">{copy.heroSecondary}</a>
          </div>
        </header>

        <div className="px-0 sm:px-8"><StoreOsPreview copy={copy} locale={locale} reducedMotion={reducedMotion} /></div>

        <section id="message" className="border-t border-line py-24 sm:py-32">
          <div className="mx-auto grid max-w-[1240px] items-center gap-14 px-5 sm:px-8 lg:grid-cols-[.82fr_1.18fr]">
            <div>
              <span className="num text-[11px] font-bold tracking-[.1em] text-green">MESSAGE AGENTS LIKE TEAMMATES</span>
              <h2 className="editorial-display mb-0 mt-4 text-[clamp(44px,5vw,68px)] leading-[1.08]">{copy.messageTitle}</h2>
              <p className="mb-0 mt-6 max-w-[520px] text-[16px] leading-[1.8] text-muted">{copy.messageBody}</p>
            </div>
            <div className="border border-line-strong bg-paper">
              <div className="num flex justify-between border-b border-line px-5 py-4 text-[10px] text-muted"><span>{manager.name.toUpperCase()} · DIRECT MESSAGE</span><span>09:14</span></div>
              <div className="grid grid-cols-[42px_1fr] gap-4 border-b border-line px-5 py-5"><span className="grid h-[38px] place-items-center bg-brand-surface text-[9px] font-bold text-on-dark">YOU</span><div><b className="text-[12px]">{copy.you}</b><p className="mb-0 mt-2 text-[13px] text-muted">{copy.command}</p></div></div>
              <div className="grid grid-cols-[48px_1fr] gap-4 border-b border-line px-5 py-5"><Avatar id="manager" size={46} playing={!reducedMotion} /><div><b className="text-[12px]">{manager.name}</b><p className="mb-0 mt-2 text-[13px] leading-[1.7] text-muted">{copy.agentReply}</p></div></div>
              <div className="m-5 flex justify-between border border-line-strong px-4 py-3 text-[11px] text-muted"><span>{copy.messagePlaceholder}</span><b className="text-forest">{copy.send}</b></div>
            </div>
          </div>
        </section>

        <section id="many" className="border-t border-line py-24 sm:py-32">
          <div className="mx-auto grid max-w-[1240px] items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.18fr_.82fr]">
            <div className="order-2 border border-green-tint-line bg-sage p-6 sm:p-10 lg:order-1">
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                {copy.agents.map((agent) => (
                  <div key={agent.id} className="text-center"><Avatar id={agent.id} size={96} playing={!reducedMotion} className="mx-auto" /><strong className="mt-2 block text-[14px]">{agent.name}</strong><span className="num mt-2 inline-flex items-center gap-2 text-[9px] text-muted"><i className={`h-1.5 w-1.5 rounded-full ${agent.color}`} />{agent.state}</span></div>
                ))}
              </div>
              <div className="mt-12 grid border-y border-forest/20 text-[11px] sm:grid-cols-4">
                {[["SHARED WORKITEM", copy.sharedTask], ["EVIDENCE", copy.sources], ["DRAFT", copy.boxes], ["AUTHORITY", copy.authority]].map(([label, value]) => <div key={label} className="border-b border-forest/20 p-3 last:border-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><small className="num text-[8px] text-muted">{label}</small><b className="mt-1 block">{value}</b></div>)}
              </div>
            </div>
            <div className="order-1 lg:order-2"><span className="num text-[11px] font-bold tracking-[.1em] text-green">WORK WITH MANY AGENTS AT ONCE</span><h2 className="editorial-display mb-0 mt-4 text-[clamp(44px,5vw,68px)] leading-[1.08]">{copy.manyTitle}</h2><p className="mb-0 mt-6 text-[16px] leading-[1.8] text-muted">{copy.manyBody}</p></div>
          </div>
        </section>

        <section id="jobs" className="border-t border-line py-24 sm:py-32">
          <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
            <span className="num text-[11px] font-bold tracking-[.1em] text-green">GIVE EACH AGENT A JOB</span>
            <h2 className="editorial-display mb-10 mt-4 text-[clamp(44px,5vw,68px)] leading-[1.08]">{copy.jobsTitle}</h2>
            <div className="border-t border-line">
              {copy.agents.map((agent) => (
                <div key={agent.id} className="grid gap-5 border-b border-line py-6 sm:grid-cols-[84px_190px_1fr_1fr] sm:items-center sm:gap-6">
                  <Avatar id={agent.id} size={76} playing={!reducedMotion} />
                  <h3 className="editorial-display m-0 text-[21px]"><span className="block">{agent.name}</span><small className="num mt-2 block text-[9px] tracking-[.06em] text-muted">{agent.state}</small></h3>
                  <div><small className="num font-bold text-oxblood">{copy.owns}</small><p className="mb-0 mt-2 text-[13px] leading-[1.6] text-muted">{agent.owns}</p></div>
                  <div><small className="num font-bold text-oxblood">{copy.boundary}</small><p className="mb-0 mt-2 text-[13px] leading-[1.6] text-muted">{agent.boundary}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pilot" className="bg-brand-surface py-24 text-on-dark sm:py-32">
          <div className="mx-auto grid max-w-[1240px] items-center gap-16 px-5 sm:px-8 lg:grid-cols-[1fr_.88fr] lg:gap-24">
            <div><span className="num text-[11px] font-bold tracking-[.1em] text-[#8fcda0]">START WITH A REAL WORKFLOW</span><h2 className="editorial-display mb-0 mt-4 text-[clamp(48px,5.4vw,72px)] leading-[1.08]">{copy.pilotTitle}</h2><p className="mb-0 mt-7 max-w-[600px] text-[15px] leading-[1.8] text-on-dark/75">{copy.pilotBody}</p><Link href={pilotHref} className="mt-8 inline-flex min-h-[52px] items-center bg-paper px-6 text-[14px] font-bold text-forest no-underline">{copy.pilotButton}</Link></div>
            <div className="border-t border-on-dark/25">{copy.pilotSteps.map(([label, body]) => <div key={label} className="grid grid-cols-[116px_1fr] gap-5 border-b border-on-dark/25 py-5"><span className="num text-[9px] font-bold text-[#8fcda0]">{label}</span><b className="text-[14px] leading-[1.55]">{body}</b></div>)}</div>
          </div>
        </section>
      </main>

      <CompanyFooter locale={locale}>
        <FooterManager copy={copy} locale={locale} reducedMotion={reducedMotion} />
      </CompanyFooter>
    </div>
  );
}
