import { timingSafeEqual } from "node:crypto";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isStoreAdminConfigured(): boolean {
  return (process.env.STORE_OS_ADMIN_SECRET ?? "").length >= 32;
}

export function verifyStoreAdminAuthorization(header: string | null): boolean {
  const secret = process.env.STORE_OS_ADMIN_SECRET ?? "";
  if (secret.length < 32 || !header?.startsWith("Bearer ")) return false;
  return safeEqual(header.slice(7), secret);
}
