# Taiwan indexing and search measurement baseline (2026-09-06)

This report makes the 2026-09-05 public SEO copy changes *measurable*. It is a
dated indexability inspection plus a Taiwan Google Search Console (GSC)
comparison runbook. It is **not** a claim that Google has indexed, recrawled, or
improved traffic for any page.

- Task-ID: `jh1nresh/uyao:taiwan-indexing-measurement-20260906`
- Packet-Revision: v1
- Source RFD (closed, not merged): https://github.com/jh1nresh/uyao/pull/274
- Inspection host: `https://uyaohealth.com` (live production)
- Worker method: direct HTTP GET only. No GSC login, no Indexing API, no deploy.

## Status vocabulary

These five words are not interchangeable:

| Word | Means here | Evidence used in this report |
| --- | --- | --- |
| **Crawlable** | A public GET reaches the document; `robots.txt` does not `Disallow` the path; no `X-Robots-Tag` or robots meta forbids crawling the HTML | Live HTTP + `robots.txt` |
| **Sitemap-listed** | The URL appears in the live sitemap with a `lastmod` | Live `sitemap.xml` |
| **Indexed** | Google Search has the URL in its index | **unknown** — needs GSC URL Inspection |
| **Recrawled** | Googlebot has fetched the URL after a named date | **unknown** — needs GSC URL Inspection last-crawl |
| **Measured** | A completed GSC reporting window exists for the filters under study | Parent property totals only; no post-change cohort yet |

Being crawlable and sitemap-listed is not proof of indexing. A sitemap `lastmod`
is a freshness *hint*, not a recrawl receipt.

## Live public inspection

Retrieved with `User-Agent: uyao-taiwan-indexing-measurement/2026-09-06`.
Redirects were recorded hop-by-hop (no client follow). Chinese store paths were
requested percent-encoded; the live sitemap lists those `loc` values as UTF-8
Chinese characters (valid XML). HTML `<link rel="canonical">` values on the
store pages were percent-encoded.

### Production crawl policy

`https://uyaohealth.com/robots.txt` at **2026-09-06T09:00:23Z**, HTTP **200**,
no `X-Robots-Tag`:

```text
User-Agent: *
Allow: /
Allow: /api/catalog
Allow: /api/pharmacies
Disallow: /api/
Disallow: /console
Disallow: /store-os
Disallow: /zh-tw/store-os
Disallow: /en/store-os

Sitemap: https://uyaohealth.com/sitemap.xml
```

None of the five study URLs is under a `Disallow` prefix.

### Live sitemap (94 URLs)

`https://uyaohealth.com/sitemap.xml` at **2026-09-06T09:00:22Z**, HTTP **200**,
`Content-Type: application/xml`, 94 `<url>` entries. Counts match the parent
task (locale variants included):

| Kind | Count | Notes |
| --- | ---: | --- |
| Guide articles (`/guides/…`) | 12 | 6 zh-tw + 6 en |
| Catalog items (`/drug/…`) | 50 | both locales where admitted |
| Category pages | 2 | `/zh-tw/category/…` and `/en/category/…` |
| Pharmacy public records (`/store/…`) | 16 | **zh-tw only** |
| Other company / home / compare / evidence | 14 | includes `/zh-tw` and `/en` |

A sitemap listing is not an index.

### The five study URLs

Canonical homepage here means the consumer-first public home,
`https://uyaohealth.com/zh-tw`. Live `/` returns the same document with that
canonical (see supporting checks).

