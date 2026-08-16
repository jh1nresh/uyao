import { createHash } from "node:crypto";

import webPush, { type PushSubscription as WebPushSubscription } from "web-push";

import * as kv from "./kv";

const SUBSCRIPTION_TTL_SECONDS = 180 * 24 * 60 * 60;
const MAX_SUBSCRIPTIONS_PER_STORE = 100;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

export interface StorePushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface StorePushMessage {
  title: string;
  body: string;
  tag: string;
  url?: string;
}

export interface StorePushResult {
  status: "sent" | "no_subscriptions" | "not_configured" | "failed";
  sent: number;
  failed: number;
  removed: number;
}

function storeKey(storeSlug: string): string {
  return Buffer.from(storeSlug, "utf8").toString("base64url");
}

function endpointId(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("base64url");
}

function subscriptionKey(storeSlug: string, endpoint: string): string {
  return `store-push:${storeKey(storeSlug)}:${endpointId(endpoint)}`;
}

function subscriptionIndexKey(storeSlug: string): string {
  return `store-push-index:${storeKey(storeSlug)}`;
}

function parseSubscription(input: unknown): StorePushSubscription | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  if (typeof value.endpoint !== "string" || value.endpoint.length > 2048) return null;
  let endpoint: URL;
  try {
    endpoint = new URL(value.endpoint);
  } catch {
    return null;
  }
  if (endpoint.protocol !== "https:") return null;

  if (!value.keys || typeof value.keys !== "object" || Array.isArray(value.keys)) return null;
  const keys = value.keys as Record<string, unknown>;
  if (
    typeof keys.p256dh !== "string" ||
    keys.p256dh.length < 60 ||
    keys.p256dh.length > 200 ||
    !BASE64URL.test(keys.p256dh) ||
    typeof keys.auth !== "string" ||
    keys.auth.length < 10 ||
    keys.auth.length > 100 ||
    !BASE64URL.test(keys.auth)
  ) return null;

  const expirationTime = value.expirationTime === null || value.expirationTime === undefined
    ? null
    : typeof value.expirationTime === "number" && Number.isFinite(value.expirationTime)
      ? value.expirationTime
      : null;

  return {
    endpoint: endpoint.toString(),
    expirationTime,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
  };
}

export function webPushPublicKey(): string | null {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY?.trim();
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY?.trim();
  return publicKey && privateKey ? publicKey : null;
}

function configureWebPush(): boolean {
  const publicKey = webPushPublicKey();
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY?.trim();
  const subject = process.env.WEB_PUSH_SUBJECT?.trim() || "mailto:support@uyaohealth.com";
  if (!publicKey || !privateKey) return false;
  webPush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function saveStorePushSubscription(
  storeSlug: string,
  input: unknown,
): Promise<StorePushSubscription | null> {
  const subscription = parseSubscription(input);
  if (!subscription) return null;
  const id = endpointId(subscription.endpoint);
  await kv.set(
    subscriptionKey(storeSlug, subscription.endpoint),
    JSON.stringify(subscription),
    SUBSCRIPTION_TTL_SECONDS,
  );
  const indexed = await kv.lastN(subscriptionIndexKey(storeSlug), MAX_SUBSCRIPTIONS_PER_STORE);
  if (!indexed.includes(id)) {
    await kv.append(subscriptionIndexKey(storeSlug), id, MAX_SUBSCRIPTIONS_PER_STORE);
  }
  return subscription;
}

export async function deleteStorePushSubscription(storeSlug: string, endpoint: string): Promise<void> {
  await kv.del(subscriptionKey(storeSlug, endpoint));
}

export async function listStorePushSubscriptions(storeSlug: string): Promise<StorePushSubscription[]> {
  const ids = await kv.lastN(subscriptionIndexKey(storeSlug), MAX_SUBSCRIPTIONS_PER_STORE);
  const uniqueIds = [...new Set(ids)];
  const subscriptions: StorePushSubscription[] = [];
  for (const id of uniqueIds) {
    const raw = await kv.get(`store-push:${storeKey(storeSlug)}:${id}`).catch(() => null);
    if (!raw) continue;
    try {
      const subscription = parseSubscription(JSON.parse(raw));
      if (subscription) subscriptions.push(subscription);
    } catch {
      // Ignore malformed or expired records; they are not deliverable capabilities.
    }
  }
  return subscriptions;
}

type DeliverPush = (
  subscription: WebPushSubscription,
  payload: string,
  options: { TTL: number; urgency: "high" },
) => Promise<unknown>;

function statusCode(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const value = (error as { statusCode?: unknown }).statusCode;
  return typeof value === "number" ? value : null;
}

export async function sendStorePush(
  storeSlug: string,
  message: StorePushMessage,
  deliver: DeliverPush = webPush.sendNotification.bind(webPush),
): Promise<StorePushResult> {
  if (!configureWebPush()) {
    return { status: "not_configured", sent: 0, failed: 0, removed: 0 };
  }
  const subscriptions = await listStorePushSubscriptions(storeSlug);
  if (subscriptions.length === 0) {
    return { status: "no_subscriptions", sent: 0, failed: 0, removed: 0 };
  }

  const payload = JSON.stringify({ ...message, url: message.url || "/" });
  let sent = 0;
  let failed = 0;
  let removed = 0;
  for (const subscription of subscriptions) {
    try {
      await deliver(subscription, payload, { TTL: 5 * 60, urgency: "high" });
      sent += 1;
    } catch (error) {
      if ([404, 410].includes(statusCode(error) ?? 0)) {
        await deleteStorePushSubscription(storeSlug, subscription.endpoint).catch(() => undefined);
        removed += 1;
      } else {
        failed += 1;
      }
    }
  }
  return {
    status: sent > 0 ? "sent" : "failed",
    sent,
    failed,
    removed,
  };
}
