import generated from "./stores.generated.json";
import { compareByFreshness, stockBadge } from "./stock";
import { matchSymptom } from "./symptoms";
import { drugCopy } from "./i18n";
import type {
  Area,
  AreaSlug,
  Category,
  CategorySlug,
  Drug,
  DrugImage,
  Offer,
  StockBadgeSpec,
  Store,
} from "./types";

/**
 * 資料層：藥局是真的，庫存還不是。
 *
 * 藥局來自 `stores.generated.json` —— 食藥署 + 健保署開放資料，跑
 * `python3 -m pharmabox.seed` 重新產生，不要手改。
 *
 * 庫存與價格來自盒子的掃描流。目前**沒有任何一家裝盒子**，所以 OFFERS
 * 是空的，每家藥局的徽章都是「？ 請預留確認」。這不是待辦事項，是這個
 * 產品現在真實的狀態 —— 徽章系統本來就是為這個狀態設計的。
 */

/**
 * 首波收錄店家所在的服務區。合作狀態另由 partners.ts 明確標示；不論是否
 * 合作，都不代表已安裝盒子或已有即時庫存。
 */
export const AREAS: Area[] = [
  { slug: "datong", countyCity: "臺北市", name: "臺北市大同區", shortName: "大同區" },
  { slug: "linkou", countyCity: "新北市", name: "新北市林口區", shortName: "林口區" },
  { slug: "luzhou", countyCity: "新北市", name: "新北市蘆洲區", shortName: "蘆洲區" },
  { slug: "xinzhuang", countyCity: "新北市", name: "新北市新莊區", shortName: "新莊區" },
  { slug: "zhongshan", countyCity: "臺北市", name: "臺北市中山區", shortName: "中山區" },
  { slug: "xitun", countyCity: "臺中市", name: "臺中市西屯區", shortName: "西屯區" },
  { slug: "miaoli", countyCity: "苗栗縣", name: "苗栗縣苗栗市", shortName: "苗栗市" },
  { slug: "yilan", countyCity: "宜蘭縣", name: "宜蘭縣宜蘭市", shortName: "宜蘭市" },
  { slug: "luodong", countyCity: "宜蘭縣", name: "宜蘭縣羅東鎮", shortName: "羅東鎮" },
];

export const DEFAULT_AREA: AreaSlug = "datong";

/** 跨區的頁面（搜尋、品類）用這個標範圍，不能只寫其中一區。 */
export const SERVICE_AREA_LABEL = AREAS.map((a) => a.shortName).join("、");

export function getArea(slug: AreaSlug): Area {
  return AREAS.find((a) => a.slug === slug) ?? AREAS[0];
}

/** 把網址上的 ?area= 收斂成合法值，亂填就退回預設區。 */
export function toAreaSlug(raw: string | undefined): AreaSlug {
  return AREAS.some((a) => a.slug === raw) ? (raw as AreaSlug) : DEFAULT_AREA;
}

export const CATEGORIES: Category[] = [
  { slug: "partner-item", name: "合作藥局品項" },
];

function partnerProvidedProduct({
  slug,
  name,
  aliases = [],
  form,
  spec = "規格待確認",
  ingredients,
  nutritionFocus,
  searchTerms,
  manufacturer,
  origin,
  image,
}: {
  slug: string;
  name: string;
  aliases?: string[];
  form: string;
  spec?: string;
  ingredients: string[];
  nutritionFocus: string;
  searchTerms: string[];
  manufacturer: string;
  origin: string;
  image?: DrugImage;
}): Drug {
  return {
    slug,
    name,
    aliases,
    form,
    spec,
    licenseNo: "",
    drugClass: "待確認",
    category: "partner-item",
    ingredients,
    indications: [],
    nutritionFocus,
    nutritionFocusEn: "Partner-provided product composition; classification pending verification",
    searchTerms,
    manufacturer,
    origin,
    image,
    source: { label: "合作藥局提供商品資料", kind: "partner" },
  };
}

