import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  authenticateStoreUser,
  createStoreSessionToken,
  hashStorePassword,
  isStoreAuthConfigured,
  isStoreSessionActive,
  readStoreSessionToken,
  resolveStoreSessionIdentity,
  type StoreUser,
} from "./store-auth";
import type { StoreLoginIdentity } from "./store-identity";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalSecret = process.env.STORE_OS_SESSION_SECRET;

const user: StoreUser = {
  userId: "user-a",
  membershipId: "membership-a",
  pharmacyId: "pharmacy-a",
  email: "owner@example.com",
  displayName: "王藥師",
  storeSlug: "A 藥局",
  storeName: "A 藥局",
  role: "owner",
};

let loginIdentity: StoreLoginIdentity;

beforeEach(async () => {
  process.env.STORE_OS_SESSION_SECRET = "test-session-secret-that-is-long-enough";
  process.env.DATABASE_URL = "postgres://test.invalid/uyao";
  loginIdentity = {
    ...user,
    passwordHash: await hashStorePassword("correct horse battery staple", Buffer.alloc(16, 7)),
  };
});

describe("Store OS credentials", () => {
  it("accepts the configured password without returning its hash", async () => {
    const result = await authenticateStoreUser(
      "OWNER@example.com",
      "correct horse battery staple",
      async () => loginIdentity,
    );
    expect(result).toEqual(user);
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("rejects a wrong password and an unknown account", async () => {
    await expect(
      authenticateStoreUser(user.email, "wrong password", async () => loginIdentity),
    ).resolves.toBeNull();
    await expect(
      authenticateStoreUser("missing@example.com", "wrong password", async () => null),
    ).resolves.toBeNull();
  });

  it("fails closed when credentials or a strong session secret are absent", () => {
    delete process.env.DATABASE_URL;
    expect(isStoreAuthConfigured()).toBe(false);
    process.env.DATABASE_URL = "postgres://test.invalid/uyao";
    process.env.STORE_OS_SESSION_SECRET = "short";
    expect(isStoreAuthConfigured()).toBe(false);
  });
});

describe("Store OS session", () => {
  it("round-trips a signed tenant-bound session", () => {
    const now = Date.UTC(2026, 7, 15, 12);
    const token = createStoreSessionToken(user, now);
    expect(readStoreSessionToken(token, now + 1000)?.storeSlug).toBe("A 藥局");
  });

  it("rejects tampering, expiry, and a changed signing secret", () => {
    const now = Date.UTC(2026, 7, 15, 12);
    const token = createStoreSessionToken(user, now);
    expect(readStoreSessionToken(`${token.slice(0, -2)}xx`, now)).toBeNull();
    expect(readStoreSessionToken(token, now + 13 * 60 * 60 * 1000)).toBeNull();
    process.env.STORE_OS_SESSION_SECRET = "a-different-session-secret-that-is-long";
    expect(readStoreSessionToken(token, now)).toBeNull();
  });

  it("invalidates an old session when the membership is revoked", async () => {
    const session = readStoreSessionToken(createStoreSessionToken(user));
    expect(session && await isStoreSessionActive(session, async () => user)).toBe(true);
    expect(session && await isStoreSessionActive(session, async () => null)).toBe(false);
  });

  it("returns only the current tenant-bound identity for the profile", async () => {
    const session = readStoreSessionToken(createStoreSessionToken(user));
    expect(session).not.toBeNull();
    await expect(resolveStoreSessionIdentity(session!, async () => ({
      ...user,
      storeName: "A 藥局新名稱",
    }))).resolves.toMatchObject({
      email: user.email,
      storeName: "A 藥局新名稱",
      role: "owner",
    });
    await expect(resolveStoreSessionIdentity(session!, async () => ({
      ...user,
      storeSlug: "B 藥局",
      storeName: "B 藥局",
    }))).resolves.toBeNull();
  });
});

afterAll(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalSecret === undefined) delete process.env.STORE_OS_SESSION_SECRET;
  else process.env.STORE_OS_SESSION_SECRET = originalSecret;
});
