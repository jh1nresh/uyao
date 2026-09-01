import { beforeEach, describe, expect, it } from "vitest";

import { __resetForTests } from "./kv";
import {
  actionableLotCount,
  alertDays,
  assessLot,
  lotsForStore,
  normalizeBatch,
  parseExpiry,
  recordLot,
  returnWindowDays,
  type LotRecord,
} from "./lots";

const NOW = new Date("2026-08-25T00:00:00Z");

function lot(overrides: Partial<LotRecord> = {}): LotRecord {
  return {
    storeSlug: "zhongshan",
    drugSlug: "hugu-gaishu-100",
    batch: "TW881",
    expiry: "2027-06-01",
    firstSeenAt: NOW.toISOString(),
    lastSeenAt: NOW.toISOString(),
    demo: false,
    ...overrides,
  };
}

describe("parseExpiry", () => {
  it("accepts ISO dates from the Python parser", () => {
    expect(parseExpiry("2027-06-01")).toBe("2027-06-01");
  });

  it("rejects non-existent calendar dates instead of rolling them forward", () => {
    // Date.parse("2026-02-31") silently becomes 2026-03-03 — an expiry that
    // slides two days later would quietly move a return window.
    expect(parseExpiry("2026-02-31")).toBeNull();
  });

  it("rejects malformed and non-string input", () => {
    expect(parseExpiry("27-06-01")).toBeNull();
    expect(parseExpiry("2027/06/01")).toBeNull();
    expect(parseExpiry(null)).toBeNull();
    expect(parseExpiry(20270601)).toBeNull();
  });
});

describe("normalizeBatch", () => {
  it("keeps GS1 AI 10 style batch codes", () => {
    expect(normalizeBatch(" TW881 ")).toBe("TW881");
    expect(normalizeBatch("A1B2-C3")).toBe("A1B2-C3");
  });

  it("rejects values that would corrupt the KV key or exceed AI 10 length", () => {
    expect(normalizeBatch("has:colon")).toBeNull();
    expect(normalizeBatch("x".repeat(21))).toBeNull();
    expect(normalizeBatch("")).toBeNull();
    expect(normalizeBatch(123)).toBeNull();
  });
});

describe("assessLot", () => {
  it("flags a lot whose return window is closing", () => {
    // window closes 180 days before expiry; put that ~30 days out
    const expiry = "2027-02-25"; // 184 days after NOW
    const a = assessLot(lot({ expiry }), NOW);
    expect(a.status).toBe("closing");
    expect(a.needsAction).toBe(true);
    expect(a.daysUntilWindowCloses).toBeLessThanOrEqual(alertDays());
    expect(a.daysUntilWindowCloses).toBeGreaterThanOrEqual(0);
  });

  it("leaves a distant lot alone", () => {
    const a = assessLot(lot({ expiry: "2029-01-01" }), NOW);
    expect(a.status).toBe("open");
    expect(a.needsAction).toBe(false);
  });

  it("does not ask for action once the window already closed", () => {
    // expiry soon => return window closed long ago; nothing to approve
    const a = assessLot(lot({ expiry: "2026-10-01" }), NOW);
    expect(a.status).toBe("window_closed");
    expect(a.needsAction).toBe(false);
  });

  it("marks expired lots without asking for a return decision", () => {
    const a = assessLot(lot({ expiry: "2026-01-01" }), NOW);
    expect(a.status).toBe("expired");
    expect(a.needsAction).toBe(false);
    expect(a.daysUntilExpiry).toBeLessThan(0);
  });

  it("computes the return window close date from the configured window", () => {
    const a = assessLot(lot({ expiry: "2027-06-01" }), NOW);
    const expected = new Date(
      Date.parse("2027-06-01T00:00:00Z") - returnWindowDays() * 86_400_000,
    )
      .toISOString()
      .slice(0, 10);
    expect(a.returnWindowClosesAt).toBe(expected);
  });

  it("is stable across times of day on the same date", () => {
    const morning = assessLot(lot(), new Date("2026-08-25T01:00:00Z"));
    const evening = assessLot(lot(), new Date("2026-08-25T23:00:00Z"));
    expect(morning.daysUntilWindowCloses).toBe(evening.daysUntilWindowCloses);
  });
});

