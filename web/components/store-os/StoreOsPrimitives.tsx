"use client";

import { useId, useState, type ReactNode } from "react";

import styles from "./StoreOsPrimitives.module.css";

export type StatusTone = "done" | "wait" | "run" | "fail" | "idle";

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const DotIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="12" r="5" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const SparkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
  </svg>
);

function StatusGlyph({ tone }: { tone: StatusTone }) {
  if (tone === "done") return <CheckIcon />;
  if (tone === "wait") return <ClockIcon />;
  return <DotIcon />;
}

/** Collapsible region driven by grid-template-rows so no height is measured. */
function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className={styles.collapse} data-open={open ? "true" : "false"}>
      <div>{children}</div>
    </div>
  );
}

export interface TaskRowItem {
  id: string;
  title: string;
  meta?: string;
  tone: StatusTone;
  statusLabel: string;
  detail: string;
  facts?: readonly { label: string; value: string }[];
}

/**
 * Task Rows: one collapsible pill per agent step. Collapsed it reads as a
 * status line; expanded it threads the step's evidence under the status dot.
 */
export function TaskRows({
  items,
  label,
  defaultOpenId,
}: {
  items: readonly TaskRowItem[];
  label: string;
  defaultOpenId?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null);
  return (
    <section className={styles.taskRows} aria-label={label}>
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <article key={item.id} className={styles.row} data-open={open ? "true" : "false"}>
            <button
              type="button"
              className={styles.rowHeader}
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : item.id)}
            >
              <span className={styles.statusDot} data-tone={item.tone} aria-hidden="true">
                <StatusGlyph tone={item.tone} />
              </span>
              <span className={styles.rowTitle}>{item.title}</span>
              {item.meta && <span className={styles.rowMeta}>{item.meta}</span>}
              <span className={styles.chip} data-tone={item.tone}>{item.statusLabel}</span>
              <span className={styles.chevron} aria-hidden="true"><ChevronIcon /></span>
            </button>
            <Collapse open={open}>
              <div className={styles.rowBody}>
                <span className={styles.rail} aria-hidden="true" />
                <div className={styles.rowDetail}>
                  <p style={{ margin: 0 }}>{item.detail}</p>
                  {item.facts?.map((fact) => (
                    <div key={fact.label}>
                      <span>{fact.label}</span>
                      <b>{fact.value}</b>
                    </div>
                  ))}
                </div>
              </div>
            </Collapse>
          </article>
        );
      })}
    </section>
  );
}

export interface TraceItem {
  id: string;
  title: string;
  at?: string;
  detail?: string;
  icon?: ReactNode;
}

/**
 * Tool Chips: a one-line summary that expands into the compact call trace.
 * Collapsed by default so the handoff log does not compete with the work item.
 */
