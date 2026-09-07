import { describe, expect, it } from "vitest";
import type { StoreReservationSummary } from "./reservations-store";
import { reservationsForView, mergeReservationPage } from "./store-reservation-view";
const item = (code: string, status: StoreReservationSummary["status"], time: number, holdExpiresAt?: string): StoreReservationSummary => ({
  code, status, createdAt: new Date(time).toISOString(), confirmedAt: null, drugName: "測試品項", drugSpec: "", priceTwd: null, contactTail: "000", demo: true, holdExpiresAt,
});
describe("Store OS task views", () => {
  it("keeps confirmed orders reachable for pickup and completed ones in history", () => {
    let rows = [item("A-001", "pending_store_confirm", 1000)];
    rows = mergeReservationPage(rows, [item("A-001", "confirmed", 1000)]);
    expect(reservationsForView(rows, "attention")).toEqual([]);
    expect(reservationsForView(rows, "pickup").map(r => r.code)).toEqual(["A-001"]);
    rows = mergeReservationPage(rows, [item("A-001", "picked_up", 1000)]);
    expect(reservationsForView(rows, "pickup")).toEqual([]);
    expect(reservationsForView(rows, "completed")).toHaveLength(1);
  });
  it("sorts longest waiting and earliest known deadlines first without mutating input", () => {
    const rows = [item("A-002", "pending_store_confirm", 2000), item("A-001", "pending_store_confirm", 1000), item("B-001", "confirmed", 1000), item("B-003", "confirmed", 3000, new Date(5000).toISOString()), item("B-002", "confirmed", 2000, new Date(4000).toISOString())];
    expect(reservationsForView(rows, "all").map(r => r.code)).toEqual(["A-001", "A-002", "B-002", "B-003", "B-001"]);
    expect(rows[0].code).toBe("A-002");
  });
  it("deduplicates pages and includes updated rows outside the loaded list", () => {
    const rows = mergeReservationPage([item("A-001", "picked_up", 1000)], [item("A-001", "picked_up", 1000), item("B-001", "confirmed", 2000)]);
    expect(rows).toHaveLength(2);
    expect(reservationsForView(rows, "pickup")[0].code).toBe("B-001");
  });
});
