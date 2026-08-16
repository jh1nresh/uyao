import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import * as kv from "@/lib/kv";
import {
  createStoreSessionToken,
  hashStorePassword,
  isStoreAuthConfigured,
} from "@/lib/store-auth";
import { activatePharmacyInvite, StoreIdentityError } from "@/lib/store-identity";
import { setStoreSessionCookie } from "@/lib/store-session";

export const runtime = "nodejs";

interface ActivateBody {
  token?: unknown;
  displayName?: unknown;
  password?: unknown;
}

function attemptKey(request: NextRequest, token: string): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return `rate:store-activate:${createHash("sha256").update(`${ip}\n${token}`).digest("base64url")}`;
}

export async function handleActivate(
  request: NextRequest,
  activateInvite: typeof activatePharmacyInvite = activatePharmacyInvite,
) {
  if (!isStoreAuthConfigured()) {
    return NextResponse.json({ error: "店家開通尚未啟用" }, { status: 503 });
  }

  let body: ActivateBody;
  try {
    body = (await request.json()) as ActivateBody;
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (
    !/^[A-Za-z0-9_-]{43}$/.test(token) ||
    !displayName || displayName.length > 120 ||
    password.length < 12 || password.length > 200
  ) {
    return NextResponse.json({ error: "邀請或帳號資料格式錯誤" }, { status: 422 });
  }

  try {
    const attempts = await kv.incr(attemptKey(request, token), 15 * 60);
    if (attempts > 10) {
      return NextResponse.json(
        { error: "嘗試次數過多，請 15 分鐘後再試" },
        { status: 429, headers: { "retry-after": "900" } },
      );
    }
  } catch {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "開通服務暫時無法使用" }, { status: 503 });
    }
  }

  try {
    const identity = await activateInvite({
      token,
      displayName,
      passwordHash: await hashStorePassword(password),
    });
    const response = NextResponse.json({
      ok: true,
      user: { displayName: identity.displayName, storeSlug: identity.storeSlug },
    }, { status: 201 });
    setStoreSessionCookie(response, createStoreSessionToken(identity));
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof StoreIdentityError) {
      const status = error.code === "invite_expired" ? 410
        : error.code === "existing_user" ? 409
          : 422;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("[store-onboarding] 啟用邀請失敗", String(error).slice(0, 200));
    return NextResponse.json({ error: "開通失敗，請稍後再試" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  return handleActivate(request);
}
