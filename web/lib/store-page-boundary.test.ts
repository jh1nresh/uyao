import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { PARTNER_PHARMACIES, partnersForProduct } from "./partners";

const STORE_VIEW_SOURCE = readFileSync(
  new URL("../components/StoreView.tsx", import.meta.url),
  "utf8",
);

/**
 * 漏斗刻意只有一個方向：搜尋品項 → 品項頁列出提供它的合作藥局 → 藥局頁。
 * 藥局頁停在公開基本資料，不揭露這家店賣什麼、有什麼貨 —— 反過來列，等於
 * 替門市公開一份庫存清單。這條界線很容易被「順手補個品項清單」翻掉，所以
 * 直接盯住藥局頁的來源。
 */
describe("藥局頁只給基本資料", () => {
  it("藥局頁不讀合作藥局的確認品項清單", () => {
    expect(STORE_VIEW_SOURCE).not.toContain("confirmedProducts");
  });

  it("品項貨架只出現在業務示範分支", () => {
    expect(STORE_VIEW_SOURCE.match(/<PreviewShelf/g) ?? []).toHaveLength(1);
  });

  it("品項 → 藥局的方向仍然通", () => {
    for (const partner of Object.values(PARTNER_PHARMACIES)) {
      for (const product of partner.confirmedProducts) {
        expect(partnersForProduct(product).map((p) => p.storeSlug)).toContain(partner.storeSlug);
      }
    }
  });
});
