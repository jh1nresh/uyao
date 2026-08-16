import { NextRequest, NextResponse } from "next/server";

import { isStoreAdminConfigured, verifyStoreAdminAuthorization } from "@/lib/store-admin";
import { isStoreDatabaseConfigured } from "@/lib/store-db";
import {
  createPharmacyInvite,
  StoreIdentityError,
  type StoreRole,
} from "@/lib/store-identity";

export const runtime = "nodejs";

interface InviteBody {
  storeSlug?: unknown;
  pharmacyName?: unknown;
  email?: unknown;
  role?: unknown;
  expiresInHours?: unknown;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = new Set<StoreRole>(["owner", "manager", "staff"]);

export async function handleCreateInvite(
  request: NextRequest,
  createInvite: typeof createPharmacyInvite = createPharmacyInvite,
) {
  if (!isStoreAdminConfigured() || !isStoreDatabaseConfigured()) {
    return NextResponse.json({ error: "admin onboarding 尚未啟用" }, { status: 503 });
  }
  if (!verifyStoreAdminAuthorization(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: InviteBody;
  try {
    body = (await request.json()) as InviteBody;
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }

  const storeSlug = typeof body.storeSlug === "string" ? body.storeSlug.trim() : "";
  const pharmacyName = typeof body.pharmacyName === "string" ? body.pharmacyName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const role = typeof body.role === "string" && ROLES.has(body.role as StoreRole)
    ? body.role as StoreRole
    : null;
  const expiresInHours = typeof body.expiresInHours === "number" && Number.isFinite(body.expiresInHours)
    ? body.expiresInHours
    : undefined;

  if (
    !storeSlug || storeSlug.length > 160 ||
    !pharmacyName || pharmacyName.length > 160 ||
    !EMAIL.test(email) || email.length > 254 ||
    !role
  ) {
    return NextResponse.json({ error: "店家、Email 或角色格式錯誤" }, { status: 422 });
  }

  try {
    const invite = await createInvite({
      storeSlug,
      pharmacyName,
      email,
      role,
      expiresInHours,
    });
    const url = new URL(process.env.STORE_OS_PUBLIC_URL ?? "https://store.uyaohealth.com/");
    // fragment 不會送進 HTTP request／Vercel logs；瀏覽器端讀取後一次性兌換。
    url.hash = `invite=${invite.token}`;
    const response = NextResponse.json(
      { activationUrl: url.toString(), expiresAt: invite.expiresAt },
      { status: 201 },
    );
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof StoreIdentityError) {
      const status = error.code === "duplicate_membership" ? 409 : 422;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("[store-onboarding] 建立邀請失敗", String(error).slice(0, 200));
    return NextResponse.json({ error: "建立邀請失敗" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  return handleCreateInvite(request);
}
