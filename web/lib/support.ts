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
    question: "Store OS 關閉後怎麼收到新工作？",
    answer: "到帳號與門市設定開啟工作通知。允許瀏覽器通知後，新預留、催單、取消與逾期可用 Web Push 提醒；完整工作狀態仍以 Store OS 為準。",
    keywords: ["通知", "沒收到", "推播", "同步", "關閉"],
  },
  {
    id: "agents",
    question: "其他 Agent 可以用嗎？",
    answer: "目前只有店長 Agent 的預留收單已連線；庫存、採購與結帳是功能預覽，還不會執行真實店務。",
    keywords: ["agent", "庫存", "採購", "結帳", "開通"],
  },
];

export const SUPPORT_FAQS_EN: SupportFaq[] = [
  {
    id: "reservation",
    question: "How do I handle a customer reservation?",
    answer: "New reservations appear under Needs you. Verify the reservation code and the last three digits of the phone number, then confirm whether the store can fulfill it. Do not promise availability before confirmation.",
    keywords: ["reservation", "order", "customer", "pickup", "code"],
  },
  {
    id: "notification",
    question: "How do I receive new work when Store OS is closed?",
    answer: "Enable Work notifications in Account and store settings. After you allow browser notifications, Web Push can alert this device about new reservations, reminders, cancellations, and expiries. Store OS remains the source of truth.",
    keywords: ["notification", "notify", "push", "sync", "closed"],
  },
  {
    id: "agents",
    question: "Can I use the other Agents?",
    answer: "Only the Manager Agent's reservation inbox is connected today. Inventory, Procurement, and Checkout are previews and do not perform live store operations yet.",
    keywords: ["agent", "inventory", "procurement", "checkout", "available"],
  },
];

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("zh-TW");
}

export function supportFaqs(locale: "zh" | "en" = "zh"): SupportFaq[] {
  return locale === "en" ? SUPPORT_FAQS_EN : SUPPORT_FAQS;
}

export function answerSupportQuestion(question: string, locale: "zh" | "en" = "zh"): SupportFaq | null {
  const normalized = normalize(question);
  if (!normalized) return null;
  return supportFaqs(locale).find((faq) =>
    normalize(faq.question) === normalized || faq.keywords.some((keyword) => normalized.includes(keyword))
  ) ?? null;
}
