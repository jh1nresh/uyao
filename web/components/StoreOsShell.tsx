"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
} from "react";

import { BrandMark } from "@/components/BrandMark";
import { SupportAgent } from "@/components/SupportAgent";
import { Flame } from "@/components/avatar-lab/Flame";
import { Pepper } from "@/components/avatar-lab/Pepper";
import { Sapling } from "@/components/avatar-lab/Sapling";
import { Sprout } from "@/components/avatar-lab/Sprout";
import { Strobi } from "@/components/avatar-lab/Strobi";
import {
  answerStoreReservationQuestion,
  parseStoreReservationCommand,
  type StoreReservationAction,
} from "@/lib/store-reservation-command";
import type { Locale } from "@/lib/i18n";
import { parseStoreOsLocale, STORE_OS_LOCALE_STORAGE_KEY } from "@/lib/store-os-locale";
import {
  STORE_AGENTS,
  STORE_AGENTS_EN,
  isStoreAgentAvailable,
  storeAgent,
  storeAgentCopy,
  storeWorkItemCopy,
  type StoreAgentId,
} from "@/lib/store-os";
import type { StoreRole } from "@/lib/store-identity";
import type { StoreReservationSummary } from "@/lib/reservations-store";

import styles from "./StoreOsShell.module.css";

type ExportedAvatar = ComponentType<{
  playing?: boolean;
  size?: number | string;
  className?: string;
}>;

type StoreTheme = "light" | "dark";
type ComposerNoticeTone = "answer" | "success" | "warning";
type StoreWorkView = "attention" | "all" | "completed";

const AGENT_AVATARS: Record<StoreAgentId, ExportedAvatar> = {
  manager: Sprout,
  inventory: Sapling,
  purchasing: Flame,
  checkout: Pepper,
};

const STATUS_LABELS: Record<StoreReservationSummary["status"], string> = {
  pending_store_confirm: "待確認",
  confirmed: "已確認",
  rejected_no_stock: "無庫存",
  cancelled_by_user: "已取消",
  picked_up: "已取貨",
  expired: "已逾期",
};

const STATUS_LABELS_EN: Record<StoreReservationSummary["status"], string> = {
  pending_store_confirm: "Pending",
  confirmed: "Confirmed",
  rejected_no_stock: "Out of stock",
  cancelled_by_user: "Cancelled",
  picked_up: "Picked up",
  expired: "Expired",
};

const COMPLETED_RESERVATION_STATUSES = new Set<StoreReservationSummary["status"]>([
  "rejected_no_stock",
  "cancelled_by_user",
  "picked_up",
  "expired",
]);

const STORE_ROLE_LABELS: Record<StoreRole, string> = {
  owner: "店家擁有者",
  manager: "門市管理者",
  staff: "門市人員",
};

const STORE_ROLE_LABELS_EN: Record<StoreRole, string> = {
  owner: "Store owner",
  manager: "Store manager",
  staff: "Store staff",
};

function taipeiTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const value = (type: Intl.DateTimeFormatPartTypes) => (
    parts.find((part) => part.type === type)?.value ?? ""
  );
  return `${value("month")}/${value("day")} ${value("hour")}:${value("minute")}`;
}

