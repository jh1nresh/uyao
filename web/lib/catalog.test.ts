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
  { slug: "keqiqing-capsule", label: "克氣清膠囊 50粒" },
  { slug: "huzhikang-60", label: "護智慷 60粒" },
  { slug: "huzhikang-150", label: "護智慷 150粒" },
  { slug: "top-fish-oil-60", label: "TOP高單位頂級魚油軟膠囊 60顆" },
  { slug: "guanlihu-60", label: "關立護 60錠" },
  { slug: "kimura-tiancheng-60", label: "木村 添誠膠囊食品 60粒" },
  { slug: "shuwei-600-fish-oil-60", label: "舒維-600魚油 60粒" },
  { slug: "baiyi-capsule-60", label: "百益膠囊食品 60粒" },
  { slug: "cm-sheliwei-softgel", label: "中美 攝利威軟膠囊" },
  { slug: "wewell-vision-softgel", label: "維維樂 視清／小視清軟膠囊" },
  { slug: "cm-jinguguanjian-sr", label: "中美 金固關健緩釋錠 60錠" },
  { slug: "likuo-fish-oil-30", label: "立國 精粹魚油膠囊 30粒" },
  { slug: "tianxia-yangshen-jingqu", label: "天下生物科技 養身景麴膠囊 90粒" },
  { slug: "hongren-riqingsheng-lm", label: "鴻仁 日清勝 LM機能益生菌" },
  { slug: "cm-guer-gan-150mg", label: "中美 顧爾肝膠囊 150 mg" },
  { slug: "gude-yishengning-p", label: "益聖寧-P軟膠囊" },
  { slug: "jingcui-huxinan", label: "護欣胺微粒膠囊 120粒" },
  { slug: "toyo-cukang-b", label: "醋康B膠囊 120粒" },
  { slug: "icheng-meileshi", label: "美樂適素食膠囊 60粒" },
  { slug: "icheng-siyunmeng", label: "思韻蒙軟膠囊 60粒" },
  { slug: "jixiang-jishukang", label: "吉舒康軟膠囊" },
  { slug: "bio-stand-calcium-softgel", label: "Bio-Stand 挺液鈣軟膠囊 100粒" },
  { slug: "rending-gujieyou", label: "固捷優 60顆" },
  { slug: "ouye-jingyong", label: "勁勇軟膠囊 60粒" },
  { slug: "greenplus-vasopower", label: "舒絡寶 Vasopower" },
  { slug: "greenplus-discpower", label: "龍固寶 DiscPower" },
  { slug: "greenplus-elgucare", label: "益固康 Elgucare" },
  { slug: "puda-grape-seed", label: "安格雅葡萄籽膠囊" },
  { slug: "puda-green-tea-compound", label: "普大綠茶複方膠囊" },
  { slug: "yingkai-guguanjian-ucii", label: "固關鍵 UC II 60粒" },
  { slug: "youquan-super-magnesium", label: "新優力超級鎂 60顆" },
  { slug: "chung-jih-youweining", label: "佑衛寧 高麗菜濃縮複方膠囊 30粒" },
  { slug: "luhsin-l-glutamine", label: "賜利康療養素－左旋麩醯胺酸 30包（每包5公克）" },
  { slug: "aob-vitality-beauty-45", label: "New AOB Vitality Beauty 45包" },
  { slug: "chungchi-yiyuansu-gastrodia-100", label: "憶元素 天麻100膠囊 60粒" },
  { slug: "yuanding-puregps-defense-450", label: "強抗力優 450+ Defense 60粒" },
  { slug: "chungchi-ganmeijia-coral-ca", label: "甘鎂佳珊瑚鈣 60錠" },
  { slug: "tianxia-chan-c-80", label: "強喜錠 Chan-C 80錠" },
  { slug: "huamao-progifted-lp28", label: "Progifted LP-28 益生菌 30包" },
  { slug: "gaoyouzhi-vitamin-b-60", label: "高優質維他命B群 60粒" },
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
  it("公開目錄剛好只有店家確認的四十三個品項", () => {
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

  it("合作藥局提供的新增品項保留資料來源、廠商、產地與分類待確認邊界", () => {
    const partnerProvided = allDrugs().filter((drug) => drug.source?.kind === "partner");

    expect(partnerProvided).toHaveLength(31);
    for (const drug of partnerProvided) {
      expect(drug.drugClass).toBe("待確認");
      expect(drug.ingredients.length).toBeGreaterThan(0);
      expect(drug.indications).toEqual([]);
      expect(drug.manufacturer).toBeTruthy();
      expect(drug.origin).toBeTruthy();
      expect(drug.source?.kind).toBe("partner");
      expect(drug.source?.label).toMatch(/^合作藥局提供商品資料/);
      if (drug.source?.url) expect(drug.source.url).toMatch(/^https:\/\//);
      expect(storesForDrug(drug.slug)).toEqual([]);
    }
  });

  it.each([
    { slug: "cm-jinguguanjian-sr", form: "緩釋錠", spec: "60錠" },
    { slug: "tianxia-yangshen-jingqu", form: "膠囊", spec: "90粒" },
    { slug: "jingcui-huxinan", form: "微粒膠囊", spec: "120粒" },
    { slug: "toyo-cukang-b", form: "膠囊", spec: "120粒" },
    { slug: "icheng-meileshi", form: "素食膠囊", spec: "60粒" },
    { slug: "icheng-siyunmeng", form: "軟膠囊", spec: "60粒" },
    { slug: "bio-stand-calcium-softgel", form: "軟膠囊", spec: "100粒" },
    { slug: "rending-gujieyou", form: "膠囊", spec: "60顆" },
    { slug: "ouye-jingyong", form: "軟膠囊", spec: "60粒" },
    { slug: "yingkai-guguanjian-ucii", form: "膠囊", spec: "60粒" },
    { slug: "youquan-super-magnesium", form: "膠囊", spec: "60顆" },
    { slug: "chung-jih-youweining", form: "膠囊", spec: "30粒" },
    { slug: "luhsin-l-glutamine", form: "粉狀", spec: "30包（每包5公克）" },
  ])("$slug 的規格已由同品項公開資料核對", ({ slug, form, spec }) => {
    const drug = getDrug(slug);

    expect(drug).toMatchObject({ form, spec, updatedOn: "2026-08-22" });
    expect(drug?.source).toMatchObject({ kind: "partner" });
    expect(drug?.source?.url).toMatch(/^https:\/\//);
  });

  it("克氣清保留公開資料可核對的規格、製造商與產地", () => {
    expect(getDrug("keqiqing-capsule")).toMatchObject({
      spec: "50粒",
      manufacturer: "UNITED PHARMA LLC",
      origin: "美國",
      updatedOn: "2026-08-22",
      source: {
        url: "https://www.rakuten.com.tw/shop/querterr/product/z8jbj38x3/",
      },
    });
  });

  it("不把原料來源誤寫成攝利威成品產地", () => {
    // 這句要釘住的是「原料標德國 ≠ 成品德國製」這個但書，不是開頭那個
    // 「待確認」標籤 —— 標籤本身不給讀的人任何資訊，已經從資料裡拿掉。
    expect(getDrug("cm-sheliwei-softgel")?.origin).toBe(
      "南瓜籽油標示德國有機原料，不等於成品德國製",
    );
  });

  it.each(["huzhikang-60", "aob-vitality-beauty-45"])(
    "%s 沒有公開產品來源前只收品名與規格",
    (slug) => {
      expect(getDrug(slug)).toMatchObject({
        drugClass: "待確認",
        ingredients: [],
        nutritionFocus: "營養補充定位待確認",
        searchTerms: [],
      });
      expect(getDrug(slug)?.source).toBeUndefined();
    },
  );

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

  it("中性品名與成分查詢仍可找到視清，且保留實際比對依據", () => {
    expect(searchDrugHits("視清")).toEqual([
      expect.objectContaining({
        drug: expect.objectContaining({ slug: "wewell-vision-softgel" }),
        match: expect.objectContaining({ kind: "name", value: expect.stringContaining("視清") }),
      }),
    ]);
    expect(searchDrugHits("小視清")).toEqual([
      expect.objectContaining({
        drug: expect.objectContaining({ slug: "wewell-vision-softgel" }),
        match: { kind: "alias", value: "小視清" },
      }),
    ]);

    for (const query of ["葉黃素", "維生素 A"]) {
      expect(searchDrugHits(query)).toContainEqual(
        expect.objectContaining({
          drug: expect.objectContaining({ slug: "wewell-vision-softgel" }),
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
