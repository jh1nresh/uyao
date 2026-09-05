"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./CommerceAgent.module.css";
import { productShowcaseScene } from "@/lib/product-showcase";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { SearchResultLink } from "@/components/SearchResultLink";
import type {
  CommerceAgentMessage,
  CommerceAgentProgress,
  CommerceAgentReply,
  CommerceAgentScreenState,
} from "@/lib/commerce-agent";
import { localizedPath, type Locale } from "@/lib/i18n";
import {
  SHOP_SEARCH_INTAKE_STORAGE_KEY,
  createShopSearchIntakeDraft,
  readLatestShopSearchIntakeDraft,
  readShopSearchIntakeDraft,
} from "@/lib/reservation-intake";
import type { AreaSlug } from "@/lib/types";

type VisibleTurn = {
  query: string;
  reply: CommerceAgentReply;
};

type AgentStreamEvent =
  | { type: "progress"; progress: CommerceAgentProgress }
  | { type: "result"; reply: CommerceAgentReply }
  | { type: "error"; error: string };

export function CommerceAgent({
  initialQuery,
  area,
  locale,
}: {
  initialQuery: string;
  area: AreaSlug;
  locale: Locale;
}) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<VisibleTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const started = useRef(false);
  const conversation = useRef<CommerceAgentMessage[]>([]);
  const screen = useRef<CommerceAgentScreenState>({ productSlugs: [] });
  const english = locale === "en";

  function reuseSafetyAnswer(query: string): boolean {
    try {
      const raw = sessionStorage.getItem(SHOP_SEARCH_INTAKE_STORAGE_KEY);
      const exact = readShopSearchIntakeDraft(raw, query);
      if (exact) return true;
      const previous = readLatestShopSearchIntakeDraft(raw);
      if (!previous) return false;
      const next = createShopSearchIntakeDraft(
        query,
        previous.allergyStatus,
        previous.allergens,
      );
      if (!next) return false;
      sessionStorage.setItem(SHOP_SEARCH_INTAKE_STORAGE_KEY, JSON.stringify(next));
      return true;
    } catch {
      return false;
    }
  }

  async function ask(raw: string) {
    const query = raw.trim();
    if (!query || loading) return;
    if (!reuseSafetyAnswer(query)) {
      setError(english
        ? "Answer the allergy check before using uYao Agent."
        : "請先回答過敏確認，再使用 uYao Agent。");
      return;
    }

    setLoading(true);
    setError("");
    const nextConversation = [
      ...conversation.current,
      { role: "user" as const, content: query },
    ].slice(-8);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          accept: "application/x-ndjson",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messages: nextConversation,
          area,
          locale,
          screen: screen.current,
          safetyContextConfirmed: true,
        }),
      });
      let body: (CommerceAgentReply & { error?: string }) | null = null;
      if (response.ok && response.headers.get("content-type")?.includes("application/x-ndjson") && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let pending = "";
        let done = false;
        while (!done) {
          const chunk = await reader.read();
          done = chunk.done;
          pending += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !done });
          const lines = pending.split("\n");
          pending = lines.pop() ?? "";
          for (const line of lines) {
            if (!line) continue;
            const event = JSON.parse(line) as AgentStreamEvent;
            if (event.type === "progress") setProgress(event.progress.message);
            if (event.type === "result") body = event.reply;
            if (event.type === "error") throw new Error(event.error);
          }
        }
      } else {
        body = await response.json().catch(() => null) as (CommerceAgentReply & { error?: string }) | null;
      }
      if (!response.ok || !body?.kind) {
        throw new Error(body?.error || (english ? "uYao Agent is unavailable." : "uYao Agent 目前無法回覆。"));
      }
      screen.current = { productSlugs: body.products.map((product) => product.slug).slice(0, 5) };
      setTurns((current) => [...current, { query, reply: body }]);
      conversation.current = [
        ...nextConversation,
        { role: "assistant" as const, content: body.message },
      ].slice(-8);
      setQuestion("");
    } catch (reason) {
      setError(reason instanceof Error
        ? reason.message
        : english ? "uYao Agent is unavailable." : "uYao Agent 目前無法回覆。");
    } finally {
      setProgress("");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (started.current || !initialQuery) return;
    started.current = true;
    void ask(initialQuery);
    // The initial URL query is intentionally run once; later turns use the composer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <section className="flex min-h-[calc(100dvh-9rem)] flex-col" aria-live="polite">
      <div className="flex-1 space-y-8 py-7 pb-12 sm:py-10 sm:pb-16">
        {turns.map((turn, turnIndex) => (
          <article key={`${turnIndex}-${turn.query}`} className="space-y-6">
            <div className="ml-auto max-w-[82%] bg-brand-surface px-4 py-3 text-on-dark sm:max-w-[70%]">
              <p className="m-0 text-pretty text-[15px] leading-[1.65]">{turn.query}</p>
            </div>

            <div className="min-w-0 max-w-[760px]">
              <p className="mb-2 mt-0 font-mono text-[11px] font-semibold tracking-[0.08em] text-forest">
                uYao Agent
              </p>
              <p className="m-0 text-pretty text-[15px] leading-[1.75] text-ink-2">{turn.reply.message}</p>
              {turn.reply.degraded && (
                <p className="mb-0 mt-2 text-pretty text-[12px] leading-[1.55] text-muted-2">
                  {english
                    ? "This reply uses catalog matches only. You can still view sources and pharmacy contact details."
                    : "這次先以目錄比對回覆；仍可查看來源與藥局聯絡方式。"}
                </p>
              )}

                {turn.reply.products.length > 0 && (
                  <div className="mt-5 max-w-[640px] border-y border-line-strong">
                    {turn.reply.products.map((product, productIndex) => {
                      const scene = productShowcaseScene(product.slug);
                      return (
                      <SearchResultLink
                        key={product.slug}
                        href={product.href}
                        drugSlug={product.slug}
                        query={turn.query}
                        className={`${styles.product} group border-b border-line py-5 no-underline transition-colors last:border-b-0 hover:bg-paper`}
                      >
                        {scene ? <span><Image src={scene.src} alt="" width={scene.width} height={scene.height} sizes="144px" className={styles.productImage} /><span className="mt-1 block text-[11px] text-muted-2">{english ? "Illustration" : "商品示意"}</span></span> : <span className={styles.productIndex} aria-hidden>{String(productIndex + 1).padStart(2, "0")}</span>}
                        <span className="min-w-0">
                        <span className={styles.resultLabel}>{english ? "CATALOG MATCH" : "目錄品項"}</span>
                        <span className="block text-pretty text-[16px] font-bold leading-[1.5] text-ink">
                          {[product.name, product.spec].filter(Boolean).join(" ")}
                        </span>
                        <span className="mt-2 block text-pretty text-[13px] leading-[1.6] text-muted">{product.reason}</span>
                        <span className="mt-3 block text-pretty text-[11px] leading-[1.55] text-muted-2">
                          {product.source}
                        </span>
                        <span className="mt-3 inline-flex min-h-11 items-center text-[13px] font-bold text-forest">
                          {english ? "View source and pharmacy options" : "查看來源與藥局選項"}
                        </span>
                        </span>
                      </SearchResultLink>
                    );})}
                  </div>
                )}

                {turn.reply.pharmacies.length > 0 && (
                  <div className="mt-5 max-w-[640px] border-y border-line-strong">
                    {turn.reply.pharmacies.map((pharmacy) => (
                      <div key={pharmacy.slug} className="border-b border-line py-5 last:border-b-0">
                        <h2 className="m-0 text-balance text-[15px] font-bold text-ink">{pharmacy.name}</h2>
                        <p className="mb-0 mt-2 text-pretty text-[13px] leading-[1.6] text-muted">{pharmacy.address}</p>
                        <div className="mt-3 flex flex-wrap gap-x-5 text-[13px] font-bold">
                          {pharmacy.phone && <a href={`tel:${pharmacy.phone}`} className="inline-flex min-h-11 min-w-11 items-center text-forest">{english ? "Call" : "致電"}</a>}
                          <a href={pharmacy.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 min-w-11 items-center text-forest">{english ? "Map" : "地圖"}</a>
                          <Link href={pharmacy.itemHref} className="inline-flex min-h-11 min-w-11 items-center text-forest">{english ? "Item details" : "品項資料"}</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </article>
        ))}

        {loading && (
          <div className="max-w-[680px] border-y border-line py-4 text-[14px] text-muted">
            <span className="mr-3 font-mono text-[11px] font-semibold tracking-[0.08em] text-forest">uYao Agent</span>
            <span>{progress || (english ? "Checking catalog sources…" : "正在核對目錄來源…")}</span>
          </div>
        )}

        {error && (
          <div className="max-w-[680px] border-y border-oxblood/30 py-4" role="alert">
            <p className="m-0 text-pretty text-[14px] leading-[1.7] text-oxblood">
              {error}{" "}
              <Link href={localizedPath("/agent", locale)} className="font-bold text-forest">
                {english ? "Start again" : "重新開始"}
              </Link>
            </p>
          </div>
        )}
      </div>

      {turns.length === 0 && !loading && !error && (
        <p className="mb-3 max-w-[680px] text-pretty text-[13px] leading-[1.6] text-muted">
          {english
            ? "Ask in Agent for a grounded next step. To browse the photographed cabinet instead, go back to Shop."
            : "在 Agent 提問，取得有依據的下一步。若要逛拍攝藥櫃目錄，請回到找藥。"}
          {" "}
          <Link href={localizedPath("/", locale)} className="font-bold text-forest no-underline hover:underline">
            {english ? "Back to Shop" : "回到找藥"}
          </Link>
        </p>
      )}

      <div className="sticky bottom-0 bg-ivory pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2">
        <form onSubmit={submit} className="flex items-end gap-2 border-y border-line-strong bg-paper p-2 transition-colors focus-within:border-forest sm:border-x">
          <label htmlFor="uyao-agent-question" className="sr-only">
            {english ? "Ask uYao Agent" : "詢問 uYao Agent"}
          </label>
          <textarea
            id="uyao-agent-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            maxLength={600}
            placeholder={english ? "Ask uYao Agent" : "詢問 uYao Agent"}
            className="min-h-12 min-w-0 flex-1 resize-none bg-transparent px-3 py-[13px] text-[15px] leading-[1.5] text-ink outline-none placeholder:text-muted-2"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="action-primary h-12 flex-none rounded-none px-5 text-[14px] disabled:opacity-45"
          >
            {english ? "Send" : "送出"}
          </button>
        </form>
        <p className="mb-0 mt-2 px-3 text-pretty text-[12px] leading-[1.55] text-muted-2">
          {english
            ? "Do not enter names, phone numbers, National Health Insurance data, or prescription details. Allergy answers stay in this tab."
            : "請勿輸入姓名、電話、健保或處方資料。過敏回答只留在這個分頁。"}
        </p>
      </div>
    </section>
  );
}
