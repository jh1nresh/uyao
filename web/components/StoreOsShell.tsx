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
import {
  ApprovalCard,
  TaskRows,
  ToolTrace,
  type ApprovalQuestion,
  type StatusTone,
} from "@/components/store-os/StoreOsPrimitives";
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
  type RestockStep,
  type RestockWorkItem,
  type StoreAgentId,
} from "@/lib/store-os";
import type { StoreRole } from "@/lib/store-identity";
import type { StoreReservationSummary } from "@/lib/reservations-store";

import { reservationsForView, mergeReservationPage, isActiveReservation, type StoreWorkView } from "@/lib/store-reservation-view";
import { createReservationLoader, ReservationLoadError } from "@/lib/store-reservation-loader";

import styles from "./StoreOsShell.module.css";

type ExportedAvatar = ComponentType<{
  playing?: boolean;
  size?: number | string;
  className?: string;
}>;

type StoreTheme = "light" | "dark";
type ComposerNoticeTone = "answer" | "success" | "warning";

type PushState = "checking" | "available" | "enabling" | "enabled" | "disabling" | "denied" | "unsupported" | "unconfigured" | "error";

function applicationServerKey(value: string): Uint8Array {
  const padded = value.padEnd(value.length + (4 - value.length % 4) % 4, "=");
  const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

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

const STEP_TONES: Record<RestockStep["state"], StatusTone> = {
  completed: "done",
  organized: "done",
  approval: "wait",
};

function draftApprovalQuestions(
  draft: RestockWorkItem["draft"],
  english: boolean,
): ApprovalQuestion[] {
  return [
    {
      id: "quantity",
      question: english
        ? `How many boxes of ${draft.product} should we order?`
        : `${draft.product} 要訂幾盒？`,
      options: [
        { id: "suggested", label: english ? `${draft.quantity} boxes (suggested)` : `${draft.quantity} 盒（建議）` },
        { id: "half", label: english ? `${Math.round(draft.quantity / 2)} boxes (hold back)` : `${Math.round(draft.quantity / 2)} 盒（保守）` },
        { id: "double", label: english ? `${draft.quantity * 2} boxes (stock up)` : `${draft.quantity * 2} 盒（多備）` },
      ],
      customPlaceholder: english ? "Another quantity…" : "其他數量…",
    },
    {
      id: "supplier",
      question: english
        ? `Keep ${draft.supplier} as the supplier?`
        : `供應商維持 ${draft.supplier}？`,
      options: [
        { id: "keep", label: english ? "Keep this supplier" : "維持這家供應商" },
        { id: "compare", label: english ? "Compare another supplier first" : "先比較其他供應商" },
      ],
      customPlaceholder: english ? "Name a supplier…" : "指定供應商…",
    },
    {
      id: "ceiling",
      question: english
        ? `Is the ${draft.priceCeiling} price ceiling still right?`
        : `價格上限 ${draft.priceCeiling} 還適用嗎？`,
      options: [
        { id: "keep", label: english ? "Keep the ceiling" : "維持上限" },
        { id: "raise", label: english ? "Ask me again if it is exceeded" : "超過時再問我一次" },
      ],
    },
  ];
}

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
  reservations, view, busyCode, actionError, locale, now, onAction, onView,
  nextHistoryCursor, historyBusy, onLoadHistory, readOnly,
}: {
  reservations: StoreReservationSummary[];
  view: StoreWorkView;
  busyCode: string;
  actionError: string;
  locale: Locale;
  now: number;
  onAction: (code: string, action: StoreReservationAction) => void;
  onView: (view: StoreWorkView) => void;
  nextHistoryCursor: string | null;
  historyBusy: boolean;
  onLoadHistory: () => void;
  readOnly: boolean;
}) {
  const english = locale === "en";
  const visibleReservations = reservationsForView(reservations, view);
  const tabs: Array<[StoreWorkView, string, string]> = [
    ["attention", "待確認", "To confirm"], ["pickup", "待取貨", "Pickup"],
    ["completed", "已結束", "Closed"], ["all", "全部", "All"],
  ];
  const title = tabs.find(([id]) => id === view)!;
  return (
    <>
      <div className={styles.workHeading}>
        <p>{english ? "STORE / RESERVATIONS" : "門市工作 / 預留單"}</p>
        <h1>{english ? title[2] : title[1]}</h1>
      </div>
      <nav className={styles.reservationTabs} aria-label={english ? "Reservation status" : "預留單分類"}>
        {tabs.map(([id, zh, en]) => (
          <button key={id} type="button" aria-current={view === id ? "page" : undefined} onClick={() => onView(id)}>
            {english ? en : zh} <b>{reservationsForView(reservations, id).length}</b>
          </button>
        ))}
      </nav>
      {actionError && <p className={styles.reservationError} role="alert">{actionError}</p>}
      {busyCode && <p className={styles.operationStatus} role="status">{english ? `Updating ${busyCode}…` : `更新 ${busyCode} 中…`}</p>}
      <section key={view} className={styles.reservationList} aria-label={english ? "Store reservations" : "門市預留單"}>
        {visibleReservations.length === 0 ? (
          <div className={styles.emptyInbox}>
            <strong>{english ? `No ${title[2].toLowerCase()} reservations` : `目前沒有${title[1]}的預留單`}</strong>
            <p>{english ? "Switch tabs to check other reservations." : "可切換上方分類查看其他預留。"}</p>
          </div>
        ) : visibleReservations.map((reservation) => {
          const elapsed = now ? Math.max(0, Math.floor((now - Date.parse(reservation.createdAt)) / 60000)) : null;
          const deadline = reservation.holdExpiresAt ? Date.parse(reservation.holdExpiresAt) : NaN;
          const overdue = now > 0 && deadline <= now;
          return (
          <article className={styles.reservationCard} key={reservation.code}>
            <header>
              <span className={styles.reservationCode}>{reservation.code}</span>
              {reservation.demo && <span className={styles.reservationDemo}>{english ? "Demo" : "示範"}</span>}
              <span data-status={reservation.status}>{reservation.status === "confirmed" ? (english ? "Awaiting pickup" : "待取貨") : (english ? STATUS_LABELS_EN : STATUS_LABELS)[reservation.status]}</span>
            </header>
            <h2>{reservation.drugName}</h2>
            <p>{reservation.drugSpec} · {reservation.priceTwd === null ? (english ? "Price at counter" : "門市報價") : `NT$ ${reservation.priceTwd}`}</p>
            {reservation.status === "pending_store_confirm" && elapsed !== null && (
              <p className={styles.reservationTiming} data-urgent={elapsed >= 15}>
                {english ? `Waiting ${elapsed} min · Oldest first` : `已等待 ${elapsed} 分鐘 · 依等待時間排序`}
              </p>
            )}
            {reservation.status === "confirmed" && (
              <p className={styles.reservationTiming} data-urgent={overdue}>
                {Number.isFinite(deadline)
                  ? `${english ? "Hold until" : "保留至"} ${taipeiTime(reservation.holdExpiresAt!)}${overdue ? (english ? " · Deadline passed; verify status" : " · 已超過期限，請核對狀態") : ""}`
                  : (english ? "Hold deadline unavailable; verify in store" : "保留期限未提供，請門市核對")}
              </p>
            )}
            <div className={styles.allergySummary} data-alert={reservation.intake?.allergyStatus !== "none"}>
              <strong>{english ? "Known allergies" : "已知過敏原"}</strong>
              <p>{reservation.intake?.allergyStatus === "none" ? (english ? "No known allergies reported" : "顧客回答目前沒有已知過敏")
                : reservation.intake?.allergens ?? (english ? "Not collected; ask the customer" : "尚未收集，請向顧客確認")}</p>
            </div>
            {reservation.intake?.note && <p className={styles.customerNote}><strong>{english ? "Customer note: " : "顧客補充："}</strong>{reservation.intake.note}</p>}
            <footer>
              <span>{english ? "Phone suffix" : "手機末三碼"} <strong>{reservation.contactTail}</strong></span>
              <time dateTime={reservation.createdAt}>{taipeiTime(reservation.createdAt)}</time>
            </footer>
            {isActiveReservation(reservation) && (
              <div className={styles.reservationActions}>
                <button type="button" className={styles.reservationPrimaryAction} disabled={readOnly || Boolean(busyCode)}
                  onClick={() => onAction(reservation.code, reservation.status === "confirmed" ? "pickup" : "confirm")}>
                  {busyCode === reservation.code ? (english ? "Processing…" : "處理中…") : reservation.status === "confirmed" ? (english ? "Complete pickup" : "完成取貨") : (english ? "Confirm in stock" : "確認有貨")}
                </button>
                {reservation.status === "pending_store_confirm" && <button type="button" disabled={readOnly || Boolean(busyCode)} onClick={() => onAction(reservation.code, "reject")}>{english ? "Out of stock" : "回報無庫存"}</button>}
              </div>
            )}
            {(reservation.intake || reservation.sourceStoreName) && <details className={styles.intakeDetails}>
              <summary>{english ? "Source and sharing details" : "來源與資料說明"}</summary>
              {reservation.intake?.searchQuery && <p>{english ? "Original search: " : "原始搜尋："}{reservation.intake.searchQuery}</p>}
              {reservation.sourceStoreName && <p>{english ? "Source page: " : "來源頁："}{reservation.sourceStoreName}</p>}
              <p>{english ? "Customer-consented context for pharmacist questions and judgment; not a diagnosis or suitability claim." : "需求脈絡由顧客同意提供，僅供藥師詢問與判斷，不代表診斷或品項適用性。"}</p>
            </details>}
          </article>
          );
        })}
        {(view === "completed" || view === "all") && nextHistoryCursor && <button type="button" className={styles.loadHistory} disabled={historyBusy || Boolean(busyCode)} onClick={onLoadHistory}>
          {historyBusy ? (english ? "Loading…" : "載入中…") : (english ? "Load older records" : "載入較早紀錄")}
        </button>}
        {(view === "completed" || view === "all") && <p className={styles.historyNote}>{english ? "Recent retained records; counts reflect loaded records." : "顯示近期保留紀錄；數量以已載入資料為準。"}</p>}
      </section>
    </>
  );
}

