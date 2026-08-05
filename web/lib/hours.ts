import type { HoursSource, Store } from "./types";

/**
 * 營業時段的呈現規則。
 *
 * 健保署的「固定看診時段」是**藥師在店可調劑健保處方**的時段，不是門市
 * 營業時間 —— 實測有藥局只登記「星期一晚上」，但門市其實天天開。把它
 * 標成「營業時間」會直接誤導消費者，所以標題跟著資料來源走。
 *
 * 也刻意不顯示「營業中／已打烊」：那需要即時時鐘比對，在還沒有 Google
 * 的 periods 之前只能用猜的，猜錯的代價是有人白跑一趟。
 */
export function hoursTitle(source: HoursSource): string {
  return source === "nhi" ? "健保調劑時段" : "營業時間";
}

export function hoursNote(source: HoursSource): string | null {
  if (source === "nhi") {
    return "來源：健保署特約資料。這是藥師可調劑健保處方的時段，門市實際營業時間通常更長。";
  }
  if (source === "google") return "來源：Google 商家資訊。";
  return null;
}

/** 列表用的一行摘要。沒有資料就明講沒有，不要猜。 */
export function hoursSummary(store: Store): string {
  const first = store.hours[0];
  if (!first) return "營業時間請電洽";
  if (store.hoursSource === "nhi") return `健保調劑 ${first.hours}`;
  return first.hours;
}

/** Google 說這家不是 OPERATIONAL 時要顯示的警語；正常營業回 null。 */
export function businessStatusWarning(store: Store): string | null {
  switch (store.businessStatus) {
    case "CLOSED_PERMANENTLY":
      return "Google 標示已永久歇業";
    case "CLOSED_TEMPORARILY":
      return "Google 標示暫停營業";
    default:
      return null;
  }
}

/**
 * 健保合約終止日已過。**不等於歇業** —— 可能只是退出健保特約仍照常賣成藥。
 * 所以文案只講「合約已終止」這個查得到的事實。
 */
export function nhiTerminationNote(store: Store): string | null {
  if (!store.nhiTerminatedOn) return null;
  const d = store.nhiTerminatedOn;
  const pretty = `${d.slice(0, 4)}/${d.slice(4, 6)}/${d.slice(6, 8)}`;
  return `健保特約已於 ${pretty} 終止（可能仍營業，建議先電話確認）`;
}