const DRUGS: Drug[] = [
  {
    slug: "hugu-gaishu-100",
    name: "護谷鈣素",
    aliases: ["轉谷護谷鈣素", "TRANSBONE", "GLUCALINE MCHC"],
    form: "軟膠囊",
    spec: "100粒",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: ["MCHC鈣", "葡萄糖胺", "軟骨膠原", "維生素D3", "磷", "鎂"],
    indications: [],
    nutritionFocus: "骨骼與關節營養補給",
    nutritionFocusEn: "Bone and joint nutrition",
    searchTerms: ["骨骼保養", "關節保養", "補鈣", "行動力保養"],
    source: {
      label: "弘鎰貿易產品資料",
      url: "https://horngda.com/products/",
    },
  },
  {
    slug: "shengkangning-150",
    name: "勝康寧",
    aliases: ["GENTALIN", "勝康寧膠囊"],
    form: "膠囊",
    spec: "150粒",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: ["南瓜子油", "南瓜子粉", "油菜籽油花粉", "大豆卵磷脂", "芸香葉"],
    indications: [],
    nutritionFocus: "男性日常保養與營養補給",
    nutritionFocusEn: "Daily nutrition for men's wellness",
    searchTerms: ["男性保養", "熟齡男性保養", "銀髮保養"],
    source: {
      label: "富康活力藥局商品資料",
      url: "https://shop.fu-kang.com/product_detail?product_sn=2217",
    },
  },
  {
    slug: "entineng-230",
    name: "恩體能",
    aliases: ["恩體能-GPH", "恩體能山楂膠囊", "ANTI-NEL GPH"],
    form: "膠囊",
    spec: "230粒",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: ["山楂萃取液"],
    indications: [],
    nutritionFocus: "山楂配方的循環日常保養",
    nutritionFocusEn: "Hawthorn-based daily circulation wellness",
    searchTerms: ["循環保養", "心血管保養", "山楂營養補給"],
    source: {
      label: "大墩藥局商品資料",
      url: "https://mall.iopenmall.tw/010419/index.php?action=product_detail&prod_no=P1041909447429",
    },
  },
  {
    slug: "jinjiweichang-60",
    name: "進磯為常-D",
    aliases: ["進磯為常", "進磯為常D", "松花青素酵素"],
    form: "膠囊",
    spec: "60粒",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: ["松花青素", "綜合酵素"],
    indications: [],
    nutritionFocus: "綜合酵素營養補給",
    nutritionFocusEn: "Mixed-enzyme nutrition supplement",
    searchTerms: ["酵素補充", "綜合酵素", "日常營養補給"],
    source: {
      label: "康鈺藥局產品資料",
      url: "https://www.pharmintw.com/product_cg369256.html",
    },
  },
  {
    slug: "keqiqing-capsule",
    name: "克氣清膠囊",
    aliases: ["克氣清咳嗽膠囊", "克氣清", "合氣清", "LAKALIN"],
    form: "軟膠囊",
    spec: "規格待確認",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: ["薄荷油", "甘草", "療肺草", "百里香萃取", "接骨木萃取", "鼠尾草萃取", "紫蘇葉"],
    indications: [],
    nutritionFocus: "呼吸道日常保養",
    nutritionFocusEn: "Daily respiratory wellness",
    searchTerms: ["呼吸道保養", "換季保養", "粉塵環境保養"],
    source: {
      label: "麗登藥妝產品資料",
      url: "https://www.citycare.com.tw/product/lakalin-sp02/",
    },
  },
  {
    // 合作藥局確認的只有品名與規格；150 粒來源不能延伸到這個 60 粒 SKU。
    slug: "huzhikang-60",
    name: "護智慷",
    aliases: ["護智康"],
    form: "劑型待確認",
    spec: "60粒",
    licenseNo: "",
    drugClass: "待確認",
    category: "partner-item",
    ingredients: [],
    indications: [],
    nutritionFocus: "營養補充定位待確認",
    nutritionFocusEn: "Nutrition positioning pending verification",
    searchTerms: [],
  },
  {
    slug: "huzhikang-150",
    name: "護智慷",
    aliases: ["護智康", "PROMETAN-G"],
    form: "軟膠囊",
    spec: "150粒",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: ["磷脂醯絲胺酸", "L-絲胺酸", "大豆油", "卵磷脂"],
    indications: [],
    nutritionFocus: "PS 磷脂醯絲胺酸營養補給",
    nutritionFocusEn: "Phosphatidylserine nutrition",
    searchTerms: ["思緒保養", "腦部營養補給", "專注保養"],
    source: {
      label: "歐頤康實體藥局商品資料",
      url: "https://www.rakuten.com.tw/shop/oecom/product/2064750/",
    },
  },
  {
    slug: "top-fish-oil-60",
    name: "TOP高單位頂級魚油軟膠囊",
    aliases: ["TOP高單位頂級魚油", "TOP FISH OIL SOFTGEL"],
    form: "軟膠囊",
    spec: "60顆",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: ["魚油", "維生素E"],
    indications: [],
    nutritionFocus: "魚油與維生素 E 營養補給",
    nutritionFocusEn: "Fish oil and vitamin E nutrition",
    searchTerms: ["魚油", "營養補給"],
    source: {
      label: "承霖興業產品資料",
      url: "https://chanlin.tw/Product_detail-68",
    },
  },
  {
    // 發元藥局提供的包裝背面照片可確認食品、劑型、成分與規格；沒有公開網址，所以 source 留空。
    slug: "guanlihu-60",
    name: "關立護",
    aliases: ["關立護錠"],
    form: "錠",
    spec: "60錠",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: [
      "葡萄糖胺鹽酸鹽",
      "軟骨素",
      "第二型膠原蛋白",
      "MSM（甲基硫醯基甲烷）",
      "檸檬酸鈣",
      "鳳梨莖萃取物",
      "松樹皮萃取物",
      "維生素D3",
    ],
    indications: [],
    nutritionFocus: "葡萄糖胺、軟骨素與第二型膠原蛋白營養補給",
    nutritionFocusEn: "Glucosamine, chondroitin, and type II collagen nutrition",
    searchTerms: ["關節營養補給", "葡萄糖胺", "軟骨素", "第二型膠原蛋白"],
  },
  {
    // 發元藥局提供的包裝背面照片可確認食品、劑型、成分與規格；沒有公開網址，所以 source 留空。
    slug: "kimura-tiancheng-60",
    name: "木村 添誠膠囊食品",
    aliases: ["木村添誠", "添誠膠囊食品"],
    form: "膠囊",
    spec: "60粒",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: [
      "南瓜子油",
      "葡萄子油",
      "杜松子油",
      "咸豐草萃取物",
      "蕁麻萃取物",
      "白朮萃取物",
      "蔓越莓萃取物",
      "番茄萃取物",
      "葡萄糖酸鋅",
      "硒酵母",
      "維生素E",
      "蒲公英萃取物",
    ],
    indications: [],
    nutritionFocus: "南瓜子油、植物萃取物、鋅與維生素 E 營養補給",
    nutritionFocusEn: "Pumpkin seed oil, botanical extracts, zinc, and vitamin E nutrition",
    searchTerms: ["南瓜子油", "植物萃取物", "鋅", "維生素E", "日常營養補給"],
  },
  {
    slug: "shuwei-600-fish-oil-60",
    name: "舒維-600魚油",
    aliases: ["舒維600魚油", "舒維－600魚油", "舒維魚油膠囊", "EPA 600 CAPSULES"],
    form: "膠囊",
    spec: "60粒",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: ["魚油", "維生素E", "大豆油"],
    indications: [],
    nutritionFocus: "魚油營養補給",
    nutritionFocusEn: "Fish oil nutrition",
    searchTerms: ["魚油", "EPA", "DHA", "營養補給"],
    source: {
      label: "輸入錠狀膠囊狀食品查驗登記資料",
      url: "https://data.zhupiter.com/oddt/18807807/%E8%88%92%E7%B6%AD%E9%AD%9A%E6%B2%B9%E8%86%A0%E5%9B%8A/",
    },
  },
  {
    slug: "baiyi-capsule-60",
    name: "百益膠囊食品",
    aliases: ["百益膠囊"],
    form: "膠囊",
    spec: "60粒",
    licenseNo: "",
    drugClass: "非藥品",
    category: "partner-item",
    ingredients: ["山藥子粉", "藍莓粉", "決明子粉", "大豆卵磷脂", "枸杞子粉", "菊花粉", "紅藻萃取物"],
    indications: [],
    nutritionFocus: "多種植物來源成分的日常營養補給",
    nutritionFocusEn: "Daily nutrition from a blend of plant-derived ingredients",
    searchTerms: ["日常營養補給", "藍莓", "枸杞", "菊花"],
    source: {
      label: "康健知識庫產品資料",
      url: "https://kb.commonhealth.com.tw/supplements/3835.html",
    },
  },
  partnerProvidedProduct({
    slug: "cm-sheliwei-softgel",
    name: "中美 攝利威軟膠囊",
    aliases: ["攝利威", "攝利威軟膠囊"],
    form: "軟膠囊",
    ingredients: ["黑麥花粉", "南瓜籽油", "南瓜籽萃取", "茄紅素", "L-精胺酸", "鋅"],
    nutritionFocus: "黑麥花粉、南瓜籽成分、茄紅素、L-精胺酸與鋅的產品組成",
    searchTerms: ["黑麥花粉", "南瓜籽油", "茄紅素", "L-精胺酸", "鋅"],
    manufacturer: "中美醫藥",
    origin: "待確認；南瓜籽油標示德國有機原料，不等於成品德國製",
  }),
  partnerProvidedProduct({
    slug: "wewell-vision-softgel",
    name: "維維樂 視清／小視清軟膠囊",
    aliases: ["維維樂視清", "小視清", "視清軟膠囊", "小視清軟膠囊"],
    form: "軟膠囊",
    ingredients: ["魚油（EPA／DHA）", "明膠", "葉黃素（紅花籽油、葉黃素、維生素E）", "甘油", "純水", "紅藻萃取物（蝦紅素）", "大豆卵磷脂", "二氧化鈦", "維生素A棕櫚酸酯"],
    nutritionFocus: "魚油、葉黃素、蝦紅素與維生素 A 等成分的產品組成",
    searchTerms: ["魚油", "EPA", "DHA", "葉黃素", "蝦紅素", "維生素A"],
    manufacturer: "維維樂／宜果國際體系",
    origin: "台灣",
  }),
  partnerProvidedProduct({
    slug: "cm-jinguguanjian-sr",
    name: "中美 金固關健緩釋錠",
    aliases: ["金固關健", "金固關健緩釋錠"],
    form: "緩釋錠",
    ingredients: ["雞胸軟骨萃取物（含非變性二型膠原蛋白）", "乳木果油萃取", "MSM（甲基硫醯基甲烷）", "葡萄糖酸鋅", "維生素D3"],
    nutritionFocus: "非變性二型膠原蛋白、MSM、鋅與維生素 D3 的產品組成",
    searchTerms: ["二型膠原蛋白", "MSM", "鋅", "維生素D3", "關節營養補給"],
    manufacturer: "中美醫藥",
    origin: "台灣（通路標示）",
  }),
  partnerProvidedProduct({
    slug: "likuo-fish-oil-30",
    name: "立國 精粹魚油膠囊",
    aliases: ["精粹魚油", "立國精粹魚油"],
    form: "膠囊",
    spec: "30粒",
    ingredients: ["魚油 1000 mg（EPA 480 mg、DHA 360 mg）", "明膠", "甘油", "純水"],
    nutritionFocus: "EPA 與 DHA 魚油的產品組成",
    searchTerms: ["魚油", "EPA", "DHA"],
    manufacturer: "立國藥品股份有限公司",
    origin: "待確認（立國官方產品頁未標成品產地）",
  }),
  partnerProvidedProduct({
    slug: "tianxia-yangshen-jingqu",
    name: "天下生物科技 養身景麴膠囊",
    aliases: ["養身景麴", "養身景麴膠囊"],
    form: "膠囊",
    ingredients: ["紅麴", "紅景天萃取物", "納豆萃取物（納豆激酶）", "人參", "肌醇", "維生素E", "葡萄籽萃取粉", "銀杏果", "甘蔗蠟萃取物", "靈芝菌絲體", "維生素B1", "維生素B2", "維生素B6", "葉酸", "維生素B12"],
    nutritionFocus: "紅麴、紅景天、納豆萃取物與多種維生素的產品組成",
    searchTerms: ["紅麴", "紅景天", "納豆激酶", "人參", "維生素B群"],
    manufacturer: "天下生物科技",
    origin: "台灣",
  }),
  partnerProvidedProduct({
    slug: "hongren-riqingsheng-lm",
    name: "鴻仁 日清勝 LM機能益生菌",
    aliases: ["日清勝", "LM機能益生菌", "日清勝LM"],
    form: "劑型待確認",
    ingredients: ["微結晶狀α-纖維素", "Lactobacillus plantarum MFM 30-3", "Lactobacillus paracasei MFM 18", "硬脂酸鎂", "比利時專利果寡糖 Orafti® P95", "二氧化矽"],
    nutritionFocus: "兩株乳酸菌與果寡糖的產品組成",
    searchTerms: ["益生菌", "乳酸菌", "果寡糖", "Lactobacillus plantarum", "Lactobacillus paracasei"],
    manufacturer: "鴻仁生技有限公司",
    origin: "台灣",
  }),
  partnerProvidedProduct({
    slug: "cm-guer-gan-150mg",
    name: "中美 顧爾肝膠囊",
    aliases: ["顧爾肝", "顧爾肝膠囊"],
    form: "膠囊",
    spec: "150 mg",
    ingredients: ["乾燥乳薊果實萃取物 225 mg（相當於 Silymarin 150 mg，以 Silybin 計）"],
    nutritionFocus: "乳薊果實萃取物所含 Silymarin 的產品組成；產品分類待確認",
    searchTerms: ["乳薊", "Silymarin", "Silybin"],
    manufacturer: "供應商：興中美生技有限公司；製造商：中美兄弟製藥股份有限公司",
    origin: "台灣",
  }),
  partnerProvidedProduct({
    slug: "gude-yishengning-p",
    name: "益聖寧-P軟膠囊",
    aliases: ["益聖寧P", "益聖寧-P"],
    form: "軟膠囊",
    ingredients: ["蕁麻", "杜松子油", "南瓜子油", "蒲公英", "蔓越莓", "葡萄糖酸鋅", "咸豐草", "玉米鬚粉", "番茄紅素", "葡萄籽", "小麥胚芽油"],
    nutritionFocus: "南瓜子油、蔓越莓、植物成分與鋅的產品組成",
    searchTerms: ["南瓜子油", "蔓越莓", "葡萄糖酸鋅", "番茄紅素"],
    manufacturer: "谷淂藥品生技有限公司",
    origin: "德國",
  }),
  partnerProvidedProduct({
    slug: "jingcui-huxinan",
    name: "護欣胺微粒膠囊",
    aliases: ["護欣胺"],
    form: "微粒膠囊",
    ingredients: ["L-精胺酸", "維生素C", "松樹皮萃取物", "L-麩醯胺酸", "綠茶萃取物", "丹參萃取物", "維生素E", "葉酸"],
    nutritionFocus: "L-精胺酸、胺基酸、植物萃取物與維生素的產品組成",
    searchTerms: ["L-精胺酸", "L-麩醯胺酸", "松樹皮", "維生素C", "維生素E", "葉酸"],
    manufacturer: "精萃載體科技股份有限公司",
    origin: "台灣",
  }),
  partnerProvidedProduct({
    slug: "toyo-cukang-b",
    name: "醋康B膠囊",
    aliases: ["醋康B", "東洋醋康B"],
    form: "膠囊",
    ingredients: ["黑醋萃取物 90 mg", "紅花籽油", "維生素E", "維生素B1", "維生素B6", "蜂蠟"],
    nutritionFocus: "黑醋萃取物、紅花籽油與維生素的產品組成",
    searchTerms: ["黑醋", "紅花籽油", "維生素B1", "維生素B6", "維生素E"],
    manufacturer: "東洋",
    origin: "日本",
  }),
  partnerProvidedProduct({
    slug: "icheng-meileshi",
    name: "美樂適素食膠囊",
    aliases: ["美樂適"],
    form: "素食膠囊",
    ingredients: ["紅花籽油", "薯蕷皂素 Diosgenin", "輔酶Q10", "脂肪酸聚合甘油酯"],
    nutritionFocus: "紅花籽油、薯蕷皂素與輔酶 Q10 的產品組成",
    searchTerms: ["紅花籽油", "薯蕷皂素", "Diosgenin", "輔酶Q10"],
    manufacturer: "一成藥品股份有限公司",
    origin: "日本",
  }),
  partnerProvidedProduct({
    slug: "icheng-siyunmeng",
    name: "思韻蒙軟膠囊",
    aliases: ["思韻蒙"],
    form: "軟膠囊",
    ingredients: ["紅花籽油", "薯蕷皂素 Diosgenin", "輔酶Q10"],
    nutritionFocus: "紅花籽油、薯蕷皂素與輔酶 Q10 的產品組成",
    searchTerms: ["紅花籽油", "薯蕷皂素", "Diosgenin", "輔酶Q10"],
    manufacturer: "一成藥品股份有限公司",
    origin: "日本",
  }),
  partnerProvidedProduct({
    slug: "jixiang-jishukang",
    name: "吉舒康軟膠囊",
    aliases: ["吉舒康", "美國吉舒康"],
    form: "軟膠囊",
    ingredients: ["深海魚油", "南極蝦油", "EPA", "DHA"],
    nutritionFocus: "深海魚油、南極蝦油、EPA 與 DHA 的產品組成",
    searchTerms: ["魚油", "南極蝦油", "EPA", "DHA"],
    manufacturer: "吉祥行有限公司",
    origin: "台灣（建利販售頁標示；公司資料另使用「美國吉舒康」名稱，上線前建議核對盒底產地）",
  }),
  partnerProvidedProduct({
    slug: "bio-stand-calcium-softgel",
    name: "Bio-Stand 挺液鈣軟膠囊",
    aliases: ["挺液鈣", "Bio-Stand挺液鈣"],
    form: "軟膠囊",
    ingredients: ["磷酸氫鈣", "葡萄糖酸鈣", "維生素D3", "大豆油", "大豆卵磷脂", "蜂膠"],
    nutritionFocus: "鈣、維生素 D3 與蜂膠等成分的產品組成",
    searchTerms: ["鈣", "葡萄糖酸鈣", "維生素D3", "補鈣"],
    manufacturer: "臺灣默化實業有限公司",
    origin: "美國（進口品）",
  }),
  partnerProvidedProduct({
    slug: "rending-gujieyou",
    name: "固捷優",
    aliases: ["固捷優膠囊"],
    form: "劑型待確認",
    ingredients: ["BioCell Collagen II 二型膠原蛋白 200 mg", "Hytolive 橄欖果萃取 100 mg", "MSM 100 mg", "檸檬酸鈣 70 mg", "維生素C 40 mg", "UC-II 非變性二型膠原蛋白 20 mg"],
    nutritionFocus: "二型膠原蛋白、MSM、鈣與維生素 C 的產品組成",
    searchTerms: ["二型膠原蛋白", "UC-II", "MSM", "檸檬酸鈣", "維生素C"],
    manufacturer: "仁鼎生技有限公司",
    origin: "台灣（通路標示）",
  }),
  partnerProvidedProduct({
    slug: "ouye-jingyong",
    name: "勁勇軟膠囊",
    aliases: ["勁勇"],
    form: "軟膠囊",
    ingredients: ["馬卡根萃取", "鹿鞭", "葫蘆巴萃取", "透納葉", "鹿茸", "南瓜子粉", "管花肉蓯蓉", "L-精胺酸", "銀杏", "鋅", "維生素B群"],
    nutritionFocus: "馬卡、植物與動物來源成分、L-精胺酸、鋅與維生素 B 群的產品組成",
    searchTerms: ["馬卡", "南瓜子", "L-精胺酸", "鋅", "維生素B群"],
    manufacturer: "歐業藥品",
    origin: "台灣",
  }),
  partnerProvidedProduct({
    slug: "greenplus-vasopower",
    name: "舒絡寶 Vasopower",
    aliases: ["舒絡寶", "Vasopower"],
    form: "劑型待確認",
    ingredients: ["人參", "當歸", "刺五加", "雞屎藤", "木瓜", "桂枝", "白朮", "紅棗", "甘草"],
    nutritionFocus: "人參、當歸與多種植物萃取物的產品組成",
    searchTerms: ["人參", "當歸", "刺五加", "木瓜", "白朮"],
    manufacturer: "綠加科技／綠杏",
    origin: "台灣",
  }),
  partnerProvidedProduct({
    slug: "greenplus-discpower",
    name: "龍固寶 DiscPower",
    aliases: ["龍固寶", "DiscPower"],
    form: "劑型待確認",
    ingredients: ["黃耆萃取", "木瓜萃取", "丹參萃取", "雞屎藤萃取", "玉竹萃取", "紅景天萃取", "天麻萃取", "紅棗萃取", "甘草萃取"],
    nutritionFocus: "黃耆、木瓜、丹參與多種植物萃取物的產品組成",
    searchTerms: ["黃耆", "木瓜", "丹參", "紅景天", "天麻"],
    manufacturer: "綠加科技／綠杏",
    origin: "台灣",
  }),
  partnerProvidedProduct({
    slug: "greenplus-elgucare",
    name: "益固康 Elgucare",
    aliases: ["益固康", "Elgucare"],
    form: "劑型待確認",
    // 成分照包裝背面的 Supplement Facts 與中文成分欄逐項核對：是伸筋草
    // （Lycopodium clavatum），不是木瓜 —— 木瓜在舒絡寶與龍固寶才有。
    ingredients: ["黃耆萃取物 210 mg", "大棗萃取物 100 mg", "丹參萃取物 45 mg", "雞屎藤萃取物 35 mg", "伸筋草萃取物 35 mg", "玉竹萃取物 35 mg", "紅景天萃取物 20 mg", "甘草萃取物 20 mg"],
    nutritionFocus: "黃耆、大棗、丹參與多種植物萃取物的產品組成",
    searchTerms: ["黃耆", "大棗", "丹參", "紅景天", "伸筋草"],
    manufacturer: "綠杏生物科技有限公司／綠加科技（LHBcare）",
    origin: "台灣",
    image: {
      src: "/products/greenplus-elgucare.webp",
      width: 900,
      height: 1125,
      kind: "packshot",
      alt: "合作藥局提供的包裝照片，已去背：綠杏 LHBcare 益固康 Elgucare 的 72 粒盒裝與 360 粒罐裝並排，盒面標示「全素可食」與 72 Capsules",
      altEn: "Partner-provided packaging photo: the LHBcare Elgucare 72-capsule carton beside the 360-capsule jar",
    },
  }),
  partnerProvidedProduct({
    slug: "puda-grape-seed",
    name: "安格雅葡萄籽膠囊",
    aliases: ["安格雅", "安格雅葡萄籽"],
    form: "膠囊",
    ingredients: ["葡萄籽", "花粉", "維他命C", "小麥胚芽油"],
    nutritionFocus: "葡萄籽、花粉、維生素 C 與小麥胚芽油的產品組成",
    searchTerms: ["葡萄籽", "花粉", "維生素C", "小麥胚芽油"],
    manufacturer: "普大藥品",
    origin: "美國",
  }),
  partnerProvidedProduct({
    slug: "puda-green-tea-compound",
    name: "普大綠茶複方膠囊",
    aliases: ["綠茶複方膠囊", "普大綠茶複方"],
    form: "膠囊",
    ingredients: ["銀杏", "山楂", "葡萄籽", "綠茶葉／綠茶粉", "啤酒酵母", "苜蓿葉", "維生素"],
    nutritionFocus: "綠茶、葡萄籽、山楂與多種植物成分的產品組成",
    searchTerms: ["綠茶", "葡萄籽", "山楂", "銀杏", "苜蓿葉"],
    manufacturer: "普大藥品",
    origin: "美國",
  }),
  partnerProvidedProduct({
    slug: "yingkai-guguanjian-ucii",
    name: "固關鍵 UC II",
    aliases: ["固關鍵", "固關鍵UC II", "固關鍵UCII"],
    form: "劑型待確認",
    ingredients: ["UC-II® 非變性二型膠原蛋白 40 mg", "北海道鮭魚鼻軟骨", "乳油木果萃取", "葡萄糖胺", "95% 玻尿酸", "MSM"],
    nutritionFocus: "非變性二型膠原蛋白、鮭魚鼻軟骨、葡萄糖胺、玻尿酸與 MSM 的產品組成",
    searchTerms: ["UC-II", "二型膠原蛋白", "葡萄糖胺", "玻尿酸", "MSM"],
    manufacturer: "迎凱有限公司",
    origin: "台灣（依合作藥局提供的產品資料）",
  }),
  partnerProvidedProduct({
    slug: "youquan-super-magnesium",
    name: "新優力超級鎂",
    aliases: ["超級鎂", "新優力鎂"],
    form: "劑型待確認",
    ingredients: ["無水檸檬酸鎂", "水溶性海藻鈣", "D-核糖", "束絲藻", "L-精胺酸", "離胺酸", "異白胺酸", "纈胺酸", "白胺酸", "維生素D3"],
    nutritionFocus: "鎂、海藻鈣、D-核糖、胺基酸與維生素 D3 的產品組成",
    searchTerms: ["鎂", "檸檬酸鎂", "海藻鈣", "D-核糖", "胺基酸", "維生素D3"],
    manufacturer: "優全生技有限公司",
    origin: "台灣",
  }),
  partnerProvidedProduct({
    slug: "chung-jih-youweining",
    name: "佑衛寧 高麗菜濃縮複方膠囊",
    aliases: ["佑衛寧", "高麗菜濃縮複方膠囊"],
    form: "膠囊",
    ingredients: ["全食物型高麗菜濃縮粉（含天然維生素U／S-甲基蛋胺酸）", "SOR-10 秋葵萃取物", "牛蒡濃縮", "芹菜", "蔥", "洋蔥", "鋅"],
    nutritionFocus: "高麗菜、秋葵、牛蒡與多種植物成分的產品組成",
    searchTerms: ["高麗菜", "維生素U", "S-甲基蛋胺酸", "秋葵", "牛蒡", "鋅"],
    manufacturer: "中日藥品",
    origin: "台灣",
  }),
  partnerProvidedProduct({
    slug: "luhsin-l-glutamine",
    name: "賜利康療養素－左旋麩醯胺酸",
    aliases: ["賜利康療養素", "左旋麩醯胺酸", "L-Glutamine"],
    form: "劑型待確認",
    ingredients: ["左旋麩醯胺酸（L-Glutamine）"],
    nutritionFocus: "左旋麩醯胺酸的產品組成",
    searchTerms: ["左旋麩醯胺酸", "L-Glutamine", "麩醯胺酸"],
    manufacturer: "綠心藥品生化科技有限公司",
    origin: "台灣",
  }),
  partnerProvidedProduct({
    slug: "chungchi-yiyuansu-gastrodia-100",
    name: "憶元素 天麻100膠囊",
    aliases: ["憶元素", "天麻100", "憶元素天麻100"],
    form: "膠囊",
    spec: "60粒",
    // 每粒含量照包裝背面【內容物】欄；含乳糖、魚油與黑豆，過敏者要看清楚。
    ingredients: ["龍眼花萃取物 200 mg（含綠蜂膠粉、β-環狀糊精）", "天麻萃取物 100 mg", "綜合維生素B群 75 mg", "蜂王乳粉 50 mg", "魚油粉 30 mg", "乳糖 25.5 mg", "黑豆粉 10 mg", "維生素E粉 5 mg", "二氧化矽 4.5 mg"],
    nutritionFocus: "龍眼花與天麻萃取物，搭配維生素 B 群、蜂王乳與魚油的產品組成",
    searchTerms: ["龍眼花", "天麻", "綠蜂膠", "維生素B群", "蜂王乳", "魚油"],
    manufacturer: "中旗生物科技股份有限公司",
    origin: "台灣",
    image: {
      src: "/products/chungchi-yiyuansu-gastrodia-100.webp",
      width: 900,
      height: 1125,
      kind: "packshot",
      alt: "合作藥局提供的包裝照片，已去背：憶元素 天麻100膠囊的金黃色盒裝正面，後方是同品項的白色瓶裝",
      altEn: "Partner-provided packaging photo: the golden carton of 憶元素 天麻100膠囊 beside its white bottle",
    },
  }),
  partnerProvidedProduct({
    slug: "yuanding-puregps-defense-450",
    name: "強抗力優 450+ Defense",
    aliases: ["強抗力優", "強抗力優450", "PUREGPS", "PUREGPS Defense", "Defense"],
    form: "植物膠囊",
    spec: "60粒",
    // 每粒 450 毫克；非水溶性 250 mg ＋ 水溶性 150 mg 合為原廠標示的
    // Wellmune WGP® 400 mg。原料授權 Kerry。
    ingredients: ["非水溶性葡聚多醣體 250 mg", "水溶性葡聚多醣體 150 mg", "穀胱甘肽 50 mg", "植物膠（羥丙基甲基纖維素）", "鹿角菜膠", "氯化鉀"],
    nutritionFocus: "β-1,3/1,6 酵母葡聚多醣體與穀胱甘肽的產品組成",
    searchTerms: ["酵母葡聚多醣體", "葡聚多醣體", "β-葡聚醣", "Wellmune", "穀胱甘肽"],
    manufacturer: "圓鼎生物科技有限公司",
    origin: "台灣",
    image: {
      src: "/products/yuanding-puregps-defense-450.webp",
      width: 900,
      height: 1125,
      kind: "packshot",
      alt: "合作藥局提供的包裝照片，已去背：PUREGPS 強抗力優 450+ Defense 盒裝正面，標示 60 Capsules、植物膠囊全素與 wellmune 原廠授權",
      altEn: "Partner-provided packaging photo: the PUREGPS Defense 450+ carton front, marked 60 Capsules",
    },
  }),
];

