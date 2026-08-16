import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import * as kv from "@/lib/kv";
import {
  authenticateStoreUser,
  createStoreSessionToken,
  isStoreAuthConfigured,
} from "@/lib/store-auth";
import { setStoreSessionCookie } from "@/lib/store-session";

export const runtime = "nodejs";

interface LoginBody {
  username?: unknown;
  password?: unknown;
}

function loginAttemptKey(request: NextRequest, username: string): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const digest = createHash("sha256")
    .update(`${ip}\n${username.toLocaleLowerCase("en-US")}`)
    .digest("base64url");
  return `rate:store-login:${digest}`;
}

export async function handleLogin(
  request: NextRequest,
  authenticate: typeof authenticateStoreUser = authenticateStoreUser,
) {
  if (!isStoreAuthConfigured()) {
    return NextResponse.json({ error: "店家登入尚未啟用" }, { status: 503 });
  }

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!username || username.length > 120 || password.length < 1 || password.length > 500) {
    return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
  }

  try {
    const attempts = await kv.incr(loginAttemptKey(request, username), 15 * 60);
    if (attempts > 10) {
      return NextResponse.json(
        { error: "嘗試次數過多，請 15 分鐘後再試" },
        { status: 429, headers: { "retry-after": "900" } },
      );
    }
  } catch {
    // production 沒有可用的 rate limiter 時不接受密碼嘗試。
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "登入服務暫時無法使用" }, { status: 503 });
    }
  }

  let user;
  try {
    user = await authenticate(username, password);
  } catch (error) {
    console.error("[store-auth] 登入資料庫查詢失敗", String(error).slice(0, 200));
    return NextResponse.json({ error: "登入服務暫時無法使用" }, { status: 503 });
  }
  if (!user) {
    return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
  }

  const response = NextResponse.json({
    ok: true,
    user: { displayName: user.displayName, storeSlug: user.storeSlug },
  });
  setStoreSessionCookie(response, createStoreSessionToken(user));
  response.headers.set("cache-control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
  return handleLogin(request);
}
