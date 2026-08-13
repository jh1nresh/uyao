/**
 * 症狀口語 → 目錄詞彙的靜態對照表。沒有 LLM。
 *
 * 為什麼需要：使用者會輸入症狀或日常保養需求，而不只輸入品名。這張表
 * 把安全、可查證的保養需求收斂成目錄詞；不適合自行選品的描述則先分流。
 *
 * ## 三個分類，不是一個
 *
 * `expand` 只指向 `Drug.nutritionFocus`／`searchTerms` 裡已查證的食品定位，
 *          不把食品寫成能治療症狀或疾病。
 *
 * `refer`  **不對應**，改成請他問藥師或就醫。這一類是「成藥自選不適當」的
 *          情況；自動對應到商品會讓人誤以為我們在推薦用藥。
 *
 * `null`   一般查詢，照原本的比對走。
 *
 * ## 這張表不是醫療建議
 *
 * 它做的是**檢索詞正規化**，不是判斷該吃什麼。頁面上呈現的仍然是「搜尋結果」，
 * 而且症狀類查詢一律附上「不確定請問藥師」。加詞之前先問一句：
 * 「這個對應會不會讓人買錯東西？」會的話放進 `REFER`。
 */

export interface SymptomExpand {
  kind: "expand";
  /** 命中的口語詞，用來跟使用者解釋 */
  matched: string;
  /** 要一起拿去搜尋的目錄詞彙 */
  terms: string[];
}

export interface SymptomRefer {
  kind: "refer";
  matched: string;
  adviceZh: string;
  adviceEn: string;
  /** 可在安全提醒下直接顯示的日常保養搜尋，不是症狀推薦。 */
  wellness?: WellnessAlternative;
}

export type SymptomMatch = SymptomExpand | SymptomRefer | null;

export interface WellnessAlternative {
  queryZh: string;
  queryEn: string;
}

/**
 * 成藥自選不適當 —— 命中就不給商品，改給處置方向。
 * 寧可少對應也不要對錯：這裡多一筆的代價是使用者多問一個人，
 * 少一筆的代價可能是他買錯東西。
 */
interface ReferralCopy {
  zh: string;
  en: string;
  wellness?: WellnessAlternative;
}

const RESPIRATORY_WELLNESS: WellnessAlternative = {
  queryZh: "呼吸道保養",
  queryEn: "Daily respiratory wellness",
};

const JOINT_WELLNESS: WellnessAlternative = {
  queryZh: "關節保養",
  queryEn: "Bone and joint nutrition",
};

