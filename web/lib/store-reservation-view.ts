import type { StoreReservationSummary } from "./reservations-store";

export type StoreWorkView = "attention" | "pickup" | "completed" | "all";
export const isActiveReservation = (item: StoreReservationSummary) => (
  item.status === "pending_store_confirm" || item.status === "confirmed"
);

export function reservationsForView(items: StoreReservationSummary[], view: StoreWorkView) {
  const time = (value: string | null | undefined) => value ? Date.parse(value) || 0 : 0;
  return items.filter((item) => view === "attention" ? item.status === "pending_store_confirm"
    : view === "pickup" ? item.status === "confirmed"
    : view === "completed" ? !isActiveReservation(item) : true).sort((a, b) => {
    const rank = (item: StoreReservationSummary) => item.status === "pending_store_confirm" ? 0 : item.status === "confirmed" ? 1 : 2;
    if (view === "all" && rank(a) !== rank(b)) return rank(a) - rank(b);
    if (a.status === "confirmed" && b.status === "confirmed") {
      return (time(a.holdExpiresAt) || Infinity) - (time(b.holdExpiresAt) || Infinity) || time(a.createdAt) - time(b.createdAt);
    }
    return isActiveReservation(a) ? time(a.createdAt) - time(b.createdAt) : time(b.createdAt) - time(a.createdAt);
  });
}

export function mergeReservationPage(current: StoreReservationSummary[], incoming: StoreReservationSummary[]) {
  const byCode = new Map(current.map((item) => [item.code, item]));
  for (const item of incoming) byCode.set(item.code, item);
  return [...byCode.values()];
}
