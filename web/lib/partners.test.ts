import { describe, expect, it } from "vitest";

import { allStores } from "./data";
import {
  PARTNER_PHARMACIES,
  partnerForStore,
  partnersForAlias,
} from "./partners";

const EXPECTED_PRODUCTS = {
  建利西藥房: [
    "護谷鈣素 100粒",
    "勝康寧 150粒",
    "恩體能 230粒",
    "進磯為常 60粒",
  ],
  萊康連鎖藥局: [
    "克氣清咳嗽膠囊",
    "護智康 60粒",
    "護智康 150粒",
    "護谷鈣素 100粒",
    "勝康寧 150粒",
    "恩體能 230粒",
  ],
  萊康中華健保藥局: [
    "克氣清咳嗽膠囊",
    "護智康 60粒",
    "護智康 150粒",
    "護谷鈣素 100粒",
    "勝康寧 150粒",
    "恩體能 230粒",
  ],
  永遠藥師藥局: [],
} as const;

const REQUIRED_ALIASES = {
  建利西藥房: ["建利西藥房", "健利西藥房"],
  萊康連鎖藥局: ["萊康藥局", "來康", "來康藥局", "萊康中正店", "萊康連鎖藥局中正店"],
  萊康中華健保藥局: ["萊康藥局", "來康", "來康藥局", "萊康中華", "萊康中華店"],
  永遠藥師藥局: ["永遠大藥局", "永遠藥局"],
} as const;

const NEW_PARTNER_LOCATIONS = [
  ["萊康連鎖藥局", "luzhou", "新北市蘆洲區中正路126號1樓", "5931142509"],
  ["萊康中華健保藥局", "luzhou", "新北市蘆洲區中華街45-1號1樓", "5931143051"],
  ["永遠藥師藥局", "xitun", "臺中市西屯區西屯路二段28之2號1樓", "5903271648"],
] as const;

describe("合作藥局人工確認資料", () => {
  it("只收錄四個已確認合作的正式藥局 slug", () => {
    expect(Object.keys(PARTNER_PHARMACIES)).toEqual(
      Object.keys(EXPECTED_PRODUCTS),
    );
  });

  it.each(NEW_PARTNER_LOCATIONS)(
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