describe("recordLot", () => {
  beforeEach(() => {
    __resetForTests();
  });

  it("records a new lot and preserves firstSeenAt on rescan", async () => {
    const first = await recordLot({
      storeSlug: "zhongshan",
      drugSlug: "hugu-gaishu-100",
      batch: "TW881",
      expiry: "2027-06-01",
      demo: false,
      at: "2026-08-01T00:00:00.000Z",
    });
    expect(first.isNew).toBe(true);

    const second = await recordLot({
      storeSlug: "zhongshan",
      drugSlug: "hugu-gaishu-100",
      batch: "TW881",
      expiry: "2027-06-01",
      demo: false,
      at: "2026-08-25T00:00:00.000Z",
    });
    expect(second.isNew).toBe(false);
    expect(second.record.firstSeenAt).toBe("2026-08-01T00:00:00.000Z");
    expect(second.record.lastSeenAt).toBe("2026-08-25T00:00:00.000Z");
    expect(second.expiryConflict).toBeNull();
  });

  it("surfaces a conflicting expiry rather than overwriting silently", async () => {
    await recordLot({
      storeSlug: "zhongshan",
      drugSlug: "hugu-gaishu-100",
      batch: "TW881",
      expiry: "2027-06-01",
      demo: false,
    });
    const conflict = await recordLot({
      storeSlug: "zhongshan",
      drugSlug: "hugu-gaishu-100",
      batch: "TW881",
      expiry: "2027-09-01",
      demo: false,
    });
    expect(conflict.expiryConflict).toBe("2027-06-01");
    expect(conflict.record.expiry).toBe("2027-09-01");
  });

  it("keeps lots from different stores separate", async () => {
    await recordLot({
      storeSlug: "zhongshan",
      drugSlug: "hugu-gaishu-100",
      batch: "TW881",
      expiry: "2027-06-01",
      demo: false,
    });
    await recordLot({
      storeSlug: "meidexin",
      drugSlug: "hugu-gaishu-100",
      batch: "TW881",
      expiry: "2027-06-01",
      demo: false,
    });
    expect(await lotsForStore("zhongshan", NOW)).toHaveLength(1);
    expect(await lotsForStore("meidexin", NOW)).toHaveLength(1);
  });

  it("sorts the most urgent lot first", async () => {
    await recordLot({
      storeSlug: "zhongshan",
      drugSlug: "a",
      batch: "FAR",
      expiry: "2029-01-01",
      demo: false,
    });
    await recordLot({
      storeSlug: "zhongshan",
      drugSlug: "b",
      batch: "NEAR",
      expiry: "2027-02-25",
      demo: false,
    });
    const lots = await lotsForStore("zhongshan", NOW);
    expect(lots[0].batch).toBe("NEAR");
  });
});

describe("actionableLotCount", () => {
  beforeEach(() => {
    __resetForTests();
  });

  it("counts only real lots that need a decision", async () => {
    // real + closing => counted
    await recordLot({
      storeSlug: "zhongshan",
      drugSlug: "real",
      batch: "R1",
      expiry: "2027-02-25",
      demo: false,
    });
    // demo + closing => must not light the physical lamp
    await recordLot({
      storeSlug: "zhongshan",
      drugSlug: "demo",
      batch: "D1",
      expiry: "2027-02-25",
      demo: true,
    });
    // real but far away => not actionable
    await recordLot({
      storeSlug: "zhongshan",
      drugSlug: "far",
      batch: "F1",
      expiry: "2029-01-01",
      demo: false,
    });
    expect(await actionableLotCount("zhongshan", NOW)).toBe(1);
  });

  it("is zero for a store with no lots", async () => {
    expect(await actionableLotCount("empty", NOW)).toBe(0);
  });
});
