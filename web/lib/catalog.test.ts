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
import { drugCopy } from "./i18n";
import { PARTNER_PHARMACIES } from "./partners";
import { matchSymptom } from "./symptoms";

const EXPECTED_CATALOG = [
  { slug: "hugu-gaishu-100", label: "護谷鈣素 100粒" },
  { slug: "shengkangning-150", label: "勝康寧 150粒" },
  { slug: "entineng-230", label: "恩體能 230粒" },
  { slug: "jinjiweichang-60", label: "進磯為常-D 60粒" },
  { slug: "keqiqing-capsule", label: "克氣清膠囊" },
  { slug: "huzhikang-60", label: "護智慷 60粒" },
  { slug: "huzhikang-150", label: "護智慷 150粒" },
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

  it("已驗證的一般食品保留非藥品邊界，並附可核對的營養補充資料", () => {
    for (const drug of allDrugs().filter((drug) => drug.slug !== "huzhikang-60")) {
      expect(drug.nameEn).toBeUndefined();
      expect(drug.licenseNo).toBe("");
      expect(drug.drugClass).toBe("非藥品");
      expect(drug.ingredients.length).toBeGreaterThan(0);
      expect(drug.indications).toEqual([]);
      expect(drug.nutritionFocus.length).toBeGreaterThan(0);
      expect(drug.nutritionFocusEn.length).toBeGreaterThan(0);
      expect(drug.searchTerms.length).toBeGreaterThan(0);
      expect(drug.source?.url).toMatch(/^https:\/\//);
      expect(alternativesFor(drug.slug)).toEqual([]);
      expect(storesForDrug(drug.slug)).toEqual([]);
    }
  });

  it("護智慷 60粒保留合作藥局確認的品名與規格，但不借用 150粒的來源或產品資料", () => {
    const sixtyCount = getDrug("huzhikang-60");
    const oneFiftyCount = getDrug("huzhikang-150");

    expect(sixtyCount).toMatchObject({
      name: "護智慷",
      spec: "60粒",
      form: "劑型待確認",
      drugClass: "待確認",
      ingredients: [],
      nutritionFocus: "營養補充定位待確認",
      searchTerms: [],
    });
    expect(sixtyCount?.source).toBeUndefined();
    expect(drugCopy(sixtyCount!, "zh").drugClass).toBe("待確認");
    expect(drugCopy(sixtyCount!, "en").drugClass).toBe("Classification pending");
    expect(oneFiftyCount?.source?.url).toBe("https://www.rakuten.com.tw/shop/oecom/product/2064750/");
  });

  it.each(EXPECTED_CATALOG)("貼上完整名稱與規格可找到 $label", ({ slug, label }) => {
    expect(searchDrugs(label).map((drug) => drug.slug)).toEqual([slug]);
    expect(searchDrugs(label.replaceAll(" ", "")).map((drug) => drug.slug)).toEqual([slug]);
  });

  it("店家提供的護智康舊字仍可找到護智慷兩種規格", () => {
    expect(searchDrugs("護智康").map((drug) => drug.spec)).toEqual(["60粒", "150粒"]);
    expect(searchDrugs("護智康150粒").map((drug) => drug.slug)).toEqual(["huzhikang-150"]);
  });

  it("店家提供的舊品名與省略符號寫法仍可搜尋", () => {
    expect(searchDrugs("進磯為常60粒").map((drug) => drug.slug)).toEqual(["jinjiweichang-60"]);
    expect(searchDrugs("克氣清咳嗽膠囊").map((drug) => drug.slug)).toEqual(["keqiqing-capsule"]);
  });

  it("低風險保養需求對應到營養定位，不對應疾病治療", () => {
    expect(searchDrugs("我想補鈣").map((drug) => drug.slug)).toEqual(["hugu-gaishu-100"]);
    expect(searchDrugs("呼吸道保養").map((drug) => drug.slug)).toEqual(["keqiqing-capsule"]);
    expect(searchDrugs("腦部保養").map((drug) => drug.slug)).toEqual(["huzhikang-150"]);
  });

  it("症狀與高風險描述只給安全分流，不回傳一般食品", () => {
    expect(matchSymptom("咳嗽")).toMatchObject({ kind: "refer", matched: "咳嗽" });
    expect(searchDrugs("咳嗽")).toEqual([]);
    expect(matchSymptom("胸痛")).toMatchObject({ kind: "refer", matched: "胸痛" });
    expect(searchDrugs("胸痛")).toEqual([]);
    expect(matchSymptom("被蚊子咬")).toMatchObject({ kind: "refer", matched: "被蚊子咬" });
    expect(searchDrugs("痠痛")).toEqual([]);
    expect(searchDrugs("止癢")).toEqual([]);
  });

  it.each([
    { query: "A mosquito bite", matched: "a mosquito bite" },
    { query: "soreness", matched: "soreness" },
    { query: "itching", matched: "itching" },
    { query: "chest pain", matched: "chest pain" },
    { query: "difficulty breathing", matched: "difficulty breathing" },
    { query: "severe allergic reaction", matched: "severe allergic reaction" },
    { query: "stroke-like weakness", matched: "stroke-like weakness" },
  ])("英文症狀 $query 走安全分流，不成為 catalog miss", ({ query, matched }) => {
    expect(matchSymptom(query)).toMatchObject({ kind: "refer", matched });
    expect(searchDrugs(query)).toEqual([]);
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
