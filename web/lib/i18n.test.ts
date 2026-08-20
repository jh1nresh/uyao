import { describe, expect, it } from "vitest";

import { localizedPath, secondaryProductName } from "./i18n";

describe("localizedPath", () => {
  it("adds an explicit locale prefix to canonical routes", () => {
    expect(localizedPath("/app", "zh")).toBe("/zh-tw/app");
    expect(localizedPath("/app", "en")).toBe("/en/app");
    expect(localizedPath("/", "zh")).toBe("/zh-tw");
    expect(localizedPath("/", "en")).toBe("/en");
  });

  it("replaces an existing locale instead of nesting prefixes", () => {
    expect(localizedPath("/en/search", "zh")).toBe("/zh-tw/search");
    expect(localizedPath("/zh-tw/search", "en")).toBe("/en/search");
  });

  it("leaves API and non-path targets unchanged", () => {
    expect(localizedPath("/api/reservations", "en")).toBe("/api/reservations");
    expect(localizedPath("#pilot", "zh")).toBe("#pilot");
  });
});

describe("secondaryProductName", () => {
  const drug = {
    name: "龍固寶 DiscPower",
    nameEn: "DiscPower",
  };

  it("does not repeat an English name already present in the Chinese title", () => {
    expect(secondaryProductName(drug, "zh")).toBeNull();
  });

  it("keeps a distinct English product name as a secondary label", () => {
    expect(secondaryProductName({ ...drug, name: "龍固寶" }, "zh")).toBe("DiscPower");
  });

  it("does not add a secondary label on English pages", () => {
    expect(secondaryProductName({ ...drug, name: "龍固寶" }, "en")).toBeNull();
  });
});
