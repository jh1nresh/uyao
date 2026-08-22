/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 家目錄有雜散的 pnpm-lock.yaml，Turbopack 會誤判 workspace root — 固定在 web/。
  turbopack: { root: import.meta.dirname },
  async headers() {
    const cache = "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";
    const publicPages = ["/", "/about", "/contact", "/privacy", "/docs", "/zh-tw", "/en"];
    return publicPages.map((source) => ({
      source,
      headers: [
        { key: "Cache-Control", value: cache },
        { key: "CDN-Cache-Control", value: cache },
        { key: "Vary", value: "Accept" },
      ],
    }));
  },
  async redirects() {
    return [
      // 舊登入入口直接收斂到唯一 Store OS 網域。
      { source: "/pharmacy-login", destination: "https://store.uyaohealth.com/", permanent: true },
      // www → apex 必須在這層做，不能只靠 proxy.ts：proxy matcher 排除含「.」
      // 的路徑，robots.txt / sitemap.xml 進不了 proxy，會落到 app 而拿到
      // 「非 canonical host → Disallow: /」。Google 讀 www/robots.txt 被擋住，
      // 就永遠看不到頁面的 308，舊的 www 索引清不掉（GSC「已建立索引，
      // 但遭到 robots.txt 封鎖」）。config redirects 跑在所有路由之前，
      // 含「.」的路徑也涵蓋。
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.uyaohealth.com" }],
        destination: "https://uyaohealth.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
