import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendPilotApplicationEmail, type PilotApplication } from "./pilot-email";

const application: PilotApplication = {
  name: "中山藥局",
  area: "中山區",
  contact: "line-id",
  problems: ["經常缺貨", "不知道附近需求"],
  createdAt: "2026-08-10T09:30:00.000Z",
};

describe("試點申請 email", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.PILOT_EMAIL_FROM;
    delete process.env.PILOT_EMAIL_TO;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
    delete process.env.PILOT_EMAIL_FROM;
    delete process.env.PILOT_EMAIL_TO;
  });

  it("沒有寄信憑證時不把申請送到外部", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendPilotApplicationEmail(application)).resolves.toBe("not_configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("把每份申請寄到指定 Gmail", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.PILOT_EMAIL_FROM = "uYao <pilot@updates.uyao.tw>";
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendPilotApplicationEmail(application)).resolves.toBe("sent");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers).toMatchObject({ authorization: "Bearer re_test" });
    expect(JSON.parse(String(init.body))).toMatchObject({
      from: "uYao <pilot@updates.uyao.tw>",
      to: ["edwardhsieh0122@gmail.com"],
      subject: "藥局試點申請：中山藥局",
      text: expect.stringContaining("聯絡方式：line-id"),
    });
  });

  it("供應商拒絕時拋錯，讓 API 留下失敗紀錄", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.PILOT_EMAIL_FROM = "uYao <pilot@updates.uyao.tw>";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 403 })));

    await expect(sendPilotApplicationEmail(application)).rejects.toThrow(
      "Resend email failed with HTTP 403",
    );
  });

  it("清掉店名換行，避免污染郵件標題", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.PILOT_EMAIL_FROM = "uYao <pilot@updates.uyao.tw>";
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendPilotApplicationEmail({ ...application, name: "中山藥局\n第二行" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).subject).toBe("藥局試點申請：中山藥局 第二行");
  });
});
