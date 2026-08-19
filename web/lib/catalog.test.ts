import { describe, expect, it } from "vitest";

import {
  CATEGORIES,
  allDrugs,
  alternativesFor,
  getDrug,
  previewOffers,
  searchDrugHits,
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
  { slug: "huzhikang-150", label: "護智慷 150粒" },
  { slug: "top-fish-oil-60", label: "TOP高單位頂級魚油軟膠囊 60顆" },
  { slug: "guanlihu-60", label: "關立護 60錠" },
  { slug: "kimura-tiancheng-60", label: "木村 添誠膠囊食品 60粒" },
  { slug: "shuwei-600-fish-oil-60", label: "舒維-600魚油 60粒" },
  { slug: "baiyi-capsule-60", label: "百益膠囊食品 60粒" },
] as const;

/**
 * 分類「待確認」的品項整批下架 —— 品名、成分、產地與供應資訊都只有合作藥局
 * 口頭提供，沒有可公開引用的來源可以獨立驗證，在那之前不該掛在公開目錄上。
 * 資料本身留在 git 歷史，逐筆驗過再放回來。
 */
const WITHDRAWN_PENDING_SLUGS = [
  "huzhikang-60",
  "aob-vitality-beauty-45",
  "cm-sheliwei-softgel",
  "wewell-vision-softgel",
  "cm-jinguguanjian-sr",
  "likuo-fish-oil-30",
  "tianxia-yangshen-jingqu",
  "hongren-riqingsheng-lm",
  "cm-guer-gan-150mg",
  "gude-yishengning-p",
  "jingcui-huxinan",
  "toyo-cukang-b",
  "icheng-meileshi",
  "icheng-siyunmeng",
  "jixiang-jishukang",
  "bio-stand-calcium-softgel",
  "rending-gujieyou",
  "ouye-jingyong",
  "greenplus-vasopower",
  "greenplus-discpower",
  "greenplus-elgucare",
  "puda-grape-seed",
  "puda-green-tea-compound",
  "yingkai-guguanjian-ucii",
  "youquan-super-magnesium",
  "chung-jih-youweining",
  "luhsin-l-glutamine",
  "chungchi-yiyuansu-gastrodia-100",
  "yuanding-puregps-defense-450",
  "chungchi-ganmeijia-coral-ca",
  "tianxia-chan-c-80",
  "huamao-progifted-lp28",
  "gaoyouzhi-vitamin-b-60",
] as const;

