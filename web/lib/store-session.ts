import type { NextRequest, NextResponse } from "next/server";

import {
  isStoreSessionActive,
  readStoreSessionToken,
  STORE_SESSION_MAX_AGE,
  storeSessionCookieName,
  type StoreSession,
} from "./store-auth";

export async function sessionFromRequest(
  request: NextRequest,
  isActive: typeof isStoreSessionActive = isStoreSessionActive,
): Promise<StoreSession | null> {
  const session = readStoreSessionToken(request.cookies.get(storeSessionCookieName())?.value);
  return session && await isActive(session) ? session : null;
}

export function setStoreSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(storeSessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STORE_SESSION_MAX_AGE,
  });
}

export function clearStoreSessionCookie(response: NextResponse): void {
  for (const name of ["uyao_store_session", "__Host-uyao_store_session"]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: name.startsWith("__Host-"),
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}
