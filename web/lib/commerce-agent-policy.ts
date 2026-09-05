import { matchSymptom } from "./symptoms";
import type { Locale } from "./i18n";

// Conservative routing, not a diagnosis or a complete clinical screening system.
const URGENT = /胸痛|呼吸困難|呼吸急促|流血不止|昏厥|暈倒|誤食|chest pain|difficulty breathing|shortness of breath|passed out/i;
const PROFESSIONAL_REVIEW = /瘀青|淤青|頭痛|肚子痛|腹痛|拉肚子|腹瀉|不舒服|疼痛|懷孕|孕婦|哺乳|小孩|兒童|嬰兒|診斷|治療|劑量|副作用|交互作用|停藥|換藥|吃幾|吃多少|怎麼吃|能不能吃|可以吃嗎|適合我|推薦.*藥|藥.*推薦|bruis(?:e|es|ing)|headache|pregnan|breastfeed|dosage|side effects?|interactions?|can i take|how much.*take|diagnos/i;
const SALES_CLAIMS = /下單|付款|配送|代購|保證.*(?:療效|有效)|廣告|(?:處方藥|抗生素).*(?:買|購)|checkout|place an order|guaranteed cure|prescription.*without/i;

export function commerceAgentSafetyMessage(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  locale: Locale,
): string | null {
  const queries = messages.filter((message) => message.role === "user")
    .map((message) => message.content.normalize("NFKC").replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, ""));
  if (queries.some((query) => URGENT.test(query))) {
    return locale === "en"
      ? "This description may need urgent medical attention. Seek medical care now; call 119 in Taiwan if you need emergency help. Do not wait for the allergy check or an AI reply."
      : "這個描述可能需要緊急醫療協助，請直接就醫；需要緊急救援時請撥 119。不要等待過敏問答或 AI 回覆。";
  }
  for (const query of [...queries].reverse()) {
    const symptom = matchSymptom(query);
    if (symptom?.kind === "refer" || PROFESSIONAL_REVIEW.test(query)) {
      return locale === "en"
        ? "Please ask a pharmacist or clinician to assess this symptom or medicine question. I cannot diagnose, choose a medicine or supplement for you, or decide a dose, substitution, or whether to stop treatment. Seek medical care if symptoms are severe or worsening."
        : "這次症狀或用藥問題需要由藥師或醫師評估。我不會代為診斷、挑選治療藥品或保健品，也不決定劑量、換藥或停藥；若症狀嚴重或惡化，請就醫。";
    }
    if (SALES_CLAIMS.test(query)) {
      return locale === "en"
        ? "uYao Agent provides catalog information and pharmacy contact options. It cannot place orders, take payment, arrange medicine delivery, or create claims about medical efficacy. A pharmacist must assess medicine questions."
        : "uYao Agent 提供目錄資訊與藥局聯絡選項，不代為下單、收款、安排藥品配送或製作療效宣傳。用藥問題請由藥師評估。";
    }
  }
  return null;
}
