import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendSupportTicketEmail, type SupportTicketEmail } from "./support-email";

const ticket: SupportTicketEmail = {
  ticketId: "SUP-A1B2C3",
  storeSlug: "uyao-demo",
  operatorName: "Demo 店長",
  replyEmail: "store@example.com",
  message: "示範單沒有出現",
  createdAt: "2026-08-15T10:00:00.000Z",
};

describe("Store OS 支援單 email", () => {
  beforeEach(() => {
    for (const key of ["RESEND_API_KEY", "SUPPORT_EMAIL_FROM", "SUPPORT_EMAIL_TO", "PILOT_EMAIL_FROM", "PILOT_EMAIL_TO"]) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("缺少寄信設定時不呼叫外部服務", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendSupportTicketEmail(ticket)).resolves.toBe("not_configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("寄到支援信箱並把藥局信箱設為 reply-to", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.SUPPORT_EMAIL_FROM = "uYao <support@updates.uyao.tw>";
    process.env.SUPPORT_EMAIL_TO = "founder@uyao.tw";
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendSupportTicketEmail(ticket)).resolves.toBe("sent");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({ "idempotency-key": "SUP-A1B2C3" });
    expect(JSON.parse(String(init.body))).toMatchObject({
      to: ["founder@uyao.tw"],
      reply_to: "store@example.com",
      subject: "Store OS 支援單 SUP-A1B2C3",
      text: expect.stringContaining("示範單沒有出現"),
    });
  });
});