const WITHDRAWN_PENDING_NAMES = [
  "護智慷 60粒",
  "New AOB Vitality Beauty",
  "中美 攝利威軟膠囊",
  "維維樂 視清",
  "中美 金固關健緩釋錠",
  "護欣胺微粒膠囊",
  "固關鍵 UC II",
  "新優力超級鎂",
  "強喜錠 Chan-C",
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
  it("公開目錄剛好只有已驗證來源的十一個品項", () => {
    expect(allDrugs().map((drug) => ({ slug: drug.slug, label: catalogLabel(drug) }))).toEqual(
      EXPECTED_CATALOG,
    );
    expect(CATEGORIES).toEqual([{ slug: "partner-item", name: "合作藥局品項" }]);
  });

  /**
   * 這條是下架本身：分類待確認的品項不管從哪個入口都不該再被看見。品項頁走
   * `getDrug`，搜尋走 `searchDrugs` —— 只補其中一個，另一個仍然通得到頁面。
   */
  it("待確認的品項不再是公開品項或搜尋結果", () => {
    for (const slug of WITHDRAWN_PENDING_SLUGS) expect(getDrug(slug), slug).toBeUndefined();
    for (const name of WITHDRAWN_PENDING_NAMES) expect(searchDrugs(name), name).toEqual([]);
  });

  it("公開目錄不留任何分類待確認的品項", () => {
    for (const drug of allDrugs()) {
      expect(drug.drugClass, drug.slug).toBe("非藥品");
      expect(drug.source?.kind, drug.slug).not.toBe("partner");
    }
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
    for (const drug of allDrugs().filter((drug) => drug.source && drug.source.kind !== "partner")) {
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

  /**
   * `nameEn` 是 `/en` 品項頁的入場券（`lib/shop-index.ts`），所以它同時是
   * 最容易被「順手翻一個」的欄位。兩條規則一起釘：
   *
   *   來源：只能照抄該品項自己 `aliases` 裡的原廠拉丁字品名。音譯或翻譯
   *         出來的英文品名，跟填假許可證字號是同一種錯。
   *   完整：反過來，已經有拉丁字品名可抄的品項就不該漏填 —— 漏一個就是
   *         一頁本來進得了英文索引的品項白白留在 zh-tw。
   *
   * 已驗證的一般食品不在這條規則內：上面那個 case 要求它們 `nameEn` 一律
   * 留空（欄位以 mono 呈現，在非藥品上會被讀成藥品識別碼），即使原廠確實
   * 有登記英文品名也一樣，那是刻意留下的缺口。
   */
  it("英文品名只照抄原廠拉丁字品名，有得抄就不漏填", () => {
    const latinOnly = /^[A-Za-z0-9][A-Za-z0-9 .+-]*$/;
    const mayHaveEnglishName = allDrugs().filter(
      (drug) => !(drug.source && drug.source.kind !== "partner"),
    );

    expect(mayHaveEnglishName.length).toBeGreaterThan(0);
    for (const drug of mayHaveEnglishName) {
      const latinAliases = drug.aliases.filter((alias) => latinOnly.test(alias));

      if (drug.nameEn) {
        expect(drug.aliases, `${drug.slug} 的 nameEn 不在 aliases 裡`).toContain(drug.nameEn);
        expect(latinOnly.test(drug.nameEn), `${drug.slug} 的 nameEn 不是純拉丁字`).toBe(true);
      } else {
        expect(latinAliases, `${drug.slug} 有拉丁字品名可抄卻沒填 nameEn`).toEqual([]);
      }
    }
  });

  it.each([
    {
      slug: "guanlihu-60",
      form: "錠",
      ingredients: ["葡萄糖胺鹽酸鹽", "軟骨素", "第二型膠原蛋白", "MSM（甲基硫醯基甲烷）"],
      query: "第二型膠原蛋白",
    },
    {
      slug: "kimura-tiancheng-60",
      form: "膠囊",
      ingredients: ["南瓜子油", "葡萄子油", "杜松子油", "葡萄糖酸鋅", "維生素E"],
      query: "南瓜子油",
    },
  ])("$slug 保留門市包裝可核對的食品資料", ({ slug, form, ingredients, query }) => {
    const drug = getDrug(slug);

    expect(drug).toMatchObject({
      form,
      drugClass: "非藥品",
      licenseNo: "",
      indications: [],
    });
    expect(drug?.ingredients).toEqual(expect.arrayContaining(ingredients));
    expect(drug?.nutritionFocus).not.toContain("待確認");
    expect(drug?.searchTerms.length).toBeGreaterThan(0);
    expect(drug?.source).toBeUndefined();
    expect(searchDrugs(query).map((item) => item.slug)).toContain(slug);
  });

  it("護智慷只留下有公開來源的 150粒，60粒不借用它的來源", () => {
    const oneFiftyCount = getDrug("huzhikang-150");

    expect(getDrug("huzhikang-60")).toBeUndefined();
    expect(oneFiftyCount?.source?.url).toBe("https://www.rakuten.com.tw/shop/oecom/product/2064750/");
    expect(drugCopy(oneFiftyCount!, "zh").drugClass).toBe("非藥品");
  });

  it.each(EXPECTED_CATALOG)("貼上完整名稱與規格可找到 $label", ({ slug, label }) => {
    expect(searchDrugs(label).map((drug) => drug.slug)).toEqual([slug]);
    expect(searchDrugs(label.replaceAll(" ", "")).map((drug) => drug.slug)).toEqual([slug]);
  });

  it("店家提供的護智康舊字仍可找到還在目錄裡的護智慷", () => {
    expect(searchDrugs("護智康").map((drug) => drug.spec)).toEqual(["150粒"]);
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
    { query: "咳嗽", matched: "咳嗽" },
    { query: "我今天有點咳", matched: "我今天有點咳" },
    { query: "喉嚨乾癢", matched: "喉嚨乾癢" },
    { query: "喉嚨不舒服", matched: "喉嚨不舒服" },
    { query: "我最近膝蓋不舒服，想找保養的東西", matched: "膝蓋不舒服" },
  ])("症狀 $query 只顯示安全分流，不自動帶保養品", ({ query, matched }) => {
    const symptom = matchSymptom(query);
    expect(symptom).toMatchObject({ kind: "refer", matched });
    expect(symptom).not.toHaveProperty("wellness");
    expect(searchDrugs(query)).toEqual([]);
  });

  it.each([
    "眼睛乾澀",
    "眼睛乾",
    "眼乾",
    "乾眼",
    "dry eyes",
    "dry eye",
    "dry-eye",
    "eye dryness",
    "my eyes are dry",
    "eyes are dry",
  ])(
    "眼睛不適 $query 只顯示安全分流，不連結視覺營養品",
    (query) => {
      const symptom = matchSymptom(query);
      expect(symptom).toMatchObject({ kind: "refer" });
      expect(symptom).not.toHaveProperty("wellness");
      expect(searchDrugs(query)).toEqual([]);
    },
  );

  it.each(["視力突然模糊", "突然看不清楚", "眼睛劇痛", "sudden blurred vision", "severe eye pain"])(
    "眼睛警訊 $query 優先進入就醫分流",
    (query) => {
      const symptom = matchSymptom(query);
      expect(symptom).toMatchObject({ kind: "refer" });
      expect(symptom).not.toHaveProperty("wellness");
      expect(searchDrugs(query)).toEqual([]);
    },
  );

  it("中性品名、別名與成分查詢都保留實際比對依據", () => {
    expect(searchDrugHits("舒維-600")).toEqual([
      expect.objectContaining({
        drug: expect.objectContaining({ slug: "shuwei-600-fish-oil-60" }),
        match: expect.objectContaining({ kind: "name", value: expect.stringContaining("舒維") }),
      }),
    ]);
    expect(searchDrugHits("舒維魚油膠囊")).toEqual([
      expect.objectContaining({
        drug: expect.objectContaining({ slug: "shuwei-600-fish-oil-60" }),
        match: { kind: "alias", value: "舒維魚油膠囊" },
      }),
    ]);

    for (const query of ["維生素 E", "大豆油"]) {
      expect(searchDrugHits(query)).toContainEqual(
        expect.objectContaining({
          drug: expect.objectContaining({ slug: "shuwei-600-fish-oil-60" }),
          match: expect.objectContaining({ kind: "ingredient", value: expect.stringContaining(query.replace(" ", "")) }),
        }),
      );
    }
  });

  it("搜尋依品名、別名、成分、營養方向、目錄詞的證據優先順序穩定排序", () => {
    const priority = ["name", "alias", "ingredient", "nutritionFocus", "searchTerm", "details"];
    const hits = searchDrugHits("魚油");
    expect(hits.length).toBeGreaterThan(1);
    expect(hits.map((hit) => priority.indexOf(hit.match.kind))).toEqual(
      [...hits].map((hit) => priority.indexOf(hit.match.kind)).sort((a, b) => a - b),
    );
    expect(searchDrugHits("骨骼與關節營養補給")[0]?.match.kind).toBe("nutritionFocus");
    expect(searchDrugHits("粉塵環境保養")[0]?.match).toEqual({
      kind: "searchTerm",
      value: "粉塵環境保養",
    });
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
    { query: "cough", matched: "cough" },
    { query: "coughing", matched: "coughing" },
    { query: "dry throat", matched: "dry throat" },
    { query: "throat discomfort", matched: "throat discomfort" },
    { query: "knee discomfort", matched: "knee discomfort" },
  ])("英文症狀 $query 只顯示安全分流，不自動帶保養品", ({ query, matched }) => {
    const symptom = matchSymptom(query);
    expect(symptom).toMatchObject({ kind: "refer", matched });
    expect(symptom).not.toHaveProperty("wellness");
    expect(searchDrugs(query)).toEqual([]);
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
