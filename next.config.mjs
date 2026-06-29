/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // 关掉：scratch canvas / 音效等副作用不想在 dev 里跑两次
};

export default nextConfig;