| Page | Requested URL | Retrieved (UTC) | HTTP | Redirect chain | Canonical | robots meta | X-Robots-Tag | Sitemap `loc` | Sitemap `lastmod` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Canonical homepage | `https://uyaohealth.com/zh-tw` | 2026-09-06T09:00:21Z | 200 | none | `https://uyaohealth.com/zh-tw` | `index, follow` | absent | yes (`https://uyaohealth.com/zh-tw`) | 2026-09-05 |
| Nearby-medicine guide | `https://uyaohealth.com/zh-tw/guides/find-medicine-nearby` | 2026-09-06T09:00:22Z | 200 | none | `https://uyaohealth.com/zh-tw/guides/find-medicine-nearby` | `index, follow` | absent | yes | 2026-09-05 |
| 建利西藥房 | `https://uyaohealth.com/zh-tw/store/%E5%BB%BA%E5%88%A9%E8%A5%BF%E8%97%A5%E6%88%BF` | 2026-09-06T09:00:22Z | 200 | none | `https://uyaohealth.com/zh-tw/store/%E5%BB%BA%E5%88%A9%E8%A5%BF%E8%97%A5%E6%88%BF` | `index, follow` | absent | yes (`…/store/建利西藥房`) | 2026-08-19 |
| 美得心藥局 | `https://uyaohealth.com/zh-tw/store/%E7%BE%8E%E5%BE%97%E5%BF%83%E8%97%A5%E5%B1%80` | 2026-09-06T09:00:22Z | 200 | none | `https://uyaohealth.com/zh-tw/store/%E7%BE%8E%E5%BE%97%E5%BF%83%E8%97%A5%E5%B1%80` | `index, follow` | absent | yes (`…/store/美得心藥局`) | 2026-08-19 |
| 樂活健保藥局 | `https://uyaohealth.com/zh-tw/store/%E6%A8%82%E6%B4%BB%E5%81%A5%E4%BF%9D%E8%97%A5%E5%B1%80` | 2026-09-06T09:00:22Z | 200 | none | `https://uyaohealth.com/zh-tw/store/%E6%A8%82%E6%B4%BB%E5%81%A5%E4%BF%9D%E8%97%A5%E5%B1%80` | `index, follow` | absent | yes (`…/store/樂活健保藥局`) | 2026-08-19 |

Titles observed on the 200 responses (not used as ranking evidence):

- Homepage: `台灣附近藥局與品項查詢｜出發前先確認供應｜uYao 找藥`
- Nearby guide: `台灣附近藥局怎麼找？查詢與出發前確認步驟｜uYao`
- Stores: `{店名}｜公開藥局資料（試營運） · uYao 有藥`

Per-URL status for this inspection:

| Page | Crawlable | Sitemap-listed | Indexed | Recrawled | Measured (page-level) |
| --- | --- | --- | --- | --- | --- |
| `/zh-tw` | yes | yes | **unknown** | **unknown** | **unmeasured** |
| `/zh-tw/guides/find-medicine-nearby` | yes | yes | **unknown** | **unknown** | **unmeasured** |
| 建利西藥房 | yes | yes | **unknown** | **unknown** | **unmeasured** |
| 美得心藥局 | yes | yes | **unknown** | **unknown** | **unmeasured** |
| 樂活健保藥局 | yes | yes | **unknown** | **unknown** | **unmeasured** |

Store `lastmod` 2026-08-19 is the shared public-record snapshot date
(`STORE_RECORD_UPDATED` in `web/lib/shop-index.ts`). Homepage and nearby-guide
`lastmod` 2026-09-05 is the dated copy change under study. Those dates are
**not** Google recrawl dates.

### Supporting host and slash checks (not the five URLs)

Recorded so operators inspect the canonical URL, not a duplicate host or slash
variant:

| Requested | Retrieved (UTC) | Result |
| --- | --- | --- |
| `https://uyaohealth.com/` | 2026-09-06T09:00:21Z | **200**, no hop; title and robots match `/zh-tw`; canonical `https://uyaohealth.com/zh-tw`. Root is **not** a separate sitemap `loc`. |
| `https://uyaohealth.com/zh-tw/` | (follow-up hop check) | **308** → `/zh-tw` |
| `https://www.uyaohealth.com/zh-tw` | (follow-up hop check) | **308** → `https://uyaohealth.com/zh-tw` |
| `https://shop.uyaohealth.com/zh-tw` | (follow-up hop check) | **308** → `https://uyaohealth.com/zh-tw` |
| Nearby guide with trailing slash | (follow-up hop check) | **308** → `/zh-tw/guides/find-medicine-nearby` |
| `https://www.uyaohealth.com/zh-tw/guides/find-medicine-nearby` | 2026-09-06T09:01:07Z | **308** → `https://uyaohealth.com/zh-tw/guides/find-medicine-nearby` |
| 建利西藥房 with trailing slash | 2026-09-06T09:01:07Z | **308** → `/zh-tw/store/%E5%BB%BA%E5%88%A9%E8%A5%BF%E8%97%A5%E6%88%BF` |

