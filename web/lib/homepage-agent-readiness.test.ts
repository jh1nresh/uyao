import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/components/LocaleProvider";
import HomePage, { generateMetadata } from "@/app/(consumer)/app/page";
import { BRAND_NAME, SITE_URL, consumerWebSiteJsonLd } from "./seo";
import { getRequestLocale } from "./locale-server";

vi.mock("./locale-server", () => ({ getRequestLocale: vi.fn() }));
vi.mock("./seo-server", () => ({ consumerIndexablePageRobots: async () => ({ index: true, follow: true }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

describe("agent-readable consumer homepages", () => {
  for (const locale of ["zh", "en"] as const) {
    it(`preserves complete ${locale} homepage metadata and canonical brand identity`, async () => {
      vi.mocked(getRequestLocale).mockResolvedValue(locale);
      const metadata = await generateMetadata();
      const canonical = `${SITE_URL}/${locale === "en" ? "en" : "zh-tw"}`;
      expect(metadata.alternates?.canonical).toBe(canonical);
      expect(metadata.openGraph).toMatchObject({ type: "website", siteName: BRAND_NAME, url: canonical });
      expect(metadata.openGraph?.images).toEqual(expect.arrayContaining([expect.objectContaining({ url: expect.stringMatching(/^https:\/\//) })]));
      expect(consumerWebSiteJsonLd(locale)).toMatchObject({
        alternateName: expect.arrayContaining([BRAND_NAME, "uyaohealth.com"]),
      });
    });

    it(`renders an H1 and meaningful ${locale} content without executing browser JavaScript`, async () => {
      vi.mocked(getRequestLocale).mockResolvedValue(locale);
      const page = await HomePage({ searchParams: Promise.resolve({}) });
      const stream = await renderToReadableStream(createElement(LocaleProvider, { locale, children: page }));
      await stream.allReady;
      const html = await new Response(stream).text();
      const content = html.replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
      const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      expect(text.length).toBeGreaterThanOrEqual(500);
      expect(text).toContain(locale === "en" ? "Open uYao. Ask before you go." : "打開 uYao，先問再出門。");
      expect(text).toContain(locale === "en" ? "not live inventory" : "不代表即時庫存");
      const headings = [...content.matchAll(/<h([1-6])\b/g)].map((match) => Number(match[1]));
      expect(headings[0]).toBe(1);
      headings.slice(1).forEach((level, index) => expect(level).toBeLessThanOrEqual(headings[index] + 1));
      expect(html.includes(`href="${SITE_URL}/docs"`)).toBe(true);
      expect(html.includes(`href="${SITE_URL}/llms.txt"`)).toBe(true);
    });
  }
});
