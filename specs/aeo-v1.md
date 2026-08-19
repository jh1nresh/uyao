# uYao AEO v1

## Outcome

Make uYao's existing answer-first knowledge pages explicit, internally
consistent, crawlable, fresh, and measurable across answer engines. AEO v1 is
an admission and measurement contract; it does not claim rankings or citations
before live evidence exists.

The canonical target questions, direct answers, routes, dates, and query
variants live in `web/lib/aeo.ts`. Do not create a second copy in this spec.

## Page admission gate

An AEO answer page must:

1. answer one real user question in its H1 and first content block;
2. give a concise answer that matches metadata and JSON-LD claims;
3. separate verified facts, prototype claims, limits, and unknowns;
4. show source or provenance information where the claim needs it;
5. use one canonical, index-allowed URL with crawlable internal links;
6. publish an accurate `dateModified` in page data and the sitemap; and
7. have at least two benchmark query phrasings without generating duplicate
   long-tail pages.

Every answer page is registered in both locales. `/zh-tw/...` and `/en/...`
are the same answer in two languages: they share `datePublished` and
`dateModified`, point hreflang at each other, and must not repeat each other's
text. A locale-specific URL is published only when its own copy exists.

`web/lib/aeo.test.ts` is the regression gate for registry coverage, visible
answer wiring, query uniqueness, and freshness.

## Discovery surface

`/guides` is the pillar page for the knowledge cluster and the only sitewide
link into it. Without it, `/compare/uyao-vs-pos` and the operations guides sit
behind a single in-body link on `/evidence`, which put
`/guides/pharmacy-return-window` four hops from the homepage. Keep the hub in
the footer.

`/llms.txt` is generated from the same registry (`web/lib/llms.ts`) and served
on both canonical hosts. It exists for agents that read pages, not for Google:
Google states it does not use the file for Search or generative Search
features, so no Google-visibility claim may be made from publishing it. Its
first job is to carry the product boundaries — not an online pharmacy, not a
POS replacement, no live inventory, guides not pharmacist-reviewed — into any
summary an agent writes.

## Machine-readable API surface

`/openapi.json` (`web/lib/openapi.ts`) describes two kinds of endpoint, and the
distinction is the point:

- `GET /api/catalog`, `/api/catalog/{slug}`, `/api/pharmacies` are a public
  read contract. They return only fields the corresponding pages already
  render, carry a `disclaimer` string in every response, and never return
  price, stock, availability, or `daysSinceScan` — uYao has no live inventory
  and a machine-readable stock field would be read as one.
- The intake endpoints (`/api/demand`, `/api/pilot`, `/api/reservations`) are
  listed but marked `x-internal: true`, with each description stating that they
  back this site's own forms and are not a public contract. They accept
  personal contact details and `POST /api/reservations` creates work in a real
  pharmacy's Store OS and can trigger a push notification. The marking is
  documentation, not a control; the real defences are the per-client and
  per-number rate limits, whitelist validation, and no-show blocking already in
  those routes.

`Store.owner` (the pharmacist-in-charge name) is never serialized. No page
displays it, so the API must not become the one place it can be bulk-extracted.

`robots.txt` allows `/api/catalog` and `/api/pharmacies` while `/api/` stays
disallowed: publishing a spec for endpoints that robots blocks would make
well-behaved agents refuse to fetch them.

`web/lib/openapi.test.ts` and `web/lib/public-api.test.ts` are the regression
gates for both the `x-internal` marking and the no-inventory/no-PII rules.

## Consumer admission gate

The consumer host indexes its two homepages, both category pages, and one
catalog item at a time. An item is admitted when it carries a cited
product-data source or uYao's own packshot; the English URL additionally
requires English copy (`nameEn`), or the page would enter the English index
with a Chinese title as a near-duplicate of the zh-tw one. Untranslated `/en`
item pages canonicalize to `/zh-tw`.

`nameEn` is only ever the manufacturer's registered Latin-script product name,
copied from that item's own `aliases`. Never transliterate or translate one: a
fabricated English product name is the same class of error as a fabricated
licence number. Verified 一般食品 keep `nameEn` empty regardless, because the
field renders as a mono product code and reads as a drug identifier on a
非藥品 item (`web/lib/catalog.test.ts` enforces this). Those items stay
zh-tw-only until a real English name exists.

Every consumer URL carries a real `lastmod`. Item pages use `Drug.updatedOn`,
hand-maintained per item exactly like `AEO_PAGES`: bump it when the visible
product copy changes, not when styling moves. Category pages and the consumer
homepages take the newest date among the items they list, because that is what
their content is. A uniform date across the catalog is fine and true when the
records really did land together — the point is that changing one item moves
only that item's URLs and the pages that summarise it.

Never admitted: `/search` (no stable content, one URL per query), `/store/*`
(shows supply no pharmacy has confirmed), and `/r/*` (private reservation
receipts). Filtered category URLs (`q`, `group`, `page`) stay `noindex, follow`
and canonicalize to the clean path. `web/lib/shop-index.test.ts` is the
regression gate.

## Measurement baseline

Capture a baseline after the change is deployed and the canonical pages have
been recrawled. Repeat monthly and after a significant answer update.

| Surface | Record | Evidence |
| --- | --- | --- |
| Google Search Console | Values exposed by the Generative AI performance report, by page and query where available | Export or dated screenshot |
| Bing Webmaster Tools AI Performance | Total citations, cited pages, grounding queries, citation share, and comparison period | CSV/XLSX export |
| ChatGPT search | Referral sessions carrying `utm_source=chatgpt.com` | Analytics export |
| Manual benchmark | Engine, registry query, cited/not cited, cited URL, answer factually aligned/not aligned | Dated result link or screenshot |

Use this row shape for manual runs:

```text
date | engine | query | cited_url | cited yes/no | answer aligned yes/no | evidence
```

Manual probes are samples, not rankings. Do not infer causality from a single
before/after result or claim AEO success until citation or referral evidence is
present.

## Intentional non-goals

- No AEO-only schema: keep truthful schema.org markup aligned with visible
  content; do not add `HowTo`, ratings, prices, or availability just to target
  answer engines. `Product` is allowed on catalog item pages only, because
  those pages really are products, and only without `offers`, price, or
  availability — uYao cannot assert any of the three.
- No AI-only rewrites, artificial chunking, mass query pages, or invented
  third-party mentions.
- No change to the GPTBot training policy. The existing `User-agent: *` rule
  already permits OAI-SearchBot discovery on public production pages while API
  and console routes remain excluded.

Primary guidance:

- [Google: Optimizing for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google: Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [OpenAI: Publishers and Developers FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)
- [Bing: AI Performance](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c)

## Live evidence gate

Code completion proves only that the answer contract and freshness signals are
present. AEO performance remains **unverified** until the production deployment
is read back and at least one platform reports citation, grounding, or referral
evidence.
