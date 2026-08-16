/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 家目錄有雜散的 pnpm-lock.yaml，Turbopack 會誤判 workspace root — 固定在 web/。
  turbopack: { root: import.meta.dirname },
  async redirects() {
    return [
      // 舊登入入口直接收斂到唯一 Store OS 網域。
      { source: "/pharmacy-login", destination: "https://store.uyaohealth.com/", permanent: true },
    ];
  },
};

export default nextConfig;
