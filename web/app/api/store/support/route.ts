import { randomBytes } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { checkSupport } from "@/lib/rate-limit";
import { appendRecord } from "@/lib/record";
import { sendSupportTicketEmail } from "@/lib/support-email";
import {
  claimSupportRequest,
  completeSupportRequest,
} from "@/lib/support-idempotency";
import { sessionFromRequest } from "@/lib/store-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Dependencies {
  readSession: typeof sessionFromRequest;
  limit: typeof checkSupport;
  sendEmail: typeof sendSupportTicketEmail;
  record: typeof appendRecord;
  now: () => Date;
  ticketId: () => string;
  claim: typeof claimSupportRequest;
  complete: typeof completeSupportRequest;
}

const defaultDependencies: Dependencies = {
  readSession: sessionFromRequest,
  limit: checkSupport,
  sendEmail: sendSupportTicketEmail,
  record: appendRecord,
  now: () => new Date(),
  ticketId: () => `SUP-${randomBytes(3).toString("hex").toUpperCase()}`,
  claim: claimSupportRequest,
  complete: completeSupportRequest,
};

export async function handleCreateSupportTicket(
  request: NextRequest,
  dependencies: Dependencies = defaultDependencies,
) {
  let session;
  try {
    session = await dependencies.readSession(request);
  } catch (error) {
    console.error("[store-support] auth unavailable", String(error).slice(0, 160));
    return NextResponse.json({ error: "登入服務暫時無法使用。" }, { status: 503 });
  }
  if (!session) return NextResponse.json({ error: "請重新登入後再試。" }, { status: 401 });

  const requestId = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(requestId)) {
    return NextResponse.json({ error: "缺少有效的請求識別碼。" }, { status: 400 });
  }

  const rateLimit = await dependencies.limit(request, session.userId);
  if (!rateLimit.ok) {
    const status = rateLimit.unavailable ? 503 : 429;
    const response = NextResponse.json({
      error: rateLimit.unavailable ? "支援服務暫時無法使用，請稍後再試。" : "支援單送出太頻繁，請稍後再試。",
    }, { status });
    response.headers.set("retry-after", String(rateLimit.retryAfterSec));
    return response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請填寫問題與回覆 Email。" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "請填寫問題與回覆 Email。" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const replyEmail = typeof input.replyEmail === "string" ? input.replyEmail.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (!EMAIL_PATTERN.test(replyEmail) || replyEmail.length > 160) {
    return NextResponse.json({ error: "請輸入有效的回覆 Email。" }, { status: 400 });
  }
  if (message.length < 4 || message.length > 600) {
    return NextResponse.json({ error: "問題摘要需為 4–600 個字。" }, { status: 400 });
  }

  const ticket = {
    ticketId: dependencies.ticketId(),
    storeSlug: session.storeSlug,
    operatorName: session.displayName,
    replyEmail,
    message,
    createdAt: dependencies.now().toISOString(),
  };

  let existing;
  try {
    existing = await dependencies.claim(session.userId, requestId, ticket.ticketId);
  } catch {
    return NextResponse.json({ error: "支援服務暫時無法使用，請稍後再試。" }, { status: 503 });
  }
  if (existing?.status === "sent") {
    return NextResponse.json({ ticketId: existing.ticketId, status: "sent" }, { status: 200 });
  }
  if (existing?.status === "processing") {
    ticket.ticketId = existing.ticketId;
  }

  try {
    const result = await dependencies.sendEmail(ticket);
    if (result !== "sent") {
      return NextResponse.json({ error: "真人通知尚未設定，請稍後再試。" }, { status: 503 });
    }
  } catch (error) {
    console.error("[store-support] email delivery failed", ticket.ticketId, String(error).slice(0, 160));
    return NextResponse.json({ error: "通知未送達，尚未建立支援單，請稍後再試。" }, { status: 503 });
  }

  await dependencies.complete(session.userId, requestId, ticket.ticketId).catch((error) => {
    console.error("[store-support] receipt failed after email sent", ticket.ticketId, String(error).slice(0, 160));
  });

  const auditRecord = {
    ticketId: ticket.ticketId,
    storeSlug: ticket.storeSlug,
    createdAt: ticket.createdAt,
  };
  await dependencies.record("support", auditRecord).catch((error) => {
    console.error("[store-support] record failed after email sent", ticket.ticketId, String(error).slice(0, 160));
  });
  return NextResponse.json({ ticketId: ticket.ticketId, status: "sent" }, { status: 201 });
}

export async function POST(request: NextRequest) {
  return handleCreateSupportTicket(request);
}
