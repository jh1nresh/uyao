import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import type { StoreSession } from "@/lib/store-auth";

import { handleSubscribe, handleUnsubscribe } from "./route";

const session: StoreSession = {
  version: 2,
  userId: "user-1",
  membershipId: "membership-1",
  pharmacyId: "pharmacy-1",
  displayName: "Demo 店長",
  storeSlug: "uyao-demo",
  role: "owner",
  issuedAt: 1,
  expiresAt: 9_999_999_999,
};

const subscription = {
  endpoint: "https://push.example.com/device-a",
  expirationTime: null,
  keys: { p256dh: "a".repeat(88), auth: "b".repeat(22) },
};

function request(method: "POST" | "DELETE", body: object) {
  return new NextRequest("http://localhost/api/store/push-subscriptions", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    readSession: vi.fn().mockResolvedValue(session),
    configured: () => true,
    save: vi.fn().mockResolvedValue(subscription),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as NonNullable<Parameters<typeof handleSubscribe>[1]>;
}

describe("Store OS Web Push subscription API", () => {
  it("requires an active Store OS session", async () => {
    const response = await handleSubscribe(
      request("POST", { subscription }),
      dependencies({ readSession: vi.fn().mockResolvedValue(null) }),
    );
    expect(response.status).toBe(401);
  });

  it("stores a browser capability only for the signed-in store", async () => {
    const deps = dependencies();
    const response = await handleSubscribe(request("POST", { subscription }), deps);
    expect(response.status).toBe(201);
    expect(deps.save).toHaveBeenCalledWith("uyao-demo", subscription);
  });

  it("fails closed when VAPID keys are unavailable", async () => {
    const response = await handleSubscribe(
      request("POST", { subscription }),
      dependencies({ configured: () => false }),
    );
    expect(response.status).toBe(503);
  });

  it("reports a temporary failure when the subscription cannot be persisted", async () => {
    const response = await handleSubscribe(
      request("POST", { subscription }),
      dependencies({ save: vi.fn().mockRejectedValue(new Error("KV down")) }),
    );
    expect(response.status).toBe(503);
  });

  it("removes only the current store's browser capability", async () => {
    const deps = dependencies();
    const response = await handleUnsubscribe(
      request("DELETE", { endpoint: subscription.endpoint }),
      deps,
    );
    expect(response.status).toBe(200);
    expect(deps.remove).toHaveBeenCalledWith("uyao-demo", subscription.endpoint);
  });

  it("does not claim notifications are off when removal fails", async () => {
    const response = await handleUnsubscribe(
      request("DELETE", { endpoint: subscription.endpoint }),
      dependencies({ remove: vi.fn().mockRejectedValue(new Error("KV down")) }),
    );
    expect(response.status).toBe(503);
  });
});
