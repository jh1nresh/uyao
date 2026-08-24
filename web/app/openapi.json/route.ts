import { headers } from "next/headers";

import { openApiDocumentForHost } from "@/lib/openapi";

export const runtime = "nodejs";

/**
 * `/openapi.json`。store.uyaohealth.com 只回公開唯讀契約
 * （GET /api/catalog、GET /api/pharmacies）。公司站與 Shop 仍回完整文件，
 * 其中寫入端點標 x-internal。
 *
 * 注意 proxy matcher 排除含「.」的路徑，所以這條 route 不經 locale rewrite。
 */
export async function GET() {
  const host = (await headers()).get("host");
  return Response.json(openApiDocumentForHost(host), {
    headers: {
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      "access-control-allow-origin": "*",
      vary: "Host",
    },
  });
}
