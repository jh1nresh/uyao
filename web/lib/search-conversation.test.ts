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

  it("replaces the latest turn when the same query returns a refreshed summary", () => {
    const raw = JSON.stringify([
      { query: "補鈣", summary: "先前結果" },
      { query: "維他命 C", summary: "舊結果摘要" },
    ]);
    const result = advanceShopSearchConversation(raw, {
      query: "維他命 C",
      summary: "更新的結果摘要",
    });
    expect(result.previous).toEqual([{ query: "補鈣", summary: "先前結果" }]);
    expect(result.turns).toEqual([
      { query: "補鈣", summary: "先前結果" },
      { query: "維他命 C", summary: "更新的結果摘要" },
    ]);
  });

  it("treats a trimmed current query as the same latest turn", () => {
    const raw = JSON.stringify([
      { query: "補鈣", summary: "先前結果" },
      { query: "維他命 C", summary: "舊結果摘要" },
    ]);
    const result = advanceShopSearchConversation(raw, {
      query: "  維他命 C  ",
      summary: "更新的結果摘要",
    });
    expect(result.previous).toEqual([{ query: "補鈣", summary: "先前結果" }]);
    expect(result.turns).toEqual([
      { query: "補鈣", summary: "先前結果" },
      { query: "維他命 C", summary: "更新的結果摘要" },
    ]);
  });

  it("keeps A then B then A as three distinct turns", () => {
    let raw: string | null = null;
    raw = JSON.stringify(advanceShopSearchConversation(raw, { query: "A", summary: "A1" }).turns);
    raw = JSON.stringify(advanceShopSearchConversation(raw, { query: "B", summary: "B1" }).turns);
    const result = advanceShopSearchConversation(raw, { query: "A", summary: "A2" });
    expect(result.previous).toEqual([
      { query: "A", summary: "A1" },
      { query: "B", summary: "B1" },
    ]);
    expect(result.turns).toEqual([
      { query: "A", summary: "A1" },
      { query: "B", summary: "B1" },
      { query: "A", summary: "A2" },
    ]);
  });
});
