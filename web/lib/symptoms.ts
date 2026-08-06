/**
 * 症狀口語 → 目錄詞彙的靜態對照表。沒有 LLM。
 *
 * 為什麼需要：`searchDrugs` 是子字串比對，使用者打「我今天被蚊子咬」對不到
 * 任何東西 —— 目錄裡寫的是「蚊蟲叮咬」。這張表把口語收斂成目錄真的有的詞。
 *
 * ## 三個分類，不是一個
 *
 * `expand` 可以對應。只指向**目錄裡真的存在**的 indications／ingredients，
 *          不憑空造詞。頁面會顯示「『蚊子咬』對應到：蚊蟲叮咬」，
 *          讓使用者看得到為什麼是這些結果。
 *
 * `refer`  **不對應**，改成請他問藥師或就醫。這一類是「成藥自選不適當」的
 *          情況 —— 最典型的就是燙傷：目錄裡沾得上邊的只有優碘軟膏，
 *          但燙傷的處置是沖冷水不是抹優碘。自動對應等於給錯誤的處置建議。
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
  眼睛受傷: "眼睛外傷請直接就醫，不要自行點藥。",
  傷口很深: "深部傷口需要清創與評估是否縫合，請就醫。",
};

/**
 * 口語 → 目錄詞。右邊只能是 `lib/data.ts` 裡真的出現過的
 * indications 或 ingredients，不然對應了也搜不到。
 */
const EXPAND: Record<string, string[]> = {
  // 叮咬
  蚊子咬: ["蚊蟲叮咬"],
  被蚊子: ["蚊蟲叮咬"],
  蚊子叮: ["蚊蟲叮咬"],
  被咬: ["蚊蟲叮咬"],
  蟲咬: ["蚊蟲叮咬"],

  // 皮膚
  皮膚癢: ["止癢", "皮膚乾癢"],
  很癢: ["止癢"],
  乾癢: ["皮膚乾癢"],
  脫皮: ["皮膚乾癢"],
  皮膚乾: ["皮膚乾癢"],

  // 痠痛
  腰痠: ["腰痛"],
  閃到腰: ["腰痛"],
  落枕: ["肩頸僵硬"],
  脖子痛: ["肩頸僵硬"],
  肩膀痛: ["肩頸僵硬"],
  肩頸: ["肩頸僵硬"],
  痠痛: ["肌肉痠痛"],
  酸痛: ["肌肉痠痛"],
  鐵腿: ["肌肉痠痛", "運動後不適"],
  運動完: ["運動後不適", "肌肉痠痛"],
  拉傷: ["肌肉痠痛"],
  扭到: ["扭傷"],
  腳踝: ["扭傷"],

  // 頭與暈
  頭痛: ["頭痛"],
  頭很痛: ["頭痛"],
  暈車: ["暈車"],
  想吐: ["暈車"],
  暈船: ["暈車"],

  // 眼睛
  眼睛乾: ["眼睛乾澀"],
  眼睛澀: ["眼睛乾澀"],
  眼睛疲勞: ["眼睛乾澀"],
  乾眼: ["眼睛乾澀"],

  // 小外傷（限「表淺、可自行處理」的範圍）
  擦傷: ["傷口消毒"],
  破皮: ["傷口消毒"],
  小傷口: ["傷口消毒"],
  消毒: ["傷口消毒"],
};


/**
 * 中文口語會在詞中間插程度副詞：「眼睛**好**乾」「皮膚**很**癢」「頭**超**痛」。
 * 子字串比對會因此整個對不上，而且逐條補變體是打地鼠。比對前先把這些字拿掉，
 * 一次解決整類問題。
 *
 * 只在比對時剝除 —— 存進 `demand.jsonl` 的仍然是使用者的原話。
 * 目錄詞彙裡沒有任何一個含這些字，所以不會誤傷。
 */
const INTENSIFIERS = /[好很超挺蠻滿]|有點|有些|非常|十分|一直|老是|總是/g;

function normalize(q: string): string {
  return q.replace(INTENSIFIERS, "");
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