function ReservationInbox({
  reservations,
  view,
  animate,
  busyCode,
  actionError,
  locale,
  onAction,
}: {
  reservations: StoreReservationSummary[];
  view: StoreWorkView;
  animate: boolean;
  busyCode: string;
  actionError: string;
  locale: Locale;
  onAction: (code: string, action: StoreReservationAction) => void;
}) {
  const english = locale === "en";
  const statusLabels = english ? STATUS_LABELS_EN : STATUS_LABELS;
  const waiting = reservations.filter((reservation) => reservation.status === "pending_store_confirm");
  const completed = reservations.filter((reservation) => COMPLETED_RESERVATION_STATUSES.has(reservation.status));
  const visibleReservations = view === "attention"
    ? waiting
    : view === "completed"
      ? completed
      : reservations;
  const withIntake = visibleReservations.filter((reservation) => reservation.intake).length;
  const heading = english
    ? view === "attention" ? "Needs you" : view === "completed" ? "Completed" : "All work"
    : view === "attention" ? "需要你" : view === "completed" ? "完成紀錄" : "全部工作";
  const eyebrow = view === "attention" ? "ACTION" : view === "completed" ? "CLOSED" : "ALL";
  const emptyTitle = english
    ? view === "attention" ? "No reservations need confirmation" : view === "completed" ? "No completed records yet" : "No reservations yet"
    : view === "attention" ? "目前沒有需要確認的預留" : view === "completed" ? "還沒有完成紀錄" : "還沒有預留單";
  const emptyDetail = english
    ? view === "attention"
      ? "New reservations will appear here for confirmation."
      : view === "completed"
        ? "Picked-up, out-of-stock, cancelled, and expired reservations remain here."
        : "When a customer reserves through uYao, the code appears here directly. No separate LINE notification is required."
    : view === "attention"
      ? "新的預留建立後，會直接出現在這裡等你確認。"
      : view === "completed"
        ? "已取貨、缺貨、取消或逾期的預留會保留在這裡。"
        : "客戶從 uYao 完成預留後，單號會直接出現在這裡，不需要另外接收 LINE 通知。";
  return (
    <>
      <div className={styles.workHeading}>
        <p>RESERVATIONS / {eyebrow}</p>
        <h1>{heading}</h1>
        <div>
          <span>{english ? `${waiting.length} awaiting confirmation` : `${waiting.length} 筆等待確認`}</span>
          <span>{english ? `${visibleReservations.length} shown` : `${visibleReservations.length} 筆目前顯示`}</span>
          <span>{english ? `${withIntake} with customer context` : `${withIntake} 筆附需求脈絡`}</span>
          <span>{english ? "Newest first" : "最新單號在上"}</span>
          <span>{english ? "Full phone numbers hidden" : "完整電話未顯示"}</span>
        </div>
      </div>

      <section className={styles.agentMessage} aria-live="polite">
        <AgentOrb id="manager" active animated={animate} />
        <div>
          <p className={styles.sender}>{english ? "Manager Agent" : "店長 Agent"} <time>{english ? "Now" : "現在"}</time></p>
          <p>
            {english
              ? view === "completed"
                ? `${completed.length} completed reservations are shown. Records retain only what staff need for verification.`
                : waiting.length > 0
                  ? `${waiting.length} new reservations need confirmation. Only the last three phone digits required for in-store verification are shown.`
                  : "No new reservations are awaiting confirmation. New reservations will appear here directly."
              : view === "completed"
                ? `目前顯示 ${completed.length} 筆已結束預留；紀錄只保留店務核對所需資訊。`
                : waiting.length > 0
                  ? `有 ${waiting.length} 筆新預留等你確認。我只顯示到店核對所需的手機末三碼。`
                  : "目前沒有等待確認的新預留；新單建立後會直接出現在這裡。"}
          </p>
        </div>
      </section>

      {actionError && <p className={styles.reservationError} role="alert">{actionError}</p>}

      <section className={styles.reservationList} aria-label={english ? "Store reservations" : "門市預留單"}>
        {visibleReservations.length === 0 ? (
          <div className={styles.emptyInbox}>
            <strong>{emptyTitle}</strong>
            <p>{emptyDetail}</p>
          </div>
        ) : visibleReservations.map((reservation) => (
          <article className={styles.reservationCard} key={reservation.code}>
            <header>
              <span className={styles.reservationCode}>{reservation.code}</span>
              {reservation.demo && <span className={styles.reservationDemo}>{english ? "Demo" : "示範"}</span>}
              <span data-status={reservation.status}>{statusLabels[reservation.status]}</span>
            </header>
            <h2>{reservation.drugName}</h2>
            <p>
              {reservation.drugSpec} · NT$ {reservation.priceTwd}
              {reservation.sourceStoreName ? ` · ${english ? "Source page" : "來源頁"} ${reservation.sourceStoreName}` : ""}
            </p>
            {reservation.intake && (
              <section className={styles.reservationIntake} aria-label={english ? "Customer context" : "顧客需求脈絡"}>
                <header>
                  <strong>{english ? "Customer context" : "顧客需求脈絡"}</strong>
                  <span>{english ? "Shared with customer consent" : "顧客已同意提供"}</span>
                </header>
                {reservation.intake.searchQuery && (
                  <div>
                    <span>{english ? "Original Shop search" : "Shop 原始搜尋"}</span>
                    <p>{reservation.intake.searchQuery}</p>
                  </div>
                )}
                {reservation.intake.note && (
                  <div>
                    <span>{english ? "Customer note" : "顧客補充描述"}</span>
                    <p>{reservation.intake.note}</p>
                  </div>
                )}
                <small>{english
                  ? "For the pharmacist's in-store questions and judgment only. This is not a diagnosis or a product-suitability claim."
                  : "僅供藥師到店詢問與判斷，不代表系統診斷或品項適用性。"}</small>
              </section>
            )}
            <footer>
              <span>{english ? "Last 3 phone digits" : "手機末三碼"} {reservation.contactTail}</span>
              <time dateTime={reservation.createdAt}>{taipeiTime(reservation.createdAt)}</time>
            </footer>
            {reservation.status === "pending_store_confirm" && (
              <div className={styles.reservationActions}>
                <button
                  type="button"
                  className={styles.reservationPrimaryAction}
                  disabled={busyCode === reservation.code}
                  onClick={() => onAction(reservation.code, "confirm")}
                >{busyCode === reservation.code ? (english ? "Processing…" : "處理中…") : (english ? "Confirm in stock" : "確認有貨")}</button>
                <button
                  type="button"
                  disabled={busyCode === reservation.code}
                  onClick={() => onAction(reservation.code, "reject")}
                >{english ? "Report out of stock" : "回報無庫存"}</button>
              </div>
            )}
            {reservation.status === "confirmed" && (
              <div className={styles.reservationActions}>
                <button
                  type="button"
                  className={styles.reservationPrimaryAction}
                  disabled={busyCode === reservation.code}
                  onClick={() => onAction(reservation.code, "pickup")}
                >{busyCode === reservation.code ? (english ? "Processing…" : "處理中…") : (english ? "Complete pickup" : "完成取貨")}</button>
              </div>
            )}
          </article>
        ))}
      </section>
    </>
  );
}

