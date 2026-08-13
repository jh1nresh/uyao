import { beforeEach, describe, expect, it } from "vitest";

import {
  drugMatchForGtin,
  logConsole,
  recentEvents,
  recordReceivingScan,
  scanSummary,
} from "./box";
import { __resetForTests } from "./kv";
import { POST as ingestScans } from "../app/api/box/ingest/route";

beforeEach(() => __resetForTests());

describe("drugMatchForGtin", () => {
  it("對到示範對照表", () => {
    expect(drugMatchForGtin("04712345678901")).toEqual({
      drugSlug: "hugu-gaishu-100",
      demo: true,
    });
  });

  it("GTIN-14 與 EAN-13 前導 0 視為同一支", () => {
    // 掃描器可能吐 13 碼（EAN）或 14 碼（DataMatrix AI 01）
    expect(drugMatchForGtin("4712345678901")?.drugSlug).toBe("hugu-gaishu-100");
    expect(drugMatchForGtin("004712345678901")?.drugSlug).toBe("hugu-gaishu-100");
  });

  it.each([
    ["4718000681797", "top-fish-oil-60"],
    ["4710937984477", "shuwei-600-fish-oil-60"],
    ["4562298391322", "baiyi-capsule-60"],
  ])("藥局包裝條碼 %s 對到真實品項", (gtin, drugSlug) => {
    expect(drugMatchForGtin(gtin)).toEqual({ drugSlug, demo: false });
  });

  it("目錄外回 null，不硬配", () => {
    expect(drugMatchForGtin("09999999999999")).toBeNull();
  });
});

describe("scan state", () => {
  it("記掃描 → summary 讀得回來，徽章是今日", async () => {
    await recordReceivingScan("OK藥師藥局", "hugu-gaishu-100");
    const rows = await scanSummary();
    expect(rows).toHaveLength(1);
    expect(rows[0].storeSlug).toBe("OK藥師藥局");
    expect(rows[0].drugSlug).toBe("hugu-gaishu-100");
    expect(rows[0].badge.tier).toBe("fresh");
    expect(rows[0].kind).toBe("receiving");
    expect(rows[0].demo).toBe(false);
  });

  it("示範掃描保留 demo 身分", async () => {
    await recordReceivingScan("OK藥師藥局", "hugu-gaishu-100", true);
    expect((await scanSummary())[0].demo).toBe(true);
  });

  it("舊版未標 demo 的 JSON 掃描保守視為示範", async () => {
    const kv = await import("./kv");
    await kv.set(
      "scan:OK藥師藥局:green-oil",
      JSON.stringify({ at: new Date().toISOString(), kind: "receiving" }),
    );
    expect((await scanSummary())[0]).toMatchObject({
      drugSlug: "green-oil",
      demo: true,
    });
  });

  it("同店同藥重掃是覆寫不是累積", async () => {
    await recordReceivingScan("OK藥師藥局", "hugu-gaishu-100");
    await recordReceivingScan("OK藥師藥局", "hugu-gaishu-100");
    expect(await scanSummary()).toHaveLength(1);
  });

  it("假 GTIN 經 ingest 後仍標成示範掃描與示範事件", async () => {
    const response = await ingestScans(new Request("http://localhost/api/box/ingest", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.BOX_API_KEY
          ? { authorization: `Bearer ${process.env.BOX_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        device_id: "建利西藥房",
        events: [{ kind: "receiving", payload: { gtin: "04712345678901" } }],
      }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ matched: 1 });
    expect((await scanSummary())[0]).toMatchObject({
      drugSlug: "hugu-gaishu-100",
      demo: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect((await recentEvents())[0]).toMatchObject({ demo: true });
  });

  it("發元藥局的真實 GTIN 經 ingest 後不會被標成示範", async () => {
    const response = await ingestScans(new Request("http://localhost/api/box/ingest", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.BOX_API_KEY
          ? { authorization: `Bearer ${process.env.BOX_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        device_id: "發元藥局",
        events: [{ kind: "receiving", payload: { gtin: "4718000681797" } }],
      }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ matched: 1 });
    expect((await scanSummary())[0]).toMatchObject({
      storeSlug: "發元藥局",
      drugSlug: "top-fish-oil-60",
      demo: false,
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    const event = (await recentEvents())[0];
    expect(event.demo).toBeUndefined();
    expect(event.msg).not.toContain("示範");
  });
});

describe("console feed", () => {
  it("寫進去讀出來，新到舊", async () => {
    logConsole("🧠", "第一筆");
    logConsole("🛎", "第二筆", "second", { demo: true });
    // logConsole 是 fire-and-forget，等 microtask 落盤
    await new Promise((r) => setTimeout(r, 10));
    const events = await recentEvents();
    expect(events.map((e) => e.msg)).toEqual(["第二筆", "第一筆"]);
    expect(events[0].icon).toBe("🛎");
    expect(events[0].demo).toBe(true);
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
