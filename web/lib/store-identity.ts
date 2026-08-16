import { createHash, randomBytes } from "node:crypto";

import { storeDb } from "./store-db";

export type StoreRole = "owner" | "manager" | "staff";

export interface StoreIdentity {
  userId: string;
  membershipId: string;
  pharmacyId: string;
  email: string;
  displayName: string;
  storeSlug: string;
  role: StoreRole;
}

export interface StoreLoginIdentity extends StoreIdentity {
  passwordHash: string;
}

export type StoreIdentityErrorCode =
  | "duplicate_membership"
  | "existing_user"
  | "invite_expired"
  | "invite_invalid"
  | "pharmacy_suspended";

export class StoreIdentityError extends Error {
  constructor(public readonly code: StoreIdentityErrorCode, message: string) {
    super(message);
    this.name = "StoreIdentityError";
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLocaleLowerCase("en-US");
}

function tokenHash(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

function rowToIdentity(row: Record<string, unknown>): StoreIdentity {
  return {
    userId: String(row.user_id),
    membershipId: String(row.membership_id),
    pharmacyId: String(row.pharmacy_id),
    email: String(row.email),
    displayName: String(row.display_name),
    storeSlug: String(row.store_slug),
    role: row.role as StoreRole,
  };
}

export async function findStoreLoginIdentity(email: string): Promise<StoreLoginIdentity | null> {
  const sql = storeDb();
  const rows = await sql`
    SELECT
      u.id AS user_id,
      u.email,
      u.display_name,
      u.password_hash,
      m.id AS membership_id,
      m.role,
      p.id AS pharmacy_id,
      p.slug AS store_slug
    FROM store_users u
    JOIN pharmacy_memberships m ON m.user_id = u.id
    JOIN pharmacies p ON p.id = m.pharmacy_id
    WHERE lower(u.email) = ${normalizeEmail(email)}
      AND u.status = 'active'
      AND m.status = 'active'
      AND p.status = 'active'
    ORDER BY m.created_at ASC
    LIMIT 2
  `;
  // 多店帳號需要明確的門市選擇器；第一版不默認挑一家，避免進錯 tenant。
  if (rows.length !== 1) return null;
  return { ...rowToIdentity(rows[0]), passwordHash: String(rows[0].password_hash) };
}

export async function findActiveStoreIdentity(input: {
  userId: string;
  membershipId: string;
  pharmacyId: string;
}): Promise<StoreIdentity | null> {
  const sql = storeDb();
  const rows = await sql`
    SELECT
      u.id AS user_id,
      u.email,
      u.display_name,
      m.id AS membership_id,
      m.role,
      p.id AS pharmacy_id,
      p.slug AS store_slug
    FROM pharmacy_memberships m
    JOIN store_users u ON u.id = m.user_id
    JOIN pharmacies p ON p.id = m.pharmacy_id
    WHERE u.id = ${input.userId}
      AND m.id = ${input.membershipId}
      AND p.id = ${input.pharmacyId}
      AND u.status = 'active'
      AND m.status = 'active'
      AND p.status = 'active'
    LIMIT 1
  `;
  return rows.length === 1 ? rowToIdentity(rows[0]) : null;
}

export async function createPharmacyInvite(input: {
  storeSlug: string;
  pharmacyName: string;
  email: string;
  role: StoreRole;
  expiresInHours?: number;
}): Promise<{ token: string; expiresAt: string }> {
  const sql = storeDb();
  const token = randomBytes(32).toString("base64url");
  const expiresInHours = Math.min(Math.max(input.expiresInHours ?? 72, 1), 168);
  const expiresAt = new Date(Date.now() + expiresInHours * 3600_000);
  const email = normalizeEmail(input.email);

  await sql.begin(async (tx) => {
    const pharmacies = await tx`
      INSERT INTO pharmacies (slug, display_name)
      VALUES (${input.storeSlug}, ${input.pharmacyName})
      ON CONFLICT (slug) DO UPDATE
        SET display_name = EXCLUDED.display_name, updated_at = now()
        WHERE pharmacies.status = 'active'
      RETURNING id, status
    `;
    if (pharmacies.length !== 1 || pharmacies[0].status !== "active") {
      throw new StoreIdentityError("pharmacy_suspended", "藥局已停用");
    }
    const pharmacyId = String(pharmacies[0].id);

    const duplicate = await tx`
      SELECT 1
      FROM pharmacy_memberships m
      JOIN store_users u ON u.id = m.user_id
      WHERE m.pharmacy_id = ${pharmacyId}
        AND lower(u.email) = ${email}
        AND m.status = 'active'
      LIMIT 1
    `;
    if (duplicate.length > 0) {
      throw new StoreIdentityError("duplicate_membership", "這個帳號已屬於該藥局");
    }

    await tx`
      UPDATE pharmacy_invites
      SET revoked_at = now()
      WHERE pharmacy_id = ${pharmacyId}
        AND lower(email) = ${email}
        AND consumed_at IS NULL
        AND revoked_at IS NULL
    `;
    await tx`
      INSERT INTO pharmacy_invites (pharmacy_id, email, role, token_hash, expires_at)
      VALUES (${pharmacyId}, ${email}, ${input.role}, ${tokenHash(token)}, ${expiresAt})
    `;
  });

  return { token, expiresAt: expiresAt.toISOString() };
}

export async function activatePharmacyInvite(input: {
  token: string;
  displayName: string;
  passwordHash: string;
}): Promise<StoreIdentity> {
  const sql = storeDb();
  return sql.begin(async (tx) => {
    const invites = await tx`
      SELECT i.id, i.email, i.role, i.expires_at, p.id AS pharmacy_id, p.slug AS store_slug
      FROM pharmacy_invites i
      JOIN pharmacies p ON p.id = i.pharmacy_id
      WHERE i.token_hash = ${tokenHash(input.token)}
        AND i.consumed_at IS NULL
        AND i.revoked_at IS NULL
        AND p.status = 'active'
      FOR UPDATE OF i
    `;
    if (invites.length !== 1) {
      throw new StoreIdentityError("invite_invalid", "邀請無效");
    }
    const invite = invites[0];
    if (new Date(String(invite.expires_at)).getTime() <= Date.now()) {
      throw new StoreIdentityError("invite_expired", "邀請已過期");
    }

    const existing = await tx`
      SELECT id FROM store_users WHERE lower(email) = ${String(invite.email)} LIMIT 1
    `;
    if (existing.length > 0) {
      throw new StoreIdentityError("existing_user", "既有帳號需由登入後接受邀請");
    }

    const users = await tx`
      INSERT INTO store_users (email, display_name, password_hash)
      VALUES (${String(invite.email)}, ${input.displayName}, ${input.passwordHash})
      RETURNING id, email, display_name
    `;
    const memberships = await tx`
      INSERT INTO pharmacy_memberships (pharmacy_id, user_id, role)
      VALUES (${String(invite.pharmacy_id)}, ${String(users[0].id)}, ${String(invite.role)})
      RETURNING id, role
    `;
    const consumed = await tx`
      UPDATE pharmacy_invites SET consumed_at = now()
      WHERE id = ${String(invite.id)} AND consumed_at IS NULL
      RETURNING id
    `;
    if (consumed.length !== 1) {
      throw new StoreIdentityError("invite_invalid", "邀請已被使用");
    }

    return {
      userId: String(users[0].id),
      membershipId: String(memberships[0].id),
      pharmacyId: String(invite.pharmacy_id),
      email: String(users[0].email),
      displayName: String(users[0].display_name),
      storeSlug: String(invite.store_slug),
      role: memberships[0].role as StoreRole,
    };
  });
}
