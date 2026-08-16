import { describe, expect, it } from "vitest";

import { answerSupportQuestion, supportFaqs, SUPPORT_FAQS } from "./support";

describe("Store OS 支援問答", () => {
  it("用固定規則回答預留與通知問題", () => {
    expect(answerSupportQuestion("我要去哪裡看預留單號？")?.id).toBe("reservation");
    expect(answerSupportQuestion("Store OS 關閉後怎麼收到推播？")?.id).toBe("notification");
  });

  it("未知問題交給真人，不假裝知道答案", () => {
    expect(answerSupportQuestion("可以幫我改公司統編嗎？")).toBeNull();
  });

  it("每個快捷問題都有可顯示的答案", () => {
    expect(SUPPORT_FAQS.every((faq) => faq.question && faq.answer)).toBe(true);
  });

  it("answers English support questions from the English FAQ set", () => {
    expect(answerSupportQuestion("How do I handle a customer reservation?", "en")?.id).toBe("reservation");
    expect(answerSupportQuestion("Can I use the checkout agent?", "en")?.id).toBe("agents");
    expect(supportFaqs("en").every((faq) => faq.question && faq.answer)).toBe(true);
  });
});
