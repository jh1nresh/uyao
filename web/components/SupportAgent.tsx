"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Strobi } from "@/components/avatar-lab/Strobi";
import type { Locale } from "@/lib/i18n";
import { answerSupportQuestion, supportFaqs } from "@/lib/support";

import styles from "./SupportAgent.module.css";

interface ChatMessage {
  id: number;
  role: "agent" | "user";
  text: string;
}

export function SupportAgent({
  animate,
  active,
  locale,
  defaultReplyEmail = "",
}: {
  animate: boolean;
  active: boolean;
  locale: Locale;
  defaultReplyEmail?: string;
}) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unresolved, setUnresolved] = useState("");
  const [replyEmail, setReplyEmail] = useState(defaultReplyEmail);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [ticketId, setTicketId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const nextMessageId = useRef(0);
  const requestId = useRef("");
  const english = locale === "en";
  const faqs = supportFaqs(locale);

  useEffect(() => {
    setQuestion("");
    setMessages([]);
    setUnresolved("");
    setError("");
    setTicketId("");
    requestId.current = "";
  }, [locale]);

  useEffect(() => {
    if (!active) return;
    inputRef.current?.focus();
  }, [active]);

  useEffect(() => {
    if (!active || messages.length === 0) return;
    const container = messagesRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: animate ? "smooth" : "auto",
    });
  }, [active, animate, messages]);

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
    const answer = answerSupportQuestion(cleaned, locale);
    if (answer) {
      append("agent", answer.answer);
    } else {
      append("agent", english
        ? "A person needs to confirm this. I won't guess; you can create a support ticket and uYao will reply by email."
        : "這個問題需要真人確認。我不會猜答案；你可以建立支援單，讓 uYao 直接用 Email 回覆。");
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
        setError(english
          ? response.status === 429
            ? "Support tickets are being submitted too quickly. Please try again later."
            : response.status === 400
              ? "Check the issue and reply email, then try again."
              : "We can't create a support ticket right now. Please try again later."
          : (result?.error || "目前無法建立支援單，請稍後再試。"));
        return;
      }
      setTicketId(result.ticketId);
      setUnresolved("");
      append("agent", english
        ? `Human support has been notified. Ticket ${result.ticketId}; we'll reply to ${replyEmail.trim()}.`
        : `已通知真人支援。單號 ${result.ticketId}，我們會回覆 ${replyEmail.trim()}。`);
    } catch {
      setError(english
        ? "The network request failed and your issue was not sent. Please try again later."
        : "網路連線失敗，問題尚未送出，請稍後再試。");
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      className={styles.panel}
      data-active={active ? "true" : "false"}
      aria-label={english ? "uYao Support" : "uYao 支援"}
      aria-hidden={!active}
    >
          {messages.length === 0 ? (
            <div className={styles.welcome}>
              <strong>{english ? "How can I help today?" : "今天需要我協助什麼？"}</strong>
              <p>{english
                ? "Choose a common question first. If there isn't an answer, I'll help turn it into a human support ticket."
                : "可以先選常見問題；找不到答案時，我會幫你整理成真人支援單。"}</p>
            </div>
          ) : (
            <div ref={messagesRef} className={styles.messages} aria-live="polite">
              {messages.map((message) => (
                <p key={message.id} data-role={message.role}>{message.text}</p>
              ))}
            </div>
          )}

          {messages.length === 0 && !unresolved && !ticketId && (
            <div className={styles.quickQuestions} aria-label={english ? "Common questions" : "常見問題"}>
              {faqs.map((faq) => (
                <button key={faq.id} type="button" onClick={() => ask(faq.question)}>
                  {faq.question}
                </button>
              ))}
            </div>
          )}

          {unresolved && (
            <form className={styles.escalation} onSubmit={submitTicket}>
              <div className={styles.escalationHeading}>
                <strong>{english ? "Create a human support ticket" : "建立真人支援單"}</strong>
                <small>{english ? "Live chat isn't available yet; a person will reply by email." : "即時聊天室尚未上線；真人會用 Email 回覆。"}</small>
              </div>
              <label htmlFor="support-reply-email">{english ? "Reply email" : "回覆 Email"}</label>
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
              <small className={styles.privacyNote}>{english ? "Do not enter patient, prescription, or full phone details." : "請勿輸入病患、處方或完整電話資料。"}</small>
              {error && <p className={styles.error} role="alert">{error}</p>}
              <div className={styles.escalationActions}>
                <button type="button" onClick={() => setUnresolved("")}>{english ? "Not now" : "先不用"}</button>
                <button type="submit" disabled={sending || !replyEmail.trim()}>
                  {sending ? (english ? "Sending…" : "通知中…") : (english ? "Contact support" : "聯絡真人")}
                </button>
              </div>
            </form>
          )}

          {ticketId && <p className={styles.ticket}>{english ? "Support ticket" : "支援單號"} <strong>{ticketId}</strong></p>}

          <form className={styles.composer} data-store-composer onSubmit={submitQuestion}>
            <span className={`${styles.avatar} ${styles.composerAvatar}`} aria-hidden="true">
              <Strobi animation="resting" playing={animate} size="100%" />
            </span>
            <label className={styles.visuallyHidden} htmlFor="support-question">{english ? "Enter a question" : "輸入問題"}</label>
            <span className={styles.composerField}>
              <span aria-hidden="true">{english ? "Support Agent" : "支援 Agent"}</span>
              <input
                ref={inputRef}
                id="support-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={english ? "For example: Why is there no new reservation?" : "例如：為什麼沒有新單？"}
                maxLength={600}
              />
            </span>
            <button type="submit" disabled={!question.trim()} aria-label={english ? "Send question" : "送出問題"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19V5" />
                <path d="m7 10 5-5 5 5" />
              </svg>
            </button>
          </form>
    </section>
  );
}
