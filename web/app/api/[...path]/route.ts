import { jsonError } from "@/lib/public-read-route";

export const runtime = "nodejs";

function unknownEndpoint() {
  return jsonError("unknown_endpoint", 404);
}

export const GET = unknownEndpoint;
export const POST = unknownEndpoint;
export const PUT = unknownEndpoint;
export const PATCH = unknownEndpoint;
export const DELETE = unknownEndpoint;
