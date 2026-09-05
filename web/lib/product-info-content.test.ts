import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { allDrugs, getDrug } from "./data";
import { productInfoPanels, type ProductInfoPanel } from "./product-info-content";
import generated from "./product-info-images.generated.json";

const images = generated as Record<string, { src: string; width: number; height: number; sha256: string; content: ProductInfoPanel }[]>;

describe("exported product information images", () => {
  it("keeps every locale's pictures and transcript in sync with the current catalog", () => {
    expect(Object.keys(images).length).toBe(allDrugs().length * 2);
    for (const drug of allDrugs()) for (const locale of ["zh", "en"] as const) {
      const entries = images[`${drug.slug}:${locale}`];
      expect(entries.map((entry) => entry.content)).toEqual(productInfoPanels(drug, locale));
      for (const entry of entries) {
        expect(entry.src).toMatch(/^\/products\/info-v2\/[a-z0-9-]+\.webp$/);
        const bytes = readFileSync(path.join(process.cwd(), "public", entry.src));
        expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
        expect(createHash("sha256").update(bytes).digest("hex")).toBe(entry.sha256);
        expect(entry.width).toBe(1000);
        expect(entry.height).toBeGreaterThanOrEqual(1100);
        expect(entry.height).toBeLessThanOrEqual(4000);
      }
    }
  });

  it("does not promote unsourced ingredients or unknown specifications into image facts", () => {
    const drug = { ...getDrug("huzhikang-60")!, source: undefined, ingredients: ["unverified ingredient 999 mg"], spec: "規格待確認" };
    const facts = productInfoPanels(drug, "zh").find((panel) => panel.kind === "facts")!;
    expect(JSON.stringify(facts)).not.toContain("999");
    expect(facts.sections.flatMap((section) => section.rows).some((row) => row.name === "規格")).toBe(false);
  });

  it("preserves amounts and qualifiers when they cannot be safely split", () => {
    const raw = "UC-II® 非變性二型膠原蛋白 20 mg（含量標示於外盒）";
    const drug = { ...getDrug("greenplus-elgucare")!, ingredients: [raw, "黃耆萃取物 210 mg"] };
    const facts = productInfoPanels(drug, "zh").find((panel) => panel.kind === "facts")!;
    expect(facts.sections[0].rows).toEqual([{ name: raw }, { name: "黃耆萃取物", value: "210 mg" }]);
  });
});
