import { matchSymptom } from "./symptoms";
import type { Drug } from "./types";

export type GuidedQueryIntent =
  | { kind: "direct" }
  | {
      kind: "safety";
      matched: string;
      adviceZh: string;
      adviceEn: string;
    }
  | {
      kind: "wellness";
      matched: string;
      terms: string[];
    };

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, "");
}

/**
 * Product identity wins over symptom wording. Some real catalog aliases include
 * words such as "咳嗽"; those must keep using the native product search.
 */
export function isExactCatalogQuery(query: string, drugs: Drug[]): boolean {
  const normalizedQuery = normalize(query.trim());
  if (!normalizedQuery) return false;

  return drugs.some((drug) => {
    const names = [drug.name, ...drug.aliases, drug.nameEn ?? ""];
    return names.some((name) => {
      if (!name) return false;
      return normalizedQuery === normalize(name)
        || normalizedQuery === normalize(`${name} ${drug.spec}`);
    });
  });
}

/**
 * Decide whether the homepage may open the deterministic guided shell.
 * Everything outside the audited symptom map remains a native GET search.
 */
export function classifyGuidedQuery(query: string, drugs: Drug[]): GuidedQueryIntent {
  const value = query.trim();
  if (!value || isExactCatalogQuery(value, drugs)) return { kind: "direct" };

  const symptom = matchSymptom(value);
  if (!symptom) return { kind: "direct" };
  if (symptom.kind === "refer") {
    return {
      kind: "safety",
      matched: symptom.matched,
      adviceZh: symptom.adviceZh,
      adviceEn: symptom.adviceEn,
    };
  }
  return {
    kind: "wellness",
    matched: symptom.matched,
    terms: symptom.terms,
  };
}

/**
 * Static expansion terms are required to name a real catalog field. Keep that
 * invariant here instead of inventing similarity scores or LLM rankings.
 */
export function wellnessCandidates(
  drugs: Drug[],
  terms: string[],
  limit = 3,
): Drug[] {
  const normalizedTerms = terms.map(normalize).filter(Boolean);
  if (normalizedTerms.length === 0 || limit <= 0) return [];

  return drugs
    .filter((drug) => {
      const fields = [
        drug.nutritionFocus,
        drug.nutritionFocusEn,
        ...drug.searchTerms,
      ].map(normalize);
      return normalizedTerms.some((term) => fields.some((field) => field === term));
    })
    .slice(0, limit);
}
