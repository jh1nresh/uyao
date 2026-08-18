import { headers } from "next/headers";

import { companyLlmsTxt, nonCanonicalLlmsTxt, shopLlmsTxt } from "@/lib/llms";
import { CANONICAL_HOST, SHOP_CANONICAL_HOST } from "@/lib/seo";

export const runtime = "nodejs";

/**
 * `/llms.txt`。兩個 canonical host 各一份（內容見 lib/llms.ts）。
 * 非 production 或非 canonical host 只回一行說明，理由與 robots.ts 相同 ——
 * preview deployment 不該被當成正式來源引用。
 *
 * 注意 proxy matcher 排除含「.」的路徑，所以這條 route 不經 locale rewrite。
 */
export async function GET() {
  const host = ((await headers()).get("host") ?? "").toLowerCase().split(":")[0];
  const isShop = host === SHOP_CANONICAL_HOST;
  const isCanonical = host === CANONICAL_HOST || isShop;

  const body = process.env.VERCEL_ENV !== "production" || !isCanonical
    ? nonCanonicalLlmsTxt()
    : isShop
      ? shopLlmsTxt()
      : companyLlmsTxt();

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
