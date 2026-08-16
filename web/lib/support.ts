export interface SupportFaq {
  id: "reservation" | "notification" | "agents";
  question: string;
  answer: string;
  keywords: string[];
}

export const SUPPORT_FAQS: SupportFaq[] = [
  {
    id: "reservation",
    question: "客戶預留怎麼處理？",
    answer: "新單會直接出現在「需要你」。先用單號與手機末三碼核對，再由店家確認能否供應；確認前不要向顧客承諾現貨。",
    keywords: ["預留", "單號", "訂單", "客戶", "取貨"],
  },
  {
    id: "notification",
    question: "為什麼沒有收到 LINE？",
    answer: "Store OS 會直接接收預留，不需要用 LINE 收店務通知。登入後保持網頁開啟，新單會每 15 秒同步一次。",
    keywords: ["line", "通知", "沒收到", "同步"],
  },
  {
    id: "agents",
    question: "其他 Agent 可以用嗎？",
    answer: "目前只有店長 Agent 的預留收單已連線；庫存、採購與結帳是功能預覽，還不會執行真實店務。",
    keywords: ["agent", "庫存", "採購", "結帳", "開通"],
  },
];

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("zh-TW");
}

export function answerSupportQuestion(question: string): SupportFaq | null {
  const normalized = normalize(question);
  if (!normalized) return null;
  return SUPPORT_FAQS.find((faq) =>
    normalize(faq.question) === normalized || faq.keywords.some((keyword) => normalized.includes(keyword))
  ) ?? null;
}
