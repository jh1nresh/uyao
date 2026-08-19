import { existsSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { allDrugs } from "./data";

const PUBLIC_DIR = path.resolve(import.meta.dirname, "..", "public");
/** 超過這個大小就是忘了跑壓縮 —— 手機原圖動輒 2 MB 以上。 */
const MAX_BYTES = 200 * 1024;

const withImage = allDrugs().filter((drug) => drug.image);

/**
 * 兩份名單分開列，因為 `kind` 是對使用者的宣告，不是樣式開關。
 *
 * PACKSHOTS 是實拍：合作藥局現場拍的包裝照，可以代表真的盒子。
 * ILLUSTRATIONS 是生成示意圖：畫面上、替代文字裡都標「示意圖，非實際包裝」，
 * 盒面上的字是模型畫的，不可當成包裝標示引用。
 *
 * 把某個 slug 從下面搬到上面，等於宣告「這張是真的包裝」—— 要搬就得先有實拍。
 */
// 兩份名單目前都是空的：有圖的品項全部是分類待確認的那批，已經整批下架。
// 圖檔還留在 public/products/，品項回到目錄時把 slug 填回它該在的那份名單。
const PACKSHOTS: string[] = [];

const ILLUSTRATIONS: string[] = [];

describe("品項圖", () => {
  it("有圖的品項就是這兩份名單", () => {
    expect(withImage.map((drug) => drug.slug).sort()).toEqual(
      [...PACKSHOTS, ...ILLUSTRATIONS].sort(),
    );
  });

  it("每張圖檔真的在 public/ 裡且已壓過", () => {
    for (const drug of withImage) {
      const image = drug.image!;
      expect(image.src.startsWith("/products/"), drug.slug).toBe(true);

      const file = path.join(PUBLIC_DIR, image.src);
      expect(existsSync(file), drug.slug).toBe(true);
      expect(statSync(file).size, drug.slug).toBeLessThan(MAX_BYTES);
    }
  });

  it("每張圖都帶得動版位與兩種語言的替代文字", () => {
    for (const drug of withImage) {
      const image = drug.image!;
      // 寬高是 next/image 固定版位用的；缺了會在手機上跳版。
      expect(image.width, drug.slug).toBeGreaterThan(0);
      expect(image.height, drug.slug).toBeGreaterThan(0);
      expect(image.alt.length, drug.slug).toBeGreaterThan(0);
      expect(image.altEn.length, drug.slug).toBeGreaterThan(0);
    }
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

  it("每一張都掛在它該掛的那份名單上", () => {
    // 這條擋的是「生成圖被標成 packshot」—— 那會讓使用者以為看到的是真的盒子，
    // 跟填假許可證字號是同一種錯。反向也擋：實拍被降級成示意圖同樣是錯的宣告。
    for (const drug of withImage) {
      const expected = PACKSHOTS.includes(drug.slug) ? "packshot" : "illustration";
      expect(drug.image!.kind, drug.slug).toBe(expected);
    }
  });
});
