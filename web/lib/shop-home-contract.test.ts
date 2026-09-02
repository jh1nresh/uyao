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
const catalogCarousel = readFileSync(
  join(import.meta.dirname, "..", "components", "CatalogCarousel.tsx"),
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

describe("household medicine storefront homepage", () => {
  it("integrates the search into a wall and keeps the full catalog below", () => {
    expect(appPage).toContain('<SearchInput size="xl" area={area}');
    expect(appPage).toContain("medicine-cabinet-hero");
    expect(appPage).toContain('<h1 className="sr-only">');
    expect(appPage).toContain("medicine-cabinet-input");
    expect(appPage).not.toContain("家裡現在需要什麼？");
    expect(appPage).not.toContain("問藥時，上排品項留在原位。");
    expect(appPage).toContain("先逛品項，再交給 uYao 去問。");
    expect(appPage).toContain("<CatalogCarousel");
    expect(catalogCarousel).toContain("aspect-[4/3]");
    expect(catalogCarousel).toContain("供應需確認");
    expect(catalogCarousel).toContain("查看品項 →");
    expect(appPage.indexOf('<SearchInput size="xl"')).toBeLessThan(
      appPage.indexOf("<CatalogCarousel"),
    );
    expect(appPage).toContain("shelfDrugs.map");
    expect(appPage).not.toContain("d-household-medicine-cabinet");
  });

  it("asks for allergens before navigating to the dedicated results route", () => {
    expect(searchInput).toContain('action={localizedPath("/search", locale)}');
    expect(searchInput).toContain("onSubmit={askAllergies}");
    expect(searchInput).toContain("先確認已知過敏原");
    expect(searchInput).toContain("continueToResults");
    expect(searchInput).not.toContain("onSubmitQuery");
    expect(searchInput).not.toContain('presentation="pearl"');
  });

  it("builds the selected wall direction from one stocked cabinet image and transparent product links", () => {
    expect(globalCss).toContain("medicine-cabinet-products");
    expect(globalCss).toContain("grid-template-columns: 337fr 238fr 290fr;");
    expect(globalCss).toContain("background-position: 59% top;");
    expect(appPage).not.toContain("<Image");
    expect(appPage).not.toContain("object-contain object-bottom");
    expect(globalCss).not.toContain("medicine-cabinet-product::after");
    expect(globalCss).toContain("background: rgb(226 204 169 / 0.34) !important;");
    expect(globalCss).toContain("/brand/uyao-medicine-cabinet-stocked-v1.webp");
    expect(globalCss).not.toContain("d-household-medicine-cabinet");
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
