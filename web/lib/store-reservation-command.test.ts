import { describe, expect, it } from "vitest";

import {
  answerStoreReservationQuestion,
  parseStoreReservationCommand,
  type StoreReservationQuestionItem,
} from "./store-reservation-command";

const reservations: StoreReservationQuestionItem[] = [
  { code: "A-123", drugName: "葉黃素", status: "pending_store_confirm" },
  { code: "B-456", drugName: "鈣片", status: "confirmed" },
  { code: "C-789", drugName: "維生素", status: "picked_up" },
];

describe("parseStoreReservationCommand", () => {
  it.each([
    ["確認 A-123", { action: "confirm", code: "A-123" }],
    ["有貨 a123", { action: "confirm", code: "A-123" }],
    ["回報無庫存 B 456", { action: "reject", code: "B-456" }],
    ["完成 C-789", { action: "pickup", code: "C-789" }],
    ["Confirm A-123", { action: "confirm", code: "A-123" }],
    ["Out of stock B 456", { action: "reject", code: "B-456" }],
    ["Complete pickup C-789", { action: "pickup", code: "C-789" }],
  ])("parses %s", (input, expected) => {
    expect(parseStoreReservationCommand(input)).toEqual(expected);
  });

  it.each(["確認", "幫我確認 A-123", "確認 A-12", "hello A-123"])(
    "rejects ambiguous free-form input %s",
    (input) => {
      expect(parseStoreReservationCommand(input)).toBeNull();
    },
  );
});

describe("answerStoreReservationQuestion", () => {
  it("lists active reservation codes without exposing completed work", () => {
    expect(answerStoreReservationQuestion("目前還有什麼單號？", reservations)).toBe(
      "目前有 2 筆進行中：A-123（待確認）、B-456（已確認）。",
    );
  });

  it("answers pending and recent reservation counts", () => {
    expect(answerStoreReservationQuestion("有幾筆待確認？", reservations)).toBe(
      "目前有 1 筆待確認：A-123。",
    );
    expect(answerStoreReservationQuestion("目前有幾筆預留？", reservations)).toBe(
      "目前載入 3 筆近期預留，其中 1 筆待確認、1 筆已確認。",
    );
  });

  it("answers a known code and fails closed for an unknown code", () => {
    expect(answerStoreReservationQuestion("A-123 是什麼狀態？", reservations)).toBe(
      "A-123 是「葉黃素」，目前狀態：待確認。",
    );
    expect(answerStoreReservationQuestion("查一下 Z-999 狀態", reservations)).toBe(
      "找不到 Z-999；我只能查詢這間門市目前載入的近期單號。",
    );
  });

  it("does not guess unrelated free-form questions", () => {
    expect(answerStoreReservationQuestion("明天天氣如何？", reservations)).toBeNull();
  });

  it("answers English reservation questions without changing source product names", () => {
    expect(answerStoreReservationQuestion("Check A-123 status", reservations, "en")).toBe(
      "A-123 is “葉黃素.” Current status: Pending confirmation.",
    );
    expect(answerStoreReservationQuestion("How many reservations are there?", reservations, "en")).toBe(
      "3 recent reservations are loaded: 1 awaiting confirmation and 1 confirmed.",
    );
  });
});