No `X-Robots-Tag` on these hops.

## Executable admission gate vs stale spec prose

Follow the **code** gate, not the stale sentence in the spec.

Live `web/lib/shop-index.ts` admits Chinese `/zh-tw/store/{slug}` public-record
pages (`isIndexableStorePage("zh") === true`) and omits English store URLs to
avoid near-duplicates. `web/app/(consumer)/store/[slug]/page.tsx` then calls
`consumerIndexablePageRobots()` for that zh-tw page. The live 200 responses
above match that gate: `index, follow` and sitemap membership for all three
pharmacies.

`specs/aeo-v1.md` §Consumer admission gate still says:

> Never admitted: `/search` … `/store/*` (shows supply no pharmacy has
> confirmed) …

That `/store/*` exclusion is **stale**. The live store pages do not list
unconfirmed supply; they are public-record fact pages. This report does **not**
rewrite the spec.

A related stale comment remains in `web/lib/seo.ts` (consumer path note still
says store pages stay `noindex`). Same rule: flag only; no code or spec edit
in this PR.

`/search` and `/r/*` remain correctly excluded by the executable gate.

## What `gsc-content-gap.py` must not be asked to do

`web/scripts/gsc-content-gap.py` reads separate GSC **Queries** and **Pages**
CSVs, token-clusters queries, and scores “queries with impressions and no
dedicated page.” It does **not** join query-to-page, does **not** produce a
daily before/after series, and must not be used to invent those joins from
anonymized rows.

## Parent GSC observation (preserve; do not re-diagnose)

Observed **2026-09-06**. This is **not** a raw export and is **not** in this
public PR.

| Filter | Value |
| --- | --- |
| Property | `sc-domain:uyaohealth.com` |
| Search type | Web |
| Country | Taiwan |
| Reporting dates | 2026-08-10 through 2026-09-04 (completed days only) |

Property totals in that window: **73 impressions**, **2 clicks**, **2.7% CTR**,
**average position 17.9**. Device split: desktop 36 impressions / 2 clicks;
mobile 37 impressions / 0 clicks.

Limitations that stay attached to these numbers:

- Small pre-change observation only. The 2026-09-05 copy changes are **after**
  this reporting cutoff.
- Visible query rows are sparse and **do not account for** property totals. Do
  not sum anonymized query rows and expect 73.
- Average position 17.9 is an **aggregate**. It is not proof that most
  impressions sit on page two, and it is not a rank for any one URL.
- Zero mobile clicks on 37 impressions is **not** a page-speed diagnosis and
  is **not** a mobile CTR target.
- No page-level or query-to-page distribution was supplied. Do not assign the
  73 impressions to the five URLs above.

Property-level, this window is **measured**. Page-level indexing, recrawl, and
the three decisions below are **not**.

## Read-only GSC comparison runbook

Operator-only. This worker did not open GSC and must not submit indexing
requests.

### Filters (keep identical on every export)

1. Property: **`sc-domain:uyaohealth.com`**
2. Report: Search results → Performance
3. Search type: **Web**
4. Country: **Taiwan**
5. Do not add a device, page, or query filter unless that filter is the
   *question* for that export.

### Compare equal-length completed windows

Use GSC’s comparison mode, or two exports with the same filters.

- **Length:** the parent window is 26 completed days (2026-08-10 through
  2026-09-04). The comparison window must be the same number of **completed**
  reporting days. Do not include GSC’s still-updating trailing days.
- **Pre-change window:** 2026-08-10 through 2026-09-04 (already observed).
- **Post-change window:** **do not fabricate**. Start it only after both of
  these are known:
  1. A confirmed production deployment date for the 2026-09-05 copy (sitemap
     `lastmod` 2026-09-05 is the content date, not the deploy/recrawl clock).
  2. A confirmed Google last-crawl date from URL Inspection for the URLs in
     that comparison (homepage and nearby guide for the 9/5 copy; store pages
     if they are in the same study).
- If today’s date is still inside an incomplete window, wait. A half-window
  is not a cohort.

