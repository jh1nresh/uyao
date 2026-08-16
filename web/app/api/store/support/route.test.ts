import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { handleCreateSupportTicket } from "./route";
import type { StoreSession } from "@/lib/store-auth";

const session: StoreSession = {
  version: 2,
  userId: "user-1",
  membershipId: "membership-1",
  pharmacyId: "pharmacy-1",
  displayName: "Demo 店長",
  storeSlug: "uyao-demo",
  role: "owner",
  issuedAt: 1,
  expiresAt: 9_999_999_999,
};

function request(body: unknown = { replyEmail: "store@example.com", message: "示範單沒有出現" }) {
  return new NextRequest("http://localhost/api/store/support", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": "support-request-123" },
    body: JSON.stringify(body),
  });
}

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    readSession: vi.fn().mockResolvedValue(session),
    limit: vi.fn().mockResolvedValue({ ok: true, retryAfterSec: 0 }),
    sendEmail: vi.fn().mockResolvedValue("sent"),
    record: vi.fn().mockResolvedValue(undefined),
    now: () => new Date("2026-08-15T10:00:00.000Z"),
    ticketId: () => "SUP-A1B2C3",
    claim: vi.fn().mockResolvedValue(null),
    complete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as NonNullable<Parameters<typeof handleCreateSupportTicket>[1]>;
}

describe("POST /api/store/support", () => {
  it("只有登入店家可以建立支援單", async () => {
    const response = await handleCreateSupportTicket(request(), dependencies({
      readSession: vi.fn().mockResolvedValue(null),
    }));
    expect(response.status).toBe(401);
  });

  it("信件送達後才回傳支援單號並留下紀錄", async () => {
    const deps = dependencies();
    const response = await handleCreateSupportTicket(request(), deps);
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ticketId: "SUP-A1B2C3", status: "sent" });
    expect(deps.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      storeSlug: "uyao-demo",
      operatorName: "Demo 店長",
      replyEmail: "store@example.com",
    }));
    expect(deps.record).toHaveBeenCalledWith("support", {
      ticketId: "SUP-A1B2C3",
      storeSlug: "uyao-demo",
      createdAt: "2026-08-15T10:00:00.000Z",
    });
    expect(deps.complete).toHaveBeenCalledWith("user-1", "support-request-123", "SUP-A1B2C3");
  });

  it("寄信服務沒有設定時不假裝已建立單號", async () => {
    const response = await handleCreateSupportTicket(request(), dependencies({
      sendEmail: vi.fn().mockResolvedValue("not_configured"),
    }));
    expect(response.status).toBe(503);
    expect(await response.json()).not.toHaveProperty("ticketId");
  });

  it("相同請求已完成時回同一個單號，不重複寄信", async () => {
    const deps = dependencies({
      claim: vi.fn().mockResolvedValue({ ticketId: "SUP-OLD123", status: "sent" }),
    });
    const response = await handleCreateSupportTicket(request(), deps);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ticketId: "SUP-OLD123", status: "sent" });
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it("前一個請求狀態不明時用同一個單號安全重試寄信", async () => {
    const deps = dependencies({
      claim: vi.fn().mockResolvedValue({ ticketId: "SUP-OLD123", status: "processing" }),
    });
    const response = await handleCreateSupportTicket(request(), deps);
    expect(response.status).toBe(201);
    expect(deps.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ ticketId: "SUP-OLD123" }));
    expect(deps.complete).toHaveBeenCalledWith("user-1", "support-request-123", "SUP-OLD123");
  });

  it("驗證 Email 與問題長度", async () => {
    const response = await handleCreateSupportTicket(request({ replyEmail: "bad", message: "x" }), dependencies());
    expect(response.status).toBe(400);
  });

  it("節流服務不可用時 fail closed", async () => {
    const response = await handleCreateSupportTicket(request(), dependencies({
      limit: vi.fn().mockResolvedValue({ ok: false, retryAfterSec: 60, unavailable: true }),
    }));
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("60");
  });
});
