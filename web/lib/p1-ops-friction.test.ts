import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const reserveSheet = readFileSync(
  join(import.meta.dirname, "..", "components", "ReserveSheet.tsx"),
  "utf8",
);
const storeOsShell = readFileSync(
  join(import.meta.dirname, "..", "components", "StoreOsShell.tsx"),
  "utf8",
);

describe("P1 reservation and Store OS friction", () => {
  it("collapses optional pharmacist note behind a disclosure", () => {
    expect(reserveSheet).toContain("<details");
    expect(reserveSheet).toContain("補充給藥師（選填）");
    expect(reserveSheet).toContain("Add more context for the pharmacist (optional)");
    expect(reserveSheet).toContain("reservation-intake-note");
  });

  it("keeps phone + submit in a sticky footer", () => {
    expect(reserveSheet).toContain("sticky bottom-0");
    expect(reserveSheet).toContain("safe-area-inset-bottom");
    expect(reserveSheet).toMatch(/送出預留|Send reservation/);
  });

  it("reduces reservation inbox meta to the two decision-relevant facts", () => {
    expect(storeOsShell).toContain("awaiting confirmation");
    expect(storeOsShell).toContain("with customer context");
    expect(storeOsShell).not.toContain("Newest first");
    expect(storeOsShell).not.toContain("Full phone numbers hidden");
    // Removed the noisy "N shown" / "完整電話未顯示" / "最新單號在上" strip.
    expect(storeOsShell).not.toContain("筆目前顯示");
    expect(storeOsShell).not.toContain("完整電話未顯示");
    expect(storeOsShell).not.toContain("最新單號在上");
  });
});
