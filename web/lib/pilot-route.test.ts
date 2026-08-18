import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appendRecord: vi.fn(),
  checkForm: vi.fn(),
  sendPilotApplicationEmail: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({ checkForm: mocks.checkForm }));
vi.mock("@/lib/record", () => ({ appendRecord: mocks.appendRecord }));
vi.mock("@/lib/pilot-email", () => ({
  sendPilotApplicationEmail: mocks.sendPilotApplicationEmail,
}));

import { POST } from "@/app/api/pilot/route";

function request(extra: Record<string, unknown> = {}): Request {
  return new Request("http://localhost/api/pilot", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "中山藥局",
      area: "中山區",
      contact: "line-id",
      problems: ["經常缺貨"],
      ...extra,
    }),
  });
}

describe("POST /api/pilot email 通知", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkForm.mockResolvedValue({ ok: true });
    mocks.appendRecord.mockResolvedValue(undefined);
    mocks.sendPilotApplicationEmail.mockResolvedValue("sent");
  });

  it("先保存申請，再寄出 email", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.appendRecord).toHaveBeenCalledOnce();
    expect(mocks.sendPilotApplicationEmail).toHaveBeenCalledOnce();
    expect(mocks.appendRecord.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sendPilotApplicationEmail.mock.invocationCallOrder[0],
    );
  });

  it("寄信失敗時保留申請並留下 log，不要求藥局重送", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.sendPilotApplicationEmail.mockRejectedValue(new Error("provider unavailable"));

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.appendRecord).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith(
      "[pilot] 申請已保存，但 email 通知失敗",
      "Error: provider unavailable",
    );
    log.mockRestore();
  });
});

describe("POST /api/pilot 廣告歸因", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkForm.mockResolvedValue({ ok: true });
    mocks.appendRecord.mockResolvedValue(undefined);
    mocks.sendPilotApplicationEmail.mockResolvedValue("sent");
  });

  it("藥局 lead 也記得住是哪則廣告帶來的", async () => {
    await POST(request({
      source: { utm_source: "google", utm_medium: "cpc", utm_campaign: "pharmacy_b2b", gclid: "GCL123" },
    }));

    expect(mocks.appendRecord).toHaveBeenCalledWith("pilot", expect.objectContaining({
      name: "中山藥局",
      source: { utm_source: "google", utm_medium: "cpc", utm_campaign: "pharmacy_b2b", gclid: "GCL123" },
    }));
  });

  it("歸因不進通知信——收信的人不需要 utm_content", async () => {
    await POST(request({ source: { utm_source: "google" } }));

    const [application] = mocks.sendPilotApplicationEmail.mock.calls[0] as [Record<string, unknown>];
    expect(application).not.toHaveProperty("source");
  });

  it("白名單之外的欄位不准跟著 lead 落地", async () => {
    await POST(request({ source: { utm_source: "google", contact: "偷渡的聯絡方式" } }));

    const [, record] = mocks.appendRecord.mock.calls[0] as [string, Record<string, unknown>];
    expect(record.source).toEqual({ utm_source: "google" });
    expect(record.contact).toBe("line-id");
  });

  it("沒有歸因時不留空欄位", async () => {
    await POST(request());

    const [, record] = mocks.appendRecord.mock.calls[0] as [string, Record<string, unknown>];
    expect(record).not.toHaveProperty("source");
  });
});
