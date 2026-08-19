import { describe, expect, it } from "vitest";

import { allStores } from "./data";
import { PARTNER_STORE_ITEMS } from "./partner-stores";
import {
  PARTNER_PHARMACIES,
  PARTNER_PHARMACY_COUNT,
  partnerForStore,
  partnersForAlias,
} from "./partners";

const EXPECTED_PRODUCTS = {
  建利西藥房: [
    "護谷鈣素 100粒",
    "勝康寧 150粒",
    "恩體能 230粒",
    "進磯為常-D 60粒",
  ],
  南興西藥房: [],
  建芳藥局: [],
  大豐藥局: [],
  美得心藥局: [],
  樂活健保藥局: [],
  祥好大藥局: [],
  中山藥局: [],
  萊康連鎖藥局: [
    "克氣清膠囊",
    "護智慷 150粒",
    "護谷鈣素 100粒",
    "勝康寧 150粒",
    "恩體能 230粒",
  ],
  萊康中華健保藥局: [
    "克氣清膠囊",
    "護智慷 150粒",
    "護谷鈣素 100粒",
    "勝康寧 150粒",
    "恩體能 230粒",
  ],
  永遠藥師藥局: [],
  發元藥局: [
    "TOP高單位頂級魚油軟膠囊 60顆",
    "舒維-600魚油 60粒",
    "百益膠囊食品 60粒",
  ],
  喜來樂中西藥局: [],
  一銘藥局: [],
} as const;

const REQUIRED_ALIASES = {
  建利西藥房: ["建利西藥房", "健利西藥房"],
  南興西藥房: ["南興西藥房", "南興藥房"],
  建芳藥局: ["建芳藥局", "建芳西藥房"],
  大豐藥局: ["大豐藥局"],
  美得心藥局: ["美得心藥局"],
  樂活健保藥局: ["樂活健保藥局"],
  祥好大藥局: ["祥好大藥局"],
  中山藥局: ["中山藥局"],
  萊康連鎖藥局: ["萊康藥局", "來康", "來康藥局", "萊康中正店", "萊康連鎖藥局中正店"],
  萊康中華健保藥局: ["萊康藥局", "來康", "來康藥局", "萊康中華", "萊康中華店"],
  永遠藥師藥局: ["永遠大藥局", "永遠藥局"],
  發元藥局: ["發元藥局", "發元西藥房", "發元藥房"],
  喜來樂中西藥局: ["喜來樂中西藥局", "新莊喜來樂中西藥局", "喜來樂藥局"],
  一銘藥局: ["一銘藥局", "一銘西藥房", "新莊一銘藥局"],
} as const;

const PARTNER_LOCATIONS = [
  ["建利西藥房", "datong", "臺北市大同區重慶北路1段85之3號1樓", null],
  ["南興西藥房", "yilan", "宜蘭縣宜蘭市光復路130號（南館市場口）", null],
  ["建芳藥局", "luodong", "宜蘭縣羅東鎮民權路31號", null],
  ["大豐藥局", "datong", "臺北市大同區昌吉街96號", null],
  ["美得心藥局", "linkou", "新北市林口區公園路63號1樓", "5931171957"],
  ["樂活健保藥局", "xinzhuang", "新北市新莊區八德街58巷1號1樓", null],
  ["祥好大藥局", "xinzhuang", "新北市新莊區新泰路331號", "5931060744"],
  ["中山藥局", "zhongshan", "臺北市中山區林森北路128號", "5901102891"],
  ["萊康連鎖藥局", "luzhou", "新北市蘆洲區中正路126號1樓", "5931142509"],
  ["萊康中華健保藥局", "luzhou", "新北市蘆洲區中華街45-1號1樓", "5931143051"],
  ["永遠藥師藥局", "xitun", "臺中市西屯區西屯路二段28之2號1樓", "5903271648"],
  ["發元藥局", "miaoli", "苗栗縣苗栗市中正路908號", null],
  ["喜來樂中西藥局", "xinzhuang", "新北市新莊區昌平街20號1樓", "593106B134"],
  ["一銘藥局", "xinzhuang", "新北市新莊區幸福路542號(1樓)", "593106C319"],
] as const;

describe("合作藥局人工確認資料", () => {
  it("收錄十四個已確認合作的正式藥局 slug", () => {
    expect(Object.keys(PARTNER_PHARMACIES)).toEqual(
      Object.keys(EXPECTED_PRODUCTS),
    );
    expect(PARTNER_PHARMACY_COUNT).toBe(14);
  });

  it("首頁合作藥局列沿用正式店名與行政區", () => {
    expect(PARTNER_STORE_ITEMS).toEqual([
      { name: "建利西藥房", district: "大同區" },
      { name: "南興西藥房", district: "宜蘭市" },
      { name: "建芳藥局", district: "羅東鎮" },
      { name: "大豐藥局", district: "大同區" },
      { name: "美得心藥局", district: "林口區" },
      { name: "樂活健保藥局", district: "新莊區" },
      { name: "祥好大藥局", district: "新莊區" },
      { name: "中山藥局", district: "中山區" },
      { name: "萊康連鎖藥局", district: "蘆洲區" },
      { name: "萊康中華健保藥局", district: "蘆洲區" },
      { name: "永遠藥師藥局", district: "西屯區" },
      { name: "發元藥局", district: "苗栗市" },
      { name: "喜來樂中西藥局", district: "新莊區" },
      { name: "一銘藥局", district: "新莊區" },
    ]);
  });

  it.each(PARTNER_LOCATIONS)(
    "%s 的正式名稱、服務區、地址與健保代碼已進入藥局資料",
    (slug, area, address, nhiCode) => {
      expect(allStores().find((store) => store.slug === slug)).toMatchObject({
        name: slug,
        area,
        address,
        nhiCode,
      });
    },
  );

  it.each(Object.entries(EXPECTED_PRODUCTS))(
    "%s 的品項名稱與規格完全相符",
    (slug, products) => {
      expect(partnerForStore(slug)?.confirmedProducts).toEqual(products);
    },
  );

  it.each(Object.entries(REQUIRED_ALIASES))(
    "%s 保留已知別名",
    (slug, aliases) => {
      expect(partnerForStore(slug)?.aliases).toEqual(
        expect.arrayContaining([...aliases]),
      );
    },
  );

  it("永遠藥師藥局尚無確認品項", () => {
    expect(partnerForStore("永遠藥師藥局")?.confirmedProducts).toEqual([]);
  });

  it("共用別名萊康藥局會保留兩家門市", () => {
    expect(partnersForAlias("萊康藥局").map((partner) => partner.storeSlug)).toEqual([
      "萊康連鎖藥局",
      "萊康中華健保藥局",
    ]);
  });

  it("常見誤寫來康也會保留兩家門市", () => {
    expect(partnersForAlias("來康").map((partner) => partner.storeSlug)).toEqual([
      "萊康連鎖藥局",
      "萊康中華健保藥局",
    ]);
  });
});
