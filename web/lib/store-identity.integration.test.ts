import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { closeStoreDb, storeDb } from "./store-db";
import {
  activatePharmacyInvite,
  createPharmacyInvite,
  findActiveStoreIdentity,
  findStoreLoginIdentity,
  StoreIdentityError,
} from "./store-identity";
import { hashStorePassword } from "./store-auth";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)("store identity Postgres integration", () => {
  beforeEach(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    await closeStoreDb();
    const sql = storeDb();
    await sql`TRUNCATE pharmacy_invites, pharmacy_memberships, store_users, pharmacies CASCADE`;
  });

  afterAll(async () => {
    await closeStoreDb();
  });

  it("creates a tenant, consumes one invite, and authenticates its owner", async () => {
    const invite = await createPharmacyInvite({
      storeSlug: "A 藥局",
      pharmacyName: "A 藥局",
      email: "Owner@Example.com",
      role: "owner",
    });
    const identity = await activatePharmacyInvite({
      token: invite.token,
      displayName: "王藥師",
      passwordHash: await hashStorePassword("correct horse battery staple"),
    });

    expect(identity).toMatchObject({ storeSlug: "A 藥局", role: "owner" });
    await expect(findStoreLoginIdentity("OWNER@example.com")).resolves.toMatchObject({
      membershipId: identity.membershipId,
      pharmacyId: identity.pharmacyId,
    });
    await expect(activatePharmacyInvite({
      token: invite.token,
      displayName: "另一人",
      passwordHash: await hashStorePassword("another secure password"),
    })).rejects.toMatchObject({ code: "invite_invalid" } satisfies Partial<StoreIdentityError>);
  });

  it("cannot validate membership A against pharmacy B and revocation is immediate", async () => {
    const inviteA = await createPharmacyInvite({
      storeSlug: "A 藥局",
      pharmacyName: "A 藥局",
      email: "a@example.com",
      role: "owner",
    });
    const inviteB = await createPharmacyInvite({
      storeSlug: "B 藥局",
      pharmacyName: "B 藥局",
      email: "b@example.com",
      role: "owner",
    });
    const a = await activatePharmacyInvite({
      token: inviteA.token,
      displayName: "A",
      passwordHash: await hashStorePassword("a secure pharmacy password"),
    });
    const b = await activatePharmacyInvite({
      token: inviteB.token,
      displayName: "B",
      passwordHash: await hashStorePassword("b secure pharmacy password"),
    });

    await expect(findActiveStoreIdentity({
      userId: a.userId,
      membershipId: a.membershipId,
      pharmacyId: b.pharmacyId,
    })).resolves.toBeNull();

    await storeDb()`UPDATE pharmacy_memberships SET status = 'revoked' WHERE id = ${a.membershipId}`;
    await expect(findActiveStoreIdentity({
      userId: a.userId,
      membershipId: a.membershipId,
      pharmacyId: a.pharmacyId,
    })).resolves.toBeNull();
  });
});
