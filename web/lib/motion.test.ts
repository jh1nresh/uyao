import { describe, expect, it } from "vitest";

import { isSmoothScrollHome } from "./motion";

describe("首頁 smooth scroll 路由", () => {
  it.each(["/", "/zh-tw", "/en"])("%s 啟用 company 與 shop 首頁緩衝", (pathname) => {
    expect(isSmoothScrollHome(pathname)).toBe(true);
  });

  it.each(["/zh-tw/store/建芳藥局", "/en/evidence", "/search"])(
    "%s 內頁維持原生捲動",
    (pathname) => {
      expect(isSmoothScrollHome(pathname)).toBe(false);
    },
  );
});