const STORES: Store[] = generated.stores as Store[];

/**
 * 目前沒有任何一家藥局裝盒子，所以沒有任何 offer。
 * 有掃描流之後這裡改成從 API 讀，上層查詢函式不用動。
 */
const OFFERS: Offer[] = [];

// ── 示範模式（業務用） ──────────────────────────────────────────────
//
// 拿去跟藥局老闆談的時候，要讓他看到「裝上盒子之後**你這家店**長什麼樣」。
// 所以 `?preview=1` 會用藥品目錄替該店生出一份示範庫存 —— 頁面上一定
// 同時掛示範橫幅，而且永遠不會出現在正式頁面。

/** FNV-1a。同一家店每次產出同一份示範資料，不依賴時鐘也不會每次重整就跳動。 */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

const PREVIEW_BASE_PRICE: Record<string, number> = {
  "hugu-gaishu-100": 120,
  "shengkangning-150": 150,
  "entineng-230": 230,
  "jinjiweichang-60": 100,
  "keqiqing-capsule": 120,
  "huzhikang-60": 100,
  "huzhikang-150": 150,
};

export function previewOffers(storeSlug: string): Offer[] {
  return DRUGS.flatMap((d) => {
    const h = hash(`${storeSlug}:${d.slug}`);
    if (h % 10 < 2) return []; // 兩成品項這家店沒進貨
    const base = PREVIEW_BASE_PRICE[d.slug] ?? 100;
    return [{
      drugSlug: d.slug,
      storeSlug,
      priceTwd: base + ((h >> 8) % 5) * 2 - 4,
      // Preview availability and price are synthetic, but availability starts unknown.
      // Only a receiving event from the demo pipeline may upgrade this signal.
      daysSinceScan: null,
    }];
  });
}

