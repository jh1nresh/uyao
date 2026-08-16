"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Strobi } from "@/components/avatar-lab/Strobi";
import { answerSupportQuestion, SUPPORT_FAQS } from "@/lib/support";

import styles from "./SupportAgent.module.css";

interface ChatMessage {
  id: number;
  role: "agent" | "user";
  text: string;
}

export function SupportAgent({
  animate,
  open,
  onOpenChange,
}: {
  animate: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unresolved, setUnresolved] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [ticketId, setTicketId] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextMessageId = useRef(0);
  const requestId = useRef("");

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  function append(role: ChatMessage["role"], text: string) {
    const id = nextMessageId.current++;
    setMessages((current) => [...current, { id, role, text }]);
  }

  function ask(value: string) {
    const cleaned = value.trim();
    if (!cleaned) return;
    setError("");
    setTicketId("");
    requestId.current = "";
    setUnresolved("");
    append("user", cleaned);
    const answer = answerSupportQuestion(cleaned);
    if (answer) {
      append("agent", answer.answer);
    } else {
      append("agent", "這個問題需要真人確認。我不會猜答案；你可以建立支援單，讓 uYao 直接用 Email 回覆。");
      setUnresolved(cleaned);
    }
    setQuestion("");
  }

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
  }

  async function submitTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!unresolved || !replyEmail.trim()) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/store/support", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": requestId.current || (requestId.current = crypto.randomUUID()),
        },
        body: JSON.stringify({ replyEmail: replyEmail.trim(), message: unresolved }),
      });
      const result = await response.json().catch(() => null) as { ticketId?: string; error?: string } | null;
      if (!response.ok || !result?.ticketId) {
        setError(result?.error || "目前無法建立支援單，請稍後再試。");
        return;
      }
      setTicketId(result.ticketId);
      setUnresolved("");
      append("agent", `已通知真人支援。單號 ${result.ticketId}，我們會回覆 ${replyEmail.trim()}。`);
    } catch {
      setError("網路連線失敗，問題尚未送出，請稍後再試。");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.support} data-open={open ? "true" : "false"}>
      {open && (
        <section className={styles.panel} aria-label="uYao 支援">
          <header className={styles.header}>
            <span className={styles.avatar} aria-hidden="true">
              <Strobi animation="listening" playing={animate} size="100%" />
            </span>
            <span>
              <strong>uYao 支援</strong>
              <small>自助回答 · 真人支援單</small>
            </span>
            <button
              type="button"
              className={styles.close}
              onClick={() => {
                onOpenChange(false);
                requestAnimationFrame(() => triggerRef.current?.focus());
              }}
              aria-label="關閉支援"
            >×</button>
          </header>

          {messages.length === 0 ? (
            <div className={styles.welcome}>
              <strong>今天需要我協助什麼？</strong>
              <p>可以先選常見問題；找不到答案時，我會幫你整理成真人支援單。</p>
            </div>
          ) : (
            <div className={styles.messages} aria-live="polite">
              {messages.map((message) => (
                <p key={message.id} data-role={message.role}>{message.text}</p>
              ))}
            </div>
          )}

          {!unresolved && !ticketId && (
            <div className={styles.quickQuestions} aria-label="常見問題">
              {SUPPORT_FAQS.map((faq) => (
                <button key={faq.id} type="button" onClick={() => ask(faq.question)}>
                  {faq.question}
                </button>
              ))}
            </div>
          )}

          {unresolved && (
            <form className={styles.escalation} onSubmit={submitTicket}>
              <div className={styles.escalationHeading}>
                <strong>建立真人支援單</strong>
                <small>即時聊天室尚未上線；真人會用 Email 回覆。</small>
              </div>
              <label htmlFor="support-reply-email">回覆 Email</label>
              <input
                id="support-reply-email"
                type="email"
                autoComplete="email"
                value={replyEmail}
                onChange={(event) => setReplyEmail(event.target.value)}
                placeholder="name@pharmacy.com"
                required
                maxLength={160}
              />
              <p className={styles.issuePreview}>{unresolved}</p>
              <small className={styles.privacyNote}>請勿輸入病患、處方或完整電話資料。</small>
              {error && <p className={styles.error} role="alert">{error}</p>}
              <div className={styles.escalationActions}>
                <button type="button" onClick={() => setUnresolved("")}>先不用</button>
                <button type="submit" disabled={sending || !replyEmail.trim()}>
                  {sending ? "通知中…" : "聯絡真人"}
                </button>
              </div>
            </form>
          )}

          {ticketId && <p className={styles.ticket}>支援單號 <strong>{ticketId}</strong></p>}

          <form className={styles.composer} onSubmit={submitQuestion}>
            <label htmlFor="support-question">輸入問題</label>
            <div>
              <input
                ref={inputRef}
                id="support-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="例如：為什麼沒有新單？"
                maxLength={600}
              />
              <button type="submit" disabled={!question.trim()} aria-label="送出問題">↑</button>
            </div>
          </form>
        </section>
      )}

      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-label={open ? "關閉 uYao 支援" : "開啟 uYao 支援"}
        onClick={() => onOpenChange(!open)}
      >
        <span className={styles.triggerAvatar} aria-hidden="true">
          <Strobi animation="listening" playing={animate} size="100%" />
        </span>
        <span>支援</span>
      </button>
    </div>
  );
}
