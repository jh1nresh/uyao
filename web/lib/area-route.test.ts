import { describe, expect, it } from "vitest";

import { withArea } from "./area-route";
import { nearestServiceArea } from "./geo";

describe("區域網址", () => {
  it("在目前藥品頁加上區域", () => {
    expect(withArea("/drug/salonpas-ae", "", "linkou")).toBe(
      "/drug/salonpas-ae?area=linkou",
    );
  });

  it("切區時保留搜尋字串", () => {
    expect(withArea("/search", "q=%E8%9A%8A%E5%AD%90%E5%92%AC&area=datong", "xinzhuang")).toBe(
      "/search?q=%E8%9A%8A%E5%AD%90%E5%92%AC&area=xinzhuang",
    );
  });
});

describe("GPS 選區", () => {
  it.each([
    [25.0633, 121.513, "datong"],
    [25.0772, 121.3916, "linkou"],
    [25.0359, 121.4322, "xinzhuang"],
    [25.0637, 121.5265, "zhongshan"],
  ] as const)("選出距離最近的服務區", (lat, lng, area) => {
    expect(nearestServiceArea({ lat, lng })).toBe(area);
  });
});
