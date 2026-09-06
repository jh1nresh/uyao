import { getStore, storesForDrug } from "./data";
import { drugCopy, type Locale } from "./i18n";
import { partnersForProduct } from "./partners";
import { isPending, known } from "./pending";
import type { Drug, Store } from "./types";

/**
 * Search descriptions for catalog item pages.
 *
 * One description is returned for every device: the page does not vary copy
 * by user-agent, and `?area=` only changes the nearby list, not the item.
 * Every clause has to match something that page actually renders.
 */

export type CatalogSourceKind = "partner" | "public" | "none";

export function catalogItemIdentity(drug: Drug, locale: Locale): string {
  const display = drugCopy(drug, locale);
  return isPending(drug.spec) ? display.name : `${display.name} ${display.spec}`;
}

/** Same Chinese name+spec the product page uses to look up partner pharmacies. */
export function catalogPartnerProductLabel(drug: Drug): string {
  return drug.spec === "規格待確認" ? drug.name : `${drug.name} ${drug.spec}`;
}

export function catalogSourceKind(drug: Drug): CatalogSourceKind {
  if (drug.source?.kind === "partner") return "partner";
  if (drug.source) return "public";
  return "none";
}

/**
 * Facts-tab ingredients are rendered only when a source exists.
 * Unsourced ingredient strings stay as "待確認" and must not be advertised.
 */
export function catalogPageShowsSourcedIngredients(drug: Drug): boolean {
  return Boolean(drug.source) && drug.ingredients.length > 0;
}

export function catalogPageShowsNutritionFocus(drug: Drug, locale: Locale): boolean {
  return Boolean(known(drugCopy(drug, locale).nutritionFocus));
}

function listedPharmacies(drug: Drug): Store[] {
  const partners = partnersForProduct(catalogPartnerProductLabel(drug))
    .map((partner) => getStore(partner.storeSlug))
    .filter((store): store is Store => store !== undefined);
  const scanned = storesForDrug(drug.slug).map((row) => row.store);
  const seen = new Set<string>();
  const stores: Store[] = [];
  for (const store of [...scanned, ...partners]) {
    if (seen.has(store.slug)) continue;
    seen.add(store.slug);
    stores.push(store);
  }
  return stores;
}

function storePhone(store: Store): string | null {
  return store.phone ? store.phone.split("、")[0] : null;
}

/** StoreBuyBox lists a reachable number — names without a phone are not contacts. */
export function catalogPageShowsPharmacyContacts(drug: Drug): boolean {
  return listedPharmacies(drug).some((store) => storePhone(store) !== null);
}

/**
 * NoInventoryYet / NotifyMe renders when there is no scan row.
 * Mention that path only when the page also has no pharmacy phone to offer.
 */
export function catalogPageShowsFindingRequest(drug: Drug): boolean {
  return storesForDrug(drug.slug).length === 0 && !catalogPageShowsPharmacyContacts(drug);
}

function joinZh(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]}與${parts[1]}`;
  return `${parts.slice(0, -1).join("、")}與${parts[parts.length - 1]}`;
}

function joinEn(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function joinSentences(locale: Locale, parts: Array<string | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(locale === "en" ? " " : "");
}

function viewParts(drug: Drug, locale: Locale): string[] {
  if (locale === "en") {
    const parts = ["item details", "source"];
    if (catalogPageShowsSourcedIngredients(drug)) parts.push("ingredients");
    if (catalogPageShowsPharmacyContacts(drug)) parts.push("pharmacy contacts");
    return parts;
  }
  const parts = ["品項資料", "來源"];
  if (catalogPageShowsSourcedIngredients(drug)) parts.push("成分");
  if (catalogPageShowsPharmacyContacts(drug)) parts.push("藥局聯絡方式");
  return parts;
}

function sourceAttribution(drug: Drug, locale: Locale): string | undefined {
  const kind = catalogSourceKind(drug);
  const ingredients = catalogPageShowsSourcedIngredients(drug);
  const nutrition = catalogPageShowsNutritionFocus(drug, locale);

  if (kind === "partner") {
    return locale === "en"
      ? "Details were provided by a partner pharmacy."
      : "資料由合作藥局提供。";
  }

  if (kind === "public") {
    if (ingredients && nutrition) {
      return locale === "en"
        ? "The page lists sourced ingredients and nutrition focus."
        : "頁面列出有來源的成分與營養補充方向。";
    }
    if (ingredients) {
      return locale === "en"
        ? "The page lists sourced ingredients."
        : "頁面列出有來源的成分。";
    }
    if (nutrition) {
      return locale === "en"
        ? "The page lists sourced nutrition focus."
        : "頁面列出有來源的營養補充方向。";
    }
    return locale === "en"
      ? "The page includes a verifiable public source."
      : "頁面附有可核對的公開來源。";
  }

  return undefined;
}

function findingRequestCopy(locale: Locale): string {
  return locale === "en"
    ? "No matching pharmacy is listed to contact; you can leave a finding request."
    : "目前沒有可聯絡的對應藥局，可留下找藥需求。";
}

function stockBoundary(locale: Locale): string {
  return locale === "en"
    ? "A listing is not live stock; ask a pharmacy to confirm supply and suitability."
    : "收錄不代表即時有貨；供應與適用性須向藥師確認。";
}

export function catalogSearchDescription(drug: Drug, locale: Locale): string {
  const identity = catalogItemIdentity(drug, locale);
  const lead =
    locale === "en"
      ? `${identity}: View ${joinEn(viewParts(drug, locale))}.`
      : `${identity}：查看${joinZh(viewParts(drug, locale))}。`;

  return joinSentences(locale, [
    lead,
    catalogPageShowsFindingRequest(drug) ? findingRequestCopy(locale) : undefined,
    sourceAttribution(drug, locale),
    stockBoundary(locale),
  ]);
}
