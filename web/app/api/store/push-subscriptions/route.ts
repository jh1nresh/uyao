import { NextRequest, NextResponse } from "next/server";

import {
  deleteStorePushSubscription,
  saveStorePushSubscription,
  webPushPublicKey,
} from "@/lib/store-push";
import { sessionFromRequest } from "@/lib/store-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Dependencies {
  readSession: typeof sessionFromRequest;
  configured: () => boolean;
  save: typeof saveStorePushSubscription;
  remove: typeof deleteStorePushSubscription;
}

const defaultDependencies: Dependencies = {
  readSession: sessionFromRequest,
  configured: () => Boolean(webPushPublicKey()),
  save: saveStorePushSubscription,
  remove: deleteStorePushSubscription,
};

async function sessionOrResponse(request: NextRequest, dependencies: Dependencies) {
  try {
    const session = await dependencies.readSession(request);
    return session ?? NextResponse.json({ error: "請重新登入後再試。" }, { status: 401 });
  } catch (error) {
    console.error("[store-push] auth unavailable", String(error).slice(0, 160));
    return NextResponse.json({ error: "登入服務暫時無法使用。" }, { status: 503 });
  }
}

export async function handleSubscribe(
  request: NextRequest,
  dependencies: Dependencies = defaultDependencies,
) {
  const session = await sessionOrResponse(request, dependencies);
  if (session instanceof NextResponse) return session;
  if (!dependencies.configured()) {
    return NextResponse.json({ error: "Web Push 尚未設定。" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "通知訂閱格式錯誤。" }, { status: 400 });
  }
  const input = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).subscription
    : null;
  let subscription;
  try {
    subscription = await dependencies.save(session.storeSlug, input);
  } catch (error) {
    console.error("[store-push] subscription save unavailable", String(error).slice(0, 160));
    return NextResponse.json({ error: "通知服務暫時無法使用。" }, { status: 503 });
  }
  if (!subscription) {
    return NextResponse.json({ error: "通知訂閱格式錯誤。" }, { status: 400 });
  }
  const response = NextResponse.json({ status: "subscribed" }, { status: 201 });
  response.headers.set("cache-control", "no-store");
  return response;
}

export async function handleUnsubscribe(
  request: NextRequest,
  dependencies: Dependencies = defaultDependencies,
) {
  const session = await sessionOrResponse(request, dependencies);
  if (session instanceof NextResponse) return session;

  let endpoint = "";
  try {
    const body = await request.json() as { endpoint?: unknown };
    endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  } catch {
    // Handled by the validation below.
  }
  if (!endpoint.startsWith("https://") || endpoint.length > 2048) {
    return NextResponse.json({ error: "通知訂閱格式錯誤。" }, { status: 400 });
  }
  try {
    await dependencies.remove(session.storeSlug, endpoint);
  } catch (error) {
    console.error("[store-push] subscription removal unavailable", String(error).slice(0, 160));
    return NextResponse.json({ error: "通知服務暫時無法使用。" }, { status: 503 });
  }
  const response = NextResponse.json({ status: "unsubscribed" });
  response.headers.set("cache-control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
  return handleSubscribe(request);
}

export async function DELETE(request: NextRequest) {
  return handleUnsubscribe(request);
}
