/** @type {import('next').NextConfig} */
// NEXT_DIST_DIR: the local test runner (tests/run.mjs) starts its own dev server next to `npm run dev`.
const nextConfig = process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {};
export default nextConfig;