export function ToolTrace({
  items,
  summary,
  label,
  defaultOpen = false,
}: {
  items: readonly TraceItem[];
  summary: string;
  label: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const regionId = useId();
  return (
    <section aria-label={label}>
      <button
        type="button"
        className={styles.traceToggle}
        data-open={open ? "true" : "false"}
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronIcon />
        <span>{summary}</span>
      </button>
      <div id={regionId}>
        <Collapse open={open}>
          <div className={styles.traceList}>
            {items.map((item) => (
              <div key={item.id}>
                <div className={styles.toolChip}>
                  <span aria-hidden="true">{item.icon}</span>
                  <strong>{item.title}</strong>
                  {item.at && <time>{item.at}</time>}
                </div>
                {item.detail && <p className={styles.toolChipDetail}>{item.detail}</p>}
              </div>
            ))}
          </div>
        </Collapse>
      </div>
    </section>
  );
}

export interface ThinkingStep {
  id: string;
  label: string;
  state: "done" | "active" | "pending";
}

/**
 * Thinking: in-flight agent trace. Built for the LLM work that is not wired
 * yet — pass `steps` as they stream in, or render it bare for a single beat.
 */
export function Thinking({
  label,
  steps = [],
}: {
  label: string;
  steps?: readonly ThinkingStep[];
}) {
  return (
    <div className={styles.thinking} role="status" aria-live="polite">
      <span className={styles.thinkingHead}>
        <span className={styles.spark} aria-hidden="true"><SparkIcon /></span>
        <span className={styles.thinkingLabel}>{label}</span>
      </span>
      {steps.length > 0 && (
        <div className={styles.thinkingSteps}>
          {steps.map((step) => (
            <span key={step.id} className={styles.thinkingStep} data-state={step.state}>
              <span aria-hidden="true">
                {step.state === "done" ? <CheckIcon /> : <DotIcon />}
              </span>
              {step.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export interface ApprovalOption {
  id: string;
  label: string;
}

export interface ApprovalQuestion {
  id: string;
  question: string;
  options: readonly ApprovalOption[];
  customPlaceholder?: string;
}

/**
 * Approval Card: the human-in-the-loop question an agent asks before acting.
 * Answers are collected per question and handed back on submit; the card never
 * performs the action itself.
 */
export function ApprovalCard({
  questions,
  note,
  submitLabel,
  onDismiss,
  onSubmit,
  disabled = false,
}: {
  questions: readonly ApprovalQuestion[];
  note?: string;
  submitLabel: string;
  onDismiss?: () => void;
  onSubmit?: (answers: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState<Record<string, string>>({});
  const active = questions[index];
  if (!active) return null;

  const answer = answers[active.id] ?? "";
  const customValue = custom[active.id] ?? "";
  const answered = Boolean(answer) || Boolean(customValue.trim());
  const last = index === questions.length - 1;

  const choose = (optionId: string) => {
    setAnswers((current) => ({ ...current, [active.id]: optionId }));
    setCustom((current) => ({ ...current, [active.id]: "" }));
  };

  const advance = () => {
    const resolved = customValue.trim() || answer;
    const next = { ...answers, [active.id]: resolved };
    setAnswers(next);
    if (last) onSubmit?.(next);
    else setIndex(index + 1);
  };

  return (
    <section className={styles.card} aria-label={active.question}>
      <div className={styles.cardPad}>
        <div className={styles.cardHead}>
          <span>{active.question}</span>
          {onDismiss && (
            <button type="button" className={styles.iconButton} onClick={onDismiss} aria-label="Dismiss">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className={styles.options}>
          {active.options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={styles.option}
              aria-pressed={answer === option.id && !customValue.trim()}
              onClick={() => choose(option.id)}
            >
              <span className={styles.radio} aria-hidden="true"><i /></span>
              <span>{option.label}</span>
            </button>
          ))}
          {active.customPlaceholder && (
            <label className={styles.customOption}>
              <span aria-hidden="true" />
              <input
                value={customValue}
                placeholder={active.customPlaceholder}
                aria-label={active.customPlaceholder}
                onChange={(event) => {
                  const value = event.target.value;
                  setCustom((current) => ({ ...current, [active.id]: value }));
                  if (value) setAnswers((current) => ({ ...current, [active.id]: "" }));
                }}
              />
            </label>
          )}
        </div>
      </div>
      <div className={styles.cardFooter}>
        <span className={styles.pager}>
          <button
            type="button"
            className={styles.iconButton}
            disabled={index === 0}
            aria-label="Previous question"
            onClick={() => setIndex(Math.max(0, index - 1))}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className={styles.dots}>
            {questions.map((question, dot) => (
              <button
                key={question.id}
                type="button"
                aria-current={dot === index ? "step" : undefined}
                aria-label={`Question ${dot + 1}`}
                onClick={() => setIndex(dot)}
              />
            ))}
          </span>
          <button
            type="button"
            className={styles.iconButton}
            disabled={last}
            aria-label="Next question"
            onClick={() => setIndex(Math.min(questions.length - 1, index + 1))}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </span>
        <button
          type="button"
          className={styles.submit}
          disabled={disabled || !answered}
          aria-label={submitLabel}
          title={submitLabel}
          onClick={advance}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>
      {note && <p className={styles.cardNote}>{note}</p>}
    </section>
  );
}
