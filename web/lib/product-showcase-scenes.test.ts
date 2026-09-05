import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { allDrugs } from "./data";
import { productShowcaseItems } from "./product-showcase";

const PUBLIC_DIR = path.resolve(import.meta.dirname, "..", "public");

describe("homepage product showcase shelf assets", () => {
  it("keeps eight identifiable packages in reference shelf order", () => {
    const items = productShowcaseItems(allDrugs());
    expect(items).toHaveLength(8);
    expect(items[0]?.drug.slug).toBe("greenplus-elgucare");
    expect(items[1]?.drug.slug).toBe("aob-vitality-beauty-45");
    expect(items.at(-1)?.drug.slug).toBe("gaoyouzhi-vitamin-b-60");

    for (const item of items) {
      expect(item.drug.image?.kind, `${item.drug.slug} 目錄仍需去背包裝照`).toBe("packshot");
      expect(item.cutout.src).toBe(`/products/shelf-renders-v1/${item.drug.slug}.webp`);
      expect(item.cutout.src).not.toBe(item.drug.image?.src);
      expect(["plain", "wide", "sunlit"]).toContain(item.bay);
      expect(item.shelfHeight).toBeGreaterThan(0);
      expect(item.shelfHeight).toBeLessThan(100);
      const file = path.join(PUBLIC_DIR, item.cutout.src);
      expect(existsSync(file), `${item.drug.slug} 缺少去背圖 ${item.cutout.src}`).toBe(true);
      expect(item.cutout.width).toBeGreaterThan(0);
      expect(item.cutout.height).toBeGreaterThan(0);
    }
  });
});
