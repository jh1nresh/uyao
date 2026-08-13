import { describe, expect, it } from "vitest";

import { withArea } from "./area-route";
import { storeGroupsByCountyCity } from "./data";
import { nearestServiceArea } from "./geo";

describe("區域網址", () => {
  it("在目前藥品頁加上區域", () => {
    expect(withArea("/drug/hugu-gaishu-100", "", "linkou")).toBe(
      "/drug/hugu-gaishu-100?area=linkou",
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
    [25.0849, 121.4737, "luzhou"],
    [25.0359, 121.4322, "xinzhuang"],
    [25.0637, 121.5265, "zhongshan"],
    [24.1813, 120.6466, "xitun"],
    [24.566667, 120.816444, "miaoli"],
  ] as const)("選出距離最近的服務區", (lat, lng, area) => {
    expect(nearestServiceArea({ lat, lng })).toBe(area);
  });
});

describe("首波店家縣市與行政區分組", () => {
  it("依固定縣市與服務區順序收錄每一家店", () => {
    const groups = storeGroupsByCountyCity();

    expect(groups.map((group) => ({
      countyCity: group.countyCity,
      areas: group.areas.map((entry) => ({
        area: entry.area.shortName,
        stores: entry.stores.map((store) => store.name),
      })),
    }))).toEqual([
      {
        countyCity: "臺北市",
        areas: [
          { area: "大同區", stores: ["建利西藥房"] },
          { area: "中山區", stores: ["中山藥局"] },
        ],
      },
      {
        countyCity: "新北市",
        areas: [
          { area: "林口區", stores: ["美得心藥局"] },
          { area: "蘆洲區", stores: ["萊康連鎖藥局", "萊康中華健保藥局"] },
          { area: "新莊區", stores: ["祥好大藥局", "樂活健保藥局"] },
        ],
      },
      { countyCity: "臺中市", areas: [{ area: "西屯區", stores: ["永遠藥師藥局"] }] },
      { countyCity: "苗栗縣", areas: [{ area: "苗栗市", stores: ["發元藥局"] }] },
    ]);

    expect(groups.flatMap((group) => group.areas).flatMap((entry) => entry.stores)).toHaveLength(9);
  });
});
