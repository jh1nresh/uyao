import "server-only";

import { headers } from "next/headers";
import type { Metadata } from "next";

import type { SocialPreviewLocale } from "./seo";
import {
  consumerIndexingAllowed,
  indexingAllowed,
  socialPreviewAudience,
  socialPreviewImages,
} from "./seo";

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

/**
 * Root-layout social card default. Next.js replaces `openGraph`/`twitter`
 * wholesale when a page declares its own, so pages that already call
 * socialPreviewImages() keep their card and everything else — guides,
 * evidence, compare, pharmacy, and the noindex consumer routes — inherits
 * the card for its own host instead of sharing as bare text.
 */
export async function defaultSocialPreview(locale: SocialPreviewLocale) {
  const host = (await headers()).get("host");
  return socialPreviewImages(socialPreviewAudience(host), locale);
}

/** Consumer homepage only: production shop canonical host may index. */
export async function consumerIndexablePageRobots(): Promise<NonNullable<Metadata["robots"]>> {
  const host = (await headers()).get("host");
  return consumerIndexingAllowed(host)
    ? { index: true, follow: true }
    : { index: false, follow: false };
}
