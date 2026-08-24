import { describe, expect, it } from "vitest";

import {
  RESERVATION_INTAKE_DRAFT_TTL_MS,
  createReservationIntakeDraft,
  createShopSearchIntakeDraft,
  parseReservationIntake,
  readReservationIntakeDraft,
  readShopSearchIntakeDraft,
} from "./reservation-intake";

describe("reservation intake consent boundary", () => {
  it("requires an explicit allergy answer on every reservation", () => {
    expect(parseReservationIntake(undefined)).toMatchObject({ ok: false, error: expect.stringContaining("過敏") });
    expect(parseReservationIntake({ consent: true })).toMatchObject({ ok: false, error: expect.stringContaining("過敏") });
    expect(parseReservationIntake({ allergyStatus: "none", consent: true })).toEqual({
      ok: true,
      intake: {
        source: "allergen_check",
        allergyStatus: "none",
        consentedAt: expect.any(String),
      },
    });
  });

  it("requires named allergens when the customer reports allergies", () => {
    expect(parseReservationIntake({ allergyStatus: "has_allergies", consent: true })).toMatchObject({
      ok: false,
      error: expect.stringContaining("過敏原"),
    });
    expect(parseReservationIntake(
      { allergyStatus: "has_allergies", allergens: "  青黴素、花生  ", consent: true },
      () => new Date("2026-08-16T00:00:00.000Z"),
    )).toEqual({
      ok: true,
      intake: {
        source: "allergen_check",
        allergyStatus: "has_allergies",
        allergens: "青黴素、花生",
        consentedAt: "2026-08-16T00:00:00.000Z",
      },
    });
  });

  it("requires explicit consent and stamps it on the server", () => {
    expect(parseReservationIntake({ allergyStatus: "none", searchQuery: "睡不好" })).toMatchObject({
      ok: false,
      error: expect.stringContaining("同意"),
    });
    expect(parseReservationIntake(
      { allergyStatus: "none", searchQuery: "  睡不好  ", note: "  最近三天   比較明顯  ", consent: true },
      () => new Date("2026-08-16T00:00:00.000Z"),
    )).toEqual({
      ok: true,
      intake: {
        source: "shop_search",
        allergyStatus: "none",
        searchQuery: "睡不好",
        note: "最近三天 比較明顯",
        consentedAt: "2026-08-16T00:00:00.000Z",
      },
    });
  });

  it("rejects oversized or malformed health context", () => {
    expect(parseReservationIntake({ allergyStatus: "none", note: "症".repeat(501), consent: true })).toMatchObject({ ok: false });
    expect(parseReservationIntake({ allergyStatus: "has_allergies", allergens: "敏".repeat(201), consent: true })).toMatchObject({ ok: false });
    expect(parseReservationIntake("睡不好")).toMatchObject({ ok: false });
  });
});

describe("shop search handoff", () => {
  it("keeps the required allergy answer with the matching search", () => {
    const now = 1_000_000;
    const searchDraft = createShopSearchIntakeDraft("  補鈣  ", "has_allergies", "  花生  ", now);
    expect(searchDraft).toEqual({
      searchQuery: "補鈣",
      allergyStatus: "has_allergies",
      allergens: "花生",
      capturedAt: now,
    });
    const raw = JSON.stringify(searchDraft);
    expect(readShopSearchIntakeDraft(raw, "補鈣", now + 1000)).toEqual(searchDraft);
    expect(readShopSearchIntakeDraft(raw, "睡不好", now + 1000)).toBeNull();
    expect(readShopSearchIntakeDraft(raw, "補鈣", now + RESERVATION_INTAKE_DRAFT_TTL_MS + 1)).toBeNull();
  });

  it("returns only a fresh draft for the selected item", () => {
    const now = 1_000_000;
    const draft = createReservationIntakeDraft(
      "睡不好",
      "item-a",
      now,
      { allergyStatus: "has_allergies", allergens: "青黴素" },
    );
    expect(draft).not.toBeNull();
    const raw = JSON.stringify(draft);
    expect(readReservationIntakeDraft(raw, "item-a", now + 1000)).toEqual(draft);
    expect(readReservationIntakeDraft(raw, "item-b", now + 1000)).toBeNull();
    expect(readReservationIntakeDraft(raw, "item-a", now + RESERVATION_INTAKE_DRAFT_TTL_MS + 1)).toBeNull();
  });

  it("ignores corrupt storage instead of blocking reservation", () => {
    expect(readReservationIntakeDraft("not-json", "item-a")).toBeNull();
    expect(readShopSearchIntakeDraft("not-json", "睡不好")).toBeNull();
  });
});
