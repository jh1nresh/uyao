import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { allDrugs } from "./data";
import { productShowcaseItems } from "./product-showcase";

const PUBLIC_DIR = path.resolve(import.meta.dirname, "..", "public");

describe("homepage product showcase row", () => {
  it("uses catalog packshots in a calm row — no scene cutouts, cabinet scenes, or wood plate", () => {
    const items = productShowcaseItems(allDrugs());
    expect(items).toHaveLength(8);
    expect(items[0]?.drug.slug).toBe("greenplus-elgucare");

    for (const item of items) {
      const image = item.drug.image;
      expect(image?.kind, `${item.drug.slug} 必須是去背包裝照`).toBe("packshot");
      expect(image!.src.startsWith("/products/"), `${item.drug.slug} 要用目錄包裝照`).toBe(true);
      expect(image!.src.includes("/cabinet/"), "不要再用整幅櫃景").toBe(false);
      expect(image!.src.includes("/showcase-cutouts/"), "不要再用櫃景抠圖").toBe(false);
      const file = path.join(PUBLIC_DIR, image!.src);
      expect(existsSync(file), `${item.drug.slug} 缺少包裝照 ${image!.src}`).toBe(true);
    }
  });
});