// ── 查詢 ────────────────────────────────────────────────────────────

export interface StoreRow {
  store: Store;
  priceTwd: number;
  daysSinceScan: number | null;
  badge: StockBadgeSpec;
}

export interface DrugRow {
  drug: Drug;
  priceTwd: number;
  daysSinceScan: number | null;
  badge: StockBadgeSpec;
  store: Store;
}

export function getDrug(slug: string): Drug | undefined {
  return DRUGS.find((d) => d.slug === slug);
}

/**
 * slug 是中文（在地搜尋用中文網址對 SEO 有利），而 Next 給的 params.slug
 * 有時是 percent-encoded、有時已解碼 —— 靜態產生跟實際請求走的路徑不同。
 * 兩種都要能查到，不然會出現「metadata 找得到但頁面 404」。
 */
function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug; // 壞掉的 % 序列會 throw，原樣退回讓它自然查不到
  }
}

export function getStore(slug: string): Store | undefined {
  const decoded = decodeSlug(slug);
  return STORES.find((s) => s.slug === slug || s.slug === decoded);
}

export function allDrugs(): Drug[] {
  return DRUGS;
}

export function allStores(): Store[] {
  return STORES;
}

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/** 藥品頁：附近有這個藥的藥局，依 新鮮度 → 距離 → 價格 排序。 */
export function storesForDrug(drugSlug: string, area?: AreaSlug): StoreRow[] {
  return OFFERS.filter((o) => o.drugSlug === drugSlug)
    .flatMap((o) => {
      const store = getStore(o.storeSlug);
      if (!store || (area && store.area !== area)) return [];
      return [{
        store,
        priceTwd: o.priceTwd,
        daysSinceScan: o.daysSinceScan,
        badge: stockBadge(o.daysSinceScan),
      }];
    })
    .sort(compareByFreshness);
}

