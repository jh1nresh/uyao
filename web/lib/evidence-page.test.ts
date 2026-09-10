import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import EvidencePage from "@/app/evidence/page";
import { AEO_PAGES } from "./aeo";
import { getRequestLocale } from "./locale-server";

vi.mock("server-only", () => ({}));
vi.mock("./locale-server", () => ({ getRequestLocale: vi.fn() }));

describe("evidence page dates", () => {
  for (const locale of ["zh", "en"] as const) {
    it(`preserves ${locale} evidence history when page navigation changes`, async () => {
      vi.mocked(getRequestLocale).mockResolvedValue(locale);
      const html = renderToStaticMarkup(await EvidencePage());
      const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
      const text = visible.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
      const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1])["@graph"];
      const page = graph.find((node: { "@type": string }) => node["@type"] === "WebPage");

      expect(page.dateModified).toBe(AEO_PAGES.evidence.dateModified);
      expect(text).toContain(locale === "zh"
        ? "證據更新日期: 2026-08-18"
        : "Evidence last updated: 2026-08-18");
      expect(text).toContain(locale === "zh"
        ? "Changelog 2026-08-18: 移除已公開合作關係一節"
        : "Changelog 2026-08-18: The disclosed-partnerships section was removed");
    });
  }
});
