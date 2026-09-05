import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { allDrugs } from "./data";
import { productShowcaseScene } from "./product-showcase";

describe("cabinet scene coverage", () => {
  it("provides a separate, nonempty WebP scene for every existing product image", () => {
    const illustrated = allDrugs().filter((drug) => drug.image);
    expect(illustrated).toHaveLength(29);
    for (const drug of illustrated) {
      const scene = productShowcaseScene(drug.slug);
      expect(scene, drug.slug).not.toBeNull();
      if (!scene) continue;
      expect(scene.src).not.toBe(drug.image?.src);
      const file = path.resolve(import.meta.dirname, "../public", scene.src.slice(1));
      expect(existsSync(file), drug.slug).toBe(true);
      const bytes = readFileSync(file);
      expect(bytes.length).toBeGreaterThan(10000);
      expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
    }
  });

  it("does not invent packaging for products without an image", () => {
    for (const drug of allDrugs().filter((drug) => !drug.image)) {
      expect(productShowcaseScene(drug.slug)).toBeNull();
    }
    expect(productShowcaseScene("not-a-product")).toBeNull();
  });
});
