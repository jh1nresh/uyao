import { describe, expect, it } from "vitest";

import { allDrugs } from "./data";
import { hasAmounts, ingredientRows, splitIngredient } from "./ingredients";

describe("成分含量拆解", () => {
  it.each([
    ["黃耆萃取物 210 mg", "黃耆萃取物", "210 mg"],
    ["非水溶性葡聚多醣體 250 mg", "非水溶性葡聚多醣體", "250 mg"],
    ["天麻萃取物 100 mg", "天麻萃取物", "100 mg"],
    ["二氧化矽 4.5 mg", "二氧化矽", "4.5 mg"],
  ])("%s 拆成名稱與含量", (raw, name, amount) => {
    expect(splitIngredient(raw)).toEqual({ name, amount });
  });

  it.each([
    "植物膠（羥丙基甲基纖維素）",
    "鹿角菜膠",
    "UC-II® 非變性二型膠原蛋白 20 mg（含量標示於外盒）",
  ])("拆不出含量的就整串當名稱：%s", (raw) => {
    expect(splitIngredient(raw)).toEqual({ name: raw, amount: null });
  });

  it("成分中間的數字不會被誤認成含量", () => {
    // β-1,3/1,6 的數字在中間，不是結尾的含量
    expect(splitIngredient("β-1,3/1,6 酵母葡聚多醣體")).toEqual({
      name: "β-1,3/1,6 酵母葡聚多醣體",
      amount: null,
    });
  });

  it("整份清單維持原順序與長度", () => {
    const raw = ["黃耆萃取物 210 mg", "鹿角菜膠", "甘草萃取物 20 mg"];
    expect(ingredientRows(raw).map((r) => r.name)).toEqual([
      "黃耆萃取物",
      "鹿角菜膠",
      "甘草萃取物",
    ]);
  });

  it("只有真的帶含量才排成表", () => {
    expect(hasAmounts(["黃耆萃取物 210 mg", "鹿角菜膠"])).toBe(true);
    expect(hasAmounts(["南瓜子油", "芸香葉"])).toBe(false);
    expect(hasAmounts([])).toBe(false);
  });

  it("目錄裡帶含量的品項都拆得出來，且沒有拆出空名稱", () => {
    for (const drug of allDrugs()) {
      for (const row of ingredientRows(drug.ingredients)) {
        expect(row.name.length).toBeGreaterThan(0);
        if (row.amount !== null) expect(row.amount).toMatch(/\d/);
      }
    }
  });
});
