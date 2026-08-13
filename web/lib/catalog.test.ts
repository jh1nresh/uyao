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
    expect(searchDrugs("關節保養").map((drug) => drug.slug)).toEqual(["hugu-gaishu-100"]);
    expect(searchDrugs("呼吸道保養").map((drug) => drug.slug)).toEqual(["keqiqing-capsule"]);
    expect(searchDrugs("腦部保養").map((drug) => drug.slug)).toEqual(["huzhikang-150"]);
  });

  it.each([
    { query: "咳嗽", matched: "咳嗽", wellnessQueryZh: "呼吸道保養" },
    { query: "我今天有點咳", matched: "我今天有點咳", wellnessQueryZh: "呼吸道保養" },
    { query: "喉嚨乾癢", matched: "喉嚨乾癢", wellnessQueryZh: "呼吸道保養" },
    { query: "喉嚨不舒服", matched: "喉嚨不舒服", wellnessQueryZh: "呼吸道保養" },
    {
      query: "我最近膝蓋不舒服，想找保養的東西",
      matched: "膝蓋不舒服",
      wellnessQueryZh: "關節保養",
    },
  ])("低風險症狀 $query 可在安全提醒下直接顯示保養資料", ({ query, matched, wellnessQueryZh }) => {
    expect(matchSymptom(query)).toMatchObject({
      kind: "refer",
      matched,
      wellness: { queryZh: wellnessQueryZh },
    });
    expect(searchDrugs(query)).toEqual([]);
    expect(searchDrugs(wellnessQueryZh).length).toBeGreaterThan(0);
  });

  it.each([
    "咳血",
    "一直咳",
    "持續咳嗽",
    "咳嗽胸痛",
    "咳嗽又呼吸困難",
    "咳嗽發燒",
    "我要止咳藥",
    "喉嚨痛",
    "咳了兩週",
    "咳嗽一個月了",
    "咳到無法呼吸",
    "咳到吸不到氣",
    "咳出血",
    "咳嗽兩個禮拜了",
    "咳一陣子了",
    "斷斷續續咳",
    "咳咳停停",
    "咳嗽越來越嚴重",
    "咳到快昏倒",
    "咳到嘴唇發紫",
    "有什麼咳藥",
    "咳嗽要吃什麼藥",
  ])("高風險或持續症狀 $query 只給安全分流", (query) => {
    expect(matchSymptom(query)).toMatchObject({ kind: "refer" });
    expect(searchDrugs(query)).toEqual([]);
  });

  it("目前沒有相關目錄品項的症狀只給安全分流", () => {
    expect(matchSymptom("胸痛")).toMatchObject({ kind: "refer", matched: "胸痛" });
    expect(searchDrugs("胸痛")).toEqual([]);
    expect(matchSymptom("被蚊子咬")).toMatchObject({ kind: "refer", matched: "被蚊子咬" });
    expect(searchDrugs("痠痛")).toEqual([]);
    expect(searchDrugs("止癢")).toEqual([]);
  });

  it.each(["膝蓋很痛", "膝蓋腫", "膝蓋無法活動", "knee pain", "joint swelling"])(
    "關節警訊 $query 不提供保養資料捷徑",
    (query) => {
      const symptom = matchSymptom(query);
      expect(symptom).toMatchObject({ kind: "refer" });
      expect(symptom).not.toHaveProperty("wellness");
      expect(searchDrugs(query)).toEqual([]);
    },
  );

  it.each(["突然暈倒", "昏厥", "fainting", "passed out"])("暈倒警訊 $query 直接安全分流", (query) => {
    const symptom = matchSymptom(query);
    expect(symptom).toMatchObject({ kind: "refer" });
    expect(symptom).not.toHaveProperty("wellness");
    expect(searchDrugs(query)).toEqual([]);
  });

  it.each([
    { query: "cough", matched: "cough", wellnessQueryEn: "Daily respiratory wellness" },
    { query: "coughing", matched: "coughing", wellnessQueryEn: "Daily respiratory wellness" },
    { query: "dry throat", matched: "dry throat", wellnessQueryEn: "Daily respiratory wellness" },
    { query: "throat discomfort", matched: "throat discomfort", wellnessQueryEn: "Daily respiratory wellness" },
    { query: "knee discomfort", matched: "knee discomfort", wellnessQueryEn: "Bone and joint nutrition" },
  ])("英文低風險症狀 $query 可在安全提醒下直接顯示保養資料", ({ query, matched, wellnessQueryEn }) => {
    expect(matchSymptom(query)).toMatchObject({
      kind: "refer",
      matched,
      wellness: { queryEn: wellnessQueryEn },
    });
    expect(searchDrugs(query)).toEqual([]);
    expect(searchDrugs(wellnessQueryEn).length).toBeGreaterThan(0);
  });

  it.each([
    "persistent cough",
    "cough won't stop",
    "coughing up blood",
    "cough with chest pain",
    "cough with difficulty breathing",
    "cough with fever",
    "cough medicine",
    "sore throat",
    "I've been coughing for weeks",
    "cough for a month",
    "cough and can't breathe",
    "cough with wheezing",
    "coughing blood",
    "coughing nonstop",
    "a cough that keeps coming back",
    "cough is getting worse",
    "severe cough",
    "cough with fainting",
    "cough with blue lips",
    "medicine for cough",
    "something for my cough",
    "what can I take for a cough",
  ])("英文高風險或持續症狀 $query 只給安全分流", (query) => {
    expect(matchSymptom(query)).toMatchObject({ kind: "refer" });
    expect(searchDrugs(query)).toEqual([]);
  });

  it("安全分流同時保留中英文可直接顯示的具體處置文字", () => {
    expect(matchSymptom("difficulty breathing")).toMatchObject({
      kind: "refer",
      adviceZh: expect.stringContaining("緊急醫療評估"),
      adviceEn: expect.stringContaining("urgent medical care"),
    });
    expect(matchSymptom("胸痛")).toMatchObject({
      kind: "refer",
      adviceZh: expect.stringContaining("可能是急症"),
      adviceEn: expect.stringContaining("emergency"),
    });
    expect(matchSymptom("cough and can't breathe")).toMatchObject({
      kind: "refer",
      adviceZh: expect.stringContaining("需要先由藥師或醫師評估"),
      adviceEn: expect.stringContaining("prompt care"),
    });
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
