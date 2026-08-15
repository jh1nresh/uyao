"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
} from "react";

import { BrandMark } from "@/components/BrandMark";
import { Cubee } from "@/components/avatar-lab/Cubee";
import { GrokBot } from "@/components/avatar-lab/GrokBot";
import { Nova } from "@/components/avatar-lab/Nova";
import { Strobi } from "@/components/avatar-lab/Strobi";
import {
  RESTOCK_WORK_ITEM,
  STORE_AGENTS,
  storeAgent,
  type StoreAgentId,
} from "@/lib/store-os";

import styles from "./StoreOsShell.module.css";

type ExportedAvatar = ComponentType<{
  playing?: boolean;
  size?: number | string;
  className?: string;
}>;

const AGENT_AVATARS: Record<StoreAgentId, ExportedAvatar> = {
  manager: Strobi,
  inventory: Nova,
  purchasing: GrokBot,
  checkout: Cubee,
};

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
      <i className={styles.orbHalo} />
      <Avatar
        className={styles.agentAvatar}
        playing={animated}
        size="100%"
      />
    </span>
  );
}

export function StoreOsShell() {
  const [activeAgentId, setActiveAgentId] = useState<StoreAgentId>("manager");
  const [draftOpen, setDraftOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [composerNotice, setComposerNotice] = useState("");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const draftButtonRef = useRef<HTMLButtonElement>(null);
  const activeAgent = storeAgent(activeAgentId);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
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

  function closeDraft() {
    setDraftOpen(false);
    requestAnimationFrame(() => draftButtonRef.current?.focus());
  }

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    setComposerNotice("介面原型尚未連接 Agent runtime；這則訊息沒有送出。");
  }

  return (
    <main className={styles.screen}>
      <aside className={styles.sidebar} aria-label="Store Agents">
        <div className={styles.brandRow}>
          <span className={styles.brandIdentity}>
            <BrandMark size={28} />
            <strong>uYao Store</strong>
          </span>
          <span className={styles.agentsLabel}>AGENTS</span>
        </div>

        <p className={styles.sectionLabel}>你的店務團隊</p>
        <div className={styles.agentList}>
          {STORE_AGENTS.map((agent) => (
            <button
              key={agent.id}
              type="button"
              className={`${styles.agentRow} ${
                activeAgentId === agent.id ? styles.agentRowActive : ""
              }`}
              aria-pressed={activeAgentId === agent.id}
              onClick={() => setActiveAgentId(agent.id)}
            >
              <AgentOrb
                id={agent.id}
                active={activeAgentId === agent.id}
              />
              <span className={styles.agentCopy}>
                <strong>{agent.name}</strong>
                <small>{agent.description}</small>
              </span>
              <span className={`${styles.agentState} ${styles[agent.state]}`}>
                {agent.stateLabel}
              </span>
            </button>
          ))}
        </div>

        <p className={styles.sectionLabel}>工作</p>
        <nav className={styles.workNav} aria-label="工作分類">
          <span className={styles.workNavActive}>需要你 <b>3</b></span>
          <span>全部工作 <b>12</b></span>
          <span>完成紀錄</span>
        </nav>

        <div className={styles.pharmacyStatus}>
          <i aria-hidden="true" />
          <span><strong>安康藥局</strong><small>台北市 · 系統連線正常</small></span>
        </div>
      </aside>

      <section className={styles.shell}>
        <header className={styles.topbar}>
          <AgentOrb id={activeAgent.id} active small />
          <span className={styles.topbarAgent}>
            <strong>{activeAgent.name}</strong>
            <small>{activeAgent.description} · {activeAgent.stateLabel}</small>
          </span>
          <span className={styles.prototypeBadge}>介面原型 · 示範資料</span>
          <span className={styles.syncTime}>最後同步 08:42</span>
          <button type="button" className={styles.modeButton}>店務模式</button>
          <button type="button" className={styles.moreButton} aria-label="更多選項">•••</button>
        </header>

        <div className={styles.contentGrid}>
          <article className={styles.workspace}>
            <div className={styles.workHeading}>
              <p>{RESTOCK_WORK_ITEM.type} / {RESTOCK_WORK_ITEM.id}</p>
              <h1>{RESTOCK_WORK_ITEM.title}</h1>
              <div>
                <span>{RESTOCK_WORK_ITEM.pharmacy}</span>
                <span>來源 {RESTOCK_WORK_ITEM.sourceCount} 項</span>
                <span>{RESTOCK_WORK_ITEM.approvalLabel}</span>
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
              三個角色正在同一張工作上交接；你不需要複製資料或分別追問。
            </p>

            <section className={styles.taskGrid} aria-label="Agent 處理進度">
              {RESTOCK_WORK_ITEM.steps.map((step) => {
                const agent = storeAgent(step.agentId);
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

            <section className={styles.approvalBar} aria-label="等待批准">
              <div>
                <strong>採購 Agent 正在等你的批准</strong>
                <p>批准的是固定草稿快照；任何數量或供應商變更都要重新確認。</p>
              </div>
              <button
                ref={draftButtonRef}
                type="button"
                onClick={() => setDraftOpen(true)}
              >
                檢查草稿
              </button>
            </section>

            <form className={styles.composer} onSubmit={submitMessage}>
              <AgentOrb id="manager" active={activeAgentId === "manager"} small />
              <label className={styles.visuallyHidden} htmlFor="store-agent-message">交代店長</label>
              <input
                id="store-agent-message"
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  setComposerNotice("");
                }}
                placeholder="交代店長，或直接問這張工作…"
              />
              <button type="submit" disabled={!message.trim()} aria-label="送出訊息">↑</button>
            </form>
            <p className={styles.composerNotice} aria-live="polite">{composerNotice}</p>
          </article>

          <aside className={styles.contextPanel}>
            <h2>Agent 交接紀錄</h2>
            <p>共同 WorkItem · {RESTOCK_WORK_ITEM.id}</p>
            <ol>
              {RESTOCK_WORK_ITEM.audit.map((entry) => (
                <li key={`${entry.agentId}-${entry.at}`}>
                  <AgentOrb id={entry.agentId} small />
                  <div>
                    <strong>{entry.handoff}</strong>
                    <p>{entry.at} · {entry.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <section className={styles.authorityNote}>
              <strong>共享工作，不共享無限權限</strong>
              <p>每個角色只看到必要工具；對客承諾、採購與金流仍有清楚的人類批准點。</p>
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
              <div><p>APPROVAL SNAPSHOT / DEMO</p><h2 id="draft-title">檢查採購草稿</h2></div>
              <button ref={closeButtonRef} type="button" onClick={closeDraft} aria-label="關閉草稿">×</button>
            </header>
            <dl>
              <div><dt>品項</dt><dd>{RESTOCK_WORK_ITEM.draft.product}</dd></div>
              <div><dt>建議數量</dt><dd>{RESTOCK_WORK_ITEM.draft.quantity} 盒</dd></div>
              <div><dt>供應商</dt><dd>{RESTOCK_WORK_ITEM.draft.supplier}</dd></div>
              <div><dt>價格上限</dt><dd>{RESTOCK_WORK_ITEM.draft.priceCeiling}</dd></div>
              <div><dt>送出狀態</dt><dd>尚未送出</dd></div>
            </dl>
            <p className={styles.dialogBoundary}>這是介面原型。尚未連接供應商、付款或送單 API，因此不提供「批准並送出」。</p>
            <button type="button" className={styles.dialogDone} onClick={closeDraft}>回到工作</button>
          </section>
        </div>
      )}
    </main>
  );
}
