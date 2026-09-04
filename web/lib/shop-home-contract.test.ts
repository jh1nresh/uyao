import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const appPage = readFileSync(
  join(import.meta.dirname, "..", "app", "(consumer)", "app", "page.tsx"),
  "utf8",
);
const searchInput = readFileSync(
  join(import.meta.dirname, "..", "components", "SearchInput.tsx"),
  "utf8",
);
const searchPage = readFileSync(
  join(import.meta.dirname, "..", "app", "(consumer)", "search", "page.tsx"),
  "utf8",
);
const commerceAgentPage = readFileSync(
  join(import.meta.dirname, "..", "app", "(consumer)", "agent", "page.tsx"),
  "utf8",
);
const commerceAgent = readFileSync(
  join(import.meta.dirname, "..", "components", "CommerceAgent.tsx"),
  "utf8",
);
const productSwipeShowcase = readFileSync(
  join(import.meta.dirname, "..", "components", "ProductSwipeShowcase.tsx"),
  "utf8",
);
const productShowcase = readFileSync(
  join(import.meta.dirname, "product-showcase.ts"),
  "utf8",
);
const partnerMarquee = readFileSync(
  join(import.meta.dirname, "..", "components", "landing", "PartnerMarquee.tsx"),
  "utf8",
);
const globalCss = readFileSync(
  join(import.meta.dirname, "..", "app", "globals.css"),
  "utf8",
);
const siteHeader = readFileSync(
  join(import.meta.dirname, "..", "components", "SiteHeader.tsx"),
  "utf8",
);
const consumerLayout = readFileSync(
  join(import.meta.dirname, "..", "app", "(consumer)", "layout.tsx"),
  "utf8",
);
const pharmacyPage = readFileSync(
  join(import.meta.dirname, "..", "app", "(consumer)", "pharmacy", "page.tsx"),
  "utf8",
);
const agentLanding = readFileSync(
  join(import.meta.dirname, "..", "components", "landing", "AgentLandingExperience.tsx"),
  "utf8",
);

