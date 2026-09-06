# Partner pharmacy citation kit (2026-09-06)

This packet prepares **verification and genuine-reference materials** for the
sixteen pharmacies already listed in `PARTNER_PHARMACIES`. It is preparation
for recommendation 5. It is **not** a claim that backlinks, Google Business
Profiles (GBP), reviews, rankings, or live stock have changed.

- Task-ID: `jh1nresh/uyao:taiwan-partner-citations-20260906`
- Packet-Revision: v1
- Source RFD (closed, not merged): https://github.com/jh1nresh/uyao/pull/278
- Accepted receipt: https://github.com/jh1nresh/uyao/pull/278#issuecomment-5558216498
- Implementation base for this file: current `main` at
  `5ebdac869bc108af22ee01d7990ab0699da8b59e` (#282), after the packet pin
  `632d5fdf4826e8a344f3a0f23cfb87e757d27ada`
- Inspection host: `https://uyaohealth.com` (live production)
- Worker method: read local store records + public Google Help pages +
  direct HTTP GET. No outbound owner mail, no GBP edit, no review request,
  no paid placement, no new listing.

## What this kit is for

The operator can sit with a pharmacy owner, compare the public uYao record
to the storefront and to that pharmacy’s **own** GBP, then decide whether
any owned website or other genuine mention should exist. Public listing on
uYao is not permission to manage a pharmacy GBP and is not a live-stock
service.

## What this kit is not

- Not a completed citation or backlink campaign.
- Not a reciprocal-link offer and not an affiliation with Google.
- Not a review-score claim and not a request for reviews.
- Not authorization to send the draft below.
- Not a list of unconfirmed pharmacies. Only `PARTNER_PHARMACIES` appears.
- Not personal owner or private contact data. Fields are limited to what
  `StoreView` already shows: name, district, address, public business phone
  (if any), map link, and hours **as labeled by `hoursSource`**.

## Status vocabulary

These labels are not interchangeable.

| Word | Means here |
| --- | --- |
| **店家尚未核對** | The pharmacy owner has not confirmed this row for citation or GBP use. Every row starts here. |
| **缺資料／待店家確認** | The public record has no value (empty phone or no usable hours). Do not invent one. |
| **搜尋查詢，非正式 GBP ID** | `mapsUrl` is `https://www.google.com/maps/search/?api=1&query=…`. It is a search, not a verified Place / GBP identity. |
| **Maps cid，非正式 GBP 驗證** | `mapsUrl` uses `maps.google.com/?cid=…`. Useful as a current map link; still **not** a verified GBP ID and still **店家尚未核對**. |
| **健保調劑時段** | `hoursSource === "nhi"`. These are NHI dispensing windows from `hours.ts`, **not** customer-facing opening hours. Do not copy them into GBP or a directory “hours” field. |
| **Pending citation log** | No public third-party URL / date is recorded until a real action happens. |

## Google guidance used (read 2026-09-06)

Read before writing. Public Help pages only; this worker has no GBP login.

### Local ranking — [Tips to improve your local ranking on Google](https://support.google.com/business/answer/7091)

- Verify the business if the **owner** is authorized to represent it.
- Complete, accurate information (address customers can visit, customer-facing
  hours, category, other factual details) helps a profile match relevant
  searches.
- Local results are mainly **relevance**, **distance**, and **prominence**.
  Prominence includes how well-known a place is, including mentions on other
  websites. There is **no** way to request or pay Google for a better local
  rank.
- This kit does **not** ask anyone to post reviews or add in-store products.

### Representation — [Guidelines for representing your business on Google](https://support.google.com/business/answer/3038177)

- Represent the business as it is consistently recognized in the real world
  (signage, stationery). One profile per location. Do not stuff the name with
  marketing, hours, phone, URL, or extra location text.
- Address must be the real visit address. Phone must be under the business’s
  control and connect to that location.
- **Website:** provide a site that represents **that** location. Do not use a
  URL that sends people to a different business or a third-party landing page
  in place of the pharmacy’s own site.
- **Hours:** customer-facing hours of operation. NHI dispensing windows are
  a different fact and must not be entered as those hours.
- Categories should complete “this business **is** a …” (for these rows:
  a pharmacy), using as few, specific categories as needed.

### How that applies to uYao URLs

1. The pharmacy’s **own official website** (if it has one) is the recommended
   primary GBP / directory website field.
2. The uYao public record is an **optional factual reference**. The owner
   decides whether it is suitable to mention. It must **not** replace the
   official site.
3. Do not present a uYao URL as a reciprocal link, as a Google-affiliated
   listing, or as proof of live inventory.

## Source keys

Resolved 2026-09-06 against `web/lib/partners.ts` (`PARTNER_PHARMACIES`,
16 keys), `web/lib/partner-stores.ts`, and `web/lib/stores.generated.json`
(16 store objects; every partner slug has exactly one store; store `name`
equals `slug` for all sixteen). Canonical path rule from
`web/lib/store-seo.ts` and `web/app/(consumer)/store/[slug]/page.tsx`:
`https://uyaohealth.com/zh-tw/store/{slug}` with the slug
**percent-encoded**. English `/en/store/{slug}` is a locale switcher only:
not in the sitemap, `noindex, follow`, canonical points at the zh-tw URL.

Row order below follows `PARTNER_PHARMACIES` key order.

## Identity table

All sixteen rows: **店家尚未核對**. Phones are the public `Store.phone`
string shown on `StoreView`, or `缺資料／待店家確認` when empty.

| Slug | 店名 | 行政區 | 地址 | 公開電話 | 核對狀態 |
| --- | --- | --- | --- | --- | --- |
| 建利西藥房 | 建利西藥房 | 大同區 | 臺北市大同區重慶北路1段85之3號1樓 | 02-2555-6484 | 店家尚未核對 |
| 南興西藥房 | 南興西藥房 | 宜蘭市 | 宜蘭縣宜蘭市光復路130號（南館市場口） | 03-932-2678 | 店家尚未核對 |
| 建芳藥局 | 建芳藥局 | 羅東鎮 | 宜蘭縣羅東鎮民權路31號 | 03-954-3649 | 店家尚未核對 |
| 大豐藥局 | 大豐藥局 | 大同區 | 臺北市大同區昌吉街96號 | 02-2585-3880 | 店家尚未核對 |
| 美得心藥局 | 美得心藥局 | 林口區 | 新北市林口區公園路63號1樓 | 02-2600-1770 | 店家尚未核對 |
| 樂活健保藥局 | 樂活健保藥局 | 新莊區 | 新北市新莊區八德街58巷1號1樓 | 02-2201-8660 | 店家尚未核對 |
| 祥好大藥局 | 祥好大藥局 | 新莊區 | 新北市新莊區新泰路331號 | 02-2993-9051 | 店家尚未核對 |
| 中山藥局 | 中山藥局 | 中山區 | 臺北市中山區林森北路128號 | 02-2523-6979、0937-661-282 | 店家尚未核對 |
| 萊康連鎖藥局 | 萊康連鎖藥局 | 蘆洲區 | 新北市蘆洲區中正路126號1樓 | 02-8286-7383 | 店家尚未核對 |
| 萊康中華健保藥局 | 萊康中華健保藥局 | 蘆洲區 | 新北市蘆洲區中華街45-1號1樓 | 02-2848-6787 | 店家尚未核對 |
| 永遠藥師藥局 | 永遠藥師藥局 | 西屯區 | 臺中市西屯區西屯路二段28之2號1樓 | 04-2312-0858 | 店家尚未核對 |
| 發元藥局 | 發元藥局 | 苗栗市 | 苗栗縣苗栗市中正路908號 | 037-320-285 | 店家尚未核對 |
| 喜來樂中西藥局 | 喜來樂中西藥局 | 新莊區 | 新北市新莊區昌平街20號1樓 | 02-2991-2068 | 店家尚未核對 |
| 一銘藥局 | 一銘藥局 | 新莊區 | 新北市新莊區幸福路542號(1樓) | 02-2996-1050 | 店家尚未核對 |
| 天養藥局 | 天養藥局 | 士林區 | 臺北市士林區中山北路6段262號(1樓) | 缺資料／待店家確認 | 店家尚未核對 |
| 美麗田藥局 | 美麗田藥局 | 士林區 | 臺北市士林區通河街78號1樓 | 02-2885-5990 | 店家尚未核對 |

`中山藥局` shows two numbers on `StoreView` (landline then mobile), copied
verbatim. `天養藥局` has an empty `phone` in the store record; the live title
uses「地址與地圖」instead of「地址與電話」.

## Canonical uYao record and current map link

Percent-encoded canonical form (use this, not `/en/store/…`):

`https://uyaohealth.com/zh-tw/store/` + `encodeURIComponent(slug)`.

| Slug | Percent-encoded canonical | 目前 mapsUrl | 地圖身分 |
| --- | --- | --- | --- |
| 建利西藥房 | https://uyaohealth.com/zh-tw/store/%E5%BB%BA%E5%88%A9%E8%A5%BF%E8%97%A5%E6%88%BF | https://maps.google.com/?cid=1165010065351364502&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA | Maps cid，非正式 GBP 驗證 |
| 南興西藥房 | https://uyaohealth.com/zh-tw/store/%E5%8D%97%E8%88%88%E8%A5%BF%E8%97%A5%E6%88%BF | https://www.google.com/maps/search/?api=1&query=南興西藥房+宜蘭縣宜蘭市光復路130號（南館市場口） | 搜尋查詢，非正式 GBP ID；需核對地圖身分 |
| 建芳藥局 | https://uyaohealth.com/zh-tw/store/%E5%BB%BA%E8%8A%B3%E8%97%A5%E5%B1%80 | https://www.google.com/maps/search/?api=1&query=建芳藥局+宜蘭縣羅東鎮民權路31號 | 搜尋查詢，非正式 GBP ID；需核對地圖身分 |
| 大豐藥局 | https://uyaohealth.com/zh-tw/store/%E5%A4%A7%E8%B1%90%E8%97%A5%E5%B1%80 | https://www.google.com/maps/search/?api=1&query=大豐藥局+臺北市大同區昌吉街96號 | 搜尋查詢，非正式 GBP ID；需核對地圖身分 |
| 美得心藥局 | https://uyaohealth.com/zh-tw/store/%E7%BE%8E%E5%BE%97%E5%BF%83%E8%97%A5%E5%B1%80 | https://maps.google.com/?cid=7634392581652883360&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA | Maps cid，非正式 GBP 驗證 |
| 樂活健保藥局 | https://uyaohealth.com/zh-tw/store/%E6%A8%82%E6%B4%BB%E5%81%A5%E4%BF%9D%E8%97%A5%E5%B1%80 | https://maps.google.com/?cid=1842909798055847274&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA | Maps cid，非正式 GBP 驗證 |
| 祥好大藥局 | https://uyaohealth.com/zh-tw/store/%E7%A5%A5%E5%A5%BD%E5%A4%A7%E8%97%A5%E5%B1%80 | https://maps.google.com/?cid=697687101222548199&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA | Maps cid，非正式 GBP 驗證 |
| 中山藥局 | https://uyaohealth.com/zh-tw/store/%E4%B8%AD%E5%B1%B1%E8%97%A5%E5%B1%80 | https://maps.google.com/?cid=14742022634120800633&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA | Maps cid，非正式 GBP 驗證 |
| 萊康連鎖藥局 | https://uyaohealth.com/zh-tw/store/%E8%90%8A%E5%BA%B7%E9%80%A3%E9%8E%96%E8%97%A5%E5%B1%80 | https://www.google.com/maps/search/?api=1&query=萊康連鎖藥局+新北市蘆洲區中正路126號1樓 | 搜尋查詢，非正式 GBP ID；需核對地圖身分 |
| 萊康中華健保藥局 | https://uyaohealth.com/zh-tw/store/%E8%90%8A%E5%BA%B7%E4%B8%AD%E8%8F%AF%E5%81%A5%E4%BF%9D%E8%97%A5%E5%B1%80 | https://www.google.com/maps/search/?api=1&query=萊康中華健保藥局+新北市蘆洲區中華街45-1號1樓 | 搜尋查詢，非正式 GBP ID；需核對地圖身分 |
| 永遠藥師藥局 | https://uyaohealth.com/zh-tw/store/%E6%B0%B8%E9%81%A0%E8%97%A5%E5%B8%AB%E8%97%A5%E5%B1%80 | https://www.google.com/maps/search/?api=1&query=永遠藥師藥局+臺中市西屯區西屯路二段28之2號1樓 | 搜尋查詢，非正式 GBP ID；需核對地圖身分 |
| 發元藥局 | https://uyaohealth.com/zh-tw/store/%E7%99%BC%E5%85%83%E8%97%A5%E5%B1%80 | https://www.google.com/maps/search/?api=1&query=發元藥局+苗栗縣苗栗市中正路908號 | 搜尋查詢，非正式 GBP ID；需核對地圖身分 |
| 喜來樂中西藥局 | https://uyaohealth.com/zh-tw/store/%E5%96%9C%E4%BE%86%E6%A8%82%E4%B8%AD%E8%A5%BF%E8%97%A5%E5%B1%80 | https://maps.google.com/?cid=17941504142783486427&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA | Maps cid，非正式 GBP 驗證 |
| 一銘藥局 | https://uyaohealth.com/zh-tw/store/%E4%B8%80%E9%8A%98%E8%97%A5%E5%B1%80 | https://www.google.com/maps/search/?api=1&query=一銘藥局+新北市新莊區幸福路542號(1樓) | 搜尋查詢，非正式 GBP ID；需核對地圖身分 |
| 天養藥局 | https://uyaohealth.com/zh-tw/store/%E5%A4%A9%E9%A4%8A%E8%97%A5%E5%B1%80 | https://www.google.com/maps/search/?api=1&query=天養藥局+臺北市士林區中山北路6段262號(1樓) | 搜尋查詢，非正式 GBP ID；需核對地圖身分 |
| 美麗田藥局 | https://uyaohealth.com/zh-tw/store/%E7%BE%8E%E9%BA%97%E7%94%B0%E8%97%A5%E5%B1%80 | https://www.google.com/maps/search/?api=1&query=美麗田藥局+臺北市士林區通河街78號1樓 | 搜尋查詢，非正式 GBP ID；需核對地圖身分 |

Search-query rows (10): 南興西藥房, 建芳藥局, 大豐藥局, 萊康連鎖藥局,
萊康中華健保藥局, 永遠藥師藥局, 發元藥局, 一銘藥局, 天養藥局, 美麗田藥局.
A search URL must not be treated as a Place ID or a verified GBP.

## Hours labeling (`hours.ts`)

Do **not** invent hours. Do **not** copy NHI windows into a GBP or directory
“opening hours” field. `hoursTitle("nhi")` is「健保調劑時段」;
`hoursNote("nhi")` states they are prescription-dispensing hours and that
store hours are often longer. `hoursSource === "none"` shows「尚無資料，建議先電話確認」
on `StoreView`.

This kit does **not** transcribe weekly hour grids. The owner must confirm
customer-facing hours from the storefront or the pharmacy’s own GBP.

| Slug | hoursSource | How to treat for citations / GBP |
| --- | --- | --- |
| 建利西藥房 | google | Public page title「營業時間」; source note is Google. Still **店家尚未核對**. Not a GBP write. |
| 南興西藥房 | partner | Public page title「營業時間」; source note is partner-provided; call to confirm. Still **店家尚未核對**. |
| 建芳藥局 | none | 缺資料／待店家確認. Do not invent hours. |
| 大豐藥局 | none | 缺資料／待店家確認. Do not invent hours. |
| 美得心藥局 | google | Same rule as 建利西藥房. |
| 樂活健保藥局 | none | 缺資料／待店家確認. Do not invent hours. |
| 祥好大藥局 | google | Same rule as 建利西藥房. |
| 中山藥局 | google | Same rule as 建利西藥房. |
| 萊康連鎖藥局 | nhi | Public page title「健保調劑時段」. **Do not copy as opening hours.** |
| 萊康中華健保藥局 | nhi | Same NHI rule. |
| 永遠藥師藥局 | nhi | Same NHI rule. |
| 發元藥局 | none | 缺資料／待店家確認. Do not invent hours. |
| 喜來樂中西藥局 | google | Same rule as 建利西藥房. |
| 一銘藥局 | nhi | Same NHI rule. |
| 天養藥局 | nhi | Same NHI rule. Also no public phone. |
| 美麗田藥局 | nhi | Same NHI rule. |

NHI rows (6): 萊康連鎖藥局, 萊康中華健保藥局, 永遠藥師藥局, 一銘藥局,
天養藥局, 美麗田藥局. Missing-hours rows (4): 建芳藥局, 大豐藥局,
樂活健保藥局, 發元藥局.

## Factual link-text examples

Short Traditional Chinese anchors only: name + district + a contact fact.
No medical claims, no “即時庫存”, no ranking language, no “Google 合作”.

| Slug | 建議錨點（尚未使用） |
| --- | --- |
| 建利西藥房 | 建利西藥房｜大同區地址與聯絡資訊 |
| 南興西藥房 | 南興西藥房｜宜蘭市地址與聯絡資訊 |
| 建芳藥局 | 建芳藥局｜羅東鎮地址與聯絡資訊 |
| 大豐藥局 | 大豐藥局｜大同區地址與聯絡資訊 |
| 美得心藥局 | 美得心藥局｜林口區地址與聯絡資訊 |
| 樂活健保藥局 | 樂活健保藥局｜新莊區地址與聯絡資訊 |
| 祥好大藥局 | 祥好大藥局｜新莊區地址與聯絡資訊 |
| 中山藥局 | 中山藥局｜中山區地址與聯絡資訊 |
| 萊康連鎖藥局 | 萊康連鎖藥局｜蘆洲區地址與聯絡資訊 |
| 萊康中華健保藥局 | 萊康中華健保藥局｜蘆洲區地址與聯絡資訊 |
| 永遠藥師藥局 | 永遠藥師藥局｜西屯區地址與聯絡資訊 |
| 發元藥局 | 發元藥局｜苗栗市地址與聯絡資訊 |
| 喜來樂中西藥局 | 喜來樂中西藥局｜新莊區地址與聯絡資訊 |
| 一銘藥局 | 一銘藥局｜新莊區地址與聯絡資訊 |
| 天養藥局 | 天養藥局｜士林區地址資訊 |
| 美麗田藥局 | 美麗田藥局｜士林區地址與聯絡資訊 |

`天養藥局` omits「聯絡」because the public record has no phone.

If an owner later puts a uYao URL on an **owned** page, keep the anchor
factual. Do not buy a placement to host this text.

## Owner-verification request — 草稿／未寄送

The following is a **generic draft**. It has not been sent. It is not
authorization, not a signed agreement, and not a request for reviews or
GBP access. Fill the bracketed fields only if a human later chooses to
contact that pharmacy through a channel the pharmacy already uses.

```text
【草稿／未寄送 — 請勿把本段當成已寄出或已授權】

主旨：核對「{店名}」公開資料（uYao 有藥）

您好，

uYao 有藥目前有一筆「{店名}」的公開藥局資料，內容只有店名、行政區、地址、
以及資料庫裡已有的對外電話與地圖連結。公開收錄不代表即時庫存，也不表示
uYao 可以代管貴局的 Google 商家檔。

想請店家核對：
1. 店名是否與招牌一致
2. 地址是否為顧客可到店的地址
3. 對外電話是否仍由本店接聽（沒有電話者可決定是否要補）
4. 實際營業時間（健保調劑時段不能直接當成營業時間）
5. 類別是否就是藥局
6. 貴局若已有官方網站，Google 商家檔的「網站」欄請用該官網；
   uYao 這頁只是可選的事實資料，是否提及由店家決定

uYao 公開頁（中文正規網址）：
{percent-encoded https://uyaohealth.com/zh-tw/store/…}

這封草稿沒有請您寫評價、沒有請您開放商家檔權限、也沒有互惠連結。
若資料有誤，也歡迎告訴我們應更正的公開欄位。

uYao 有藥
```

Do not mail-merge this. Do not open a new inbox, CRM, or GBP integration
to send it.

## Operator next-step checklist

Current rows stay **pending**. Record a public URL and date **only after**
a real action that already happened.

1. Pharmacy owner verifies **name, address, public phone, category, and
   customer-facing hours** against the storefront.
2. Owner (or their authorized manager) opens **that pharmacy’s own** GBP —
   this worker must not. Confirm one profile per location and that the
   website field is the official site, not a third-party directory by default.
3. Owner chooses an appropriate **owned-site** reference if they want one.
   uYao remains optional and factual.
4. If a genuine public mention already exists after that choice, log
   `public URL` + `YYYY-MM-DD` + `who confirmed` in a **private** operator
   note. Do not invent a log row here.
5. Search-query map rows: owner confirms the correct Maps / GBP identity
   before anyone treats a URL as “the” listing.
6. NHI-hour rows: owner supplies real opening hours; do not paste NHI
   windows.
7. `天養藥局`: owner confirms whether a public business phone should exist.
8. Do not request reviews, buy citations, create listings, or edit GBP from
   this repository.

### Citation log (empty on purpose)

| Slug | 核對日 | 官網（店家自有） | 可選 uYao 提及？ | 已發生的公開 URL | 日期 |
| --- | --- | --- | --- | --- | --- |
| （十六列皆空） | — | 待店家提供 | 待店家決定 | 尚未有已核對紀錄 | — |

## Live HTTP spot-check (2026-09-06)

`User-Agent: uyao-partner-citation-kit/2026-09-06`. No redirect follow on
the first hop. No `X-Robots-Tag` on these responses.

| Requested | Retrieved (UTC) | HTTP | `<link rel="canonical">` | robots meta | Notes |
| --- | --- | --- | --- | --- | --- |
| `https://uyaohealth.com/zh-tw/store/%E5%BB%BA%E5%88%A9%E8%A5%BF%E8%97%A5%E6%88%BF` | 2026-09-06T10:27:15Z | 200 | same percent-encoded zh-tw URL | `index, follow` | Title: 建利西藥房｜臺北市大同區地址與電話. Hours heading「營業時間」(`hoursSource=google`). |
| `https://uyaohealth.com/zh-tw/store/%E8%90%8A%E5%BA%B7%E9%80%A3%E9%8E%96%E8%97%A5%E5%B1%80` | 2026-09-06T10:27:15Z | 200 | same percent-encoded zh-tw URL | `index, follow` | Title: 萊康連鎖藥局｜新北市蘆洲區地址與電話. Hours heading「健保調劑時段」+ NHI note. |
| `https://uyaohealth.com/zh-tw/store/%E5%A4%A9%E9%A4%8A%E8%97%A5%E5%B1%80` | 2026-09-06T10:27:15Z | 200 | same percent-encoded zh-tw URL | `index, follow` | Title: 天養藥局｜臺北市士林區地址與地圖 (no phone). Hours heading「健保調劑時段」. JSON-LD has no `telephone`. |
| `https://uyaohealth.com/en/store/%E5%BB%BA%E5%88%A9%E8%A5%BF%E8%97%A5%E6%88%BF` | 2026-09-06T10:27:16Z | 200 | **zh-tw** percent-encoded store URL | `noindex, follow` | Not a citation target. Locale switcher only. |
| `https://uyaohealth.com/sitemap.xml` | 2026-09-06T10:27:16Z | 200 | — | — | 94 `<url>` rows; **16** `/store/` locs, all `/zh-tw/store/…`, **zero** `/en/store/`. Sitemap `loc` uses UTF-8 Chinese; HTML canonicals are percent-encoded. |

Remaining thirteen zh-tw store URLs were **not** each fetched in this
worker. Their path form and uniqueness were checked against
`PARTNER_PHARMACIES` + `stores.generated.json` + the live sitemap list
(all sixteen slugs present once). Treat those thirteen live bodies as
**unverified** beyond sitemap membership.

## Local identity check (this checkout)

- `Object.keys(PARTNER_PHARMACIES)` = 16 unique slugs.
- `stores.generated.json` has 16 stores; set equality with partner slugs
  holds; no extra partner and no missing store.
- Every canonical uses `/zh-tw/store/` + unique percent-encoded slug.
- No `/en/store/` citation URL is recommended.
- Missing phone: only 天養藥局.
- NHI hour labeling matches `web/lib/hours.ts`.
- Owner strings exist in some generated records but are **omitted** here
  because `StoreView` does not show them.

## What this worker did not do

- No message sent to any pharmacy.
- No GBP create / edit / verify / review reply.
- No purchased citation, directory signup, or new external account.
- No automated outreach or CRM.
- No production code, schema, robots, or sitemap change.
- No deploy, merge, or claim that recommendation 5 is finished.
- No product build (docs-only).
