/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // 藥局端沒有後台帳號可以登入（預留確認走 LINE bot），
      // 合作說明與試點申請統一收在 /pharmacy。
      { source: "/pharmacy-login", destination: "/pharmacy", permanent: true },
    ];
  },
};

export default nextConfig;