describe("household medicine storefront homepage", () => {
  it("starts search in the cabinet and continues input in the Agent workspace", () => {
    expect(appPage).toContain("<SearchInput");
    expect(appPage).toContain('resultsPath="/agent"');
    expect(appPage).toContain("redirectOnInput");
    expect(appPage).toContain("medicine-cabinet-hero");
    expect(appPage).toContain("medicine-cabinet-cell-copy");
    expect(appPage).toContain("medicine-cabinet-cell-ask");
    expect(appPage).toContain("家裡的藥箱，現在會找答案");
    expect(appPage).toContain("打開 uYao，先問再出門。");
    expect(appPage).toContain("在框裡問 uYao 會進入 Agent；已知品項可直接逛下方藥櫃。");
    expect(appPage).toContain("Ask uYao in the box — that opens Agent. Browse the cabinet below when you already know the item.");
    expect(appPage).toContain("medicine-cabinet-input");
    expect(searchInput).toContain("hasRedirectedInputRef");
    expect(searchInput).toContain("INPUT_REDIRECT_DELAY_MS");
    expect(searchInput).toContain("onCompositionEnd");
    expect(searchInput).toContain('new URLSearchParams({ draft: value })');
    expect(commerceAgentPage).toContain("initialDraft");
    expect(commerceAgentPage).toContain("defaultValue={initialDraft}");
    expect(commerceAgentPage).toContain("uyao-agent-composer");
    expect(appPage).not.toContain("家裡現在需要什麼？");
    expect(appPage).not.toContain("問藥時，上排品項留在原位。");
    expect(appPage).toContain("先逛品項，再交給 uYao 去問。");
    expect(appPage).toContain("<ProductSwipeShowcase");
    expect(appPage).toContain("productShowcaseItems(drugs)");
    expect(appPage).toContain("查看全部 ${drugs.length} 項 →");
    expect(appPage).toContain("精選品項是可瀏覽的目錄資料");
    expect(appPage).toContain("Catalog categories");
    expect(appPage).toContain("CATALOG_GROUPS");
    expect(productShowcase).toContain('drug?.image?.kind === "packshot"');
    expect(productSwipeShowcase).toContain("看這一項 →");
    expect(productSwipeShowcase).toContain("rail.scrollTo");
    expect(productSwipeShowcase).not.toContain("scrollIntoView");
    expect(productSwipeShowcase).toContain("motion-reduce:transition-none");
    expect(appPage).toContain("medicine-cabinet-showcase-section");
    expect(productSwipeShowcase).toContain("product-showcase-stage");
    expect(productSwipeShowcase).toContain("product-showcase-rail");
    expect(productSwipeShowcase).toContain("product-showcase-bay");
    expect(productSwipeShowcase).toContain("overflow-x-auto");
    expect(productSwipeShowcase).toContain("snap-mandatory");
    expect(productSwipeShowcase).toContain("scrollLeft = drag.startScrollLeft - deltaX");
    expect(productSwipeShowcase).toContain("bay.offsetLeft + bay.clientWidth / 2 - railCenter");
    expect(productSwipeShowcase).toContain("bay.offsetLeft - (rail.clientWidth - bay.clientWidth) / 2");
    expect(productSwipeShowcase).not.toContain("indexedItems.slice(-2).map");
    expect(productSwipeShowcase).not.toContain("key: `leading-");
    expect(productSwipeShowcase).toContain("data-showcase-index={logicalIndex}");
    expect(productSwipeShowcase).toContain("loading={logicalIndex === 0 ? \"eager\" : \"lazy\"}");
    expect(productSwipeShowcase).not.toContain('className="relative h-full w-full shrink-0 snap-center"');
    expect(productSwipeShowcase).toContain('from "next/image"');
    expect(productSwipeShowcase).toContain("item.sceneSrc");
    expect(productSwipeShowcase).toContain("product-showcase-scene");
    expect(productSwipeShowcase).toContain('sizes="(max-width: 767px) 100vw, min(100vw, 1600px)"');
    expect(productSwipeShowcase).not.toContain("unoptimized");
    expect(productSwipeShowcase).not.toContain("transition-opacity");
    expect(productSwipeShowcase).not.toContain("opacity-0");
    expect(productSwipeShowcase).not.toContain("product-shelf-unit");
    expect(productSwipeShowcase).not.toContain("product-shelf-bay");
    expect(productSwipeShowcase).toContain("useState(0)");
    expect(productSwipeShowcase).not.toContain("SIDE_SCENE_SCALE");
    expect(productSwipeShowcase).not.toContain("SIDE_SCENE_X");
    expect(productSwipeShowcase).not.toContain('clipPath: "polygon');
    expect(productSwipeShowcase).not.toContain("--showcase-accent");
    expect(globalCss).toContain(".product-showcase-stage");
    expect(globalCss).toContain("aspect-ratio: 1774 / 373");
    expect(globalCss).toContain(".product-showcase-scene");
    expect(globalCss).toContain(".product-showcase-bay");
    expect(globalCss).toContain("--product-showcase-bay-width: 100%");
    expect(globalCss).not.toContain("--product-showcase-bay-width: 28.525vw");
    expect(globalCss).not.toContain("--product-showcase-bay-width: 18.993rem");
    expect(globalCss).not.toContain(".product-showcase-bay::after");
    expect(globalCss).not.toContain(".product-showcase-stage::before");
    expect(globalCss).not.toContain("background: #d4ad78");
    expect(globalCss).toContain(".medicine-cabinet-showcase-section {\n  /* Cream field so the photographed cabinet is the wood, not the page. */\n  background-color: rgb(var(--color-ivory));");
    expect(productShowcase).toContain("PRODUCT_SHOWCASE_SCENES");
    expect(productShowcase).toContain("[...PRODUCT_SHOWCASE_SCENES].flatMap");
    expect(productShowcase).toContain("/brand/uyao-product-cabinet-composite-v1.webp");
    expect(partnerMarquee).toContain("cabinet-partner-marquee");
    expect(partnerMarquee).toContain("sm:pb-2.5 sm:pt-5");
    expect(appPage).toContain("w-[calc(100vw-clamp(32px,6vw,92px))]");
    expect(partnerMarquee).toContain("cabinet-marquee-edge-left");
    expect(partnerMarquee).not.toContain("from-paper to-transparent");
    expect(globalCss).toContain(".cabinet-partner-marquee::before");
    expect(productSwipeShowcase).not.toContain("transition-[transform,opacity,filter,left]");
    expect(appPage.indexOf('localizedPath("/agent", locale)')).toBeLessThan(
      appPage.indexOf("<ProductSwipeShowcase"),
    );
    expect(appPage).toContain("shelfDrugs.map");
    expect(appPage).not.toContain("medicine-cabinet-path");
    expect(appPage).not.toContain("附近取貨");
    expect(appPage).not.toContain("d-household-medicine-cabinet");
  });

  it("uses the cabinet-toned compact header only on the storefront homepage", () => {
    expect(appPage).toContain('tone="cabinet"');
    expect(appPage).toContain('activeWorkspace="shop"');
    expect(appPage).toContain('className="medicine-cabinet-stage relative"');
    expect(siteHeader).toContain('tone?: "default" | "cabinet";');
    expect(siteHeader).toContain('"cabinet-overlay-header cabinet-header-band absolute inset-x-0 top-0 z-40"');
    expect(siteHeader).toContain("cabinet-workspace-nav");
    expect(siteHeader).toContain("cabinet-workspace-tab");
    expect(siteHeader).toContain("cabinet-header-controls flex items-center");
    expect(siteHeader).toContain('cabinetTone ? "h-16 sm:h-[68px]"');
    expect(siteHeader).toContain("SiteHeaderMobileMenu");
    expect(siteHeader).toContain("hidden h-full items-stretch justify-center md:flex");
    expect(globalCss).toContain(".cabinet-header-band");
    expect(globalCss).toContain("background: rgb(var(--color-forest) / 0.88);");
    expect(globalCss).toContain('.cabinet-workspace-tab[aria-current="page"]');
    expect(globalCss).toContain(".cabinet-header-controls > div > div");
    expect(globalCss).toContain("background: transparent;");
  });

  it("keeps Shop and Agent reachable from a mobile hamburger disclosure", () => {
    const mobileMenu = readFileSync(
      join(import.meta.dirname, "..", "components", "SiteHeaderMobileMenu.tsx"),
      "utf8",
    );
    expect(mobileMenu).toContain("site-header-mobile-panel");
    expect(mobileMenu).toContain('aria-expanded={open}');
    expect(mobileMenu).toContain("md:hidden");
    expect(mobileMenu).toContain('href={localizedPath("/", locale)}');
    expect(mobileMenu).toContain('href={localizedPath("/agent", locale)}');
    expect(mobileMenu).toContain("AreaSwitch");
    expect(mobileMenu).toContain("我是藥局");
    expect(globalCss).toContain(".cabinet-header-controls > div > .site-header-mobile-panel");
  });

  it("does not render the early-access banner above consumer routes", () => {
    expect(consumerLayout).not.toContain("DemoBanner");
    expect(consumerLayout).not.toContain("試營運");
  });

  it("asks for allergens before navigating to the dedicated results route", () => {
    expect(searchInput).toContain('resultsPath = "/search"');
    expect(searchInput).toContain('action={localizedPath(resultsPath, locale)}');
    expect(searchInput).toContain("onSubmit={askAllergies}");
    expect(searchInput).toContain("先確認已知過敏原");
    expect(searchInput).toContain("continueToResults");
    expect(searchInput).not.toContain("onSubmitQuery");
    expect(searchInput).not.toContain('presentation="pearl"');
  });

  it("keeps uYao Agent as one conversation surface", () => {
    expect(commerceAgentPage).toContain("uYao Agent");
    expect(commerceAgentPage).toContain("<SiteHeader");
    expect(commerceAgentPage).toContain('activeWorkspace="agent"');
    expect(siteHeader).toContain('activeWorkspace?: "shop" | "agent";');
    expect(siteHeader).toContain("uYao 主要導覽");
    expect(siteHeader).toContain('aria-current={activeWorkspace === "agent" ? "page" : undefined}');
    expect(siteHeader).toContain('href={localizedPath("/agent", locale)}');
    expect(commerceAgentPage).toContain('presentation="agent"');
    expect(commerceAgentPage).toContain("<CommerceAgent");
    expect(commerceAgentPage).not.toContain("CatalogItemGrid");
    expect(commerceAgentPage).not.toContain("ReservationAccess");
    expect(commerceAgentPage).not.toContain("tabHref");
    expect(globalCss).toContain(".uyao-agent-shell");
  });

  it("renders the Agent as a flat paper workspace", () => {
    expect(commerceAgent).toContain("border-y border-line-strong");
    expect(commerceAgent).toContain("uYao Agent");
    expect(commerceAgent).not.toContain("BrandMark");
    expect(commerceAgent).not.toContain("backdrop-blur");
    expect(searchInput).toContain("focus-within:border-forest");
    expect(globalCss).toContain(".uyao-agent-shell {\n  background: rgb(var(--color-ivory));\n}");
    expect(globalCss).toContain(".uyao-agent-composer {\n  background: rgb(var(--color-paper));\n}");
  });

  it("continues the cabinet hero into a bounded search conversation", () => {
    expect(searchInput).toContain('presentation?: "default" | "cabinet" | "agent";');
    expect(searchInput).toContain("medicine-cabinet-dialogue-layer");
    expect(searchInput).toContain("continueConversation");
    expect(searchInput).toContain("readLatestShopSearchIntakeDraft");
    expect(searchPage).toContain('tone="cabinet"');
    expect(searchPage).toContain("medicine-cabinet-conversation-page");
    expect(searchPage).toContain("SearchConversationHistory");
    expect(searchPage).toContain('submitLabel={locale === "en" ? "Ask another question" : "繼續問 uYao"}');
    expect(searchPage).toContain("key={q}");
  });

  it("uses a restrained entry transition before continuing into search results", () => {
    expect(searchInput).toContain("CONVERSATION_ENTRY_DURATION_MS");
    expect(searchInput).toContain("router.prefetch(entryTarget)");
    expect(searchInput).toContain("search-conversation-entry-layer");
    expect(searchInput).not.toContain("medicine-cabinet-opening-door");
    expect(searchInput).not.toContain("正在打開藥櫃");
    expect(searchInput).toContain('window.matchMedia("(prefers-reduced-motion: reduce)").matches');
    expect(globalCss).toContain("@keyframes search-conversation-entry-focus");
    expect(globalCss).toContain(".search-conversation-entry-layer");
    expect(globalCss).not.toContain("medicine-cabinet-door-left-open");
  });

  it("builds the selected wall direction from one stocked cabinet image and transparent product links", () => {
    expect(globalCss).toContain("medicine-cabinet-products");
    expect(globalCss).toContain("grid-template-columns: 337fr 238fr 290fr;");
    expect(globalCss).toContain(".medicine-cabinet-cell-copy");
    expect(globalCss).toContain(".medicine-cabinet-cell-ask");
    expect(globalCss).toContain("the ask-medicine copy sits inside the photographed upper bays");
    expect(globalCss).not.toContain("top: 52%");
    expect(globalCss).toContain("background-position: 59% top;");
    expect(globalCss).toContain("height: clamp(34rem, 49vw, 50rem);");
    expect(appPage).not.toContain("<Image");
    expect(appPage).not.toContain("object-contain object-bottom");
    expect(globalCss).not.toContain("medicine-cabinet-product::after");
    expect(globalCss).toContain("background: rgb(226 204 169 / 0.34) !important;");
    expect(globalCss).toContain("/brand/uyao-medicine-cabinet-stocked-v1.webp");
    expect(globalCss).not.toContain("d-household-medicine-cabinet");
  });

  it("keeps Store OS visible as the pharmacist handoff behind the consumer flow", () => {
    expect(appPage).toContain("你提出需求，藥師在 Store OS 接手。");
    expect(appPage).toContain('#store-os-preview`');
    expect(appPage).toContain("合作藥局登入 ↗");
    expect(appPage).toContain("medicine-cabinet-guide");
    expect(appPage).toContain("medicine-cabinet-guide-boundary");
    expect(appPage).toContain("medicine-cabinet-base");
    expect(appPage).not.toContain("lg:grid-cols-[48px_140px_1fr]");
    expect(appPage).not.toContain("搜尋或留下需求，再等待藥局或藥師確認供應與用藥問題。");
    expect(pharmacyPage).toContain('id="store-os-preview"');
    expect(pharmacyPage).toContain("<StoreOsProductPreview locale={locale} />");
    expect(agentLanding).toContain("export function StoreOsProductPreview");
  });

  it("keeps the established uYao brand system without recoloring factual catalog images", () => {
    expect(globalCss).toContain("--color-ivory: 242 239 230;");
    expect(globalCss).toContain("--color-brand-surface: 23 57 44;");
    expect(globalCss).toContain("--color-ink: 28 39 34;");
    expect(appPage).toContain('className="medicine-cabinet-home"');
    expect(globalCss).toContain(".medicine-cabinet-home {");
    expect(globalCss).toContain(".medicine-cabinet-home > footer {");
    expect(globalCss).toContain(".medicine-cabinet-guide::before");
    expect(appPage).not.toContain("mono-halftone-field");
    expect(appPage).toContain("<ProductSwipeShowcase");
    expect(agentLanding).not.toContain("mono-halftone-soft");
    expect(agentLanding).toContain("border-warning-line bg-warning-tint");
  });
});
