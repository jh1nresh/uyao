import { describe, expect, it } from "vitest";

import { parseStoreReservationCommand } from "./store-reservation-command";

describe("parseStoreReservationCommand", () => {
  it.each([
    ["確認 A-123", { action: "confirm", code: "A-123" }],
    ["有貨 a123", { action: "confirm", code: "A-123" }],
    ["回報無庫存 B 456", { action: "reject", code: "B-456" }],
    ["完成 C-789", { action: "pickup", code: "C-789" }],
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
