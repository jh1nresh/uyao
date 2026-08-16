import { NextRequest, NextResponse } from "next/server";

import { appendRecord } from "@/lib/record";
import {
  getByCode,
  listStoreReservations,
  updateStatus,
  type ReservationStatus,
} from "@/lib/reservations-store";
import { isStoreDemoSandbox } from "@/lib/store-demo";
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

type ReservationAction = "confirm" | "reject" | "pickup";

const ACTION_STATUS: Record<ReservationAction, ReservationStatus> = {
  confirm: "confirmed",
  reject: "rejected_no_stock",
  pickup: "picked_up",
};

const ACTION_FROM: Record<ReservationAction, ReservationStatus> = {
  confirm: "pending_store_confirm",
  reject: "pending_store_confirm",
  pickup: "confirmed",
};

interface ActionDependencies {
  readSession: typeof sessionFromRequest;
  findByCode: typeof getByCode;
  transition: typeof updateStatus;
  listReservations: typeof listStoreReservations;
  record: typeof appendRecord;
}

const actionDependencies: ActionDependencies = {
  readSession: sessionFromRequest,
  findByCode: getByCode,
  transition: updateStatus,
  listReservations: listStoreReservations,
  record: appendRecord,
};

export async function handleUpdateReservation(
  request: NextRequest,
  dependencies: ActionDependencies = actionDependencies,
) {
  let session;
  try {
    session = await dependencies.readSession(request);
  } catch (error) {
    console.error("[store-reservations] membership 驗證失敗", String(error).slice(0, 160));
    return NextResponse.json({ error: "登入服務暫時無法使用。" }, { status: 503 });
  }
  if (!session) return NextResponse.json({ error: "請重新登入後再試。" }, { status: 401 });

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "請提供單號與處理動作。" }, { status: 400 });
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json({ error: "請提供單號與處理動作。" }, { status: 400 });
  }

  const body = input as Record<string, unknown>;
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const action = typeof body.action === "string" ? body.action : "";
  if (!/^[A-Z]-\d{3}$/.test(code) || !["confirm", "reject", "pickup"].includes(action)) {
    return NextResponse.json({ error: "單號或處理動作無效。" }, { status: 400 });
  }

  const reservation = await dependencies.findByCode(code).catch(() => null);
  const demoSandbox = isStoreDemoSandbox(session.storeSlug);
  const ownsReservation = reservation && (
    demoSandbox
      ? reservation.demo === true
      : reservation.storeSlug === session.storeSlug && reservation.demo !== true
  );
  // 不揭露其他門市是否擁有這個單號。
  if (!reservation || !ownsReservation) {
    return NextResponse.json({ error: "找不到這筆預留。" }, { status: 404 });
  }

  const typedAction = action as ReservationAction;
  const expectedStatus = ACTION_FROM[typedAction];
  if (reservation.status !== expectedStatus) {
    return NextResponse.json({
      error: "這筆預留的狀態已變更，請重新整理後再試。",
    }, { status: 409 });
  }

  const updated = await dependencies.transition(
    code,
    ACTION_STATUS[typedAction],
    expectedStatus,
  ).catch(() => null);
  if (!updated) {
    return NextResponse.json({ error: "預留狀態剛剛已變更，請重新整理後再試。" }, { status: 409 });
  }

  await dependencies.record("reservations", {
    code,
    storeSlug: session.storeSlug,
    operatorName: session.displayName,
    status: ACTION_STATUS[typedAction],
    demo: updated.demo === true,
    at: new Date().toISOString(),
    source: "store_os",
  }).catch((error) => {
    console.error("[store-reservations] audit sink failed", code, String(error).slice(0, 160));
  });

  const reservations = await dependencies.listReservations(session.storeSlug);
  const summary = reservations.find((item) => item.code === code);
  if (!summary) {
    return NextResponse.json({ error: "狀態已更新，但收件匣暫時無法重新載入。" }, { status: 503 });
  }
  const response = NextResponse.json({ reservation: summary });
  response.headers.set("cache-control", "no-store");
  return response;
}

export async function PATCH(request: NextRequest) {
  return handleUpdateReservation(request);
}
