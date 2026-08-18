import { existsSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { allDrugs } from "./data";

const PUBLIC_DIR = path.resolve(import.meta.dirname, "..", "public");
/** 超過這個大小就是忘了跑壓縮 —— 手機原圖動輒 2 MB 以上。 */
const MAX_BYTES = 200 * 1024;

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

  it("kind 與替代文字說的是同一件事", () => {
    // kind 是「這是不是實際包裝」的宣告，不是樣式開關。兩種都必須在替代文字
    // 裡講清楚 —— 把生成圖標成 packshot 會讓使用者以為看到的是真的盒子，
    // 跟填假許可證字號是同一種錯。
    for (const drug of withImage) {
      const image = drug.image!;
      if (image.kind === "packshot") {
        expect(image.alt).toContain("包裝照片");
        expect(image.altEn.toLowerCase()).toContain("packaging photo");
      } else {
        expect(image.alt).toContain("示意圖");
        expect(image.altEn.toLowerCase()).toContain("illustration");
      }
    }
  });

  it("目前三張都是合作藥局提供的實拍", () => {
    expect(withImage.map((drug) => drug.image!.kind)).toEqual([
      "packshot",
      "packshot",
      "packshot",
    ]);
  });
});
