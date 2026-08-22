import { describe, expect, it } from "vitest";

import { allDrugs } from "./data";
import {
  classifyGuidedQuery,
  isExactCatalogQuery,
  wellnessCandidates,
} from "./guided-search";

describe("首頁空間對話分流", () => {
  const drugs = allDrugs();

  it("完整品名或別名即使含症狀字樣仍走原生搜尋", () => {
    expect(isExactCatalogQuery("克氣清咳嗽膠囊", drugs)).toBe(true);
    expect(classifyGuidedQuery("克氣清咳嗽膠囊", drugs)).toEqual({ kind: "direct" });
    expect(classifyGuidedQuery("護谷鈣素 100粒", drugs)).toEqual({ kind: "direct" });
  });

  it("症狀描述進入安全問答，不直接帶品項", () => {
    expect(classifyGuidedQuery("晚上一直咳嗽", drugs)).toMatchObject({
      kind: "safety",
      matched: "晚上一直咳嗽",
    });
  });

  it("已核准的日常保養詞進入保養確認", () => {
    expect(classifyGuidedQuery("想補鈣", drugs)).toEqual({
      kind: "wellness",
      matched: "想補鈣",
      terms: ["骨骼與關節營養補給"],
    });
  });

  it("保養結果只取完全對應現有目錄欄位的品項", () => {
    expect(wellnessCandidates(drugs, ["骨骼與關節營養補給"]))
      .toEqual([expect.objectContaining({ slug: "hugu-gaishu-100" })]);
    expect(wellnessCandidates(drugs, ["不存在的模型詞"])).toEqual([]);
  });

  it("未知查詢維持原生 GET 搜尋", () => {
    expect(classifyGuidedQuery("葉黃素", drugs)).toEqual({ kind: "direct" });
  });
});
