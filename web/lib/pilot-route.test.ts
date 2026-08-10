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

function request(): Request {
  return new Request("http://localhost/api/pilot", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "中山藥局",
      area: "中山區",
      contact: "line-id",
      problems: ["經常缺貨"],
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
