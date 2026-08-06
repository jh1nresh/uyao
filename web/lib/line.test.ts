import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";

import { reservationFlex, verifySignature } from "./line";

const SECRET = "test-secret-not-real";
const sign = (body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(body, "utf8").digest("base64");

beforeEach(() => {
  process.env.LINE_CHANNEL_SECRET = SECRET;
});

/**
 * 簽章是 webhook 唯一的信任邊界。放行一個偽造請求，別人就能替藥局
 * 「確認」或「取消」任何一筆預留。
 */
describe("LINE webhook 簽章", () => {
  const body = JSON.stringify({ events: [{ type: "follow" }] });

  it("正確簽章放行", () => {
    expect(verifySignature(body, sign(body))).toBe(true);
  });

  it("body 被竄改就失效", () => {
    expect(verifySignature(body + " ", sign(body))).toBe(false);
  });

  it("重新序列化的 body 對不上 —— 所以驗簽一定要用原始字串", () => {
    const reserialized = JSON.stringify(JSON.parse(body)) + "\n";
    expect(verifySignature(reserialized, sign(body))).toBe(false);
  });

  it("錯的密鑰、空簽章、非 base64、長度不符都不會 throw 只會回 false", () => {
    expect(verifySignature(body, sign(body, "wrong"))).toBe(false);
    expect(verifySignature(body, null)).toBe(false);
    expect(verifySignature(body, "!!!not-base64!!!")).toBe(false);
    expect(verifySignature(body, "YWJj")).toBe(false);
  });

  it("沒設密鑰時一律拒絕，不能 fail open", () => {
    delete process.env.LINE_CHANNEL_SECRET;
    expect(verifySignature(body, sign(body))).toBe(false);
  });
});

/**
 * 示範頁是公開的，任何人都能對已綁定的真藥局產生示範單。
 * 卡片長得跟真單一樣的話，藥師會真的把商品從架上拿下來。
 */
describe("預留卡片必須分得出真假", () => {
  const base = {
    code: "A-347",
    drugName: "綠油精",
    drugSpec: "10ml",
    priceTwd: 65,
    storeName: "中山藥局",
    contactKind: "phone" as const,
    contact: "0912345678",
    holdHours: 4,
  };

  it("示範單的標題列與真單不同色，而且推播預覽有前綴", () => {
    const real = reservationFlex(base) as any;
    const demo = reservationFlex({ ...base, demo: true }) as any;
    expect(demo.contents.header.backgroundColor).not.toBe(
      real.contents.header.backgroundColor,
    );
    expect(demo.altText).toContain("示範");
    expect(real.altText).not.toContain("示範");
  });

  it("兩顆 postback 按鈕帶著取貨碼 —— 少了任一顆迴圈就合不上", () => {
    const f = reservationFlex(base) as any;
    const actions = f.contents.footer.contents.map((b: any) => b.action.data);
    expect(actions).toEqual([
      "action=confirm&code=A-347",
      "action=reject&code=A-347",
    ]);
  });

  it("卡片上要有手機尾號，藥師到店才有東西可核對", () => {
    const f = JSON.stringify(reservationFlex(base));
    expect(f).toContain("678");
  });
});
