import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The pearl stage is a CSS-owned visual contract. These are structural
 * regressions, not aesthetic judgments: a later theme override silently
 * replaced the entire wall background once already, which removed the key
 * light, the horizon, and the floor grain from the shipped page while the
 * source still read as if the treatment existed.
 */
const css = readFileSync(join(import.meta.dirname, "..", "app", "globals.css"), "utf8");
const component = readFileSync(
  join(import.meta.dirname, "..", "components", "ShopSpatialExperience.tsx"),
  "utf8",
);

function block(selector: string): string {
  const index = css.indexOf(`${selector} {`);
  expect(index, `${selector} must exist in globals.css`).toBeGreaterThan(-1);
  return css.slice(index, css.indexOf("\n}", index));
}

describe("site-wide light tokens", () => {
  it("keeps :root ivory/paper on the main values", () => {
    const root = block(":root");
    expect(root).toMatch(/--color-ivory: 242 239 230;/);
    expect(root).toMatch(/--color-paper: 248 244 233;/);
  });
});

describe("pearl stage wall and floor", () => {
  it("keeps a single unconditional hero background", () => {
    // A theme-scoped override wins over `.shop-pearl-hero` and would replace
    // every wall layer at once. `.shop-pearl-home` already pins light tokens.
    expect(css).not.toMatch(/html\[data-theme="dark"\] \.shop-pearl-hero/);
    expect(css).not.toMatch(/html:not\(\[data-theme\]\) \.shop-pearl-hero/);
    expect(css).not.toMatch(/html\[data-theme="dark"\] \.shop-spatial-stage/);
  });

  it("re-pins pearl tokens under theme selectors", () => {
    expect(css).toMatch(/html\[data-theme="dark"\] \.shop-pearl-home/);
    expect(css).toMatch(/html:not\(\[data-theme\]\) \.shop-pearl-home/);
    const home = block(".shop-pearl-home");
    expect(home).toMatch(/--color-ivory: 248 246 241;/);
    expect(home).toMatch(/--color-paper: 252 251 248;/);
  });

  it("lights the wall from one direction instead of tinting it flat", () => {
    const hero = block(".shop-pearl-hero");
    expect(hero).toMatch(/--pearl-horizon:/);
    // The angled shaft is what makes the surface read as lit.
    expect(hero).toMatch(/linear-gradient\(104deg/);
  });

  it("gives the floor a visible horizon and readable grain", () => {
    const floor = block(".shop-pearl-hero::before");
    expect(floor).toMatch(/height: calc\(100% - var\(--pearl-horizon\)\)/);
    expect(floor).toMatch(/border-top: 1px solid/);

    const grain = floor.match(/rgb\(var\(--color-line-soft\) \/ ([\d.]+)\)/);
    expect(grain, "floor grain must exist").not.toBeNull();
    // At 0.16 the previous striping was invisible against the pearl surface.
    expect(Number(grain![1])).toBeGreaterThanOrEqual(0.3);
  });
});

describe("search capsule reflection", () => {
  it("renders a masked mirror rather than a blurred ellipse", () => {
    const reflection = block(".shop-pearl-reflection");
    expect(reflection).toMatch(/mask-image: linear-gradient/);
    expect(reflection).toMatch(/filter: blur/);

    const opacity = reflection.match(/opacity: ([\d.]+)/);
    expect(opacity).not.toBeNull();
    expect(Number(opacity![1])).toBeGreaterThanOrEqual(0.6);
  });

  it("casts a contact shadow and reserves layout space under the capsule", () => {
    expect(block(".shop-pearl-object")).toMatch(/padding-bottom:/);
    expect(block(".shop-pearl-object::after")).toMatch(/box-shadow|background: rgb\(var\(--shadow-paper\)/);
  });

  it("keeps the mirror silhouette in the markup", () => {
    expect(component).toMatch(/aria-hidden className="shop-pearl-reflection"/);
    expect(component).toMatch(/shop-pearl-reflection-pill/);
    expect(component).toMatch(/shop-pearl-reflection-action/);
  });
});

describe("idle stack and partner marquee", () => {
  it("keeps the moving 16-location marquee between search and catalog", () => {
    const searchAt = component.indexOf("shop-pearl-object");
    const marqueeAt = component.indexOf("<PartnerMarquee");
    const catalogAt = component.indexOf("shop-pearl-catalog");
    expect(searchAt).toBeGreaterThan(-1);
    expect(marqueeAt).toBeGreaterThan(searchAt);
    expect(catalogAt).toBeGreaterThan(marqueeAt);
    expect(component).toMatch(/partner-marquee-track|PartnerMarquee/);
  });

  it("does not replace the marquee with a static store-count line", () => {
    expect(component).not.toMatch(/listed pharmacies/);
    expect(component).not.toMatch(/收錄 \$\{storeCount\}/);
    expect(css).toMatch(/@keyframes partner-marquee-scroll/);
    expect(block(".partner-marquee-track")).toMatch(/animation: partner-marquee-scroll/);
  });

  it("renders four catalog cards on a paper sheet, not a store dump", () => {
    expect(component).toMatch(/\.slice\(0, 4\)/);
    expect(component).toMatch(/shop-pearl-catalog-sheet/);
    expect(component).not.toMatch(/CatalogCarousel/);
    expect(component.indexOf("partnerStores")).toBeLessThan(component.indexOf("<PartnerMarquee"));
  });

  it("gives the shop marquee a paper band and forest names", () => {
    const marquee = block(".shop-pearl-home .partner-marquee");
    expect(marquee).toMatch(/background: rgb\(var\(--color-paper\)\)/);
    expect(marquee).not.toMatch(/opacity: 0/);
    expect(block(".shop-pearl-home .partner-marquee li span:first-child")).toMatch(
      /color: rgb\(var\(--color-forest\)\)/,
    );
  });
});

describe("spatial dialogue wings", () => {
  it("uses the composing label and keeps symptom wings off the link path", () => {
    expect(component).toMatch(/目錄品項・暫時收起/);
    expect(component).toMatch(/候選品項・整理中/);
    const wing = component.slice(
      component.indexOf("function SpatialWing"),
      component.indexOf("export function ShopSpatialExperience"),
    );
    expect(wing).not.toMatch(/<Link/);
    expect(block(".shop-spatial-wing")).toMatch(/pointer-events: none/);
  });

  it("keeps the three-column desktop stage", () => {
    expect(css).toMatch(/minmax\(190px, 250px\) minmax\(700px, 740px\) minmax\(190px, 250px\)/);
    const stage = block(".shop-spatial-stage");
    expect(stage).toMatch(/linear-gradient\(104deg/);
    expect(stage).toMatch(/--pearl-horizon:/);
  });
});
