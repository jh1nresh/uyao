import { describe, expect, it } from "vitest";

import { parseStoreOsLocale } from "./store-os-locale";

describe("StoreOS locale preference", () => {
  it("accepts English and otherwise defaults safely to Traditional Chinese", () => {
    expect(parseStoreOsLocale("en")).toBe("en");
    expect(parseStoreOsLocale("zh")).toBe("zh");
    expect(parseStoreOsLocale(null)).toBe("zh");
    expect(parseStoreOsLocale("ja")).toBe("zh");
  });
});
