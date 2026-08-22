import { describe, expect, it } from "vitest";

import { shouldOpenGuidedComposer } from "./guided-search";

describe("首頁空間對話輸入狀態", () => {
  it("第一個非空字元就展開對話，不等待送出", () => {
    expect(shouldOpenGuidedComposer("")).toBe(false);
    expect(shouldOpenGuidedComposer("   ")).toBe(false);
    expect(shouldOpenGuidedComposer("咳")).toBe(true);
  });
});