Store pages were **not** given a 2026-09-05 `lastmod`. Treat them as a
separate recrawl question from the homepage/guide copy change.

### Keep exports separate

Unless GSC actually offers a joint-dimension export for that property, download
and store these as **separate** files:

- Queries
- Pages
- Devices
- Dates

Do not join them in a spreadsheet to invent query-to-page or query-to-device
cells that GSC did not emit. Do not publish the CSVs or screenshots in a
public PR.

`gsc-content-gap.py` may be run later on Queries.csv + Pages.csv for content
gaps. It is not a before/after instrument.

### URL Inspection (pending operator)

For each of the five canonical URLs, read and record (private notes, not this
repo):

- Indexed or not
- Last crawl time
- Crawled as Googlebot Smartphone or Desktop
- Referring sitemap, if shown
- Whether the live page matches the indexed page

Until those five reads exist, indexing and recrawl stay **unknown**.

### Request indexing (pending operator; not this worker)

If URL Inspection shows “URL is not on Google” or a last-crawl before
2026-09-05 for the homepage or nearby guide, a **human** may use the GSC
URL Inspection “Request indexing” button. That step is **pending operator
action**. This worker does not click it and must not call Google’s Indexing
API for these pages. The Indexing API is the wrong tool for ordinary web
pages.

## Three decisions (how to read; current values)

Use the same Taiwan / Web filters as the parent observation. If the joint
breakdown or sample is insufficient, the cell is **unmeasurable** or
**observe** — not zero.

### 1. Non-brand Taiwan impressions

**Definition.** Property-level Taiwan / Web impressions whose query is not a
brand query. Brand queries, for this baseline, are those whose query string
contains `uyao`, `uyaohealth`, `有藥`, or `u yao` (case-insensitive).

**How to read.** Take the property total from the Performance header (not a
sum of visible query rows). Subtract brand-query impressions only if the
Queries export is complete enough that brand + non-brand equals that header
total. If GSC hides low-volume queries and the visible rows do not add up to
the header, **do not** compute `73 − (visible brand rows)`.

**Current value.** **observe / unmeasurable.** The parent note has a property
total (73) and says visible query rows are sparse. No complete Queries export
is in this worker.

### 2. Count of pages with impressions

**Definition.** Distinct URLs in the Pages export with impressions > 0 under
the same Taiwan / Web / date filters. This is **not** “how many pages are
indexed.”

**How to read.** Use the Pages export only. Do not infer the count from
query rows or from the sitemap’s 94 URLs.

**Current value.** **unmeasurable.** The parent observation did not include a
Pages export.

### 3. Mobile CTR within comparable query/page and position ranges

**Definition.** Mobile clicks / mobile impressions on the *same* query or page
set, restricted to a stated average-position band (for example 1–10, or a band
that matches the desktop comparison set). Compare either mobile vs desktop in
one window, or mobile vs mobile across the two equal-length windows.

**How to read.** Requires a joint breakdown that GSC actually provides
(device×query or device×page, plus position). The parent mobile split
(37 impressions / 0 clicks) is an **uncontrolled** device total. It is not
this metric. Do not treat 0% as a measured mobile CTR and do not diagnose
speed from it.

**Current value.** **unmeasurable.** No joint device × query/page × position
export is available; sample size at property level is already small.

## Pending GSC-only evidence (explicit)

These items are missing on purpose. Absence is not a reason to invent numbers.

1. URL Inspection status for the five canonical URLs (indexed / last crawl).
2. Operator decision on manual “Request indexing” after those reads.
3. A confirmed production deploy timestamp and a confirmed Google last-crawl
   date, so a post-change 26-day window can be opened.
4. Separate Queries / Pages / Devices / Dates exports for any future window.
5. Completeness check before computing non-brand impressions or page counts.
6. Any joint export needed for decision 3.

Private GSC screenshots and CSVs stay out of this public file.

## What this worker did not do

- No production code, sitemap `lastmod` bump, robots/canonical/schema change.
- No GSC login, export, or URL Inspection.
- No Google Indexing API call and no “Request indexing” click.
- No deploy, publish, or external post.
- No rewrite of `specs/aeo-v1.md`.
- No claim that the 2026-09-05 changes improved impressions, clicks, CTR, or
  average position.
