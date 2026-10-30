import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cooked/shared'],
  // `next dev` only serves localhost by default; phones on the same Wi-Fi come from private addresses
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*'],
};

export default config;
