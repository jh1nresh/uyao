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

`web/lib/aeo.test.ts` is the regression gate for registry coverage, visible
answer wiring, query uniqueness, and freshness.

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

- No `llms.txt` for Google visibility: Google says it does not use the file for
  Search or generative Search features.
- No AEO-only schema: keep truthful schema.org markup aligned with visible
  content; do not add `HowTo`, `Product`, ratings, prices, or availability just
  to target answer engines.
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
