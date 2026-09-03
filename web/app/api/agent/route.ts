import { NextResponse } from "next/server";

import {
  answerCommerceAgent,
  parseCommerceAgentMessages,
  parseCommerceAgentScreenState,
  type CommerceAgentInput,
  type CommerceAgentProgress,
} from "@/lib/commerce-agent";
import { AREAS } from "@/lib/data";
import { checkCommerceAgent } from "@/lib/rate-limit";
import type { AreaSlug } from "@/lib/types";

export const runtime = "nodejs";

type Body = {
  messages?: unknown;
  area?: unknown;
  locale?: unknown;
  safetyContextConfirmed?: unknown;
  screen?: unknown;
};

function streamReply(input: CommerceAgentInput): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (event: object) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      const progress = (value: CommerceAgentProgress) => write({ type: "progress", progress: value });
      void answerCommerceAgent(input, undefined, progress)
        .then((reply) => write({ type: "result", reply }))
        .catch(() => write({ type: "error", error: "uYao Agent 目前無法回覆。" }))
        .finally(() => controller.close());
    },
  });
  return new Response(stream, {
    headers: {
      "cache-control": "private, no-store",
      "content-type": "application/x-ndjson; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const rate = await checkCommerceAgent(request);
  if (!rate.ok) {
    return NextResponse.json(
      { error: rate.unavailable ? "uYao Agent 暫時無法安全啟動，請稍後再試。" : "問得太快了，請稍後再試。" },
      { status: rate.unavailable ? 503 : 429, headers: { "retry-after": String(rate.retryAfterSec) } },
    );
  }

  let body: Body;
  try {
    body = await request.json() as Body;
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }

  const messages = parseCommerceAgentMessages(body.messages);
  const screen = parseCommerceAgentScreenState(body.screen);
  const area = typeof body.area === "string" && AREAS.some((item) => item.slug === body.area)
    ? body.area as AreaSlug
    : null;
  const locale = body.locale === "en" ? "en" : body.locale === "zh" ? "zh" : null;
  if (!messages || !area || !locale || (body.screen !== undefined && !screen)) {
    return NextResponse.json({ error: "請提供有效的問題、地區與語言。" }, { status: 422 });
  }

  // 過敏回答仍只在 browser sessionStorage，絕不送進 model request。這個布林值
  // 只證明 UI gate 已完成；真正預留時，reservation route 會重新驗證答案與同意。
  if (body.safetyContextConfirmed !== true) {
    return NextResponse.json({ error: "請先回答是否有已知過敏。" }, { status: 428 });
  }

  const input: CommerceAgentInput = { messages, area, locale, ...(screen ? { screen } : {}) };
  if (request.headers.get("accept")?.includes("application/x-ndjson")) {
    return streamReply(input);
  }

  const reply = await answerCommerceAgent(input);
  return NextResponse.json(reply, {
    headers: { "cache-control": "private, no-store" },
  });
}