const REFERRAL = {
  burn: {
    zh: "先用流動冷水沖 15–20 分鐘，不要塗抹藥膏或偏方，再請藥師或醫師評估；起水泡、面積大於手掌或發生在臉部與關節請直接就醫。",
    en: "Cool the burn under running water for 15–20 minutes. Do not apply ointment or home remedies. Ask a pharmacist or clinician; seek care for blistering, a large area, or burns on the face or a joint.",
  },
  fever: {
    zh: "持續發燒、合併意識改變、胸痛或呼吸急促時請就醫，不要透過搜尋自行選品。",
    en: "Fever needs medical assessment when it persists or comes with confusion, chest pain, or rapid breathing. Do not self-select a product through search.",
  },
  chestPain: {
    zh: "胸痛可能是急症，請直接就醫，不要自行買藥處理。",
    en: "Chest pain can be an emergency. Seek medical care now rather than self-selecting a product.",
  },
  breathing: {
    zh: "呼吸困難或急促需要緊急醫療評估，請直接就醫，不要自行買藥處理。",
    en: "Breathing difficulty or rapid breathing needs urgent medical care. Do not self-select a product through search.",
  },
  bleeding: {
    zh: "流血不止請直接就醫或前往急診。",
    en: "Bleeding that will not stop needs urgent medical care or an emergency department.",
  },
  ingestion: {
    zh: "請立即就醫，並保留誤食物品的包裝供醫師判斷。",
    en: "Seek medical care immediately and keep the swallowed product packaging for the clinician to review.",
  },
  allergy: {
    zh: "過敏反應的成因與嚴重度差異很大，請由藥師或醫師判斷；出現喘、臉部腫脹請直接就醫。",
    en: "Allergic reactions vary in severity. Ask a pharmacist or clinician; seek urgent care for breathing trouble or facial swelling.",
  },
  mosquito: {
    zh: "先清洗並避免搔抓；目前目錄沒有止癢藥。請藥師協助判斷；若全身起疹、臉部腫脹或喘，請直接就醫。",
    en: "Clean the area and avoid scratching. This catalog has no anti-itch medicine. Ask a pharmacist; seek urgent care for widespread hives, facial swelling, or breathing trouble.",
  },
  soreness: {
    zh: "痠痛的部位與原因不同，目前目錄沒有止痛藥。請先詢問藥師；外傷後劇痛、無法活動或持續惡化時請就醫。",
    en: "Soreness has different causes, and this catalog has no pain medicine. Ask a pharmacist; seek care after an injury if pain is severe, movement is limited, or symptoms worsen.",
  },
  itching: {
    zh: "搔癢成因很多，目前目錄沒有止癢藥。請先詢問藥師；若全身起疹、臉部腫脹或喘，請直接就醫。",
    en: "Itching has many causes, and this catalog has no anti-itch medicine. Ask a pharmacist; seek urgent care for widespread hives, facial swelling, or breathing trouble.",
  },
  injury: {
    zh: "這類外傷需要由醫療專業人員評估，請就醫，不要自行選藥。",
    en: "This injury needs professional medical assessment. Seek care rather than self-selecting a medicine.",
  },
  cough: {
    zh: "這個咳嗽描述需要先由藥師或醫師評估，不顯示關聯品項；若持續、惡化、咳血，或合併胸痛、喘、昏厥、嘴唇發紫，請儘快就醫。",
    en: "This cough description needs pharmacist or medical assessment, so related items are not shown. Seek prompt care if it persists, worsens, involves blood, chest pain, breathing trouble, fainting, or blue lips.",
  },
  coughWithWellness: {
    zh: "咳嗽或喉嚨不適有不同原因，以下品項不是治療建議；症狀持續、惡化，或合併發燒、胸痛、呼吸困難等警訊時，請詢問藥師或就醫。",
    en: "Cough or throat discomfort can have different causes. The items below are not treatment recommendations; ask a pharmacist or seek care if symptoms persist, worsen, or come with fever, chest pain, or breathing trouble.",
    wellness: RESPIRATORY_WELLNESS,
  },
  coughMedicine: {
    zh: "目前目錄沒有止咳藥；請先詢問藥師，不要把呼吸道日常保養品當成治療用藥。",
    en: "This catalog does not list a cough medicine. Ask a pharmacist and do not treat a daily-wellness item as medicine.",
  },
  soreThroat: {
    zh: "喉嚨痛或其他未明確限定的喉嚨不適，請先詢問藥師或醫師；若吞嚥或呼吸困難，請儘快就醫。",
    en: "A sore throat or an unspecified throat symptom can have different causes. Ask a pharmacist or clinician; seek prompt care if swallowing or breathing is difficult.",
  },
  generalAssessment: {
    zh: "這個狀況不適合透過搜尋自行選品，請先詢問藥師或醫師；若症狀嚴重或惡化，請就醫。",
    en: "This situation is not suitable for product self-selection. Ask a pharmacist or clinician, and seek care if symptoms are severe or worsening.",
  },
  emergencyWeakness: {
    zh: "突然無力或類似中風的症狀需要緊急醫療評估，請立即就醫。",
    en: "Sudden or stroke-like weakness needs emergency medical care. Seek help immediately.",
  },
  fainting: {
    zh: "突然暈倒、昏倒或昏厥需要緊急醫療評估，請立即就醫。",
    en: "Fainting or passing out needs urgent medical assessment. Seek medical care immediately.",
  },
  joint: {
    zh: "膝蓋或關節疼痛、腫脹、無法活動，或外傷後不適，請由藥師或醫師評估，不要透過搜尋自行選品。",
    en: "Knee or joint pain, swelling, limited movement, or symptoms after an injury need pharmacist or medical assessment. Do not self-select a product through search.",
  },
  jointWithWellness: {
    zh: "膝蓋或關節不適有不同原因，以下只列日常營養補充資料，不是依症狀推薦保健品；若疼痛、腫脹、無法活動、外傷後不適或持續惡化，請詢問藥師或就醫。",
    en: "Knee or joint discomfort can have different causes. The items below are daily nutrition information, not supplement recommendations based on symptoms; ask a pharmacist or seek care for pain, swelling, limited movement, injury, or worsening symptoms.",
    wellness: JOINT_WELLNESS,
  },
} as const satisfies Record<string, ReferralCopy>;

