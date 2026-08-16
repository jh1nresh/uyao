import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { allDrugs } from "./data";
import { SHOW_PRICE_TO_CONSUMER } from "./pricing";

/**
 * 法規護欄。
 *
 * 衛生機關認定「網路販售藥品」看的是交易是否於網路完成：刊登品名 +
 * 價格 + 可下單。而通訊交易只開放乙類成藥，我們目錄裡有甲類成藥與指示藥。
 *
 * 這條規則靠人記是記不住的 —— 三個月後有人為了做比價功能加回 formatPrice，
 * code review 不會有人想到藥事法。所以讓測試守住。
 */

const CONSUMER_SURFACES = [
  "app/page.tsx",
  "app/drug",
  "app/store/[slug]/page.tsx",
  "app/search",
  "app/category",
  "app/r",
  "components/DrugResults.tsx",
  "components/PharmacyList.tsx",
  "components/ReserveSheet.tsx",
  "components/AreaStores.tsx",
  "components/NoInventoryYet.tsx",
];

/** 藥局端的介面，價格本來就該有 —— 老闆知道自己的售價不算「向消費者刊登」。 */
const PHARMACY_SURFACES = ["components/PreviewShelf.tsx", "components/StoreOsShell.tsx"];

function filesUnder(target: string): string[] {
  const abs = path.resolve(__dirname, "..", target);
  try {
    if (!statSync(abs).isDirectory()) return [abs];
  } catch {
    return [];
  }
  return readdirSync(abs, { recursive: true, encoding: "utf8" })
    .map((f) => path.join(abs, f))
    .filter((f) => /\.tsx?$/.test(f));
}

describe("消費端不得顯示藥品價格", () => {
  it("開關是關的", () => {
    expect(SHOW_PRICE_TO_CONSUMER).toBe(false);
  });

  it.each(CONSUMER_SURFACES)("%s 不呼叫價格格式化函式", (target) => {
    for (const file of filesUnder(target)) {
      const src = readFileSync(file, "utf8");
      expect(src, `${path.basename(file)} 出現價格顯示`).not.toMatch(
        /formatPrice|formatFromPrice/,
      );
    }
  });

  it("藥局端仍保留價格 —— 拿掉的話示範就沒有說服力了", () => {
    const kept = PHARMACY_SURFACES.filter((f) =>
      filesUnder(f).some((x) => /formatPrice|NT\$/.test(readFileSync(x, "utf8"))),
    );
    expect(kept.length).toBe(PHARMACY_SURFACES.length);
  });
});

describe("藥品分級", () => {
  it("沒有把握的一律標待確認 —— 標錯比不標更糟，那是可被引用的法規分類", () => {
    for (const d of allDrugs()) {
      expect(
        ["甲類成藥", "乙類成藥", "指示藥", "非藥品", "待確認"],
        `${d.name} 的分級不在合法集合裡`,
      ).toContain(d.drugClass);
    }
  });

  it("目錄裡沒有處方藥 —— 消費端不呈現處方藥是 spec 的硬邊界", () => {
    const names = allDrugs().map((d) => `${d.name}${d.drugClass}`).join(" ");
    expect(names).not.toMatch(/處方/);
  });
});
