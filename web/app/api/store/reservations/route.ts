import { NextRequest, NextResponse } from "next/server";

import { listStoreReservations } from "@/lib/reservations-store";
import { sessionFromRequest } from "@/lib/store-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = sessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const reservations = await listStoreReservations(session.storeSlug);
  const response = NextResponse.json({ reservations });
  response.headers.set("cache-control", "no-store");
  return response;
}
