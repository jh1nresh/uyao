/**
 * 已由店家確認的合作關係與販售品項。
 *
 * 這份人工確認資料不代表盒子已安裝，也不是即時庫存或藥品主檔；因此不應
 * 寫回政府藥局資料、Store.status 或掃描產生的 OFFERS。
 */
export type PartnerStoreSlug =
  | "建利西藥房"
  | "萊康連鎖藥局"
  | "萊康中華健保藥局"
  | "永遠藥師藥局";

export interface PartnerPharmacy {
  readonly storeSlug: PartnerStoreSlug;
  readonly aliases: readonly string[];
  readonly confirmedProducts: readonly string[];
}

export const PARTNER_PHARMACIES = {
  建利西藥房: {
    storeSlug: "建利西藥房",
    aliases: ["建利西藥房", "健利西藥房"],
    confirmedProducts: [
      "護谷鈣素 100粒",
      "勝康寧 150粒",
      "恩體能 230粒",
      "進磯為常 60粒",
    ],
  },
  萊康連鎖藥局: {
    storeSlug: "萊康連鎖藥局",
    aliases: ["萊康藥局", "來康", "來康藥局", "萊康中正店", "萊康連鎖藥局中正店"],
    confirmedProducts: [
      "克氣清咳嗽膠囊",
      "護智康 60粒",
      "護智康 150粒",
      "護谷鈣素 100粒",
      "勝康寧 150粒",
      "恩體能 230粒",
    ],
  },
  萊康中華健保藥局: {
    storeSlug: "萊康中華健保藥局",
    aliases: ["萊康藥局", "來康", "來康藥局", "萊康中華", "萊康中華店"],
    confirmedProducts: [
      "克氣清咳嗽膠囊",
      "護智康 60粒",
      "護智康 150粒",
      "護谷鈣素 100粒",
      "勝康寧 150粒",
      "恩體能 230粒",
    ],
  },
  永遠藥師藥局: {
    storeSlug: "永遠藥師藥局",
    aliases: ["永遠大藥局", "永遠藥局"],
    confirmedProducts: [],
  },
} as const satisfies Record<PartnerStoreSlug, PartnerPharmacy>;

export function partnerForStore(storeSlug: string): PartnerPharmacy | undefined {
  return PARTNER_PHARMACIES[storeSlug as PartnerStoreSlug];
}

/**
 * 別名不是唯一鍵，例如「萊康藥局」同時指向兩家門市，所以一律回傳陣列。
 */
export function partnersForAlias(alias: string): PartnerPharmacy[] {
  const candidate = alias.trim();

  return Object.values(PARTNER_PHARMACIES).filter(
    (partner) =>
      partner.storeSlug === candidate ||
      partner.aliases.some((partnerAlias) => partnerAlias === candidate),
  );
}

/** 回傳曾把這個完整品項名稱／規格交給我們的合作藥局；不等於即時有貨。 */
export function partnersForProduct(product: string): PartnerPharmacy[] {
  return Object.values(PARTNER_PHARMACIES).filter((partner) =>
    partner.confirmedProducts.some((confirmed) => confirmed === product),
  );
}
