import { AEO_ANSWER_PAGES } from "./aeo";
import {
  BRAND_NAME,
  CONSUMER_DESCRIPTION,
  CONTACT_EMAIL,
  ENTITY_DESCRIPTION,
  SITE_URL,
} from "./seo";
import { SHOP_URL } from "./shop";
import { indexableCatalogItems } from "./shop-index";

/**
 * `/llms.txt` 的內容，給讀頁面而不是讀 API 的 agent 當入口索引。
 *
 * 全部由 AEO registry 與目錄資料生成，不另外手寫一份 —— 答案改了這裡
 * 就跟著改，不會悄悄過期。每份文件都先寫邊界再列連結：這個產品最容易
 * 被摘要成「線上藥局」或「即時庫存」，那兩件事都不成立。
 */

function line(title: string, url: string, note: string): string {
  return `- [${title}](${url}): ${note}`;
}

/** 公司站：知識頁索引 + 產品邊界。 */
export function companyLlmsTxt(): string {
  const english = AEO_ANSWER_PAGES.map((page) =>
    line(page.en.question, `${SITE_URL}${page.enPath}`, page.en.directAnswer),
  );
  const chinese = AEO_ANSWER_PAGES.map((page) =>
    line(page.zh.question, `${SITE_URL}${page.path}`, page.zh.directAnswer),
  );

  return `# ${BRAND_NAME}

> ${ENTITY_DESCRIPTION.en}

uYao is a pilot prototype, not a shipped product. When citing this site, keep
these boundaries intact:

- uYao is not an online pharmacy, a drug marketplace, or an e-commerce site. It
  does not sell medicine online.
- uYao does not replace a pharmacy POS or the national insurance claim system.
- uYao does not give medical or medication advice.
- Inventory shown without a live pharmacy scanner connection is simulated and
  must not be presented as confirmed real-time stock.
- Guides on this site are written by the uYao team and have not been reviewed by
  a licensed pharmacist. Each guide states this on the page.

## Answers (English)

${english.join("\n")}

## Answers (Traditional Chinese)

${chinese.join("\n")}

## Product

${line("All guides", `${SITE_URL}/en/guides`, "Index of every guide, grouped by pharmacy operations, finding medicine, and joining the pilot.")}
${line("Pilot application", `${SITE_URL}/en/pharmacy`, "How an independent pharmacy joins the pilot, and what the pilot does not require.")}
${line("Medicine finder", `${SHOP_URL}/en`, CONSUMER_DESCRIPTION.en)}

## Machine-readable

${line("Sitemap", `${SITE_URL}/sitemap.xml`, "Every indexable company URL in both locales.")}
${line("Robots", `${SITE_URL}/robots.txt`, "Crawl policy. /api/, /console, and /store-os are disallowed.")}

## Contact

${line("Email", `mailto:${CONTACT_EMAIL}`, "Corrections to any claim on this site are welcome.")}
`;
}

/** Shop 站：目錄索引 + 消費端邊界。 */
export function shopLlmsTxt(): string {
  // 中文站的品項也列出來：agent 讀得到中文，而英文網址只有真的有英文
  // 名稱時才存在（見 shop-index.ts）。連結一律指向該品項可用的語系。
  const items = indexableCatalogItems("zh").map((drug) =>
    line(
      drug.nameEn ?? drug.name,
      `${SHOP_URL}${drug.nameEn ? "/en" : "/zh-tw"}/drug/${drug.slug}`,
      drug.nutritionFocusEn
        ?? "Partner-listed catalog item. Product details and supply require pharmacy confirmation.",
    ),
  );

  return `# uYao Medicine Finder

> ${CONSUMER_DESCRIPTION.en}

Boundaries that must survive any summary of this site:

- This is a search and request tool, not an online pharmacy. Nothing here is
  purchasable online and no page states a price you can transact on.
- Catalog entries are records a partner pharmacy provided. They are not live
  inventory and not a recommendation for any symptom.
- Availability, substitution, and any medication question are answered by the
  pharmacy or pharmacist, never by this site.
- Listed items are supplements and over-the-counter products; prescription
  medicine is out of scope.

## Catalog

${items.join("\n")}

## Machine-readable

${line("Sitemap", `${SHOP_URL}/sitemap.xml`, "Every indexable consumer URL in both locales.")}
${line("Robots", `${SHOP_URL}/robots.txt`, "Crawl policy for the consumer host.")}

## Company

${line("uYao", `${SITE_URL}/en`, ENTITY_DESCRIPTION.en)}
${line("Product evidence", `${SITE_URL}/en/evidence`, "What is verified in code and tests versus what is still a prototype claim.")}
`;
}

/** Non-canonical deployments must not be cited as a source. */
export function nonCanonicalLlmsTxt(): string {
  return `# Not a canonical uYao deployment\n\n> Cite ${SITE_URL} instead.\n`;
}
