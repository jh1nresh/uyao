import { describe, expect, it } from "vitest";

import { isPaidClick, normalizeAdSource, parseAdSource, sameCampaign } from "@/lib/attribution";

describe("parseAdSource", () => {
  it("抽出 UTM 與 click id，落地路徑一起帶著", () => {
    const source = parseAdSource(
      "https://shop.uyaohealth.com/drug/salonpas-ae?utm_source=ig&utm_medium=paid_social&utm_campaign=datong_w3&utm_content=b4_concierge&fbclid=ABC123",
    );

    expect(source).toEqual({
      utm_source: "ig",
      utm_medium: "paid_social",
      utm_campaign: "datong_w3",
      utm_content: "b4_concierge",
      fbclid: "ABC123",
      landing: "/drug/salonpas-ae",
    });
  });

  it("referrer 只留主機名——完整 URL 可能夾帶別站的查詢字串", () => {
    const source = parseAdSource(
      "https://shop.uyaohealth.com/app",
      "https://www.google.com/search?q=%E8%97%A5%E5%B1%80+%E8%85%B0%E7%97%9B%E8%B2%BC",
    );

    expect(source).toEqual({ referrer: "www.google.com", landing: "/app" });
  });

  it("同站導覽不算 referrer——只留落地路徑", () => {
    const source = parseAdSource("https://shop.uyaohealth.com/app", "https://shop.uyaohealth.com/search");
    expect(source).toEqual({ landing: "/app" });
    expect(isPaidClick(source)).toBe(false);
  });

  it("直接輸入網址、沒有任何可記的東西時回 null", () => {
    expect(parseAdSource("https://shop.uyaohealth.com/")).toBeNull();
  });

  it("壞掉的網址或 referrer 不丟例外", () => {
    expect(parseAdSource("not-a-url")).toBeNull();
    expect(parseAdSource("https://shop.uyaohealth.com/app", "javascript:void(0)")).toEqual({ landing: "/app" });
  });

  it("過長的值切斷，不讓單一參數灌爆紀錄", () => {
    const source = parseAdSource(`https://shop.uyaohealth.com/app?utm_campaign=${"x".repeat(500)}`);
    expect(source?.utm_campaign).toHaveLength(120);
  });
});

describe("isPaidClick", () => {
  it("有 click id 就一定是付費點擊", () => {
    expect(isPaidClick({ gclid: "xyz" })).toBe(true);
  });

  it("只有 referrer 與落地頁不算廣告", () => {
    expect(isPaidClick({ referrer: "www.google.com", landing: "/app" })).toBe(false);
    expect(isPaidClick(null)).toBe(false);
  });
});

describe("sameCampaign", () => {
  it("同一則廣告不覆蓋既有歸因", () => {
    const a = { utm_source: "ig", utm_campaign: "datong_w3", landing: "/app" };
    const b = { utm_source: "ig", utm_campaign: "datong_w3", landing: "/drug/x" };
    expect(sameCampaign(a, b)).toBe(true);
  });

  it("換了 campaign 就是新的一次點擊", () => {
    expect(sameCampaign({ utm_campaign: "datong_w3" }, { utm_campaign: "luzhou_w5" })).toBe(false);
  });
});

describe("normalizeAdSource", () => {
  it("白名單之外的 key 全部丟掉", () => {
    const source = normalizeAdSource({
      utm_source: "ig",
      contact: "0912345678",
      ip: "1.2.3.4",
      __proto__polluted: "x",
    });

    expect(source).toEqual({ utm_source: "ig" });
  });

  it("空值、非字串與空物件都收斂成 null", () => {
    expect(normalizeAdSource({ utm_source: "   ", utm_medium: 42 })).toBeNull();
    expect(normalizeAdSource({})).toBeNull();
    expect(normalizeAdSource(null)).toBeNull();
    expect(normalizeAdSource("utm_source=ig")).toBeNull();
    expect(normalizeAdSource([{ utm_source: "ig" }])).toBeNull();
  });

  it("同樣切斷過長的值", () => {
    expect(normalizeAdSource({ utm_content: "y".repeat(500) })?.utm_content).toHaveLength(120);
  });
});