const REFER: Record<string, ReferralCopy> = {
  燙傷: REFERRAL.burn,
  灼傷: REFERRAL.burn,
  燒傷: REFERRAL.burn,
  發燒: REFERRAL.fever,
  fever: REFERRAL.fever,
  胸痛: REFERRAL.chestPain,
  "chest pain": REFERRAL.chestPain,
  呼吸困難: REFERRAL.breathing,
  呼吸急促: REFERRAL.breathing,
  "difficulty breathing": REFERRAL.breathing,
  "shortness of breath": REFERRAL.breathing,
  流血不止: REFERRAL.bleeding,
  誤食: REFERRAL.ingestion,
  過敏: REFERRAL.allergy,
  "severe allergic reaction": REFERRAL.allergy,
  被蚊子咬: REFERRAL.mosquito,
  "a mosquito bite": REFERRAL.mosquito,
  痠痛: REFERRAL.soreness,
  soreness: REFERRAL.soreness,
  止癢: REFERRAL.itching,
  itching: REFERRAL.itching,
  眼睛受傷: REFERRAL.injury,
  傷口很深: REFERRAL.injury,
  咳血: REFERRAL.cough,
  止咳藥: REFERRAL.coughMedicine,
  咳嗽藥: REFERRAL.coughMedicine,
  止咳: REFERRAL.coughMedicine,
  "cough medicine": REFERRAL.coughMedicine,
  "cough syrup": REFERRAL.coughMedicine,
  喉嚨痛: REFERRAL.soreThroat,
  "sore throat": REFERRAL.soreThroat,
  胸悶: REFERRAL.generalAssessment,
  喘: REFERRAL.breathing,
  心悸: REFERRAL.generalAssessment,
  血尿: REFERRAL.generalAssessment,
  排尿困難: REFERRAL.generalAssessment,
  記憶力突然變差: REFERRAL.generalAssessment,
  "stroke-like weakness": REFERRAL.emergencyWeakness,
  膝蓋不舒服: REFERRAL.jointWithWellness,
  關節不舒服: REFERRAL.jointWithWellness,
  "knee discomfort": REFERRAL.jointWithWellness,
  "joint discomfort": REFERRAL.jointWithWellness,
  膝蓋無法活動: REFERRAL.joint,
  關節無法活動: REFERRAL.joint,
  膝蓋痛: REFERRAL.joint,
  關節痛: REFERRAL.joint,
  膝蓋腫: REFERRAL.joint,
  關節腫: REFERRAL.joint,
  "knee pain": REFERRAL.joint,
  "joint pain": REFERRAL.joint,
  "knee swelling": REFERRAL.joint,
  "joint swelling": REFERRAL.joint,
  暈倒: REFERRAL.fainting,
  昏倒: REFERRAL.fainting,
  昏厥: REFERRAL.fainting,
  fainting: REFERRAL.fainting,
  "passed out": REFERRAL.fainting,
};

/**
 * 口語保養需求 → 目錄詞。右邊只能是 `lib/data.ts` 裡真的出現過的
 * nutritionFocus 或 searchTerms，不然對應了也搜不到。
 */
const EXPAND: Record<string, string[]> = {
  想補鈣: ["骨骼與關節營養補給"],
  補鈣: ["骨骼與關節營養補給"],
  骨骼保養: ["骨骼與關節營養補給"],
  關節保養: ["骨骼與關節營養補給"],
  男性保養: ["男性日常保養與營養補給"],
  熟齡男性保養: ["男性日常保養與營養補給"],
  循環保養: ["山楂配方的循環日常保養"],
  心血管保養: ["山楂配方的循環日常保養"],
  酵素補充: ["綜合酵素營養補給"],
  呼吸道保養: ["呼吸道日常保養"],
  思緒保養: ["PS 磷脂醯絲胺酸營養補給"],
  腦部保養: ["PS 磷脂醯絲胺酸營養補給"],
  專注保養: ["PS 磷脂醯絲胺酸營養補給"],
};


