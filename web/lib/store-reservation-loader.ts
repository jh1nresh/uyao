import type { StoreReservationSummary } from "./reservations-store";

export interface ReservationPage {
  reservations: StoreReservationSummary[];
  nextHistoryCursor?: string | null;
}

export class ReservationLoadError extends Error {
  constructor(public status: number) { super(`Reservation request failed (${status})`); }
}

/** One in-flight read; invalidation prevents pre-mutation responses from replacing newer state. */
export function createReservationLoader(fetcher: typeof fetch = fetch) {
  let pending: AbortController | null = null;
  let revision = 0;
  return {
    invalidate() { revision += 1; pending?.abort(); pending = null; },
    async load(url = "/api/store/reservations"): Promise<ReservationPage | null> {
      if (pending) return null;
      const current = revision;
      const controller = new AbortController();
      pending = controller;
      const timer = setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetcher(url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new ReservationLoadError(response.status);
        const page = await response.json() as ReservationPage;
        if (!Array.isArray(page?.reservations)) throw new ReservationLoadError(502);
        return current === revision ? page : null;
      } catch (error) {
        if (current !== revision) return null;
        throw error;
      } finally {
        clearTimeout(timer);
        if (pending === controller) pending = null;
      }
    },
  };
}
