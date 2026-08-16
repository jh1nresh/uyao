import { beforeEach, describe, expect, it, vi } from "vitest";

import { allStores, previewOffers } from "@/lib/data";
import { __resetForTests } from "@/lib/kv";
import * as reservationStore from "@/lib/reservations-store";

const mocks = vi.hoisted(() => ({
  appendRecord: vi.fn(async () => undefined),
  logConsole: vi.fn(),
  userForStore: vi.fn(async () => "line-user"),
  push: vi.fn(async () => undefined),
}));

vi.mock("@/lib/record", () => ({ appendRecord: mocks.appendRecord }));
vi.mock("@/lib/box", () => ({ logConsole: mocks.logConsole }));
vi.mock("@/lib/bindings", () => ({ userForStore: mocks.userForStore }));
vi.mock("@/lib/line", () => ({
  isConfigured: () => true,
  push: mocks.push,
  reservationFlex: vi.fn(() => ({})),
  text: vi.fn(() => ({})),
}));

import { DELETE, POST } from "./route";

beforeEach(() => {
  __resetForTests();
  vi.clearAllMocks();
});

describe("demo reservation sandbox", () => {
  it("routes a preview reservation to uyao-demo without touching a real pharmacy LINE", async () => {
    const store = allStores().find((candidate) => previewOffers(candidate.slug).length > 0);
    expect(store).toBeTruthy();
    const offer = previewOffers(store!.slug)[0];

    const response = await POST(new Request("http://localhost/api/reservations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.20",
      },
      body: JSON.stringify({
        drugSlug: offer.drugSlug,
        storeSlug: store!.slug,
        contact: "0912345678",
        demo: true,
      }),
    }));
    const body = await response.json() as { code: string; token: string; notify: string };

    expect(response.status).toBe(200);
    expect(body.notify).toBe("sandboxed");
    expect(mocks.userForStore).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();

    const sandbox = await reservationStore.listStoreReservations("uyao-demo");
    expect(sandbox).toEqual([
      expect.objectContaining({
        code: body.code,
        demo: true,
        sourceStoreName: store!.name,
        contactTail: "678",
      }),
    ]);
    expect(await reservationStore.listStoreReservations(store!.slug)).toEqual([]);

    const cancelled = await DELETE(new Request("http://localhost/api/reservations", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: body.token }),
    }));
    expect(cancelled.status).toBe(200);
    expect(mocks.userForStore).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("fails closed when the sandbox cannot persist the demo order", async () => {
    const store = allStores().find((candidate) => previewOffers(candidate.slug).length > 0)!;
    const offer = previewOffers(store.slug)[0];
    vi.spyOn(reservationStore, "saveReservation").mockRejectedValueOnce(new Error("KV down"));

    const response = await POST(new Request("http://localhost/api/reservations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.21",
      },
      body: JSON.stringify({
        drugSlug: offer.drugSlug,
        storeSlug: store.slug,
        contact: "0912345678",
        demo: true,
      }),
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "示範預留未送達，請再試一次" });
    expect(mocks.userForStore).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
