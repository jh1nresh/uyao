import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  authenticateStoreUser,
  createStoreSessionToken,
  hashStorePassword,
  isStoreAuthConfigured,
  isStoreSessionActive,
  readStoreSessionToken,
  type StoreUser,
} from "./store-auth";

const originalUsers = process.env.STORE_OS_USERS_JSON;
const originalSecret = process.env.STORE_OS_SESSION_SECRET;

const user: StoreUser = {
  id: "owner-a",
  username: "owner@example.com",
  displayName: "王藥師",
  storeSlug: "A 藥局",
};

beforeEach(async () => {
  process.env.STORE_OS_SESSION_SECRET = "test-session-secret-that-is-long-enough";
  process.env.STORE_OS_USERS_JSON = JSON.stringify([{
    ...user,
    passwordHash: await hashStorePassword("correct horse battery staple", Buffer.alloc(16, 7)),
  }]);
});

describe("Store OS credentials", () => {
  it("accepts the configured password without returning its hash", async () => {
    const result = await authenticateStoreUser("OWNER@example.com", "correct horse battery staple");
    expect(result).toEqual(user);
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("rejects a wrong password and an unknown account", async () => {
    await expect(authenticateStoreUser(user.username, "wrong password")).resolves.toBeNull();
    await expect(authenticateStoreUser("missing@example.com", "wrong password")).resolves.toBeNull();
  });

  it("fails closed when credentials or a strong session secret are absent", () => {
    delete process.env.STORE_OS_USERS_JSON;
    expect(isStoreAuthConfigured()).toBe(false);
    process.env.STORE_OS_USERS_JSON = "[]";
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

  it("invalidates an old session when the account is removed", () => {
    const session = readStoreSessionToken(createStoreSessionToken(user));
    expect(session && isStoreSessionActive(session)).toBe(true);
    process.env.STORE_OS_USERS_JSON = "[]";
    expect(session && isStoreSessionActive(session)).toBe(false);
  });
});

afterAll(() => {
  if (originalUsers === undefined) delete process.env.STORE_OS_USERS_JSON;
  else process.env.STORE_OS_USERS_JSON = originalUsers;
  if (originalSecret === undefined) delete process.env.STORE_OS_SESSION_SECRET;
  else process.env.STORE_OS_SESSION_SECRET = originalSecret;
});
