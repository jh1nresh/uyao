import { describe, expect, it } from "vitest";

import { allDrugs, allStores } from "./data";
import {
  catalogItem,
  catalogPayload,
  pharmaciesPayload,
  readLocale,
} from "./public-api";
import { SHOP_URL } from "./shop";

const LOCALES = ["zh", "en"] as const;

describe("public read API payloads", () => {
  it("never leaks price, stock, or availability", () => {
    for (const locale of LOCALES) {
      const json = JSON.stringify({
        catalog: catalogPayload(locale),
        pharmacies: pharmaciesPayload(locale),
      });
      for (const banned of [
        "priceTwd",
        "daysSinceScan",
        "availability",
        "inStock",
        "offers",
        "badge",
      ]) {
        expect(json, banned).not.toContain(banned);
      }
    }
  });

  it("never exposes the pharmacist-in-charge name or third-party ids", () => {
    const owners = allStores().map((store) => store.owner).filter(Boolean);
    expect(owners.length).toBeGreaterThan(0);

    for (const locale of LOCALES) {
      const json = JSON.stringify(pharmaciesPayload(locale));
      expect(json).not.toContain("owner");
      expect(json).not.toContain("placeId");
      for (const owner of owners) {
        expect(json, `leaked owner ${owner}`).not.toContain(owner);
      }
    }
  });

  it("covers every catalog item and points each at a page that exists", () => {
    const items = catalogPayload("zh");
    expect(items).toHaveLength(allDrugs().length);
    for (const item of items) {
      expect(item.url.startsWith(`${SHOP_URL}/zh-tw/drug/`)).toBe(true);
    }
    // Untranslated items keep the zh URL even when asked in English, because
    // that is the URL that canonically exists.
    for (const item of catalogPayload("en")) {
      const drug = allDrugs().find((d) => d.slug === item.slug)!;
      const prefix = drug.nameEn ? "/en" : "/zh-tw";
      expect(item.url, item.slug).toBe(`${SHOP_URL}${prefix}/drug/${item.slug}`);
    }
  });

  it("omits a licence number rather than publishing an empty one", () => {
    for (const item of catalogPayload("zh")) {
      if ("licenseNo" in item) {
        expect(item.licenseNo, item.slug).toBeTruthy();
      }
    }
  });

  it("keeps the illustration/packshot distinction machine-readable", () => {
    for (const item of catalogPayload("zh")) {
      if (item.image) {
        expect(["illustration", "packshot"]).toContain(item.image.kind);
        expect(item.image.url.startsWith(SHOP_URL)).toBe(true);
      }
    }
  });

  it("returns detail fields only for a known slug", () => {
    const known = allDrugs()[0];
    expect(catalogItem(known.slug, "zh")?.slug).toBe(known.slug);
    expect(catalogItem("no-such-item", "zh")).toBeUndefined();
  });

  it("filters pharmacies by area and keeps the hours provenance", () => {
    const all = pharmaciesPayload("zh");
    const one = pharmaciesPayload("zh", "datong");

    expect(all.length).toBeGreaterThan(one.length);
    expect(one.every((store) => store.area === "datong")).toBe(true);
    for (const store of all) {
      expect(["google", "nhi", "partner", "none"]).toContain(store.hoursSource);
    }
  });

  it("treats any unknown locale as Chinese instead of returning nothing", () => {
    expect(readLocale("en")).toBe("en");
    expect(readLocale("zh")).toBe("zh");
    expect(readLocale("fr")).toBe("zh");
    expect(readLocale(null)).toBe("zh");
  });
});
