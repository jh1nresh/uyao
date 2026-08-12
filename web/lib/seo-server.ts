import "server-only";

import { headers } from "next/headers";
import type { Metadata } from "next";

import { indexingAllowed } from "./seo";

/**
 * 允許 index 的 route 用這個算 robots：只有 production canonical host
 * 拿到 index；preview、deployment URL、shop host 維持 noindex。
 * 其他 route 不要呼叫 —— root layout 的預設 noindex 就是它們的 policy。
 */
export async function indexablePageRobots(): Promise<NonNullable<Metadata["robots"]>> {
  const host = (await headers()).get("host");
  return indexingAllowed(host)
    ? { index: true, follow: true }
    : { index: false, follow: false };
}
