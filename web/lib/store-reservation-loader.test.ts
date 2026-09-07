import { describe, expect, it, vi } from "vitest";
import { createReservationLoader, ReservationLoadError } from "./store-reservation-loader";
const page = { reservations: [], nextHistoryCursor: null };
describe("Store OS synchronization", () => {
  it("reports failed and malformed reads and recovers on retry", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ error: "bad data" })).mockResolvedValueOnce(Response.json(page));
    const loader = createReservationLoader(fetcher);
    await expect(loader.load()).rejects.toMatchObject({ status: 503 });
    await expect(loader.load()).rejects.toBeInstanceOf(ReservationLoadError);
    await expect(loader.load()).resolves.toEqual(page);
  });
  it("prevents overlapping reads and discards responses started before an action", async () => {
    let finish!: (response: Response) => void;
    const fetcher = vi.fn<typeof fetch>().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce(Response.json(page));
    const loader = createReservationLoader(fetcher);
    const old = loader.load();
    expect(await loader.load()).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    loader.invalidate();
    const fresh = loader.load();
    finish(Response.json({ reservations: [{ code: "OLD" }] }));
    expect(await old).toBeNull();
    expect(await fresh).toEqual(page);
  });
  it("does not report intentional cancellation as a connection error", async () => {
    const loader = createReservationLoader(vi.fn<typeof fetch>().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    })));
    const request = loader.load();
    loader.invalidate();
    expect(await request).toBeNull();
  });
  it("times out a hung read and permits retry", async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn<typeof fetch>().mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () => reject(new Error("timeout")));
      })).mockResolvedValueOnce(Response.json(page));
      const loader = createReservationLoader(fetcher);
      const assertion = expect(loader.load()).rejects.toThrow("timeout");
      await vi.advanceTimersByTimeAsync(10_000);
      await assertion;
      expect(await loader.load()).toEqual(page);
    } finally { vi.useRealTimers(); }
  });
});
