import { beforeEach, describe, expect, it, vi } from "vitest";

import { __resetForTests } from "@/lib/kv";

const mocks = vi.hoisted(() => ({
  // 帶上簽章，否則 mock.calls 推成 []，測試裡取不到寫進去的那筆紀錄。
  appendRecord: vi.fn(async (_kind: string, _record: Record<string, unknown>) => undefined),
}));

vi.mock("@/lib/record", () => ({ appendRecord: mocks.appendRecord }));

import { POST } from "./route";

function post(body: unknown, ip: string) {
  return new Request("http://localhost/api/demand", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  __resetForTests();
  vi.clearAllMocks();
});

describe("POST /api/demand 廣告歸因", () => {
  it("把 UTM 存進需求訊號——沒有它就答不出這筆是哪則廣告帶來的", async () => {
    const response = await POST(post({
      kind: "catalog_miss",
      query: "腰痛貼的那個",
      area: "datong",
      source: {
        utm_source: "ig",
        utm_medium: "paid_social",
        utm_campaign: "datong_w3",
        utm_content: "b4_concierge",
        landing: "/app",
      },
    }, "127.0.1.1"));

    expect(response.status).toBe(200);
    expect(mocks.appendRecord).toHaveBeenCalledWith("demand", expect.objectContaining({
      kind: "catalog_miss",
      query: "腰痛貼的那個",
      source: {
        utm_source: "ig",
        utm_medium: "paid_social",
        utm_campaign: "datong_w3",
        utm_content: "b4_concierge",
        landing: "/app",
      },
    }));
  });

  it("source 是使用者可控輸入——白名單之外的欄位不准落地", async () => {
    const response = await POST(post({
      kind: "catalog_miss",
      query: "退燒藥",
      source: { utm_source: "ig", ip: "1.2.3.4", contact: "0912345678" },
    }, "127.0.1.2"));

    expect(response.status).toBe(200);
    const [, record] = mocks.appendRecord.mock.calls[0];
    expect(record.source).toEqual({ utm_source: "ig" });
  });

  it("自然流量沒有 source 欄位，不留空物件", async () => {
    const response = await POST(post({ kind: "catalog_miss", query: "退燒藥" }, "127.0.1.3"));

    expect(response.status).toBe(200);
    const [, record] = mocks.appendRecord.mock.calls[0];
    expect(record).not.toHaveProperty("source");
  });

  it("壞掉的 source 不該讓整筆需求訊號掉在地上", async () => {
    const response = await POST(post({
      kind: "catalog_miss",
      query: "退燒藥",
      source: "utm_source=ig",
    }, "127.0.1.4"));

    expect(response.status).toBe(200);
    const [, record] = mocks.appendRecord.mock.calls[0];
    expect(record.query).toBe("退燒藥");
    expect(record).not.toHaveProperty("source");
  });
});
