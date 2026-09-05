import { CATEGORIES, allDrugs, allStores } from "./data";
import type { Locale } from "./i18n";
import type { Drug, IsoDate } from "./types";

/**
 * Consumer admission gate, in code.
 *
 * The consumer host used to index only its two homepages. Catalog pages are now
 * admitted too, but one item at a time: an item page is worth indexing only
 * when it can show something a search result should land on — either a cited
 * product-data source or uYao's own packshot. The remaining catalog rows are
 * placeholder records whose details are still unverified, so they stay
 * `noindex, follow` and are reachable through the category page instead.
 *
 * 藥局頁（`/store/*`）現在也收錄，但**只收中文**。它曾經被擋在門外，理由是
 * 「列出沒有藥局確認過的供應」—— 那個理由在程式裡早就不成立：真實藥局頁的
 * 品項是空陣列（`StoreView.tsx`），頁面自己寫明「不列出這家藥局賣什麼、有
 * 什麼貨」。剩下的內容全是公開藥局資料：店名、行政區、地址、電話、營業時間
 * 與健保特約狀態，來源是食藥署與健保署開放資料。那是一則可以被搜尋結果落地
 * 的事實記錄，收錄它不會對供應做出任何主張。
 *
 * 英文版不收：藥局名是中文，`/en/store/x` 的標題跟 `/zh-tw/store/x` 一模一樣，
 * 收了就是製造近似重複頁 —— 跟品項頁缺 `nameEn` 時的處理同一條規則。
 *
 * 收錄不代表合作。沒加入的店在頁面上標示「尚未加入」，且不出現任何預留入口。
 *
 * Not admitted at all, on purpose:
 *   /search      no stable content, one URL per query
 *   /r/*         private reservation receipts
 */
export function isIndexableCatalogItem(drug: Drug, locale: Locale = "zh"): boolean {
  const hasEvidence = Boolean(drug.source) || Boolean(drug.image);
  // An English URL is only worth indexing when its title is actually English.
  // `drugCopy` falls back to the Chinese name when `nameEn` is missing, which
  // would put a Chinese-titled page into the English index as a near-duplicate
  // of the zh-tw one. Fill in `nameEn` and the page is admitted automatically.
  return locale === "en" ? hasEvidence && Boolean(drug.nameEn) : hasEvidence;
}

export function indexableCatalogItems(locale: Locale = "zh"): Drug[] {
  return allDrugs().filter((drug) => isIndexableCatalogItem(drug, locale));
}

export function isIndexableCatalogItemSlug(slug: string, locale: Locale = "zh"): boolean {
  const drug = allDrugs().find((item) => item.slug === slug);
  return drug ? isIndexableCatalogItem(drug, locale) : false;
}

const LOCALES = ["zh", "en"] as const;
const LOCALE_PREFIX: Record<Locale, string> = { zh: "/zh-tw", en: "/en" };

/**
 * 消費端首頁自己的文案更新日。品項改動會經由下面的 `latest()` 帶進來，
 * 這個常數只負責首頁上不是目錄的那些字。改文案才動它。
 */
const SHOP_HOME_COPY_UPDATED: IsoDate = "2026-09-05";

/**
 * 藥局頁的內容更新日。
 *
 * 藥局沒有 `updatedOn`：它們不是一筆一筆維護的，是整批來自食藥署與健保署的
 * 開放資料快照。所以這裡用一個共用日期 —— 重灌那份快照時改它。
 *
 * 刻意不用今天的日期：`lastmod` 說的是「內容變了」，每次 build 都推一次等於
 * 對 Google 說謊，而且謊說久了它就不再相信這個站的 lastmod。
 */
const STORE_RECORD_UPDATED: IsoDate = "2026-08-19";

/**
 * 藥局頁只收中文 —— 理由見檔頭。留成函式而不是在下面寫死 `locale === "zh"`，
 * 是因為之後若有英文藥局名，改這裡一處就會同時打開 sitemap 與頁面的 robots。
 */
