/**
 * 把成分字串拆成「名稱 + 含量」，供品項頁排成對照表。
 *
 * 資料仍以 `Drug.ingredients` 的字串為準 —— 不另外開一份含量欄位，兩份會漂移。
 * 拆不出含量的就整串當名稱，不猜、不補零。
 */

/** 結尾是數字＋單位才算含量。中間出現的數字（如 β-1,3/1,6、UC-II）不算。 */
const TRAILING_AMOUNT = /^(.*\S)\s+([\d.]+\s?(?:mg|g|µg|mcg|IU|毫克|微克|公克))$/i;

export interface IngredientRow {
  name: string;
  /** 沒有可辨識含量時為 null —— 畫面上就只顯示名稱，不顯示「—」以外的東西。 */
  amount: string | null;
}

export function splitIngredient(raw: string): IngredientRow {
  const match = TRAILING_AMOUNT.exec(raw.trim());
  if (!match) return { name: raw.trim(), amount: null };
  return { name: match[1], amount: match[2] };
}

export function ingredientRows(ingredients: readonly string[]): IngredientRow[] {
  return ingredients.map(splitIngredient);
}

/** 有任何一項拆得出含量才值得排成表；否則維持原本的一行式列舉。 */
export function hasAmounts(ingredients: readonly string[]): boolean {
  return ingredients.some((item) => splitIngredient(item).amount !== null);
}
