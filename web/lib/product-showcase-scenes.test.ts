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
      expect(item.scene.src).toBe(`/products/shelf-scenes-v2/${item.drug.slug}.webp`);
      expect(item.scene.src).not.toBe(item.drug.image?.src);
      const file = path.join(PUBLIC_DIR, item.scene.src);
      expect(existsSync(file), `${item.drug.slug} 缺少櫃內場景圖 ${item.scene.src}`).toBe(true);
      expect(item.scene.width).toBeGreaterThan(0);
      expect(item.scene.width / item.scene.height).toBe(1.5);
    }
  });
});
