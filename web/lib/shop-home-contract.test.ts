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
const pharmacyPage = readFileSync(
  join(import.meta.dirname, "..", "app", "(consumer)", "pharmacy", "page.tsx"),
  "utf8",
);
const agentLanding = readFileSync(
  join(import.meta.dirname, "..", "components", "landing", "AgentLandingExperience.tsx"),
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

  it("asks for allergens before navigating to the dedicated results route", () => {
    expect(searchInput).toContain('action={localizedPath("/search", locale)}');
    expect(searchInput).toContain("onSubmit={askAllergies}");
    expect(searchInput).toContain("先確認已知過敏原");
    expect(searchInput).toContain("continueToResults");
    expect(searchInput).not.toContain("onSubmitQuery");
    expect(searchInput).not.toContain('presentation="pearl"');
  });

  it("does not load the removed spatial room treatment", () => {
    expect(globalCss).not.toContain("shop-pearl");
    expect(globalCss).not.toContain("shop-spatial");
    expect(globalCss).not.toContain("shop-pearl-sunlit-room.webp");
  });

  it("keeps Store OS visible as the pharmacist handoff behind the consumer flow", () => {
    expect(appPage).toContain("你提出需求，藥師在 Store OS 接手。");
    expect(appPage).toContain('#store-os-preview`');
    expect(appPage).toContain("合作藥局登入 ↗");
    expect(pharmacyPage).toContain('id="store-os-preview"');
    expect(pharmacyPage).toContain("<StoreOsProductPreview locale={locale} />");
    expect(agentLanding).toContain("export function StoreOsProductPreview");
  });

  it("keeps the established uYao brand system without recoloring factual catalog images", () => {
    expect(globalCss).toContain("--color-ivory: 242 239 230;");
    expect(globalCss).toContain("--color-brand-surface: 23 57 44;");
    expect(globalCss).toContain("--color-ink: 28 39 34;");
    expect(appPage).not.toContain("mono-halftone-field");
    expect(appPage).toContain("<CatalogCarousel");
    expect(agentLanding).not.toContain("mono-halftone-soft");
    expect(agentLanding).toContain("border-warning-line bg-warning-tint");
  });
});
