/**
 * 已由店家確認的合作關係與販售品項。
 *
 * 這份人工確認資料不代表盒子已安裝，也不是即時庫存或藥品主檔；因此不應
 * 寫回政府藥局資料、Store.status 或掃描產生的 OFFERS。
 */
export type PartnerStoreSlug =
  | "建利西藥房"
  | "南興西藥房"
  | "大豐藥局"
  | "美得心藥局"
  | "樂活健保藥局"
  | "祥好大藥局"
  | "中山藥局"
  | "萊康連鎖藥局"
  | "萊康中華健保藥局"
  | "永遠藥師藥局"
  | "發元藥局";

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
      "進磯為常-D 60粒",
      "益聖寧-P軟膠囊",
      "護欣胺微粒膠囊",
      "醋康B膠囊",
      "美樂適素食膠囊",
      "思韻蒙軟膠囊",
      "吉舒康軟膠囊",
      "Bio-Stand 挺液鈣軟膠囊",
      "固捷優",
      "勁勇軟膠囊",
      "舒絡寶 Vasopower",
      "龍固寶 DiscPower",
      "益固康 Elgucare",
      "安格雅葡萄籽膠囊",
      "普大綠茶複方膠囊",
    ],
  },
  南興西藥房: {
    storeSlug: "南興西藥房",
    aliases: ["南興西藥房", "南興藥房"],
    confirmedProducts: [
      "中美 攝利威軟膠囊",
      "維維樂 視清／小視清軟膠囊",
      "中美 金固關健緩釋錠",
      "立國 精粹魚油膠囊 30粒",
      "天下生物科技 養身景麴膠囊",
      "鴻仁 日清勝 LM機能益生菌",
      "中美 顧爾肝膠囊 150 mg",
    ],
  },
  大豐藥局: {
    storeSlug: "大豐藥局",
    aliases: ["大豐藥局"],
    confirmedProducts: [
      "固關鍵 UC II",
      "新優力超級鎂",
      "佑衛寧 高麗菜濃縮複方膠囊",
      "賜利康療養素－左旋麩醯胺酸",
    ],
  },
  美得心藥局: {
    storeSlug: "美得心藥局",
    aliases: ["美得心藥局"],
    confirmedProducts: [],
  },
  樂活健保藥局: {
    storeSlug: "樂活健保藥局",
    aliases: ["樂活健保藥局"],
    confirmedProducts: [],
  },
  祥好大藥局: {
    storeSlug: "祥好大藥局",
    aliases: ["祥好大藥局"],
    confirmedProducts: [],
  },
  中山藥局: {
    storeSlug: "中山藥局",
    aliases: ["中山藥局"],
    confirmedProducts: [],
  },
  萊康連鎖藥局: {
    storeSlug: "萊康連鎖藥局",
    aliases: ["萊康藥局", "來康", "來康藥局", "萊康中正店", "萊康連鎖藥局中正店"],
    confirmedProducts: [
      "克氣清膠囊",
      "護智慷 60粒",
      "護智慷 150粒",
      "護谷鈣素 100粒",
      "勝康寧 150粒",
      "恩體能 230粒",
    ],
  },
  萊康中華健保藥局: {
    storeSlug: "萊康中華健保藥局",
    aliases: ["萊康藥局", "來康", "來康藥局", "萊康中華", "萊康中華店"],
    confirmedProducts: [
      "克氣清膠囊",
      "護智慷 60粒",
      "護智慷 150粒",
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
  發元藥局: {
    storeSlug: "發元藥局",
    aliases: ["發元藥局", "發元西藥房", "發元藥房"],
    confirmedProducts: [
      "TOP高單位頂級魚油軟膠囊 60顆",
      "關立護 60錠",
      "木村 添誠膠囊食品 60粒",
      "舒維-600魚油 60粒",
      "百益膠囊食品 60粒",
    ],
  },
} as const satisfies Record<PartnerStoreSlug, PartnerPharmacy>;

export const PARTNER_PHARMACY_COUNT = Object.keys(PARTNER_PHARMACIES).length;

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
