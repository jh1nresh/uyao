import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import NearbyGuide, { generateMetadata } from "@/app/guides/find-medicine-nearby/page";
import { AEO_PAGES, aeoPath, sitemapLastModified } from "./aeo";
import { getRequestLocale } from "./locale-server";
import { SHOP_URL } from "./shop";

vi.mock("server-only", () => ({}));
vi.mock("./locale-server", () => ({ getRequestLocale: vi.fn() }));
vi.mock("./seo-server", () => ({
  indexablePageRobots: async () => ({ index: true, follow: true }),
}));

const PAGE = AEO_PAGES.findMedicineNearby;

describe("nearby pharmacy guide", () => {
  for (const locale of ["zh", "en"] as const) {
    it(`renders verifiable ${locale} answers with matching metadata and schema`, async () => {
      vi.mocked(getRequestLocale).mockResolvedValue(locale);
      const html = renderToStaticMarkup(await NearbyGuide());
      const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
      const text = visible.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
      const metadata = await generateMetadata();
      const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1])["@graph"];
      const article = graph.find((node: { "@type": string }) => node["@type"] === "Article");
      const faq = graph.find((node: { "@type": string }) => node["@type"] === "FAQPage");

      expect(html.match(/<h1\b/g)).toHaveLength(1);
      expect(text).toContain(PAGE[locale].question);
      expect(text).toContain(PAGE[locale].directAnswer);
      expect(metadata.description).toBe(PAGE[locale].directAnswer);
      expect(metadata.alternates?.canonical).toBe(aeoPath(PAGE, locale));
      expect(metadata.alternates?.languages).toMatchObject({
        "zh-TW": PAGE.path,
        en: PAGE.enPath,
      });
      expect(metadata.robots).toMatchObject({ index: true, follow: true });
      expect(article).toMatchObject({
        headline: PAGE[locale].question,
        description: PAGE[locale].directAnswer,
        dateModified: PAGE.dateModified,
      });
      expect(text).toContain(PAGE.dateModified);
      expect(sitemapLastModified(aeoPath(PAGE, locale))).toBe(PAGE.dateModified);
      for (const question of faq.mainEntity) {
        expect(text).toContain(question.name);
        expect(text).toContain(question.acceptedAnswer.text);
      }

      expect(visible).toContain('href="https://info.nhi.gov.tw/INAE1000/INAE1000S01"');
      expect(visible).toContain(`href="${SHOP_URL}/${locale === "en" ? "en" : "zh-tw"}"`);
      expect(visible).not.toMatch(/href="[^\"]*\/store\//);
      expect(text).toContain(locale === "zh" ? "未經藥師專業審閱" : "Not reviewed by a licensed pharmacist");
      expect(text).toContain(locale === "zh" ? "不是預留成功或供應承諾" : "does not confirm a reservation or promise supply");
      expect(text).toContain(locale === "zh" ? "不是步行路程" : "not a walking route");
      expect(text).not.toContain(locale === "zh" ? "營業時間通常更長" : "store hours are usually longer");
    });
  }
});