/** 這一區的藥局，近的排前面（還沒補座標的排後面）。 */
export function storesInArea(area: AreaSlug): Store[] {
  return STORES.filter((s) => s.area === area).sort(
    (a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity),
  );
}

export interface StoreCountyCityGroup {
  countyCity: string;
  areas: Array<{ area: Area; stores: Store[] }>;
}

/** 首波店家依縣市、服務區分組；順序跟 AREAS 一致，避免畫面隨資料輸入順序漂移。 */
export function storeGroupsByCountyCity(): StoreCountyCityGroup[] {
  const groups: StoreCountyCityGroup[] = [];

  for (const area of AREAS) {
    const stores = storesInArea(area.slug);
    if (stores.length === 0) continue;

    const current = groups.find((group) => group.countyCity === area.countyCity);
    if (current) {
      current.areas.push({ area, stores });
    } else {
      groups.push({ countyCity: area.countyCity, areas: [{ area, stores }] });
    }
  }

  return groups;
}

export function storeCount(): number {
  return STORES.length;
}

/**
 * 藥局頁：本店有貨商品，同樣依新鮮度排序。
 * `preview` 只給業務示範用，正式頁面永遠是 false。
 */
export function drugsForStore(storeSlug: string, preview = false): DrugRow[] {
  const store = getStore(storeSlug);
  if (!store) return [];
  if (preview) return previewDrugsForStore(store);
  return OFFERS.filter((o) => o.storeSlug === storeSlug)
    .flatMap((o) => {
      const drug = getDrug(o.drugSlug);
      if (!drug) return [];
      return [{
        drug,
        store,
        priceTwd: o.priceTwd,
        daysSinceScan: o.daysSinceScan,
        badge: stockBadge(o.daysSinceScan),
      }];
    })
    .sort(compareByFreshness);
}

