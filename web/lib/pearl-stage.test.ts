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

function block(selector: string): string {
  const index = css.indexOf(`${selector} {`);
  expect(index, `${selector} must exist in globals.css`).toBeGreaterThan(-1);
  return css.slice(index, css.indexOf("\n}", index));
}

describe("pearl stage wall and floor", () => {
  it("keeps a single unconditional hero background", () => {
    // A theme-scoped override wins over `.shop-pearl-hero` and would replace
    // every wall layer at once. `.shop-pearl-home` already pins light tokens.
    expect(css).not.toMatch(/html\[data-theme="dark"\] \.shop-pearl-hero/);
    expect(css).not.toMatch(/html:not\(\[data-theme\]\) \.shop-pearl-hero/);
  });

  it("lights the wall from one direction instead of tinting it flat", () => {
    const hero = block(".shop-pearl-hero");
    expect(hero).toMatch(/--pearl-horizon:/);
    // The angled shaft is what makes the surface read as lit.
    expect(hero).toMatch(/linear-gradient\(101deg/);
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

  it("reserves layout space so the store count clears the mirror", () => {
    expect(block(".shop-pearl-object")).toMatch(/padding-bottom:/);
  });

  it("keeps the mirror silhouette in the markup", () => {
    const component = readFileSync(
      join(import.meta.dirname, "..", "components", "ShopSpatialExperience.tsx"),
      "utf8",
    );
    expect(component).toMatch(/aria-hidden className="shop-pearl-reflection"/);
    expect(component).toMatch(/shop-pearl-reflection-pill/);
    expect(component).toMatch(/shop-pearl-reflection-action/);
  });
});
