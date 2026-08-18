import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { track } from "@/lib/analytics";

/**
 * 專案的 vitest 跑在 node environment，沒有 jsdom。`track()` 只碰
 * `window.gtag` 與 `window.fbq`，所以塞一個最小的 window 就夠，
 * 不值得為了這個測試多拉一個 jsdom 依賴。
 */
const gtag = vi.fn();
const fbq = vi.fn();

function stubWindow(overrides: Record<string, unknown> = {}) {
  vi.stubGlobal("window", { gtag, fbq, ...overrides });
}

beforeEach(() => {
  vi.clearAllMocks();
  stubWindow();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("track", () => {
  it("同一個事件同時送到 GA4 與 Meta", () => {
    track("demand_recorded", { kind: "catalog_miss", area: "datong" });

    expect(gtag).toHaveBeenCalledWith("event", "demand_recorded", {
      kind: "catalog_miss",
      area: "datong",
    });
    expect(fbq).toHaveBeenCalledWith("trackCustom", "demand_recorded", {
      kind: "catalog_miss",
      area: "datong",
    });
  });

  it("被動記錄不映射到 Meta 標準事件——拿它當優化目標會買到必然落空的流量", () => {
    track("demand_recorded", { area: "datong" });

    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).not.toHaveBeenCalledWith("track", expect.anything(), expect.anything());
  });

  it("留了聯絡方式才額外送標準事件 Lead，讓自動出價有得優化", () => {
    track("notify_signup", { area: "datong" });

    expect(fbq).toHaveBeenCalledWith("trackCustom", "notify_signup", { area: "datong" });
    expect(fbq).toHaveBeenCalledWith("track", "Lead", { area: "datong" });
  });

  it("代問請求映射到 Contact", () => {
    track("concierge_request", { area: "luzhou" });

    expect(fbq).toHaveBeenCalledWith("track", "Contact", { area: "luzhou" });
  });

  it("undefined 與空字串不送出，物件不准混進參數", () => {
    track("notify_signup", {
      area: "datong",
      drug_slug: undefined,
      query: "",
      junk: { nested: true } as unknown as string,
    });

    expect(gtag).toHaveBeenCalledWith("event", "notify_signup", { area: "datong" });
  });

  it("沒載入 GA4 或 Pixel 時是純 no-op，不丟例外", () => {
    stubWindow({ gtag: undefined, fbq: undefined });

    expect(() => track("notify_signup")).not.toThrow();
  });

  it("在 server 端呼叫不丟例外", () => {
    vi.stubGlobal("window", undefined);

    expect(() => track("notify_signup")).not.toThrow();
  });

  it("量測端自己爆掉不該影響使用者流程，也不該拖累另一端", () => {
    stubWindow({
      gtag: vi.fn(() => {
        throw new Error("blocked by extension");
      }),
    });

    expect(() => track("notify_signup", { area: "datong" })).not.toThrow();
    expect(fbq).toHaveBeenCalledWith("track", "Lead", { area: "datong" });
  });
});