/**
 * 中文口語會在詞中間插程度副詞。比對前先把這些字拿掉，讓安全分流詞
 * 與保養需求詞不會因為「很／超」等修飾語而漏接。
 *
 * 只在比對時剝除 —— 存進 `demand.jsonl` 的仍然是使用者的原話。
 * 目錄詞彙裡沒有任何一個含這些字，所以不會誤傷。
 */
// 「一直／持續／老是／總是」是病程資訊，不是程度副詞，不能剝掉後誤當低風險查詢。
const INTENSIFIERS = /[好很超挺蠻滿]|有點|有些|非常|十分/g;

function normalize(q: string): string {
  return q.replace(INTENSIFIERS, "").toLowerCase();
}

/**
 * key 也要走同一套正規化，否則含程度副詞的 key（「傷口很深」）在比對時
 * 永遠對不上 —— 那是安全類的漏接，不是小瑕疵。
 * 顯示時仍然用原始 key。長的先比，讓「眼睛受傷」贏過「眼睛乾」這類前綴衝突。
 */
function indexOf(table: Record<string, unknown>) {
  return Object.keys(table)
    .map((key) => ({ key, norm: normalize(key) }))
    .filter((e) => e.norm.length > 0)
    .sort((a, b) => b.norm.length - a.norm.length);
}

const REFER_KEYS = indexOf(REFER);
const EXPAND_KEYS = indexOf(EXPAND);

function referral(matched: string, copy: ReferralCopy): SymptomRefer {
  return {
    kind: "refer",
    matched,
    adviceZh: copy.zh,
    adviceEn: copy.en,
    ...(copy.wellness ? { wellness: copy.wellness } : {}),
  };
}

function compactChinese(query: string): string {
  return query.replace(/[\s，。！？、；：,.!?;:'"’“”]/g, "");
}

/**
 * 少數明確、短而低風險的句型可以在安全提醒下直接顯示日常保養資料。
 * 其他咳嗽／喉嚨描述只給分流，
 * 避免用黑名單猜漏病程或警訊。
 */
function mildWellnessSymptom(raw: string, normalized: string): SymptomRefer | null {
  const zh = compactChinese(normalized);

  if (/^(?:我)?(?:今天)?(?:咳嗽|咳)(?:一下)?$/.test(zh)) {
    return referral(raw, REFERRAL.coughWithWellness);
  }
  if (/^(?:我)?(?:今天)?喉嚨(?:乾癢|乾|不舒服)$/.test(zh)) {
    return referral(raw, REFERRAL.coughWithWellness);
  }

  const en = normalized.trim().replace(/[.!?]+$/g, "").replace(/\s+/g, " ");
  if (
    /^(?:(?:a )?(?:mild |little )?cough|(?:i have |i have got |i've got )(?:a )?(?:mild |little )?cough|(?:i'm |i am )?coughing)$/.test(en)
  ) {
    return referral(raw, REFERRAL.coughWithWellness);
  }
  if (
    /^(?:(?:a |my )?dry throat|throat discomfort|my throat (?:is|feels) dry)$/.test(en)
  ) {
    return referral(raw, REFERRAL.coughWithWellness);
  }

  return null;
}

function containsCough(query: string): boolean {
  return query.includes("咳") || /\bcough(?:s|ed|ing)?\b/.test(query);
}

function containsThroat(query: string): boolean {
  return query.includes("喉嚨") || /\bthroat\b/.test(query);
}

/**
 * 使用者打的是整句（「我今天被蚊子咬」），所以是用表裡的詞去比對句子，
 * 不是反過來。`refer` 一律優先於 `expand` —— 安全的那邊先贏。
 */
export function matchSymptom(query: string): SymptomMatch {
  const raw = query.trim();
  if (!raw) return null;
  const q = normalize(raw);

  for (const e of REFER_KEYS) {
    if (q.includes(e.norm)) {
      return referral(e.key, REFER[e.key]);
    }
  }

  const mildWellness = mildWellnessSymptom(raw, q);
  if (mildWellness) return mildWellness;

  // 完整品名會由 data.ts 的 exactDrugMatches 先處理；走到這裡的其他咳嗽／喉嚨句子保守分流。
  if (containsCough(q)) return referral(raw, REFERRAL.cough);
  if (containsThroat(q)) return referral(raw, REFERRAL.soreThroat);

  for (const e of EXPAND_KEYS) {
    if (q.includes(e.norm)) {
      return { kind: "expand", matched: e.key, terms: EXPAND[e.key] };
    }
  }
  return null;
}
