import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/components/LocaleProvider";
import DrugPage, { generateMetadata } from "@/app/(consumer)/drug/[slug]/page";
import { getDrug, getStore, storesForDrug } from "./data";
import { drugCopy, type Locale } from "./i18n";
import { partnersForProduct } from "./partners";
import { known } from "./pending";
import { productInfoPanels } from "./product-info-content";
import { SHOP_URL } from "./shop";
import { isIndexableCatalogItem } from "./shop-index";
import type { Drug } from "./types";
import {
  catalogItemIdentity,
  catalogPageShowsFindingRequest,
  catalogPageShowsNutritionFocus,
  catalogPageShowsPharmacyContacts,
  catalogPageShowsSourcedIngredients,
  catalogPartnerProductLabel,
  catalogSearchDescription,
  catalogSourceKind,
} from "./catalog-search-description";
import { getRequestLocale } from "./locale-server";

vi.mock("./locale-server", () => ({ getRequestLocale: vi.fn() }));
vi.mock("./seo-server", () => ({
  consumerIndexablePageRobots: async () => ({ index: true, follow: true }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/zh-tw/drug/test",
  useSearchParams: () => new URLSearchParams(),
}));

const SOURCED = "hugu-gaishu-100";
const PARTNER = "greenplus-elgucare";
const PLACEHOLDER = "deligan";

function drug(slug: string): Drug {
  const found = getDrug(slug);
  expect(found, slug).toBeDefined();
  return found as Drug;
}

function isolate(overrides: Partial<Drug>): Drug {
  return {
    ...drug("huzhikang-60"),
    slug: "synthetic-unlisted-item",
    name: "合成測試品項",
    nameEn: undefined,
    aliases: [],
    ...overrides,
  };
}

async function metadataFor(slug: string, locale: Locale) {
  vi.mocked(getRequestLocale).mockResolvedValue(locale);
  return generateMetadata({ params: Promise.resolve({ slug }) });
}

async function visibleText(slug: string, locale: Locale): Promise<string> {
  vi.mocked(getRequestLocale).mockResolvedValue(locale);
  const page = await DrugPage({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve({}),
  });
  const stream = await renderToReadableStream(
    createElement(LocaleProvider, { locale, children: page }),
  );
  await stream.allReady;
  const html = await new Response(stream).text();
  return html.replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function expectSharedBoundaries(description: string, locale: Locale) {
  expect(description).not.toMatch(/24\s*h|24小時|現貨|庫存充足|一定有貨|page two|CTR/i);
  expect(description).not.toMatch(/大同區|林口區|士林區|datong|linkou/i);
  expect(description.toLowerCase()).not.toContain("non-drug");
  expect(description).not.toContain("非藥品");
  expect(description).not.toContain("approved medicine");
  expect(description).not.toContain("核准藥品");
  if (locale === "en") {
    expect(description).toContain("not live stock");
    expect(description).toContain("ask a pharmacy");
  } else {
    expect(description).toContain("不代表即時有貨");
    expect(description).toContain("須向藥師確認");
  }
}

describe("catalog search description decisions", () => {
  it("leads partner, public-source, and no-source items with identity then page content", () => {
    const sourced = drug(SOURCED);
    const partner = drug(PARTNER);
    const placeholder = drug(PLACEHOLDER);

    expect(catalogSourceKind(sourced)).toBe("public");
    expect(catalogSourceKind(partner)).toBe("partner");
    expect(catalogSourceKind(placeholder)).toBe("none");

    const sourcedZh = catalogSearchDescription(sourced, "zh");
    const partnerZh = catalogSearchDescription(partner, "zh");
    const placeholderZh = catalogSearchDescription(placeholder, "zh");

    expect(sourcedZh.startsWith("護谷鈣素 100粒：查看")).toBe(true);
    expect(sourcedZh).toContain("成分");
    expect(sourcedZh).toContain("藥局聯絡方式");
    expect(sourcedZh).toContain("頁面列出有來源的成分與營養補充方向");
    expect(sourcedZh.indexOf("護谷鈣素")).toBeLessThan(sourcedZh.indexOf("合作藥局") === -1 ? sourcedZh.length : sourcedZh.indexOf("合作藥局"));
    expect(sourcedZh.startsWith("護谷鈣素 100粒由合作藥局提供並收錄於 uYao 試營運目錄")).toBe(false);

    expect(partnerZh.startsWith("益固康 Elgucare：查看")).toBe(true);
    expect(partnerZh).toContain("成分");
    expect(partnerZh).toContain("資料由合作藥局提供");
    expect(partnerZh).not.toContain("規格待確認");

    expect(placeholderZh.startsWith("得力干：查看")).toBe(true);
    expect(placeholderZh).not.toContain("成分");
    expect(placeholderZh).not.toContain("規格待確認");
    expect(placeholderZh).toContain("藥局聯絡方式");

    for (const text of [sourcedZh, partnerZh, placeholderZh]) {
      expectSharedBoundaries(text, "zh");
    }
  });

  it("does not infer a non-drug classification from a public source alone", () => {
    const pendingPublic = isolate({
      name: "來源待分類測試品",
      spec: "10粒",
      drugClass: "待確認",
      ingredients: ["測試成分 A"],
      nutritionFocus: "日常營養補給",
      nutritionFocusEn: "Daily nutrition",
      source: { label: "公開測試來源", url: "https://example.com/source" },
    });

    expect(catalogSourceKind(pendingPublic)).toBe("public");
    expect(pendingPublic.drugClass).toBe("待確認");

    const zh = catalogSearchDescription(pendingPublic, "zh");
    const en = catalogSearchDescription(pendingPublic, "en");
    expect(zh).toContain("來源待分類測試品 10粒：查看");
    expect(en).toContain("來源待分類測試品 10 count: View");
    expectSharedBoundaries(zh, "zh");
    expectSharedBoundaries(en, "en");
    expect(en.toLowerCase()).not.toContain("non-drug product");
  });

  it("omits unsourced ingredients and pending nutrition copy", () => {
    const unsourced = drug("guanlihu-60");
    expect(unsourced.ingredients.length).toBeGreaterThan(0);
    expect(unsourced.source).toBeUndefined();
    expect(catalogPageShowsSourcedIngredients(unsourced)).toBe(false);

    const facts = productInfoPanels(unsourced, "zh").find((panel) => panel.kind === "facts")!;
    expect(facts.sections[0].rows).toEqual([{ name: "成分資料待確認。" }]);

    const description = catalogSearchDescription(unsourced, "zh");
    expect(description).not.toContain("成分");
    expect(description).not.toContain(unsourced.ingredients[0]);
    expect(description.startsWith("關立護 60錠：查看品項資料、來源與藥局聯絡方式。")).toBe(true);
    expectSharedBoundaries(description, "zh");
  });

  it("keeps pending classification off the snippet and drops placeholder spec", () => {
    const pending = drug("huzhikang-60");
    expect(pending.drugClass).toBe("待確認");
    expect(pending.spec).toBe("60粒");

    const zh = catalogSearchDescription(pending, "zh");
    const en = catalogSearchDescription(pending, "en");
    expect(zh).not.toContain("待確認");
    expect(en).not.toContain("Classification pending");
    expect(en).not.toContain("pending");
    expect(catalogSearchDescription(drug(PLACEHOLDER), "zh")).not.toContain("規格待確認");
    expect(catalogSearchDescription(drug(PLACEHOLDER), "en")).not.toContain("Package size pending");
    expectSharedBoundaries(zh, "zh");
    expectSharedBoundaries(en, "en");
  });

  it("uses manufacturer-provided English names only", () => {
    const withNameEn = drug(PARTNER);
    const withoutNameEn = drug(SOURCED);
    expect(withNameEn.nameEn).toBe("Elgucare");
    expect(withoutNameEn.nameEn).toBeUndefined();

    expect(catalogItemIdentity(withNameEn, "en")).toBe("Elgucare");
    expect(catalogSearchDescription(withNameEn, "en").startsWith("Elgucare: View")).toBe(true);

    expect(catalogItemIdentity(withoutNameEn, "en")).toBe("護谷鈣素 100 count");
    expect(catalogSearchDescription(withoutNameEn, "en").startsWith("護谷鈣素 100 count: View")).toBe(true);
    expect(catalogSearchDescription(withoutNameEn, "en")).not.toMatch(/Glucaline|Transbone|Bone Calcium/i);
  });

  it("mentions contacts or a finding request only when that UI is present", () => {
    const listed = drug(SOURCED);
    expect(partnersForProduct(catalogPartnerProductLabel(listed)).length).toBeGreaterThan(0);
    expect(catalogPageShowsPharmacyContacts(listed)).toBe(true);
    expect(catalogPageShowsFindingRequest(listed)).toBe(false);
    expect(catalogSearchDescription(listed, "zh")).toContain("藥局聯絡方式");
    expect(catalogSearchDescription(listed, "zh")).not.toContain("找藥需求");

    const noContact = isolate({
      spec: "12粒",
      source: { label: "公開測試來源", url: "https://example.com/source" },
      ingredients: ["測試成分 A"],
    });
    expect(partnersForProduct(catalogPartnerProductLabel(noContact))).toEqual([]);
    expect(storesForDrug(noContact.slug)).toEqual([]);
    expect(catalogPageShowsPharmacyContacts(noContact)).toBe(false);
    expect(catalogPageShowsFindingRequest(noContact)).toBe(true);

    const zh = catalogSearchDescription(noContact, "zh");
    const en = catalogSearchDescription(noContact, "en");
    expect(zh).not.toContain("藥局聯絡方式");
    expect(zh).toContain("可留下找藥需求");
    expect(en).not.toContain("pharmacy contacts");
    expect(en).toContain("leave a finding request");
    expectSharedBoundaries(zh, "zh");
    expectSharedBoundaries(en, "en");
  });

  it("does not promise a phone when listed pharmacies have none", () => {
    const noPhone = isolate({
      spec: "8粒",
      source: undefined,
      ingredients: [],
    });
    const tianyang = getStore("天養藥局");
    expect(tianyang?.phone).toBe("");

    const description = catalogSearchDescription(noPhone, "zh");
    expect(description).not.toContain("藥局聯絡方式");
    expect(description).toContain("可留下找藥需求");
  });

  it("preserves a long product label at the front in both locales", () => {
    const longName = "超長測試品項名稱用來確認搜尋描述會完整保留品名與規格而不改寫或省略";
    const long = isolate({
      name: longName,
      spec: "30包（每包5公克）",
      nameEn: undefined,
      source: { kind: "partner", label: "合作藥局提供商品資料" },
      ingredients: ["左旋麩醯胺酸"],
    });

    const zh = catalogSearchDescription(long, "zh");
    const en = catalogSearchDescription(long, "en");
    expect(zh.startsWith(`${longName} 30包（每包5公克）：查看`)).toBe(true);
    expect(en.startsWith(`${longName} 30包（每包5公克）: View`)).toBe(true);
    expectSharedBoundaries(zh, "zh");
    expectSharedBoundaries(en, "en");
  });
});

describe("generateMetadata uses the shared description", () => {
  it("returns the same description the helper would for sourced, partner, and placeholder items", async () => {
    for (const slug of [SOURCED, PARTNER, PLACEHOLDER]) {
      for (const locale of ["zh", "en"] as const) {
        const item = drug(slug);
        const metadata = await metadataFor(slug, locale);
        expect(metadata.description).toBe(catalogSearchDescription(item, locale));
        expect(metadata.title).toBe(
          locale === "en"
            ? `${catalogItemIdentity(item, locale)} — partner-listed item`
            : `${catalogItemIdentity(item, locale)}｜合作藥局提供品項`,
        );
        expect(metadata.alternates?.canonical).toBe(
          `${SHOP_URL}${locale === "en" && !item.nameEn ? "/zh-tw" : locale === "en" ? "/en" : "/zh-tw"}/drug/${item.slug}`,
        );
        expect(metadata.robots).toEqual(
          isIndexableCatalogItem(item, locale)
            ? { index: true, follow: true }
            : { index: false, follow: true },
        );
      }
    }
  });

  it("keeps noindex on unadmitted records and does not invent an English canonical", async () => {
    const placeholder = await metadataFor(PLACEHOLDER, "zh");
    const sourcedEn = await metadataFor(SOURCED, "en");
    const partnerEn = await metadataFor(PARTNER, "en");

    expect(isIndexableCatalogItem(drug(PLACEHOLDER), "zh")).toBe(false);
    expect(placeholder.robots).toEqual({ index: false, follow: true });
    expect(drug(SOURCED).nameEn).toBeUndefined();
    expect(sourcedEn.alternates?.canonical).toBe(`${SHOP_URL}/zh-tw/drug/${SOURCED}`);
    expect(sourcedEn.robots).toEqual({ index: false, follow: true });
    expect(partnerEn.alternates?.canonical).toBe(`${SHOP_URL}/en/drug/${PARTNER}`);
    expect(partnerEn.robots).toEqual({ index: true, follow: true });
  });
});

describe("description promises match visible product page content", () => {
  it.each([
    { slug: SOURCED, kind: "sourced" },
    { slug: PARTNER, kind: "partner" },
    { slug: PLACEHOLDER, kind: "placeholder" },
  ])("$kind $slug description only promises what the page shows", async ({ slug }) => {
    const item = drug(slug);
    const description = catalogSearchDescription(item, "zh");
    const text = await visibleText(slug, "zh");
    const facts = productInfoPanels(item, "zh").find((panel) => panel.kind === "facts")!;
    const ingredientNames = facts.sections[0].rows.map((row) => row.name);

    expect(text).toContain(drugCopy(item, "zh").name);
    expect(text).toContain("產品資料來源");
    expect(text).toContain("不代表即時有貨");
    expect(text).toContain("須向藥師確認");

    if (catalogPageShowsSourcedIngredients(item)) {
      expect(description).toContain("成分");
      expect(ingredientNames.some((name) => name !== "成分資料待確認。")).toBe(true);
    } else {
      expect(description).not.toContain("成分");
      expect(ingredientNames).toEqual(["成分資料待確認。"]);
    }

    if (catalogPageShowsNutritionFocus(item, "zh") && catalogSourceKind(item) === "public") {
      expect(description).toContain("營養補充方向");
      expect(text).toContain(known(item.nutritionFocus));
    }

    if (catalogPageShowsPharmacyContacts(item)) {
      expect(description).toContain("藥局聯絡方式");
      expect(description).not.toContain("找藥需求");
      expect(text).toMatch(/打電話問|Call to ask|這家藥局有這個品項|pharmacies carry it/);
    } else {
      expect(description).not.toContain("藥局聯絡方式");
    }

    expect(catalogSearchDescription(item, "zh")).toBe(catalogSearchDescription(item, "zh"));
    expectSharedBoundaries(description, "zh");
    expectSharedBoundaries(catalogSearchDescription(item, "en"), "en");
  });
});
