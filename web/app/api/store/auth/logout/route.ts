import { NextResponse } from "next/server";

import { clearStoreSessionCookie } from "@/lib/store-session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearStoreSessionCookie(response);
  response.headers.set("cache-control", "no-store");
  return response;
}