function AgentOrb({
  id,
  active = false,
  animated = true,
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
  webPushPublicKey,
  previewMode = false,
}: {
  storeName: string;
  storeSlug: string;
  operatorName: string;
  operatorEmail: string;
  operatorRole: StoreRole;
  reservations: StoreReservationSummary[];
  demoMode: boolean;
  webPushPublicKey: string | null;
  previewMode?: boolean;
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
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [now, setNow] = useState(0);
  const [syncState, setSyncState] = useState<"checking" | "ready" | "error">("checking");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [nextHistoryCursor, setNextHistoryCursor] = useState<string | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const historyDepthRef = useRef(0);
  const mutationRef = useRef(false);
  const loaderRef = useRef<ReturnType<typeof createReservationLoader> | null>(null);
  const syncRef = useRef<() => Promise<void>>(async () => {});
  const [reservationActionError, setReservationActionError] = useState("");
  const [supportOpen, setSupportOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>("zh");
  const [pushState, setPushState] = useState<PushState>(webPushPublicKey ? "checking" : "unconfigured");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const draftButtonRef = useRef<HTMLButtonElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const profileCloseButtonRef = useRef<HTMLButtonElement>(null);
  const english = locale === "en";
  const agents = english ? STORE_AGENTS_EN : STORE_AGENTS;
  const activeAgent = storeAgentCopy(activeAgentId, locale);
  const workItem = storeWorkItemCopy(locale);
  const activeAgentAvailable = isStoreAgentAvailable(activeAgentId, demoMode);
  const draftQuestions = draftApprovalQuestions(workItem.draft, english);
  const syncLabel = previewMode ? (english ? "Preview data" : "示範資料")
    : syncState === "error" ? (english ? "Sync failed" : "同步中斷")
    : syncState === "checking" ? (english ? "Checking connection" : "正在核對連線")
    : (english ? "Reservations synced" : "預留已同步");

  async function registerStoreServiceWorker(): Promise<ServiceWorkerRegistration> {
    return navigator.serviceWorker.register("/store-sw.js", { scope: "/" });
  }

  async function syncPushSubscription(subscription: PushSubscription): Promise<boolean> {
    const response = await fetch("/api/store/push-subscriptions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });
    if (response.status === 401) {
      window.location.reload();
      return false;
    }
    return response.ok;
  }

  useEffect(() => {
    if (!webPushPublicKey) {
      setPushState("unconfigured");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushState("unsupported");
      return;
    }
    let stopped = false;
    void (async () => {
      try {
        const registration = await registerStoreServiceWorker();
        const subscription = await registration.pushManager.getSubscription();
        if (stopped) return;
        if (Notification.permission === "denied") {
          setPushState("denied");
        } else if (subscription) {
          setPushState(await syncPushSubscription(subscription) ? "enabled" : "error");
        } else {
          setPushState("available");
        }
      } catch {
        if (!stopped) setPushState("error");
      }
    })();
    return () => { stopped = true; };
  }, [webPushPublicKey]);

  async function enablePush() {
    if (!webPushPublicKey || pushState === "enabling") return;
    setPushState("enabling");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState(permission === "denied" ? "denied" : "available");
        return;
      }
      const registration = await registerStoreServiceWorker();
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(webPushPublicKey),
      });
      setPushState(await syncPushSubscription(subscription) ? "enabled" : "error");
    } catch {
      setPushState("error");
    }
  }

  async function disablePush() {
    if (pushState === "disabling") return;
    setPushState("disabling");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/store/push-subscriptions", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (response.status === 401) {
          window.location.reload();
          return;
        }
        if (!response.ok) throw new Error("unsubscribe failed");
        await subscription.unsubscribe();
      }
      setPushState("available");
    } catch {
      setPushState("error");
    }
  }

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
    setNow(Date.now());
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    if (previewMode) return;
    const loader = createReservationLoader();
    loaderRef.current = loader;
    let stopped = false;
    async function syncReservations() {
      if (stopped || mutationRef.current || document.visibilityState === "hidden") return;
      try {
        const page = await loader.load();
        if (!page || stopped) return;
        setLiveReservations((current) => historyDepthRef.current > 0
          ? mergeReservationPage(current.filter((item) => !isActiveReservation(item)), page.reservations)
          : page.reservations);
        if (historyDepthRef.current === 0) setNextHistoryCursor(page.nextHistoryCursor ?? null);
        setLastSyncedAt(Date.now());
        setSyncState("ready");
      } catch (error) {
        if (stopped) return;
        if (error instanceof ReservationLoadError && error.status === 401) {
          window.location.reload();
          return;
        }
        setSyncState("error");
      }
    }
    syncRef.current = syncReservations;
    void syncReservations();
    const timer = window.setInterval(syncReservations, 15_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void syncReservations();
      else loader.invalidate();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      loader.invalidate();
      loaderRef.current = null;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [previewMode]);

  async function loadHistory() {
    if (!nextHistoryCursor || historyBusy || mutationRef.current) return;
    setHistoryBusy(true);
    try {
      const page = await loaderRef.current?.load(`/api/store/reservations?historyCursor=${encodeURIComponent(nextHistoryCursor)}`);
      if (!page) return;
      setLiveReservations((current) => mergeReservationPage(current, page.reservations));
      setNextHistoryCursor(page.nextHistoryCursor ?? null);
      historyDepthRef.current += 1;
    } catch (error) {
      if (error instanceof ReservationLoadError && error.status === 401) window.location.reload();
      else if (error instanceof ReservationLoadError && error.status === 400) {
        historyDepthRef.current = 0;
        setNextHistoryCursor(null);
        setReservationActionError(english ? "History changed. Reloading recent records." : "歷史紀錄已變更，正在重新載入近期紀錄。");
        void syncRef.current();
      } else setReservationActionError(english ? "Couldn't load older records. Please retry." : "較早紀錄載入失敗，請重試。");
    } finally { setHistoryBusy(false); }
  }

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
    if (mutationRef.current || previewMode) return false;
    mutationRef.current = true;
    loaderRef.current?.invalidate();
    setReservationBusyCode(code);
    setReservationActionError("");
    setComposerNotice("");
    try {
      const response = await fetch("/api/store/reservations", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, action }),
        signal: AbortSignal.timeout(10_000),
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
      setLiveReservations((current) => mergeReservationPage(current, [result.reservation!]));
      const actionLabel = english
        ? action === "confirm" ? "confirmed in stock" : action === "reject" ? "reported out of stock" : "marked as picked up"
        : action === "confirm" ? "已確認有貨" : action === "reject" ? "已回報無庫存" : "已完成取貨";
      setComposerNotice(english
        ? `${code} ${actionLabel}. The customer's pickup page will update automatically.`
        : `${code} ${actionLabel}；消費者取貨頁會同步更新。`);
      setComposerNoticeTone("success");
      return true;
    } catch {
      setReservationActionError(`${code} · ${english ? "Result could not be confirmed. Refresh the status before retrying." : "尚未確認操作結果，請先重新同步狀態再重試。"}`);
      return false;
    } finally {
      mutationRef.current = false;
      setReservationBusyCode("");
      void syncRef.current();
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
            const stateLabel = agent.id === "manager" ? syncLabel : available ? agent.stateLabel : "Coming soon";
            return (
              <button
                key={agent.id}
                type="button"
                className={`${styles.agentRow} ${
                  !supportOpen && activeAgentId === agent.id ? styles.agentRowActive : ""
                } ${!available ? styles.agentRowComingSoon : ""}`}
                aria-pressed={!supportOpen && activeAgentId === agent.id}
                aria-label={`${agent.name} · ${stateLabel}`}
                title={sidebarCollapsed ? `${agent.name} · ${stateLabel}` : undefined}
                onClick={() => {
                  setActiveAgentId(agent.id);
                  setSupportOpen(false);
                }}
              >
                <AgentOrb
                  id={agent.id}
                  active={!supportOpen && activeAgentId === agent.id}
                  animated={!prefersReducedMotion}
                />
                <span className={styles.agentCopy}>
                  <strong>{agent.name}</strong>
                  <small>{agent.id === "manager" ? (english ? "Reservations and pickup" : "預留確認與取貨") : agent.description}</small>
                </span>
                <span className={`${styles.agentState} ${available ? styles[agent.state] : styles.comingSoon}`}>
                  {stateLabel}
                </span>
              </button>
            );
          })}
        </div>


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
          <span><strong>{storeName}</strong><small>{operatorName} · {syncLabel}</small></span>
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
            <AgentOrb id={activeAgent.id} active animated={!prefersReducedMotion} small />
          )}
          <span className={styles.topbarAgent}>
            <strong>{supportOpen ? (english ? "Support Agent" : "支援 Agent") : activeAgent.name}</strong>
            <small>
              {supportOpen
                ? (english ? "Product help and human support · Connected" : "操作協助與真人支援 · 已連線")
                : activeAgentId === "manager"
                  ? (english ? "Reservations and pickup" : "預留確認與取貨")
                  : `${activeAgent.description} · ${activeAgentAvailable ? activeAgent.stateLabel : "Coming soon"}`}
            </small>
          </span>
          <span className={styles.prototypeBadge}>{supportOpen ? (english ? "Support" : "支援") : syncLabel}</span>
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

        <div className={styles.contentGrid} data-reservations={!supportOpen && activeAgentId === "manager"}>
          <article className={styles.workspace}>
            <SupportAgent
              animate={!prefersReducedMotion}
              active={supportOpen}
              locale={locale}
              defaultReplyEmail={operatorEmail}
            />
            {!supportOpen && (activeAgentId === "manager" ? (
              <>
              <div className={styles.syncStatus} data-state={previewMode ? "preview" : syncState} role="status">
                <span>{syncLabel}{lastSyncedAt ? ` · ${english ? "Last success" : "最後成功"} ${taipeiTime(new Date(lastSyncedAt).toISOString())}` : ""}</span>
                {!previewMode && <button type="button" disabled={Boolean(reservationBusyCode)} onClick={() => { void syncRef.current(); }}>{english ? "Refresh" : "重新同步"}</button>}
              </div>
              {previewMode && <p className={styles.previewNotice}>{english ? "Reservation preview · reservation actions disabled" : "預留唯讀示範 · 預留操作已停用"}</p>}
              <ReservationInbox
                reservations={liveReservations}
                view={workView}
                busyCode={reservationBusyCode}
                readOnly={previewMode}
                now={now}
                onView={openWorkView}
                nextHistoryCursor={nextHistoryCursor}
                historyBusy={historyBusy}
                onLoadHistory={() => { void loadHistory(); }}
                actionError={reservationActionError}
                locale={locale}
                onAction={(code, action) => { void updateReservation(code, action); }}
              />
              </>
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
                  <AgentOrb id={activeAgent.id} active animated={!prefersReducedMotion} />
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

            <div className={styles.taskGrid}>
              <TaskRows
                label={english ? "Agent progress" : "Agent 處理進度"}
                defaultOpenId={workItem.steps.find((step) => step.state === "approval")?.agentId}
                items={workItem.steps.map((step) => {
                  const agent = storeAgentCopy(step.agentId, locale);
                  return {
                    id: step.agentId,
                    title: step.label,
                    meta: agent.name,
                    tone: STEP_TONES[step.state],
                    statusLabel: step.stateLabel,
                    detail: step.detail,
                  };
                })}
              />
            </div>

            <div className={styles.approvalSlot}>
              <ApprovalCard
                questions={draftQuestions}
                submitLabel={english ? "Send answer" : "送出回答"}
                note={english
                  ? "Answers stay in this prototype. Supplier, payment, and order-submission APIs are not connected, so nothing is sent."
                  : "回答只留在這個原型。尚未連接供應商、付款或送單 API，因此不會送出任何訂單。"}
                onSubmit={() => {
                  setComposerNoticeTone("warning");
                  setComposerNotice(english
                    ? "Recorded in the prototype. No order was sent."
                    : "已記錄在原型中，尚未送出任何訂單。");
                }}
              />
              <button
                ref={draftButtonRef}
                type="button"
                className={styles.draftLink}
                onClick={() => setDraftOpen(true)}
              >
                {english ? "Review the fixed draft" : "檢查固定草稿"}
              </button>
            </div>
              </>
            ))}

            {!supportOpen && <details className={styles.commandDisclosure} open={commandsOpen} onToggle={(event) => setCommandsOpen(event.currentTarget.open)}>
            <summary>{english ? "Advanced commands" : "進階指令"}</summary>
            <form className={styles.composer} data-store-composer onSubmit={submitMessage}>
              <AgentOrb
                id="manager"
                active={activeAgentId === "manager"}
                animated={!prefersReducedMotion}
                small
              />
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
              <button type="submit" disabled={previewMode || !message.trim()} aria-label={english ? "Send message" : "送出訊息"}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 19V5" />
                  <path d="m7 10 5-5 5 5" />
                </svg>
              </button>
            </form></details>}
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
                  <AgentOrb id="manager" animated={!prefersReducedMotion} small />
                  <div>
                    <strong>{english ? "Store identity verified" : "門市身份已驗證"}</strong>
                    <p>{english ? `Only reservations for ${storeName} are loaded.` : `目前只載入 ${storeName} 的預留單。`}</p>
                  </div>
                </li>
                <li>
                  <AgentOrb id="inventory" animated={!prefersReducedMotion} small />
                  <div>
                    <strong>{syncLabel}</strong>
                    <p>{english
                      ? `${liveReservations.length} recent reservation codes. Only customer-consented context is shown; full phone numbers and pickup links are not sent to the browser.`
                      : `${liveReservations.length} 筆近期單號；只顯示顧客同意提供的描述，完整手機與取貨連結不會送到瀏覽器。`}</p>
                  </div>
                </li>
              </ol>
            ) : !activeAgentAvailable ? (
              <ol>
                <li>
                  <AgentOrb id={activeAgent.id} animated={!prefersReducedMotion} small />
                  <div>
                    <strong>{english ? "Store data is not connected" : "尚未連接店務資料"}</strong>
                    <p>{english ? "This role does not read or change any live store data." : "此角色目前不讀取、不變更任何正式店家資料。"}</p>
                  </div>
                </li>
              </ol>
            ) : (
              <div className={styles.tracePanel}>
                <ToolTrace
                  label={english ? "Agent handoff log" : "Agent 交接紀錄"}
                  summary={english
                    ? `${workItem.audit.length} handoffs, ${workItem.steps.length} agents`
                    : `${workItem.audit.length} 次交接、${workItem.steps.length} 個角色`}
                  defaultOpen
                  items={workItem.audit.map((entry) => ({
                    id: `${entry.agentId}-${entry.at}`,
                    title: entry.handoff,
                    at: entry.at,
                    detail: entry.detail,
                    icon: <AgentOrb id={entry.agentId} animated={!prefersReducedMotion} small />,
                  }))}
                />
              </div>
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
              <div>
                <dt>{english ? "Work notifications" : "工作通知"}</dt>
                <dd>
                  <span className={styles.pushSetting}>
                    <span>
                      <strong>{english
                        ? pushState === "enabled" ? "Enabled on this device" : pushState === "denied" ? "Blocked by browser" : pushState === "unsupported" ? "Not supported" : pushState === "unconfigured" ? "Not configured" : pushState === "error" ? "Needs attention" : "Available"
                        : pushState === "enabled" ? "這台裝置已開啟" : pushState === "denied" ? "已被瀏覽器封鎖" : pushState === "unsupported" ? "此瀏覽器不支援" : pushState === "unconfigured" ? "尚未設定" : pushState === "error" ? "需要重新設定" : "可以開啟"}</strong>
                      <small>{english ? "Receive new reservation, reminder, cancellation, and expiry alerts when Store OS is closed." : "Store OS 關閉時，仍可收到新預留、催單、取消與逾期提醒。"}</small>
                    </span>
                    {pushState === "enabled" || pushState === "disabling" ? (
                      <button type="button" disabled={pushState === "disabling"} onClick={disablePush}>{english ? "Turn off" : "關閉通知"}</button>
                    ) : (
                      <button
                        type="button"
                        disabled={["checking", "enabling", "disabling", "denied", "unsupported", "unconfigured"].includes(pushState)}
                        onClick={enablePush}
                      >{pushState === "enabling" ? (english ? "Enabling…" : "開啟中…") : (english ? "Enable" : "開啟通知")}</button>
                    )}
                  </span>
                </dd>
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
