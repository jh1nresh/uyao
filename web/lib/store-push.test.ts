import { beforeEach, describe, expect, it, vi } from "vitest";
import webPush from "web-push";

import { __resetForTests } from "./kv";
import {
  deleteStorePushSubscription,
  listStorePushSubscriptions,
  saveStorePushSubscription,
  sendStorePush,
} from "./store-push";

const subscription = {
  endpoint: "https://push.example.com/subscriptions/device-a",
  expirationTime: null,
  keys: {
    p256dh: "a".repeat(88),
    auth: "b".repeat(22),
  },
};
type DeliverPush = NonNullable<Parameters<typeof sendStorePush>[2]>;

beforeEach(() => {
  __resetForTests();
  const keys = webPush.generateVAPIDKeys();
  process.env.WEB_PUSH_PUBLIC_KEY = keys.publicKey;
  process.env.WEB_PUSH_PRIVATE_KEY = keys.privateKey;
  process.env.WEB_PUSH_SUBJECT = "mailto:test@uyaohealth.com";
});

describe("Store OS push subscriptions", () => {
  it("stores subscriptions inside the signed-in store boundary", async () => {
    expect(await saveStorePushSubscription("store-a", subscription)).toEqual(subscription);
    await saveStorePushSubscription("store-a", subscription);
    expect(await listStorePushSubscriptions("store-a")).toEqual([subscription]);
    expect(await listStorePushSubscriptions("store-b")).toEqual([]);
  });

  it("rejects malformed or non-HTTPS push capabilities", async () => {
    expect(await saveStorePushSubscription("store-a", {
      ...subscription,
      endpoint: "http://push.example.com/device-a",
    })).toBeNull();
    expect(await listStorePushSubscriptions("store-a")).toEqual([]);
  });

  it("delivers a minimal notification without exposing customer contact data", async () => {
    await saveStorePushSubscription("store-a", subscription);
    const deliver = vi.fn(async (..._args: Parameters<DeliverPush>) => undefined);
    const result = await sendStorePush("store-a", {
      title: "新預留需要確認",
      body: "A-123 · 請開啟 Store OS 查看",
      tag: "reservation-A-123",
    }, deliver);

    expect(result).toMatchObject({ status: "sent", sent: 1, failed: 0 });
    const payload = deliver.mock.calls[0][1];
    expect(JSON.parse(payload)).toEqual({
      title: "新預留需要確認",
      body: "A-123 · 請開啟 Store OS 查看",
      tag: "reservation-A-123",
      url: "/",
    });
    expect(payload).not.toContain("0912");
    expect(payload).not.toContain("測試商品");
  });

  it("removes an expired browser capability after a 410 response", async () => {
    await saveStorePushSubscription("store-a", subscription);
    const deliver = vi.fn(async (..._args: Parameters<DeliverPush>) => {
      throw Object.assign(new Error("gone"), { statusCode: 410 });
    });

    expect(await sendStorePush("store-a", {
      title: "測試",
      body: "測試",
      tag: "test",
    }, deliver)).toMatchObject({ status: "failed", removed: 1 });
    expect(await listStorePushSubscriptions("store-a")).toEqual([]);
  });

  it("can explicitly remove the current browser subscription", async () => {
    await saveStorePushSubscription("store-a", subscription);
    await deleteStorePushSubscription("store-a", subscription.endpoint);
    expect(await listStorePushSubscriptions("store-a")).toEqual([]);
  });
});
