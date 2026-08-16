import {
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const KEY_LENGTH = 32;

export interface StoreUser {
  id: string;
  username: string;
  displayName: string;
  storeSlug: string;
}

interface ConfiguredStoreUser extends StoreUser {
  passwordHash: string;
}

export interface StoreSession {
  version: 1;
  userId: string;
  displayName: string;
  storeSlug: string;
  issuedAt: number;
  expiresAt: number;
}

function configuredUsers(): ConfiguredStoreUser[] {
  const raw = process.env.STORE_OS_USERS_JSON;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((entry): ConfiguredStoreUser[] => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
      const user = entry as Record<string, unknown>;
      const username = typeof user.username === "string" ? user.username.trim() : "";
      const storeSlug = typeof user.storeSlug === "string" ? user.storeSlug.trim() : "";
      const passwordHash = typeof user.passwordHash === "string" ? user.passwordHash : "";
      const displayName = typeof user.displayName === "string" && user.displayName.trim()
        ? user.displayName.trim()
        : username;
      const id = typeof user.id === "string" && user.id.trim() ? user.id.trim() : username;

      if (
        !username || username.length > 120 || /[\u0000-\u001f]/.test(username) ||
        !storeSlug || storeSlug.length > 160 ||
        !id || id.length > 120 ||
        !/^scrypt\$[A-Za-z0-9_-]{16,}\$[A-Za-z0-9_-]{32,}$/.test(passwordHash)
      ) return [];

      return [{ id, username, displayName, storeSlug, passwordHash }];
    });
  } catch {
    return [];
  }
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
  return Boolean(sessionSecret()) && configuredUsers().length > 0;
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
): Promise<StoreUser | null> {
  const normalized = username.trim().toLocaleLowerCase("en-US");
  const user = configuredUsers().find(
    (candidate) => candidate.username.toLocaleLowerCase("en-US") === normalized,
  );

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
    version: 1,
    userId: user.id,
    displayName: user.displayName,
    storeSlug: user.storeSlug,
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
      session.version !== 1 ||
      typeof session.userId !== "string" || !session.userId ||
      typeof session.displayName !== "string" ||
      typeof session.storeSlug !== "string" || !session.storeSlug ||
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

export function isStoreSessionActive(session: StoreSession): boolean {
  return configuredUsers().some(
    (user) => user.id === session.userId && user.storeSlug === session.storeSlug,
  );
}

export const STORE_SESSION_MAX_AGE = SESSION_TTL_SECONDS;
