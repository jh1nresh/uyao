"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { BrandMark } from "@/components/BrandMark";
import {
  RESTOCK_WORK_ITEM,
  STORE_AGENTS,
  storeAgent,
  type StoreAgentId,
} from "@/lib/store-os";

import styles from "./StoreOsShell.module.css";

const AGENT_ORB_PATHS: Record<StoreAgentId, string> = {
  manager:
    "M20 3C30 3 37 10 37 20C37 30 30 37 20 37C10 37 3 30 3 20C3 10 10 3 20 3Z",
  inventory:
    "M18.5 3.5C29 2 37 9 37.5 18.5C38 29 31 37 21 37.5C10.5 38 3.5 31 3 21C2.5 11 9 5 18.5 3.5Z",
  purchasing:
    "M21 3C31 3 38 10 37 20C36 30 30 38 20 37C10 36 3 30 3 20C3 10 11 3 21 3Z",
  checkout:
    "M11 4H29C34 4 37 8 36 13L35 29C35 34 31 37 26 36L11 35C6 35 3 31 4 26L5 11C5 7 7 4 11 4Z",
};

interface AgentOrbEye {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  rotation: number;
}

const AGENT_ORB_EYES: Record<
  StoreAgentId,
  readonly [AgentOrbEye, AgentOrbEye]
> = {
  manager: [
    {
      x: 12.3,
      y: 13.5,
      width: 4.5,
      height: 10.8,
      rx: 2.25,
      rotation: -6,
    },
    {
      x: 23.2,
      y: 13.5,
      width: 4.5,
      height: 10.8,
      rx: 2.25,
      rotation: 6,
    },
  ],
  inventory: [
    {
      x: 12.5,
      y: 16.4,
      width: 5.4,
      height: 5.8,
      rx: 2.7,
      rotation: 8,
    },
    {
      x: 22.8,
      y: 16.4,
      width: 5.4,
      height: 5.8,
      rx: 2.7,
      rotation: -8,
    },
  ],
  purchasing: [
    { x: 13.1, y: 14.1, width: 4.2, height: 9.8, rx: 2.1, rotation: 10 },
    { x: 23.9, y: 16.1, width: 4, height: 8.3, rx: 2, rotation: -8 },
  ],
  checkout: [
    { x: 13, y: 16.3, width: 4.3, height: 8.2, rx: 2.15, rotation: -3 },
    { x: 23.5, y: 16.3, width: 4.3, height: 8.2, rx: 2.15, rotation: 3 },
  ],
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
  const eyes = AGENT_ORB_EYES[id];
  return (
    <span
      className={`${styles.agentFace} ${small ? styles.smallFace : ""}`}
      data-active={active ? "true" : "false"}
      data-agent={id}
      data-animated={animated ? "true" : "false"}
      data-state={agent.state}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" focusable="false">
        <circle className={styles.orbHalo} cx="20" cy="20" r="17.5" />
        <g className={styles.orbBodyMotion}>
          <path className={styles.orbBody} d={AGENT_ORB_PATHS[id]} />
        </g>
        <g className={styles.orbGaze}>
          <g className={styles.orbBlink}>
            {eyes.map((eye, index) => {
              const centerX = eye.x + eye.width / 2;
              const centerY = eye.y + eye.height / 2;
              return (
                <rect
                  key={index}
                  className={styles.orbEye}
                  x={eye.x}
                  y={eye.y}
                  width={eye.width}
                  height={eye.height}
                  rx={eye.rx}
                  transform={`rotate(${eye.rotation} ${centerX} ${centerY})`}
                />
              );
            })}
          </g>
        </g>
      </svg>
    </span>
  );
}

export function StoreOsShell() {
  const [activeAgentId, setActiveAgentId] = useState<StoreAgentId>("manager");
  const [draftOpen, setDraftOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [composerNotice, setComposerNotice] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const draftButtonRef = useRef<HTMLButtonElement>(null);
  const activeAgent = storeAgent(activeAgentId);

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
              <AgentOrb id={activeAgent.id} active animated />
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
