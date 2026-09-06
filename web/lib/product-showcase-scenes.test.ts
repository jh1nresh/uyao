import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { allDrugs } from "./data";
import { productShowcaseItems } from "./product-showcase";
import { drugCopy } from "./i18n";

const PUBLIC_DIR = path.resolve(import.meta.dirname, "..", "public");

describe("homepage product showcase shelf assets", () => {
  it("ships only carousel display data while preserving every rendered field in both locales", () => {
    const drugs = allDrugs();
    const items = productShowcaseItems(drugs);
    for (const item of items) {
      const drug = drugs.find((drug) => drug.slug === item.slug)!;
      for (const locale of ["zh", "en"] as const) {
        const { name, spec, drugClass, nutritionFocus } = drugCopy(drug, locale);
        expect(item.copy[locale]).toEqual({ name, spec, drugClass, nutritionFocus });
      }
      expect(Object.keys(item).sort()).toEqual(["copy", "scene", "slug"]);
    }
    const fullPayload = items.map((item) => ({ drug: drugs.find((drug) => drug.slug === item.slug), scene: item.scene }));
    expect(JSON.stringify(items).length).toBeLessThan(JSON.stringify(fullPayload).length / 2);
  });

  it("keeps eight identifiable packages in reference shelf order", () => {
    const items = productShowcaseItems(allDrugs());
    expect(items).toHaveLength(8);
    expect(items[0]?.slug).toBe("greenplus-elgucare");
    expect(items[1]?.slug).toBe("aob-vitality-beauty-45");
    expect(items.at(-1)?.slug).toBe("gaoyouzhi-vitamin-b-60");

    for (const item of items) {
      const drug = allDrugs().find((drug) => drug.slug === item.slug)!;
      expect(drug.image?.kind, `${item.slug} 目錄仍需去背包裝照`).toBe("packshot");
      expect(item.scene.src).toBe(`/products/shelf-scenes-v2/${item.slug}.webp`);
      expect(item.scene.src).not.toBe(drug.image?.src);
      const file = path.join(PUBLIC_DIR, item.scene.src);
      expect(existsSync(file), `${item.slug} 缺少櫃內場景圖 ${item.scene.src}`).toBe(true);
      expect(item.scene.width).toBeGreaterThan(0);
      expect(item.scene.width / item.scene.height).toBe(1.5);
    }
  });
});
