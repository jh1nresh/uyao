import { describe, expect, it } from "vitest";

import {
  RESERVATION_INTAKE_DRAFT_TTL_MS,
  createReservationIntakeDraft,
  parseReservationIntake,
  readReservationIntakeDraft,
} from "./reservation-intake";

describe("reservation intake consent boundary", () => {
  it("keeps an ordinary reservation free of health context", () => {
    expect(parseReservationIntake(undefined)).toEqual({ ok: true });
    expect(parseReservationIntake({ searchQuery: " ", note: "" })).toEqual({ ok: true });
  });

  it("requires explicit consent and stamps it on the server", () => {
    expect(parseReservationIntake({ searchQuery: "睡不好" })).toMatchObject({
      ok: false,
      error: expect.stringContaining("同意"),
    });
    expect(parseReservationIntake(
      { searchQuery: "  睡不好  ", note: "  最近三天   比較明顯  ", consent: true },
      () => new Date("2026-08-16T00:00:00.000Z"),
    )).toEqual({
      ok: true,
      intake: {
        source: "shop_search",
        searchQuery: "睡不好",
        note: "最近三天 比較明顯",
        consentedAt: "2026-08-16T00:00:00.000Z",
      },
    });
  });

  it("rejects oversized or malformed health context", () => {
    expect(parseReservationIntake({ note: "症".repeat(501), consent: true })).toMatchObject({ ok: false });
    expect(parseReservationIntake("睡不好")).toMatchObject({ ok: false });
  });
});

describe("shop search handoff", () => {
  it("returns only a fresh draft for the selected item", () => {
    const now = 1_000_000;
    const draft = createReservationIntakeDraft("睡不好", "item-a", now);
    expect(draft).not.toBeNull();
    const raw = JSON.stringify(draft);
    expect(readReservationIntakeDraft(raw, "item-a", now + 1000)).toEqual(draft);
    expect(readReservationIntakeDraft(raw, "item-b", now + 1000)).toBeNull();
    expect(readReservationIntakeDraft(raw, "item-a", now + RESERVATION_INTAKE_DRAFT_TTL_MS + 1)).toBeNull();
  });

  it("ignores corrupt storage instead of blocking reservation", () => {
    expect(readReservationIntakeDraft("not-json", "item-a")).toBeNull();
  });
});
