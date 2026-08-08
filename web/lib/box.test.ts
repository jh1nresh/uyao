import { beforeEach, describe, expect, it } from "vitest";

import {
  drugSlugForGtin,
  logConsole,
  recentEvents,
  recordScan,
  scanSummary,
} from "./box";
import { __resetForTests } from "./kv";

beforeEach(() => __resetForTests());

describe("drugSlugForGtin", () => {
  it("對到示範對照表", () => {
    expect(drugSlugForGtin("04712345678901")).toBe("green-oil");
  });

  it("GTIN-14 與 EAN-13 前導 0 視為同一支", () => {
    // 掃描器可能吐 13 碼（EAN）或 14 碼（DataMatrix AI 01）
    expect(drugSlugForGtin("4712345678901")).toBe("green-oil");
    expect(drugSlugForGtin("004712345678901")).toBe("green-oil");
  });

  it("目錄外回 null，不硬配", () => {
    expect(drugSlugForGtin("09999999999999")).toBeNull();
  });
});

describe("scan state", () => {
  it("記掃描 → summary 讀得回來，徽章是今日", async () => {
    await recordScan("OK藥師藥局", "green-oil");
    const rows = await scanSummary();
    expect(rows).toHaveLength(1);
    expect(rows[0].storeSlug).toBe("OK藥師藥局");
    expect(rows[0].drugSlug).toBe("green-oil");
    expect(rows[0].badge.tier).toBe("fresh");
  });

  it("同店同藥重掃是覆寫不是累積", async () => {
    await recordScan("OK藥師藥局", "green-oil");
    await recordScan("OK藥師藥局", "green-oil");
    expect(await scanSummary()).toHaveLength(1);
  });
});

describe("console feed", () => {
  it("寫進去讀出來，新到舊", async () => {
    logConsole("🧠", "第一筆");
    logConsole("🛎", "第二筆");
    // logConsole 是 fire-and-forget，等 microtask 落盤
    await new Promise((r) => setTimeout(r, 10));
    const events = await recentEvents();
    expect(events.map((e) => e.msg)).toEqual(["第二筆", "第一筆"]);
    expect(events[0].icon).toBe("🛎");
  });

  it("壞行跳過，不讓整條流水掛掉", async () => {
    logConsole("🧠", "好的");
    await new Promise((r) => setTimeout(r, 10));
    const kv = await import("./kv");
    await kv.append("console:log", "not-json{");
    const events = await recentEvents();
    expect(events).toHaveLength(1);
  });
});