/** Build a synthetic shelf for an explicit demo store without registering it. */
export function previewDrugsForStore(store: Store): DrugRow[] {
  const source = previewOffers(store.slug);
  return source.filter((o) => o.storeSlug === store.slug)
    .flatMap((o) => {
      const drug = getDrug(o.drugSlug);
      if (!drug) return [];
      return [{
        drug,
        store,
        priceTwd: o.priceTwd,
        daysSinceScan: o.daysSinceScan,
        badge: stockBadge(o.daysSinceScan),
      }];
    })
    .sort(compareByFreshness);
}

export interface Alternative {
  drug: Drug;
  /** 附近有貨（掃描紀錄在 7 天內）的店家數 */
  storesWithStock: number;
  fromPriceTwd: number;
}

/** 同成分替代品 — 沒貨時的出路。比對主成分集合完全相同的其他品項。 */
export function alternativesFor(drugSlug: string, area?: AreaSlug): Alternative[] {
  const drug = getDrug(drugSlug);
  if (!drug || drug.ingredients.length === 0) return [];
  const signature = [...drug.ingredients].sort().join("|");

  return DRUGS.filter(
    (d) =>
      d.slug !== drug.slug &&
      d.ingredients.length > 0 &&
      [...d.ingredients].sort().join("|") === signature,
  )
    .flatMap((d) => {
      const rows = storesForDrug(d.slug, area);
      const inStock = rows.filter((r) => r.badge.tier !== "unknown");
      if (inStock.length === 0) return [];
      return [{
        drug: d,
        storesWithStock: inStock.length,
        fromPriceTwd: Math.min(...inStock.map((r) => r.priceTwd)),
      }];
    })
    .sort((a, b) => b.storesWithStock - a.storesWithStock);
}

