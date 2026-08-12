import { describe, expect, it } from "vitest";

import {
  CATEGORIES,
  allDrugs,
  alternativesFor,
  getDrug,
  previewOffers,
  searchDrugs,
  storesForDrug,
} from "./data";
import { PARTNER_PHARMACIES } from "./partners";

const EXPECTED_CATALOG = [
  { slug: "hugu-gaishu-100", label: "護谷鈣素 100粒" },
  { slug: "shengkangning-150", label: "勝康寧 150粒" },
  { slug: "entineng-230", label: "恩體能 230粒" },
  { slug: "jinjiweichang-60", label: "進磯為常 60粒" },
  { slug: "keqiqing-capsule", label: "克氣清咳嗽膠囊" },
  { slug: "huzhikang-60", label: "護智康 60粒" },
  { slug: "huzhikang-150", label: "護智康 150粒" },
] as const;

const OLD_SAMPLE_SLUGS = [
  "salonpas-ae",
  "golden-cross-patch",
  "cool-relief-patch",
  "mentholatum-ad",
  "jimu-spray",
  "green-oil",
  "white-flower-oil",
  "povidone-iodine",
  "artificial-tears",
] as const;

const OLD_SAMPLE_NAMES = [
  "撒隆巴斯",
  "金十字酸痛貼布",
  "痠痛必貼",
  "曼秀雷敦",
  "肌樂",
  "綠油精",
  "白花油",
  "優碘軟膏",
  "人工淚液",
] as const;

function catalogLabel(drug: ReturnType<typeof allDrugs>[number]): string {
  return drug.spec === "規格待確認" ? drug.name : `${drug.name} ${drug.spec}`;
}

describe("合作藥局常見品項目錄", () => {
  it("公開目錄剛好只有店家確認的七個品項", () => {
    expect(allDrugs().map((drug) => ({ slug: drug.slug, label: catalogLabel(drug) }))).toEqual(
      EXPECTED_CATALOG,
    );
    expect(CATEGORIES).toEqual([{ slug: "partner-item", name: "合作藥局品項" }]);
  });

  it("公開目錄和合作藥局品項清單不會漂移", () => {
    const partnerProducts = new Set(
      Object.values(PARTNER_PHARMACIES).flatMap((partner) => partner.confirmedProducts),
    );
    expect([...partnerProducts].sort()).toEqual(
      EXPECTED_CATALOG.map((item) => item.label).sort(),
    );
  });

  it("未提供的醫療主檔欄位保持空白或待確認", () => {
    for (const drug of allDrugs()) {
      expect(drug.nameEn).toBeUndefined();
      expect(drug.licenseNo).toBe("");
      expect(drug.drugClass).toBe("待確認");
      expect(drug.ingredients).toEqual([]);
      expect(drug.indications).toEqual([]);
      expect(alternativesFor(drug.slug)).toEqual([]);
      expect(storesForDrug(drug.slug)).toEqual([]);
    }
  });

  it.each(EXPECTED_CATALOG)("貼上完整名稱與規格可找到 $label", ({ slug, label }) => {
    expect(searchDrugs(label).map((drug) => drug.slug)).toEqual([slug]);
    expect(searchDrugs(label.replaceAll(" ", "")).map((drug) => drug.slug)).toEqual([slug]);
  });

  it("護智康名稱搜尋保留兩種規格，完整規格只回對應一筆", () => {
    expect(searchDrugs("護智康").map((drug) => drug.spec)).toEqual(["60粒", "150粒"]);
    expect(searchDrugs("護智康150粒").map((drug) => drug.slug)).toEqual(["huzhikang-150"]);
  });

  it("舊樣品不再是公開品項或搜尋結果", () => {
    for (const slug of OLD_SAMPLE_SLUGS) expect(getDrug(slug)).toBeUndefined();
    for (const name of OLD_SAMPLE_NAMES) expect(searchDrugs(name)).toEqual([]);
  });

  it("示範頁也只使用目前公開目錄的 slug", () => {
    const catalogSlugs = new Set(allDrugs().map((drug) => drug.slug));
    for (const offer of previewOffers("建利西藥房")) {
      expect(catalogSlugs.has(offer.drugSlug)).toBe(true);
    }
  });
});
