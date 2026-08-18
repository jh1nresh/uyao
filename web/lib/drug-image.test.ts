import { existsSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { allDrugs } from "./data";

const PUBLIC_DIR = path.resolve(import.meta.dirname, "..", "public");
/** 品項圖是大面積平塗，超過這個大小就是忘了跑 scripts/optimize-product-images.py。 */
const MAX_BYTES = 120 * 1024;

const withImage = allDrugs().filter((drug) => drug.image);

describe("品項圖", () => {
  it("目前只有一銘藥局的三個品項有圖", () => {
    expect(withImage.map((drug) => drug.slug)).toEqual([
      "greenplus-elgucare",
      "chungchi-yiyuansu-gastrodia-100",
      "yuanding-puregps-defense-450",
    ]);
  });

  it.each(withImage)("$slug 的圖檔真的在 public/ 裡且已壓過", (drug) => {
    const image = drug.image!;
    expect(image.src.startsWith("/products/")).toBe(true);

    const file = path.join(PUBLIC_DIR, image.src);
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).size).toBeLessThan(MAX_BYTES);
  });

  it.each(withImage)("$slug 帶得動版位與兩種語言的替代文字", (drug) => {
    const image = drug.image!;
    // 寬高是 next/image 固定版位用的；缺了會在手機上跳版。
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
    expect(image.alt.length).toBeGreaterThan(0);
    expect(image.altEn.length).toBeGreaterThan(0);
  });

  it("生成的示意圖不會被標成實拍", () => {
    // packshot 是「這就是實際包裝」的宣告。目前三張都是 AI 生成的示意圖，
    // 標成 packshot 會讓使用者以為看到的是真的盒子。
    for (const drug of withImage) {
      expect(drug.image!.kind).toBe("illustration");
      expect(drug.image!.alt).toContain("示意圖");
      expect(drug.image!.altEn.toLowerCase()).toContain("illustration");
    }
  });
});