/** 首頁「附近現在有貨」：只收今日掃描確認的品項，一個藥只出現一次（取最近的店）。 */
/** 「附近現在有貨」——只看使用者所在區，跨區的距離不可比。 */
export function nearbyInStock(area: AreaSlug = DEFAULT_AREA, limit = 6): DrugRow[] {
  const seen = new Set<string>();
  return OFFERS.filter((o) => o.daysSinceScan !== null && o.daysSinceScan < 1)
    .flatMap((o) => {
      const drug = getDrug(o.drugSlug);
      const store = getStore(o.storeSlug);
      if (!drug || !store || store.area !== area) return [];
      return [{
        drug,
        store,
        priceTwd: o.priceTwd,
        daysSinceScan: o.daysSinceScan,
        badge: stockBadge(o.daysSinceScan),
      }];
    })
    .sort(compareByFreshness)
    .filter((r) => {
      if (seen.has(r.drug.slug)) return false;
      seen.add(r.drug.slug);
      return true;
    })
    .slice(0, limit);
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
}

/**
 * 完整品名／別名優先於症狀詞分流。例：「克氣清咳嗽膠囊」是店家提供的
 * 完整舊品名，不能因為字串裡有「咳嗽」就被誤判成只在描述症狀；單獨搜
 * 「咳嗽」仍然會走安全分流。
 */
