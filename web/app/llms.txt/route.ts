import { headers } from "next/headers";

import { companyLlmsTxt, nonCanonicalLlmsTxt, storeLlmsTxt } from "@/lib/llms";
import { CANONICAL_HOST, STORE_CANONICAL_HOST } from "@/lib/seo";

export const runtime = "nodejs";

/**
 * `/llms.txt`。主站是一份整合後的公司＋consumer 索引；Store OS 仍獨立。
 * 非 production 或非 canonical host 只回一行說明，理由與 robots.ts 相同 ——
 * preview deployment 不該被當成正式來源引用。
 *
 * 注意 proxy matcher 排除含「.」的路徑，所以這條 route 不經 locale rewrite。
 */
export async function GET() {
  const host = ((await headers()).get("host") ?? "").toLowerCase().split(":")[0];
  const isStore = host === STORE_CANONICAL_HOST;
  const isCanonical = host === CANONICAL_HOST || isStore;

  const body = process.env.VERCEL_ENV !== "production" || !isCanonical
    ? nonCanonicalLlmsTxt()
    : isStore
      ? storeLlmsTxt()
      : companyLlmsTxt();

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      vary: "Accept-Encoding",
    },
  });
}
