import {
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

import { isStoreDatabaseConfigured } from "./store-db";
import {
  findActiveStoreIdentity,
  findStoreLoginIdentity,
  type StoreIdentity,
  type StoreLoginIdentity,
  type StoreRole,
} from "./store-identity";

const scryptAsync = promisify(scrypt);
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const KEY_LENGTH = 32;

export type StoreUser = StoreIdentity;

export interface StoreSession {
  version: 2;
  userId: string;
  membershipId: string;
  pharmacyId: string;
  displayName: string;
  storeSlug: string;
  role: StoreRole;
  issuedAt: number;
  expiresAt: number;
}

function sessionSecret(): string | null {
  const secret = process.env.STORE_OS_SESSION_SECRET ?? "";
  return secret.length >= 32 ? secret : null;
}

function digest(secret: string, payload: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

function safeEqual(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

export function storeSessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Host-uyao_store_session"
    : "uyao_store_session";
}

export function isStoreAuthConfigured(): boolean {
  return Boolean(sessionSecret()) && isStoreDatabaseConfigured();
}

export async function hashStorePassword(password: string, salt = randomBytes(16)): Promise<string> {
  if (password.length < 12) throw new Error("密碼至少需要 12 個字元");
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [, saltText, digestText] = encoded.split("$");
  if (!saltText || !digestText) return false;

  try {
    const expected = Buffer.from(digestText, "base64url");
    const actual = (await scryptAsync(
      password,
      Buffer.from(saltText, "base64url"),
      expected.length,
    )) as Buffer;
    return safeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function authenticateStoreUser(
  username: string,
  password: string,
  findIdentity: (email: string) => Promise<StoreLoginIdentity | null> = findStoreLoginIdentity,
): Promise<StoreUser | null> {
  const user = await findIdentity(username);

  // 找不到帳號也跑一次 scrypt，避免用回應時間枚舉帳號。
  if (!user) {
    await scryptAsync(password, Buffer.alloc(16), KEY_LENGTH);
    return null;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return null;

  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export function createStoreSessionToken(
  user: StoreUser,
  now = Date.now(),
): string {
  const secret = sessionSecret();
  if (!secret) throw new Error("STORE_OS_SESSION_SECRET 未設定或少於 32 字元");

  const issuedAt = Math.floor(now / 1000);
  const session: StoreSession = {
    version: 2,
    userId: user.userId,
    membershipId: user.membershipId,
    pharmacyId: user.pharmacyId,
    displayName: user.displayName,
    storeSlug: user.storeSlug,
    role: user.role,
    issuedAt,
    expiresAt: issuedAt + SESSION_TTL_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${digest(secret, payload).toString("base64url")}`;
}

export function readStoreSessionToken(
  token: string | undefined,
  now = Date.now(),
): StoreSession | null {
  const secret = sessionSecret();
  if (!secret || !token) return null;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;

  try {
    if (!safeEqual(Buffer.from(signature, "base64url"), digest(secret, payload))) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const session = parsed as Partial<StoreSession>;
    const nowSeconds = Math.floor(now / 1000);
    if (
      session.version !== 2 ||
      typeof session.userId !== "string" || !session.userId ||
      typeof session.membershipId !== "string" || !session.membershipId ||
      typeof session.pharmacyId !== "string" || !session.pharmacyId ||
      typeof session.displayName !== "string" ||
      typeof session.storeSlug !== "string" || !session.storeSlug ||
      !["owner", "manager", "staff"].includes(session.role ?? "") ||
      typeof session.issuedAt !== "number" ||
      typeof session.expiresAt !== "number" ||
      session.issuedAt > nowSeconds + 60 ||
      session.expiresAt <= nowSeconds
    ) return null;
    return session as StoreSession;
  } catch {
    return null;
  }
}

export async function isStoreSessionActive(
  session: StoreSession,
  findIdentity: typeof findActiveStoreIdentity = findActiveStoreIdentity,
): Promise<boolean> {
  return Boolean(await resolveStoreSessionIdentity(session, findIdentity));
}

export async function resolveStoreSessionIdentity(
  session: StoreSession,
  findIdentity: typeof findActiveStoreIdentity = findActiveStoreIdentity,
): Promise<StoreIdentity | null> {
  const identity = await findIdentity({
    userId: session.userId,
    membershipId: session.membershipId,
    pharmacyId: session.pharmacyId,
  });
  return (
    identity &&
    identity.storeSlug === session.storeSlug &&
    identity.role === session.role
  ) ? identity : null;
}

export const STORE_SESSION_MAX_AGE = SESSION_TTL_SECONDS;
