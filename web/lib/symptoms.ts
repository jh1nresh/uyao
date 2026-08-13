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
  advice: string;
}

export type SymptomMatch = SymptomExpand | SymptomRefer | null;

/**
 * 成藥自選不適當 —— 命中就不給商品，改給處置方向。
 * 寧可少對應也不要對錯：這裡多一筆的代價是使用者多問一個人，
 * 少一筆的代價可能是他買錯東西。
 */
const REFER: Record<string, string> = {
  燙傷: "先用流動冷水沖 15–20 分鐘、不要塗抹任何藥膏或偏方，再請藥師或醫師評估。起水泡、面積大於手掌、或發生在臉部與關節請直接就醫。",
  灼傷: "先用流動冷水沖 15–20 分鐘，不要自行塗藥，再請藥師或醫師評估。",
  燒傷: "先用流動冷水沖 15–20 分鐘，不要自行塗藥，再請藥師或醫師評估。",
  發燒: "成藥退燒只能緩解症狀。持續發燒、合併意識改變或呼吸急促請就醫。",
  胸痛: "胸痛可能是急症，請直接就醫，不要自行買藥處理。",
  呼吸困難: "呼吸困難請直接就醫，不要自行買藥處理。",
  流血不止: "請直接就醫或前往急診。",
  誤食: "請立即就醫，並保留誤食物品的包裝供醫師判斷。",
  過敏: "過敏反應的成因與嚴重度差異很大，請由藥師或醫師判斷；出現喘、臉部腫脹請直接就醫。",
  "a mosquito bite": "A mosquito bite can need pharmacist assessment; seek urgent care for widespread hives, facial swelling, or breathing trouble.",
  soreness: "Soreness has different causes. This catalog does not list pain medicines; ask a pharmacist before self-selecting treatment.",
  itching: "Itching has many causes. This catalog does not list anti-itch medicines; ask a pharmacist before self-selecting treatment.",
  "chest pain": "Chest pain can be an emergency. Seek medical care now rather than self-selecting a product.",
  "difficulty breathing": "Difficulty breathing needs urgent medical care. Do not self-select a product through search.",
  "severe allergic reaction": "A severe allergic reaction needs urgent medical care. Do not self-select a product through search.",
  "stroke-like weakness": "Stroke-like weakness needs emergency medical care. Do not self-select a product through search.",
  眼睛受傷: "眼睛外傷請直接就醫，不要自行點藥。",
  傷口很深: "深部傷口需要清創與評估是否縫合，請就醫。",
  咳血: "咳血需要由醫師評估原因，請儘快就醫；若同時呼吸困難、胸痛或大量出血，請直接前往急診。",
  咳嗽: "咳嗽成因很多，這批收錄品項是一般食品，不是止咳藥。請先詢問藥師；若持續、合併發燒、胸痛或呼吸困難，請就醫。",
  被蚊子咬: "先清洗並避免搔抓；這批收錄品項不是止癢藥。請藥師協助判斷適合的處理方式；若全身起疹、臉部腫脹或喘，請直接就醫。",
  痠痛: "痠痛的部位與原因不同，這批收錄品項不是止痛藥。請先詢問藥師；若為外傷後劇痛、無法活動或持續惡化，請就醫。",
  止癢: "搔癢成因很多，這批收錄品項沒有止癢藥。請先詢問藥師；若全身起疹、臉部腫脹或喘，請直接就醫。",
  心悸: "心悸可能需要醫療評估，請先詢問醫師或藥師；若合併胸痛、喘或暈厥，請直接就醫。",
  血尿: "血尿需要醫療評估，請就醫，不要以保健食品自行處理。",
  排尿困難: "排尿困難的原因很多，請由醫師或藥師評估，不要以保健食品自行處理。",
  記憶力突然變差: "記憶或認知狀況突然改變需要醫療評估，請就醫，不要以營養補充品自行處理。",
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
const INTENSIFIERS = /[好很超挺蠻滿]|有點|有些|非常|十分|一直|老是|總是/g;

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
      return { kind: "refer", matched: e.key, advice: REFER[e.key] };
    }
  }
  for (const e of EXPAND_KEYS) {
    if (q.includes(e.norm)) {
      return { kind: "expand", matched: e.key, terms: EXPAND[e.key] };
    }
  }
  return null;
}
