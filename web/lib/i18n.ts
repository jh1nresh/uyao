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
}> = {
  "salonpas-ae": {
    name: "Salonpas-AE Patch",
    form: "Patch",
    ingredients: ["Methyl salicylate", "l-Menthol"],
    indications: ["Muscle soreness", "Sprains", "Lower back pain"],
  },
  "golden-cross-patch": {
    name: "Golden Cross Pain Relief Patch",
    form: "Patch",
    ingredients: ["Methyl salicylate", "l-Menthol"],
    indications: ["Muscle soreness", "Neck and shoulder stiffness"],
  },
  "cool-relief-patch": {
    name: "Cool Relief Patch",
    form: "Patch",
    ingredients: ["Methyl salicylate", "l-Menthol"],
    indications: ["Muscle soreness", "Post-exercise discomfort"],
  },
  "mentholatum-ad": {
    name: "Mentholatum AD Ointment",
    form: "Ointment",
    ingredients: ["Allantoin", "dl-Camphor"],
    indications: ["Dry, itchy skin", "Itch relief"],
  },
  "jimu-spray": {
    name: "Jimu Cooling Spray",
    form: "Spray",
    ingredients: ["Methyl salicylate", "Menthol"],
    indications: ["Muscle soreness", "Fatigue"],
  },
  "green-oil": {
    name: "Green Oil",
    form: "Topical liquid",
    ingredients: ["Menthol", "Camphor", "Eucalyptus oil"],
    indications: ["Headache", "Motion sickness", "Insect bites"],
  },
  "white-flower-oil": {
    name: "White Flower Oil No. 5",
    form: "Topical liquid",
    ingredients: ["Menthol", "Methyl salicylate", "Eucalyptus oil"],
    indications: ["Headache", "Insect bites"],
  },
  "povidone-iodine": {
    name: "Povidone-Iodine Ointment",
    form: "Ointment",
    ingredients: ["Povidone-iodine"],
    indications: ["Wound disinfection"],
  },
  "artificial-tears": {
    name: "Hulikan Artificial Tears",
    form: "Eye drops",
    ingredients: ["Sodium hyaluronate"],
    indications: ["Dry eyes"],
  },
};

const CATEGORY_EN: Record<string, string> = {
  patch: "Pain relief patches",
  ointment: "Ointments",
  "otc-staple": "Everyday OTC products",
};

const AREA_EN: Record<string, { name: string; shortName: string }> = {
  datong: { name: "Datong District, Taipei", shortName: "Datong" },
  linkou: { name: "Linkou District, New Taipei", shortName: "Linkou" },
  xinzhuang: { name: "Xinzhuang District, New Taipei", shortName: "Xinzhuang" },
  zhongshan: { name: "Zhongshan District, Taipei", shortName: "Zhongshan" },
  xinyi: { name: "Xinyi District, Taipei", shortName: "Xinyi" },
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
    form: translated?.form ?? drug.form,
    spec: drug.spec.replace("片/盒", "patches/box"),
    ingredients: translated?.ingredients ?? drug.ingredients,
    indications: translated?.indications ?? drug.indications,
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
