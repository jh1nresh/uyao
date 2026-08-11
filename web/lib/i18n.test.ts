import { describe, expect, it } from "vitest";

import { localizedPath } from "./i18n";

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