export function isIndexableStorePage(locale: Locale = "zh"): boolean {
  return locale === "zh";
}

export type ShopSitemapEntry = { path: string; lastModified: IsoDate };

/** ISO 日期字串比大小就是時序比大小，不用 Date（render 期不碰時鐘）。 */
function latest(dates: IsoDate[], fallback: IsoDate): IsoDate {
  return dates.reduce((newest, date) => (date > newest ? date : newest), fallback);
}

/**
 * 品類頁專用：有品項就只看品項，沒有品項才退回站上文案日期。
 *
 * 不能直接用 `latest(dates, SHOP_HOME_COPY_UPDATED)` —— 那個 fallback 是
 * 下限，會把一個全是舊品項的品類墊成「今天剛更新」。首頁需要那個下限
 * （它的文案不只是目錄），品類頁不需要：它的內容就是底下那些品項。
 */
function newestOf(dates: IsoDate[], fallback: IsoDate): IsoDate {
  return dates.length > 0 ? latest(dates, dates[0]) : fallback;
}

/**
 * Every consumer URL one sitemap publishes, each with real freshness:
 * both localized homepages, both locales of each category, and each admitted
 * item in the locales whose copy actually exists.
 *
 * `lastmod` 的重點是「哪幾頁變了」。品項頁用自己的 `updatedOn`；品類頁取
 * **它自己底下**品項的最新日期，首頁取整份目錄的，因為那就是它們各自的
 * 內容。整批同一天不是問題 —— 那是事實；一旦只改一筆，就只有那一頁與
 * 摘要它的頁會動。
 *
 * 參數化成 (categories, drugs) 只有一個理由：真實目錄現在只有一個品類，
 * 用它自己的資料證明不了「改 A 品類不會推掉 B 品類的日期」。合成兩個品類
 * 的 regression test 才釘得住這條規則（`shop-index.test.ts`）。
 */
export function sitemapEntriesFor(
  categories: readonly { slug: string }[],
  drugs: readonly Drug[],
  stores: readonly { slug: string }[] = [],
): ShopSitemapEntry[] {
  return LOCALES.flatMap((locale) => {
    const prefix = LOCALE_PREFIX[locale];
    const items = drugs.filter((drug) => isIndexableCatalogItem(drug, locale));
    const catalogUpdated = latest(items.map((drug) => drug.updatedOn), SHOP_HOME_COPY_UPDATED);

    return [
      { path: prefix, lastModified: catalogUpdated },
      ...categories.map((category) => ({
        path: `${prefix}/category/${category.slug}`,
        // 用全目錄最新日期的話，改 A 品類會把 B 品類的 lastmod 一起推掉 ——
        // 等於告訴 Google 一頁沒變的頁面變了，freshness 訊號就作廢了。
        lastModified: newestOf(
          items
            .filter((drug) => drug.category === category.slug)
            .map((drug) => drug.updatedOn),
          SHOP_HOME_COPY_UPDATED,
        ),
      })),
      ...items.map((drug) => ({
        path: `${prefix}/drug/${drug.slug}`,
        lastModified: drug.updatedOn,
      })),
      // 藥局頁的 lastmod 跟品項無關 —— 這一頁的內容是開放資料快照，不是目錄。
      ...(isIndexableStorePage(locale)
        ? stores.map((store) => ({
            path: `${prefix}/store/${store.slug}`,
            lastModified: STORE_RECORD_UPDATED,
          }))
        : []),
    ];
  });
}

/** 真實目錄的那一份。 */
export function shopSitemapEntries(): ShopSitemapEntry[] {
  return sitemapEntriesFor(CATEGORIES, allDrugs(), allStores());
}

/** 只要路徑的呼叫端用這個。順序與 `shopSitemapEntries()` 一致。 */
export function shopIndexablePaths(): string[] {
  return shopSitemapEntries().map((entry) => entry.path);
}
