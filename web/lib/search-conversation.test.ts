import { describe, expect, it } from "vitest";

import { advanceShopSearchConversation } from "./search-conversation";

describe("shop search conversation", () => {
  it("keeps only three earlier turns and does not duplicate the current reload", () => {
    let raw: string | null = null;
    for (const query of ["一", "二", "三", "四", "五"]) {
      raw = JSON.stringify(advanceShopSearchConversation(raw, { query, summary: `${query}的結果` }).turns);
    }
    const result = advanceShopSearchConversation(raw, { query: "五", summary: "五的結果" });
    expect(result.previous.map((turn) => turn.query)).toEqual(["二", "三", "四"]);
    expect(result.turns.map((turn) => turn.query)).toEqual(["二", "三", "四", "五"]);
  });

  it("drops corrupt per-tab history", () => {
    expect(advanceShopSearchConversation("not-json", { query: "補鈣", summary: "找到資料" })).toEqual({
      previous: [],
      turns: [{ query: "補鈣", summary: "找到資料" }],
    });
  });
});
