import "server-only";

import type { Metadata } from "next";

import { aeoLanguages, aeoPath, type AeoAnswerPage } from "./aeo";
import type { Locale } from "./i18n";
import { indexablePageRobots } from "./seo-server";

/**
 * 每個 AEO 答案頁的 metadata 都長一樣：title 由頁面自己給（SERP 標題與
 * H1 問句刻意不同），description 一律等於 registry 的 directAnswer，
 * canonical 指向該語系，hreflang 指向另一個語系。集中在這裡，新增語系或
 * 改 robots 政策時不用逐頁改八份。
 */
export async function aeoPageMetadata(
  page: AeoAnswerPage,
  locale: Locale,
  titles: Record<Locale, string>,
): Promise<Metadata> {
  return {
    title: { absolute: titles[locale] },
    description: page[locale].directAnswer,
    alternates: {
      canonical: aeoPath(page, locale),
      languages: aeoLanguages(page),
    },
    robots: await indexablePageRobots(),
  };
}