export function exactDrugMatches(query: string): Drug[] {
  const q = normalizeSearchText(query.trim());
  if (!q) return [];

  return DRUGS.filter((drug) => {
    const names = [drug.name, ...drug.aliases, drug.nameEn ?? ""];
    return names.some((name) => {
      if (!name) return false;
      const normalizedName = normalizeSearchText(name);
      return q === normalizedName || q === normalizeSearchText(`${name} ${drug.spec}`);
    });
  });
}

export type DrugSearchMatchKind =
  | "name"
  | "alias"
  | "ingredient"
  | "nutritionFocus"
  | "searchTerm"
  | "details";

export interface DrugSearchMatch {
  kind: DrugSearchMatchKind;
  /** 實際命中的原始欄位值；卡片用它解釋為什麼顯示，不生成相似度分數。 */
  value: string;
}

export interface DrugSearchHit {
  drug: Drug;
  match: DrugSearchMatch;
}

interface RankedDrugSearchMatch extends DrugSearchMatch {
  rank: number;
}

function findExact(values: string[], query: string): string | undefined {
  return values.find((value) => value && normalizeSearchText(value) === query);
}

function findIncluded(values: string[], query: string): string | undefined {
  return values.find((value) => value && normalizeSearchText(value).includes(query));
}

/** 回傳這個品項最直接、可在畫面上說明的命中欄位。 */
function searchMatch(drug: Drug, query: string): RankedDrugSearchMatch | null {
  const en = drugCopy(drug, "en");
  const names = [
    drug.name,
    `${drug.name} ${drug.spec}`,
    drug.nameEn ?? "",
    en.name,
    `${en.name} ${en.spec}`,
  ];

  // 完整別名要先於品名內的局部字串。例如「小視清」是別名，不是假造的相關度。
  const exactName = findExact(names, query);
  if (exactName) return { kind: "name", value: exactName, rank: 0 };
  const exactAlias = findExact(drug.aliases, query);
  if (exactAlias) return { kind: "alias", value: exactAlias, rank: 1 };

  const groups: Array<{
    kind: DrugSearchMatchKind;
    rank: number;
    values: string[];
  }> = [
    { kind: "name", rank: 0, values: names },
    { kind: "alias", rank: 1, values: drug.aliases },
    { kind: "ingredient", rank: 2, values: [...drug.ingredients, ...en.ingredients] },
    { kind: "nutritionFocus", rank: 3, values: [drug.nutritionFocus, drug.nutritionFocusEn] },
    { kind: "searchTerm", rank: 4, values: drug.searchTerms },
    {
      kind: "details",
      rank: 5,
      values: [drug.form, drug.spec, ...drug.indications, en.form, en.spec, ...en.indications],
    },
  ];

  for (const group of groups) {
    const value = findIncluded(group.values, query);
    if (value) return { kind: group.kind, value, rank: group.rank };
  }
  return null;
}

/**
 * 搜尋：品名 / 英文名 / 規格 / 成分 / 適應症 都吃。空白不影響比對，讓店家
 * 貼來的「護谷鈣素100粒」和畫面上的「護谷鈣素 100粒」都能找到同一項。
 *
 * `refer` 類回空陣列，由頁面顯示安全提醒，不自行對應商品。
 */
export function searchDrugHits(query: string): DrugSearchHit[] {
  const raw = query.trim();
  if (!raw) return [];
  const normalized = normalizeSearchText(raw);

  const exact = exactDrugMatches(raw);
  if (exact.length > 0) {
    return exact
      .map((drug, catalogIndex) => ({
        drug,
        match: searchMatch(drug, normalized) ?? { kind: "name" as const, value: drug.name, rank: 0 },
        catalogIndex,
      }))
      .sort((a, b) => a.match.rank - b.match.rank || a.catalogIndex - b.catalogIndex)
      .map(({ drug, match }) => ({
        drug,
        match: { kind: match.kind, value: match.value },
      }));
  }

  const hit = matchSymptom(raw);
  if (hit?.kind === "refer") return [];

  const terms = hit?.kind === "expand" ? hit.terms : [raw];
  const matches = new Map<string, { drug: Drug; match: RankedDrugSearchMatch; catalogIndex: number }>();
  for (const t of terms) {
    const q = normalizeSearchText(t);
    for (const [catalogIndex, drug] of DRUGS.entries()) {
      const match = searchMatch(drug, q);
      if (!match) continue;
      const current = matches.get(drug.slug);
      if (!current || match.rank < current.match.rank) {
        matches.set(drug.slug, { drug, match, catalogIndex });
      }
    }
  }

  return [...matches.values()]
    .sort((a, b) => a.match.rank - b.match.rank || a.catalogIndex - b.catalogIndex)
    .map(({ drug, match }) => ({
      drug,
      match: { kind: match.kind, value: match.value },
    }));
}

/** 向後相容的純品項結果；新 UI 應使用 searchDrugHits 保留比對依據。 */
export function searchDrugs(query: string): Drug[] {
  return searchDrugHits(query).map((hit) => hit.drug);
}

export function drugsInCategory(slug: CategorySlug): Drug[] {
  return DRUGS.filter((d) => d.category === slug);
}

export interface DrugSummary {
  drug: Drug;
  storeCount: number;
  /** 最新鮮的那家（rows 已排序，取第一筆） */
  bestBadge: StockBadgeSpec;
  nearestStore: Store | null;
  fromPriceTwd: number | null;
}

/** 搜尋 / 品類列表用的一行摘要。 */
export function drugSummary(drugSlug: string, area?: AreaSlug): DrugSummary | undefined {
  const drug = getDrug(drugSlug);
  if (!drug) return undefined;
  const rows = storesForDrug(drugSlug, area);
  return {
    drug,
    storeCount: rows.length,
    bestBadge: rows[0]?.badge ?? stockBadge(null),
    nearestStore: rows[0]?.store ?? null,
    fromPriceTwd: rows.length > 0 ? Math.min(...rows.map((r) => r.priceTwd)) : null,
  };
}

/** 藥局頁 header 的「N 項」。 */
export function storeItemCount(storeSlug: string, preview = false): number {
  const source = preview ? previewOffers(storeSlug) : OFFERS;
  return source.filter((o) => o.storeSlug === storeSlug).length;
}
