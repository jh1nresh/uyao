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
const PACKSHOTS = [
  "aob-vitality-beauty-45",
  "chungchi-ganmeijia-coral-ca",
  "chungchi-yiyuansu-gastrodia-100",
  "gaoyouzhi-vitamin-b-60",
  "greenplus-elgucare",
  "huamao-progifted-lp28",
  "tianxia-chan-c-80",
  "yuanding-puregps-defense-450",
];

const ILLUSTRATIONS = [
  "bio-stand-calcium-softgel",
  "chung-jih-youweining",
  "cm-guer-gan-150mg",
  "cm-jinguguanjian-sr",
  "greenplus-discpower",
  "greenplus-vasopower",
  "gude-yishengning-p",
  "hongren-riqingsheng-lm",
  "icheng-meileshi",
  "icheng-siyunmeng",
  "jingcui-huxinan",
  "likuo-fish-oil-30",
  "luhsin-l-glutamine",
  "ouye-jingyong",
  "puda-grape-seed",
  "puda-green-tea-compound",
  "rending-gujieyou",
  "tianxia-yangshen-jingqu",
  "toyo-cukang-b",
  "yingkai-guguanjian-ucii",
  "youquan-super-magnesium",
];

describe("品項圖", () => {
  it("有圖的品項就是這兩份名單", () => {
    expect(withImage.map((drug) => drug.slug).sort()).toEqual(
      [...PACKSHOTS, ...ILLUSTRATIONS].sort(),
    );
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

  it("每一張都掛在它該掛的那份名單上", () => {
    // 這條擋的是「生成圖被標成 packshot」—— 那會讓使用者以為看到的是真的盒子，
    // 跟填假許可證字號是同一種錯。反向也擋：實拍被降級成示意圖同樣是錯的宣告。
    for (const drug of withImage) {
      const expected = PACKSHOTS.includes(drug.slug) ? "packshot" : "illustration";
      expect(drug.image!.kind, drug.slug).toBe(expected);
    }
  });
});
