import { drugCopy, type Locale } from "./i18n";
import { ingredientRows } from "./ingredients";
import { known } from "./pending";
import type { Drug } from "./types";

export interface ProductInfoPanel {
  kind: "features" | "facts";
  name: string;
  title: string;
  subtitle: string;
  sections: { title: string; rows: { name: string; value?: string }[] }[];
  notes: string[];
}

/** One text source feeds the exported picture and its accessible transcript. */
export function productInfoPanels(drug: Drug, locale: Locale): ProductInfoPanel[] {
  const copy = drugCopy(drug, locale);
  const en = locale === "en";
  const panels: ProductInfoPanel[] = [];
  const attribution = en ? "Source wording, not a uYao endorsement." : "依來源資料整理，非 uYao 評價或背書。";
  if (drug.highlights?.length || drug.dosage || drug.cautions) {
    const sections: ProductInfoPanel["sections"] = [];
    if (drug.highlights?.length) sections.push({
      title: en ? "As stated on the package" : "原廠標示特色",
      rows: drug.highlights.map((item) => ({ name: item.title, value: item.body })),
    });
    if (drug.dosage) sections.push({ title: en ? "Suggested use on the label" : "標示建議用量", rows: [{ name: drug.dosage }] });
    if (drug.cautions) sections.push({ title: en ? "Cautions and allergens" : "注意事項與過敏原", rows: [{ name: drug.cautions }] });
    panels.push({ kind: "features", name: copy.name, title: en ? "Product features" : "產品特色", subtitle: attribution, sections,
      notes: [en ? "uYao has not independently verified manufacturer claims. Food and supplement wording does not establish disease prevention or treatment." : "uYao 未獨立驗證原廠說法。食品與營養補充品的文字不能解讀為預防或治療疾病。", en ? "Check the actual package and ask a pharmacist." : "請以實際包裝並向藥師確認。"],
    });
  }
  const specifications = [
    [en ? "Pack size" : "規格", known(copy.spec)],
    [en ? "Form" : "劑型", known(copy.form)],
    [en ? "Company / supplier" : "廠商／供應資訊", known(drug.manufacturer)],
    [en ? "Origin" : "產地", known(drug.origin)],
  ].flatMap(([name, value]) => value ? [{ name: name!, value }] : []);
  panels.push({ kind: "facts", name: copy.name, title: en ? "Ingredients & specifications" : "成分與規格", subtitle: attribution,
    sections: [
      { title: en ? "Ingredients listed by source" : "資料所列成分", rows: drug.source && copy.ingredients.length
        ? ingredientRows(copy.ingredients).map((item) => ({ name: item.name, ...(item.amount ? { value: item.amount } : {}) }))
        : [{ name: en ? "Ingredient details require verification." : "成分資料待確認。" }] },
      ...(specifications.length ? [{ title: en ? "Product record" : "品項資料", rows: specifications }] : []),
    ],
    notes: [drug.source?.label ?? (en ? "No verified product source is available." : "尚無已驗證的產品資料來源。"), drug.source?.kind === "partner"
      ? (en ? "Partner-provided information; not independently verified against a public source." : "合作藥局提供資料，尚未以公開來源獨立驗證。")
      : (en ? "Check the actual package and confirm the details with a pharmacist." : "請以實際包裝及藥師確認為準。"),
      en ? "A catalog listing does not establish stock, price or suitability." : "目錄收錄不代表即時有貨、價格或適用性。"],
  });
  return panels;
}
