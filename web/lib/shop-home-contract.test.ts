import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const appPage = readFileSync(
  join(import.meta.dirname, "..", "app", "(consumer)", "app", "page.tsx"),
  "utf8",
);
const searchInput = readFileSync(
  join(import.meta.dirname, "..", "components", "SearchInput.tsx"),
  "utf8",
);
const globalCss = readFileSync(
  join(import.meta.dirname, "..", "app", "globals.css"),
  "utf8",
);

describe("classic shop homepage", () => {
  it("keeps search and catalog in the pre-spatial single-column flow", () => {
    expect(appPage).toContain('<SearchInput size="xl" area={area}');
    expect(appPage).toContain("<CatalogCarousel");
    expect(appPage.indexOf('<SearchInput size="xl"')).toBeLessThan(
      appPage.indexOf("<CatalogCarousel"),
    );
    expect(appPage).not.toContain("ShopSpatialExperience");
    expect(appPage).not.toContain("shop-pearl");
  });

  it("submits searches to the dedicated results route", () => {
    expect(searchInput).toContain('action={localizedPath("/search", locale)}');
    expect(searchInput).not.toContain("onSubmitQuery");
    expect(searchInput).not.toContain('presentation="pearl"');
  });

  it("does not load the removed spatial room treatment", () => {
    expect(globalCss).not.toContain("shop-pearl");
    expect(globalCss).not.toContain("shop-spatial");
    expect(globalCss).not.toContain("shop-pearl-sunlit-room.webp");
  });
});
