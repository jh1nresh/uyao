/**
 * 資料裡「這一欄還不知道」是用一句佔位字串記的（`規格待確認`、`產地待確認`…）。
 *
 * 那是給我們自己看的欄位狀態，不是要印給使用者的。畫面上印出「待確認」，
 * 對讀的人沒有任何資訊，還像替品項掛了一個問號 —— 未知就整段不顯示。
 *
 * 只認**完全等於**佔位字串的值。像
 * `待確認；南瓜籽油標示德國有機原料，不等於成品德國製` 這種帶了實際說明的
 * 內容不算佔位，照常顯示；把它一起吃掉會連可查證的但書都消失。
 */
const PLACEHOLDERS = new Set([
  "待確認",
  "規格待確認",
  "劑型待確認",
  "產地待確認",
  "廠商待確認",
  "營養補充定位待確認",
  // i18n.ts 對照出來的英文面
  "Classification pending",
  "Package size pending",
  "Form pending",
  "Nutrition positioning pending verification",
]);

export function isPending(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && PLACEHOLDERS.has(value.trim());
}

/** 佔位就回 undefined，方便直接 `{known(x) && …}` 或丟進 `.filter(Boolean)`。 */
export function known(value: string | null | undefined): string | undefined {
  return isPending(value) || !value ? undefined : value;
}
