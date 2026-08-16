import type { Area, Drug, StockBadgeSpec } from "./types";

export type Locale = "zh" | "en";

export function localizedPath(path: string, locale: Locale): string {
  if (!path.startsWith("/") || path.startsWith("/api/")) return path;
  const prefix = locale === "en" ? "/en" : "/zh-tw";
  const canonical = path.replace(/^\/(?:en|zh-tw)(?=\/|$)/, "") || "/";
  return canonical === "/" ? prefix : `${prefix}${canonical}`;
}

const DRUG_EN: Record<string, {
  name: string;
  form: string;
  ingredients: string[];
  indications: string[];
}> = {};

const CATEGORY_EN: Record<string, string> = {
  "partner-item": "Partner-listed items",
};

const AREA_EN: Record<string, { countyCity: string; name: string; shortName: string }> = {
  datong: { countyCity: "Taipei", name: "Datong District, Taipei", shortName: "Datong" },
  linkou: { countyCity: "New Taipei", name: "Linkou District, New Taipei", shortName: "Linkou" },
  luzhou: { countyCity: "New Taipei", name: "Luzhou District, New Taipei", shortName: "Luzhou" },
  xinzhuang: { countyCity: "New Taipei", name: "Xinzhuang District, New Taipei", shortName: "Xinzhuang" },
  zhongshan: { countyCity: "Taipei", name: "Zhongshan District, Taipei", shortName: "Zhongshan" },
  xinyi: { countyCity: "Taipei", name: "Xinyi District, Taipei", shortName: "Xinyi" },
  xitun: { countyCity: "Taichung", name: "Xitun District, Taichung", shortName: "Xitun" },
  miaoli: { countyCity: "Miaoli County", name: "Miaoli City, Miaoli", shortName: "Miaoli" },
  yilan: { countyCity: "Yilan County", name: "Yilan City, Yilan", shortName: "Yilan" },
  luodong: { countyCity: "Yilan County", name: "Luodong Township, Yilan", shortName: "Luodong" },
};

const CLASS_EN: Record<string, string> = {
  "甲類成藥": "Class A OTC",
  "乙類成藥": "Class B OTC",
  "指示藥": "Pharmacist-guided medicine",
  "非藥品": "Non-drug product",
  "待確認": "Classification pending",
};

export function drugCopy(drug: Drug, locale: Locale) {
  if (locale === "zh") return drug;
  const translated = DRUG_EN[drug.slug];
  return {
    ...drug,
    name: translated?.name ?? drug.nameEn ?? drug.name,
    form: translated?.form ?? (drug.form === "劑型待確認" ? "Form pending" : drug.form === "軟膠囊" ? "Softgel" : drug.form === "膠囊" ? "Capsule" : drug.form),
    spec: drug.spec === "規格待確認" ? "Package size pending" : drug.spec.replace(/[粒顆錠]$/, " count"),
    ingredients: translated?.ingredients ?? drug.ingredients,
    indications: translated?.indications ?? drug.indications,
    nutritionFocus: drug.nutritionFocusEn,
    drugClass: CLASS_EN[drug.drugClass] ?? drug.drugClass,
  };
}

export function categoryName(slug: string, fallback: string, locale: Locale): string {
  return locale === "en" ? CATEGORY_EN[slug] ?? fallback : fallback;
}

export function areaCopy(area: Area, locale: Locale): Area {
  if (locale === "zh") return area;
  const translated = AREA_EN[area.slug];
  return translated ? { ...area, ...translated } : area;
}

export function stockCopy(badge: StockBadgeSpec, locale: Locale): StockBadgeSpec {
  if (locale === "zh") return badge;
  if (badge.tier === "fresh") {
    return { ...badge, text: "Received today", shortText: "Today" };
  }
  if (badge.tier === "unknown") {
    return { ...badge, text: "Ask pharmacy to confirm", shortText: "Confirm" };
  }
  const days = Number.parseInt(badge.text, 10);
  const label = Number.isFinite(days) ? `${days} days ago` : "Recently received";
  return { ...badge, text: label, shortText: label };
}