function AgentOrb({
  id,
  active = false,
  animated = false,
  small = false,
}: {
  id: StoreAgentId;
  active?: boolean;
  animated?: boolean;
  small?: boolean;
}) {
  const agent = storeAgent(id);
  const Avatar = AGENT_AVATARS[id];
  return (
    <span
      className={`${styles.agentFace} ${small ? styles.smallFace : ""}`}
      data-active={active ? "true" : "false"}
      data-agent={id}
      data-animated={animated ? "true" : "false"}
      data-state={agent.state}
      aria-hidden="true"
    >
      <Avatar
        className={styles.agentAvatar}
        playing={animated}
        size="100%"
      />
    </span>
  );
}

export function StoreOsShell({
  storeName,
  storeSlug,
  operatorName,
  operatorEmail,
  operatorRole,
  reservations,
  demoMode,
}: {
  storeName: string;
  storeSlug: string;
  operatorName: string;
  operatorEmail: string;
  operatorRole: StoreRole;
  reservations: StoreReservationSummary[];
  demoMode: boolean;
}) {
  const [activeAgentId, setActiveAgentId] = useState<StoreAgentId>("manager");
  const [draftOpen, setDraftOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [composerNotice, setComposerNotice] = useState("");
  const [composerNoticeTone, setComposerNoticeTone] = useState<ComposerNoticeTone>("answer");
  const [workView, setWorkView] = useState<StoreWorkView>("attention");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<StoreTheme>("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [liveReservations, setLiveReservations] = useState(reservations);
  const [reservationBusyCode, setReservationBusyCode] = useState("");
  const [reservationActionError, setReservationActionError] = useState("");
  const [supportOpen, setSupportOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>("zh");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const draftButtonRef = useRef<HTMLButtonElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const profileCloseButtonRef = useRef<HTMLButtonElement>(null);
  const english = locale === "en";
  const agents = english ? STORE_AGENTS_EN : STORE_AGENTS;
  const activeAgent = storeAgentCopy(activeAgentId, locale);
  const workItem = storeWorkItemCopy(locale);
  const activeAgentAvailable = isStoreAgentAvailable(activeAgentId, demoMode);
  const waitingCount = liveReservations.filter((reservation) => reservation.status === "pending_store_confirm").length;
  const completedCount = liveReservations.filter((reservation) => COMPLETED_RESERVATION_STATUSES.has(reservation.status)).length;

  function openWorkView(view: StoreWorkView) {
    setSupportOpen(false);
    setActiveAgentId("manager");
    setWorkView(view);
  }

  useEffect(() => {
    setLocale(parseStoreOsLocale(window.localStorage.getItem(STORE_OS_LOCALE_STORAGE_KEY)));
  }, []);

  function changeLocale(next: Locale) {
    setLocale(next);
    setMessage("");
    setComposerNotice("");
    setReservationActionError("");
    window.localStorage.setItem(STORE_OS_LOCALE_STORAGE_KEY, next);
  }

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem("uyao-store-theme");
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const savedTheme = stored === "light" || stored === "dark" ? stored : null;
    setResolvedTheme(savedTheme ?? (media.matches ? "light" : "dark"));
    if (savedTheme) return;
    const onChange = () => {
      if (!window.localStorage.getItem("uyao-store-theme")) {
        setResolvedTheme(media.matches ? "light" : "dark");
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function toggleTheme() {
    const next: StoreTheme = resolvedTheme === "dark" ? "light" : "dark";
    setResolvedTheme(next);
    window.localStorage.setItem("uyao-store-theme", next);
  }

  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem("uyao-store-sidebar") === "collapsed");
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("uyao-store-sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }

  useEffect(() => {
    let stopped = false;
    async function syncReservations() {
      const response = await fetch("/api/store/reservations", { cache: "no-store" }).catch(() => null);
      if (response?.status === 401) {
        window.location.reload();
        return;
      }
      if (!response?.ok) return;
      const result = await response.json().catch(() => null) as { reservations?: StoreReservationSummary[] } | null;
      if (!stopped && Array.isArray(result?.reservations)) setLiveReservations(result.reservations);
    }

    const timer = window.setInterval(syncReservations, 15_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void syncReservations();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!draftOpen) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDraftOpen(false);
        draftButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [draftOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    profileCloseButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeProfile();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [profileOpen]);

  function closeDraft() {
    setDraftOpen(false);
    requestAnimationFrame(() => draftButtonRef.current?.focus());
  }

  function closeProfile() {
    setProfileOpen(false);
    requestAnimationFrame(() => profileButtonRef.current?.focus());
  }

  async function updateReservation(code: string, action: StoreReservationAction): Promise<boolean> {
    if (reservationBusyCode) return false;
    setReservationBusyCode(code);
    setReservationActionError("");
    setComposerNotice("");
    try {
      const response = await fetch("/api/store/reservations", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, action }),
      });
      if (response.status === 401) {
        window.location.reload();
        return false;
      }
      const result = await response.json().catch(() => null) as {
        reservation?: StoreReservationSummary;
        error?: string;
      } | null;
      if (!response.ok || !result?.reservation) {
        const error = english
          ? response.status === 404
            ? "Reservation not found."
            : response.status === 409
              ? "This reservation changed. Refresh and try again."
              : "This reservation can't be updated right now. Please try again later."
          : (result?.error || "目前無法更新這筆預留，請稍後再試。");
        setReservationActionError(`${code} · ${error}`);
        return false;
      }
      setLiveReservations((current) => current.map((item) => (
        item.code === code ? result.reservation! : item
      )));
      const actionLabel = english
        ? action === "confirm" ? "confirmed in stock" : action === "reject" ? "reported out of stock" : "marked as picked up"
        : action === "confirm" ? "已確認有貨" : action === "reject" ? "已回報無庫存" : "已完成取貨";
      setComposerNotice(english
        ? `${code} ${actionLabel}. The customer's pickup page will update automatically.`
        : `${code} ${actionLabel}；消費者取貨頁會同步更新。`);
      setComposerNoticeTone("success");
      return true;
    } catch {
      setReservationActionError(`${code} · ${english ? "Network request failed; status was not updated." : "網路連線失敗，狀態尚未更新。"}`);
      return false;
    } finally {
      setReservationBusyCode("");
    }
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    if (activeAgentId !== "manager") {
      setComposerNoticeTone("warning");
      setComposerNotice(activeAgentAvailable
        ? (english ? "This demo only shows Agent work status; it does not perform live store operations." : "這個 Demo 只展示 Agent 工作狀態；尚未執行正式店務。")
        : (english ? `${activeAgent.name} is not available yet. Only the Manager Agent can handle reservations.` : `${activeAgent.name} 尚未開通；目前只有店長 Agent 可以處理預留。`));
      return;
    }
    const command = parseStoreReservationCommand(message);
    if (command) {
      if (await updateReservation(command.code, command.action)) setMessage("");
      return;
    }
    const answer = answerStoreReservationQuestion(message, liveReservations, locale);
    if (answer) {
      setComposerNotice(answer);
      setComposerNoticeTone("answer");
      setMessage("");
      return;
    }
    setComposerNoticeTone("warning");
    setComposerNotice(english
      ? "I can answer questions about reservation codes, counts, and status. I can also run: Confirm A-123, Out of stock A-123, or Complete pickup A-123."
      : "我目前可以回答單號、預留數量與狀態；也可以執行：確認 A-123、缺貨 A-123、完成 A-123。");
  }

  async function logout() {
    await fetch("/api/store/auth/logout", { method: "POST" }).catch(() => null);
    window.location.reload();
  }

  return (
    <main
      className={styles.screen}
      lang={english ? "en" : "zh-Hant-TW"}
      data-theme={resolvedTheme}
      data-sidebar={sidebarCollapsed ? "collapsed" : "expanded"}
    >
      <aside id="store-agent-sidebar" className={styles.sidebar} aria-label="Store Agents">
        <div className={styles.brandRow}>
          <span className={styles.brandIdentity}>
            <BrandMark size={28} />
            <strong>uYao Store</strong>
          </span>
          <span className={styles.agentsLabel}>AGENTS</span>
          <button
            type="button"
            className={styles.sidebarToggle}
            aria-controls="store-agent-sidebar"
            aria-expanded={!sidebarCollapsed}
            aria-label={sidebarCollapsed ? (english ? "Expand sidebar" : "展開側邊欄") : (english ? "Collapse sidebar" : "收合側邊欄")}
            title={sidebarCollapsed ? (english ? "Expand sidebar" : "展開側邊欄") : (english ? "Collapse sidebar" : "收合側邊欄")}
            onClick={toggleSidebar}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14.5 7 9.5 12l5 5" />
              <path d="M19 5v14" />
            </svg>
          </button>
        </div>

        <p className={styles.sectionLabel}>{english ? "Your store team" : "你的店務團隊"}</p>
        <div className={styles.agentList}>
          {agents.map((agent) => {
            const available = isStoreAgentAvailable(agent.id, demoMode);
            return (
              <button
                key={agent.id}
                type="button"
                className={`${styles.agentRow} ${
                  !supportOpen && activeAgentId === agent.id ? styles.agentRowActive : ""
                } ${!available ? styles.agentRowComingSoon : ""}`}
                aria-pressed={!supportOpen && activeAgentId === agent.id}
                aria-label={`${agent.name} · ${available ? agent.stateLabel : "Coming soon"}`}
                title={sidebarCollapsed ? `${agent.name} · ${available ? agent.stateLabel : "Coming soon"}` : undefined}
                onClick={() => {
                  setActiveAgentId(agent.id);
                  setSupportOpen(false);
                }}
              >
                <AgentOrb
                  id={agent.id}
                  active={!supportOpen && activeAgentId === agent.id}
                  animated={!prefersReducedMotion && available}
                />
                <span className={styles.agentCopy}>
                  <strong>{agent.name}</strong>
                  <small>{agent.description}</small>
                </span>
                <span className={`${styles.agentState} ${available ? styles[agent.state] : styles.comingSoon}`}>
                  {available ? agent.stateLabel : "Coming soon"}
                </span>
              </button>
            );
          })}
        </div>

        <p className={styles.sectionLabel}>{english ? "Work" : "工作"}</p>
        <nav className={styles.workNav} aria-label={english ? "Work categories" : "工作分類"}>
          <button
            type="button"
            className={workView === "attention" && !supportOpen && activeAgentId === "manager" ? styles.workNavActive : ""}
            aria-current={workView === "attention" && !supportOpen && activeAgentId === "manager" ? "page" : undefined}
            onClick={() => openWorkView("attention")}
          >{english ? "Needs you" : "需要你"} <b>{waitingCount}</b></button>
          <button
            type="button"
            className={workView === "all" && !supportOpen && activeAgentId === "manager" ? styles.workNavActive : ""}
            aria-current={workView === "all" && !supportOpen && activeAgentId === "manager" ? "page" : undefined}
            onClick={() => openWorkView("all")}
          >{english ? "All work" : "全部工作"} <b>{liveReservations.length}</b></button>
          <button
            type="button"
            className={workView === "completed" && !supportOpen && activeAgentId === "manager" ? styles.workNavActive : ""}
            aria-current={workView === "completed" && !supportOpen && activeAgentId === "manager" ? "page" : undefined}
            onClick={() => openWorkView("completed")}
          >{english ? "Completed" : "完成紀錄"} <b>{completedCount}</b></button>
        </nav>

        <div className={styles.sidebarSupport}>
          <button
            type="button"
            className={`${styles.agentRow} ${supportOpen ? styles.agentRowActive : ""}`}
            aria-pressed={supportOpen}
            aria-label={english ? "Support Agent · Standing by" : "支援 Agent · 待命"}
            title={sidebarCollapsed ? (english ? "Support Agent · Standing by" : "支援 Agent · 待命") : undefined}
            onClick={() => setSupportOpen(true)}
          >
            <span className={styles.supportFace} aria-hidden="true">
              <Strobi animation="listening" playing={!prefersReducedMotion} size="100%" />
            </span>
            <span className={styles.agentCopy}>
              <strong>{english ? "Support Agent" : "支援 Agent"}</strong>
              <small>{english ? "Product help and human support" : "操作協助與真人支援"}</small>
            </span>
            <span className={`${styles.agentState} ${styles.idle}`}>{english ? "Standing by" : "待命"}</span>
          </button>
        </div>

        <button
          ref={profileButtonRef}
          type="button"
          className={styles.pharmacyStatus}
          onClick={() => setProfileOpen(true)}
          aria-label={english ? "Open account and store settings" : "開啟帳號與門市設定"}
          aria-haspopup="dialog"
        >
          <i aria-hidden="true" />
          <span><strong>{storeName}</strong><small>{operatorName} · {english ? "System connected" : "系統連線正常"}</small></span>
          <span className={styles.profileChevron} aria-hidden="true">›</span>
        </button>
      </aside>

      <section className={styles.shell}>
        <header className={styles.topbar}>
          {supportOpen ? (
            <span className={`${styles.supportFace} ${styles.smallFace}`} aria-hidden="true">
              <Strobi animation="listening" playing={!prefersReducedMotion} size="100%" />
            </span>
          ) : (
            <AgentOrb id={activeAgent.id} active small />
          )}
          <span className={styles.topbarAgent}>
            <strong>{supportOpen ? (english ? "Support Agent" : "支援 Agent") : activeAgent.name}</strong>
            <small>
              {supportOpen
                ? (english ? "Product help and human support · Connected" : "操作協助與真人支援 · 已連線")
                : `${activeAgent.description} · ${activeAgentAvailable ? activeAgent.stateLabel : "Coming soon"}`}
            </small>
          </span>
          <span className={styles.prototypeBadge}>{supportOpen ? (english ? "Support backend connected" : "支援後端已連線") : (english ? "Reservation backend connected" : "預留後端已連線")}</span>
          <span className={styles.syncTime}>{storeName}</span>
          <button
            type="button"
            role="switch"
            aria-checked={resolvedTheme === "dark"}
            className={styles.themeSwitch}
            data-theme-value={resolvedTheme}
            onClick={toggleTheme}
            aria-label={english
              ? `Using ${resolvedTheme} mode. Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode.`
              : `目前為${resolvedTheme === "dark" ? "深色" : "淺色"}介面，切換為${resolvedTheme === "dark" ? "淺色" : "深色"}介面`}
            title={english ? `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode` : (resolvedTheme === "dark" ? "切換為淺色介面" : "切換為深色介面")}
          >
            <span className={styles.themeIcon} data-active={resolvedTheme === "light" ? "true" : "false"} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="3.5" />
                <path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" />
              </svg>
            </span>
            <span className={styles.themeIcon} data-active={resolvedTheme === "dark" ? "true" : "false"} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 15.2A8.4 8.4 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" />
              </svg>
            </span>
          </button>
        </header>

        <div className={styles.contentGrid}>
          <article className={styles.workspace}>
            <SupportAgent
              animate={!prefersReducedMotion}
              active={supportOpen}
              locale={locale}
              defaultReplyEmail={operatorEmail}
            />
            {!supportOpen && (activeAgentId === "manager" ? (
              <ReservationInbox
                reservations={liveReservations}
                view={workView}
                animate={!prefersReducedMotion}
                busyCode={reservationBusyCode}
                actionError={reservationActionError}
                locale={locale}
                onAction={(code, action) => { void updateReservation(code, action); }}
              />
            ) : !activeAgentAvailable ? (
              <>
                <div className={styles.workHeading}>
                  <p>{activeAgent.id.toUpperCase()} / COMING SOON</p>
                  <h1>{english ? `${activeAgent.name} is coming soon` : `${activeAgent.name} 即將開通`}</h1>
                  <div>
                    <span>{english ? "Live stores currently use reservations and support" : "正式店家目前先使用預留單與支援功能"}</span>
                  </div>
                </div>
                <section className={styles.agentMessage} aria-live="polite">
                  <AgentOrb id={activeAgent.id} active />
                  <div>
                    <p className={styles.sender}>{activeAgent.name}</p>
                    <p>{english
                      ? "This role is currently available only in the uYao demo account. It has no access to your store data or operational permissions."
                      : "這個角色目前只在 uYao Demo 帳號展示，尚未接入你的店務資料或取得任何操作權限。"}</p>
                  </div>
                </section>
                <p className={styles.sharedWorkNotice}>
                  {english ? "Coming soon · Data sources, permissions, and pharmacist approval points will be confirmed before activation." : "Coming soon · 開通前會先確認資料來源、權限與藥師批准點。"}
                </p>
              </>
            ) : (
              <>
            <div className={styles.workHeading}>
              <p>{workItem.type} / {workItem.id}</p>
              <h1>{workItem.title}</h1>
              <div>
                <span>{workItem.pharmacy}</span>
                <span>{english ? `${workItem.sourceCount} sources` : `來源 ${workItem.sourceCount} 項`}</span>
                <span>{workItem.approvalLabel}</span>
              </div>
            </div>

            <section className={styles.agentMessage} aria-live="polite">
              <AgentOrb
                id={activeAgent.id}
                active
                animated={!prefersReducedMotion}
              />
              <div>
                <p className={styles.sender}>{activeAgent.name} <time>09:14</time></p>
                <p>{activeAgent.summary}</p>
              </div>
            </section>

            <p className={styles.sharedWorkNotice}>
              {english ? "Three roles are handing off the same work item; you don't need to copy data or ask each one separately." : "三個角色正在同一張工作上交接；你不需要複製資料或分別追問。"}
            </p>

            <section className={styles.taskGrid} aria-label={english ? "Agent progress" : "Agent 處理進度"}>
              {workItem.steps.map((step) => {
                const agent = storeAgentCopy(step.agentId, locale);
                return (
                  <article
                    key={step.agentId}
                    className={`${styles.taskCard} ${
                      activeAgentId === step.agentId ? styles.taskCardActive : ""
                    }`}
                  >
                    <header>
                      <AgentOrb id={agent.id} active={activeAgentId === agent.id} small />
                      <strong>{agent.name}</strong>
                      <span className={styles[step.state]}>{step.stateLabel}</span>
                    </header>
                    <h2>{step.label}</h2>
                    <p>{step.detail}</p>
                  </article>
                );
              })}
            </section>

            <section className={styles.approvalBar} aria-label={english ? "Awaiting approval" : "等待批准"}>
              <div>
                <strong>{english ? "The Procurement Agent is waiting for your approval" : "採購 Agent 正在等你的批准"}</strong>
                <p>{english ? "You approve a fixed draft snapshot. Any quantity or supplier change requires another confirmation." : "批准的是固定草稿快照；任何數量或供應商變更都要重新確認。"}</p>
              </div>
              <button
                ref={draftButtonRef}
                type="button"
                onClick={() => setDraftOpen(true)}
              >
                {english ? "Review draft" : "檢查草稿"}
              </button>
            </section>
              </>
            ))}

            {!supportOpen && <form className={styles.composer} data-store-composer onSubmit={submitMessage}>
              <AgentOrb id="manager" active={activeAgentId === "manager"} small />
              <label className={styles.visuallyHidden} htmlFor="store-agent-message">{english ? "Message the Manager Agent" : "交代店長"}</label>
              <span className={styles.composerField}>
                <span aria-hidden="true">{english ? "Manager Agent" : "店長 Agent"}</span>
                <input
                  id="store-agent-message"
                  value={message}
                  onChange={(event) => {
                    setMessage(event.target.value);
                    setComposerNotice("");
                    setComposerNoticeTone("answer");
                  }}
                  placeholder={activeAgentId === "manager"
                    ? (english ? "Ask about a code, or enter: Confirm A-123" : "詢問單號，或輸入：確認 A-123")
                    : activeAgentAvailable ? (english ? "Ask the Manager Agent about this demo work…" : "向店長詢問這個 Demo 工作…") : (english ? `${activeAgent.name} is coming soon` : `${activeAgent.name} 即將開通`)}
                />
              </span>
              <button type="submit" disabled={!message.trim()} aria-label={english ? "Send message" : "送出訊息"}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 19V5" />
                  <path d="m7 10 5-5 5 5" />
                </svg>
              </button>
            </form>}
            {!supportOpen && <p className={styles.composerNotice} data-tone={composerNoticeTone} aria-live="polite">{composerNotice}</p>}
          </article>

          <aside className={styles.contextPanel}>
            <h2>{supportOpen
              ? (english ? "Support connection" : "支援連線狀態")
              : activeAgentId === "manager"
              ? (english ? "Reservation connection" : "預留連線狀態")
              : activeAgentAvailable ? (english ? "Agent handoff log" : "Agent 交接紀錄") : (english ? "Agent availability" : "Agent 開通狀態")}</h2>
            <p>{supportOpen
              ? storeName
              : activeAgentId === "manager"
              ? storeName
              : activeAgentAvailable ? `${english ? "Shared WorkItem" : "共同 WorkItem"} · ${workItem.id}` : activeAgent.name}</p>
            {supportOpen ? (
              <ol>
                <li>
                  <span className={`${styles.supportFace} ${styles.smallFace}`} aria-hidden="true">
                    <Strobi animation="listening" playing={!prefersReducedMotion} size="100%" />
                  </span>
                  <div>
                    <strong>{english ? "Self-service answers connected" : "自助問答已連線"}</strong>
                    <p>{english ? "Common product questions are answered in the central conversation." : "常見操作問題會直接在中央對話區回答。"}</p>
                  </div>
                </li>
                <li>
                  <span className={`${styles.supportFace} ${styles.smallFace}`} aria-hidden="true">
                    <Strobi animation="listening" playing={!prefersReducedMotion} size="100%" />
                  </span>
                  <div>
                    <strong>{english ? "Human support tickets connected" : "真人支援單已連線"}</strong>
                    <p>{english ? "For unresolved issues, leave an email address and the uYao team will follow up." : "無法處理的問題可留下 Email，由 uYao 團隊接手。"}</p>
                  </div>
                </li>
              </ol>
            ) : activeAgentId === "manager" ? (
              <ol>
                <li>
                  <AgentOrb id="manager" small />
                  <div>
                    <strong>{english ? "Store identity verified" : "門市身份已驗證"}</strong>
                    <p>{english ? `Only reservations for ${storeName} are loaded.` : `目前只載入 ${storeName} 的預留單。`}</p>
                  </div>
                </li>
                <li>
                  <AgentOrb id="inventory" small />
                  <div>
                    <strong>{english ? "Reservation data and customer context synced" : "預留資料與需求脈絡已同步"}</strong>
                    <p>{english
                      ? `${liveReservations.length} recent reservation codes. Only customer-consented context is shown; full phone numbers and pickup links are not sent to the browser.`
                      : `${liveReservations.length} 筆近期單號；只顯示顧客同意提供的描述，完整手機與取貨連結不會送到瀏覽器。`}</p>
                  </div>
                </li>
              </ol>
            ) : !activeAgentAvailable ? (
              <ol>
                <li>
                  <AgentOrb id={activeAgent.id} small />
                  <div>
                    <strong>{english ? "Store data is not connected" : "尚未連接店務資料"}</strong>
                    <p>{english ? "This role does not read or change any live store data." : "此角色目前不讀取、不變更任何正式店家資料。"}</p>
                  </div>
                </li>
              </ol>
            ) : (
              <ol>
                {workItem.audit.map((entry) => (
                  <li key={`${entry.agentId}-${entry.at}`}>
                    <AgentOrb id={entry.agentId} small />
                    <div>
                      <strong>{entry.handoff}</strong>
                      <p>{entry.at} · {entry.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <section className={styles.authorityNote}>
              <strong>{supportOpen
                ? (english ? "Support does not read sensitive data" : "支援不會讀取敏感資料")
                : (english ? "Shared work, not unlimited permissions" : "共享工作，不共享無限權限")}</strong>
              <p>{supportOpen
                ? (english ? "Do not enter patient, prescription, full phone, or other personal health data." : "請勿輸入病患、處方、完整電話或其他個人醫療資料。")
                : (english ? "Each role sees only the tools it needs. Customer commitments, procurement, and payments retain explicit human approval points." : "每個角色只看到必要工具；對客承諾、採購與金流仍有清楚的人類批准點。")}</p>
            </section>
          </aside>
        </div>
      </section>

      {draftOpen && (
        <div className={styles.dialogBackdrop} onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeDraft();
        }}>
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="draft-title"
          >
            <header>
              <div><p>APPROVAL SNAPSHOT / DEMO</p><h2 id="draft-title">{english ? "Review procurement draft" : "檢查採購草稿"}</h2></div>
              <button ref={closeButtonRef} type="button" onClick={closeDraft} aria-label={english ? "Close draft" : "關閉草稿"}>×</button>
            </header>
            <dl>
              <div><dt>{english ? "Item" : "品項"}</dt><dd>{workItem.draft.product}</dd></div>
              <div><dt>{english ? "Suggested quantity" : "建議數量"}</dt><dd>{workItem.draft.quantity} {english ? "boxes" : "盒"}</dd></div>
              <div><dt>{english ? "Supplier" : "供應商"}</dt><dd>{workItem.draft.supplier}</dd></div>
              <div><dt>{english ? "Price ceiling" : "價格上限"}</dt><dd>{workItem.draft.priceCeiling}</dd></div>
              <div><dt>{english ? "Submission status" : "送出狀態"}</dt><dd>{english ? "Not submitted" : "尚未送出"}</dd></div>
            </dl>
            <p className={styles.dialogBoundary}>{english ? "This is an interface prototype. Supplier, payment, and order-submission APIs are not connected, so Approve and submit is unavailable." : "這是介面原型。尚未連接供應商、付款或送單 API，因此不提供「批准並送出」。"}</p>
            <button type="button" className={styles.dialogDone} onClick={closeDraft}>{english ? "Back to work" : "回到工作"}</button>
          </section>
        </div>
      )}

      {profileOpen && (
        <div className={styles.dialogBackdrop} onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeProfile();
        }}>
          <section
            className={`${styles.dialog} ${styles.profileDialog}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-title"
          >
            <header>
              <div><p>ACCOUNT / STORE</p><h2 id="profile-title">{english ? "Account and store settings" : "帳號與門市設定"}</h2></div>
              <button ref={profileCloseButtonRef} type="button" onClick={closeProfile} aria-label={english ? "Close account settings" : "關閉帳號設定"}>×</button>
            </header>
            <dl>
              <div>
                <dt>{english ? "Language" : "介面語言"}</dt>
                <dd>
                  <span className={styles.languageSelect}>
                    <select
                      value={locale}
                      onChange={(event) => changeLocale(event.target.value as Locale)}
                      aria-label={english ? "Interface language" : "介面語言"}
                    >
                      <option value="zh">繁體中文</option>
                      <option value="en">English</option>
                    </select>
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m6 8 4 4 4-4" />
                    </svg>
                  </span>
                </dd>
              </div>
              <div><dt>{english ? "Operator" : "操作者"}</dt><dd>{operatorName}</dd></div>
              <div><dt>{english ? "Sign-in email" : "登入信箱"}</dt><dd>{operatorEmail}</dd></div>
              <div>
                <dt>{english ? "Pharmacy" : "所屬藥局"}</dt>
                <dd>{storeName}<small>{storeSlug}</small></dd>
              </div>
              <div><dt>{english ? "Role" : "權限角色"}</dt><dd>{english ? STORE_ROLE_LABELS_EN[operatorRole] : STORE_ROLE_LABELS[operatorRole]}</dd></div>
              <div>
                <dt>{english ? "Support reply email" : "支援回覆信箱"}</dt>
                <dd>{operatorEmail}<small>{english ? "Pre-filled when creating a human support ticket" : "建立真人支援單時會自動帶入"}</small></dd>
              </div>
              <div>
                <dt>{english ? "Account security" : "帳號安全"}</dt>
                <dd>{english ? "Password protection enabled" : "密碼保護已啟用"}<small>{english ? "Sign-in sessions last up to 12 hours" : "登入工作階段最長 12 小時"}</small></dd>
              </div>
            </dl>
            <p className={styles.profileHelp}>{english ? "Store details currently come from activation records. Ask the Support Agent to change a name, email, store, or role." : "店家資料目前由開通資料載入。需要修改姓名、信箱、門市或權限時，請由支援 Agent 協助。"}</p>
            <div className={styles.profileActions}>
              <button type="button" onClick={closeProfile}>{english ? "Back to work" : "回到工作"}</button>
              <button type="button" className={styles.logoutButton} onClick={logout}>{english ? "Sign out" : "登出"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
