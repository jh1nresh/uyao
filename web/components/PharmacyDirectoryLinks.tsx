import Link from "next/link";

import { AREAS, allStores, storesInArea } from "@/lib/data";
import { areaCopy, type Locale } from "@/lib/i18n";

export function pharmacyRecordHref(slug: string): string {
  return `/zh-tw/store/${encodeURIComponent(slug)}`;
}

function listedAreaGroups() {
  return AREAS.flatMap((area) => {
    const stores = storesInArea(area.slug);
    return stores.length > 0 ? [{ area, stores }] : [];
  });
}

/**
 * Server-rendered text links to the existing Chinese pharmacy records.
 * Canonical destinations stay on /zh-tw/store/* in both locales — English
 * store URLs are not admitted. Names are the recorded Chinese names.
 */
export function PharmacyDirectoryLinks({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const stores = allStores();
  const groups = listedAreaGroups();
  const headingId = "pharmacy-directory-heading";
  const heading =
    locale === "en"
      ? `${stores.length} pharmacy records currently listed on uYao`
      : `目前收錄的 ${stores.length} 家藥局公開資料`;
  const note =
    locale === "en"
      ? "A public listing is not live stock and is not proof of a uYao partnership. Pharmacy names stay in Chinese as recorded."
      : "公開收錄不代表即時庫存，也不代表已與 uYao 合作。";

  return (
    <section aria-labelledby={headingId} className={className}>
      <h2
        id={headingId}
        className="editorial-display m-0 max-w-[18em] text-balance text-[25px] leading-[1.3] sm:text-[30px]"
      >
        {heading}
      </h2>
      <p className="mb-0 mt-3 max-w-[42em] text-pretty text-[14.5px] leading-[1.75] text-muted">
        {note}
      </p>

      <div className="mt-6 grid gap-7 sm:grid-cols-2">
        {groups.map(({ area, stores: areaStores }) => {
          const areaLabel = areaCopy(area, locale);
          return (
            <div key={area.slug}>
              <h3 className="m-0 text-[13.5px] font-bold text-oxblood">
                {areaLabel.name}
              </h3>
              <ul className="m-0 mt-1.5 list-none p-0">
                {areaStores.map((store) => {
                  const district =
                    locale === "en" ? areaLabel.shortName : store.district;
                  return (
                    <li key={store.slug} className="min-w-0">
                      <Link
                        href={pharmacyRecordHref(store.slug)}
                        className="flex min-h-11 min-w-0 items-center text-pretty break-words text-[15px] font-medium leading-[1.45] text-forest no-underline hover:text-green"
                      >
                        <span className="min-w-0 whitespace-normal break-words">
                          {store.name}
                          <span className="font-normal text-muted">
                            {" "}
                            · {district}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
