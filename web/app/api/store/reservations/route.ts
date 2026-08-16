import { NextRequest, NextResponse } from "next/server";

import { listStoreReservations } from "@/lib/reservations-store";
import { sessionFromRequest } from "@/lib/store-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function handleGetReservations(
  request: NextRequest,
  readSession: typeof sessionFromRequest = sessionFromRequest,
) {
  let session;
  try {
    session = await readSession(request);
  } catch (error) {
    console.error("[store-auth] membership 驗證失敗", String(error).slice(0, 200));
    return NextResponse.json({ error: "auth service unavailable" }, { status: 503 });
  }
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const reservations = await listStoreReservations(session.storeSlug);
  const response = NextResponse.json({ reservations });
  response.headers.set("cache-control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  return handleGetReservations(request);
}
