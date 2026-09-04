import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { allDrugs } from "./data";
import { productShowcaseItems } from "./product-showcase";

const PUBLIC_DIR = path.resolve(import.meta.dirname, "..", "public");

describe("homepage product showcase packshots", () => {
  it("uses complete packshots with slide-enlarge — no cabinet crops or wood plate", () => {
    const items = productShowcaseItems(allDrugs());
    expect(items).toHaveLength(8);
    expect(items[0]?.drug.slug).toBe("greenplus-elgucare");

    for (const item of items) {
      expect(item.drug.image?.kind, `${item.drug.slug} 目錄仍需去背包裝照`).toBe("packshot");
      expect(item.cutout.src, "貨架要用完整包裝照，不要貼邊裁切的櫃景抠圖").toBe(item.drug.image?.src);
      expect(item.cutout.src.startsWith("/products/showcase-cutouts/")).toBe(false);
      expect(item.cutout.src.includes("/cabinet/"), "不要再用整幅櫃景").toBe(false);
      const file = path.join(PUBLIC_DIR, item.cutout.src);
      expect(existsSync(file), `${item.drug.slug} 缺少包裝照 ${item.cutout.src}`).toBe(true);
      expect(item.cutout.width).toBe(item.drug.image?.width);
      expect(item.cutout.height).toBe(item.drug.image?.height);
    }
  });
});
