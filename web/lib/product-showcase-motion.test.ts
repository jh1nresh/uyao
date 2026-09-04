import { describe, expect, it } from "vitest";

import {
  easeBrand,
  itemTransform,
  shortestSignedDistance,
  shortestTarget,
  showcaseOpacity,
  showcaseScale,
  snapFromDrag,
  wrapIndex,
} from "./product-showcase-motion";

describe("showcase continuous motion", () => {
  it("walks the short path around the ring", () => {
    expect(shortestSignedDistance(0, 7.2, 8)).toBeCloseTo(0.8, 5);
    expect(shortestSignedDistance(0, 0.2, 8)).toBeCloseTo(-0.2, 5);
    expect(shortestSignedDistance(7, 0.2, 8)).toBeCloseTo(-1.2, 5);
    expect(shortestTarget(7.2, 0, 8)).toBeCloseTo(8, 5);
    expect(shortestTarget(0.2, 7, 8)).toBeCloseTo(-1, 5);
    expect(wrapIndex(8, 8)).toBe(0);
    expect(wrapIndex(-1, 8)).toBe(7);
  });

  it("interpolates scale and opacity instead of jumping 1 / 0.66 / 0.48", () => {
    expect(showcaseScale(0)).toBe(1);
    expect(showcaseScale(1)).toBeCloseTo(0.66, 5);
    expect(showcaseScale(2)).toBeCloseTo(0.48, 5);
    expect(showcaseScale(0.5)).toBeGreaterThan(0.66);
    expect(showcaseScale(0.5)).toBeLessThan(1);
    expect(showcaseOpacity(0)).toBe(1);
    expect(showcaseOpacity(0.5)).toBeGreaterThan(showcaseOpacity(1));
  });

  it("keeps drag and settle in the same cqw unit", () => {
    expect(itemTransform(0.4, 40)).toContain("16cqw");
    expect(itemTransform(0.4, 40)).toContain("scale(");
    expect(itemTransform(0.4, 40)).not.toContain("px");
  });

  it("commits one slot from distance or a flick, otherwise returns", () => {
    expect(snapFromDrag(0, 0.3, 0)).toBe(1);
    expect(snapFromDrag(0, 0.1, 0)).toBe(0);
    expect(snapFromDrag(0, 0.05, 0.003)).toBe(1);
    expect(snapFromDrag(0, -0.3, 0)).toBe(-1);
    expect(snapFromDrag(7, 7.25, 0)).toBe(8);
  });

  it("eases with a fast start and a long settle", () => {
    expect(easeBrand(0)).toBe(0);
    expect(easeBrand(1)).toBe(1);
    expect(easeBrand(0.25)).toBeGreaterThan(0.55);
    expect(easeBrand(0.8)).toBeGreaterThan(0.95);
  });
});
