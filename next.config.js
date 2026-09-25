/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Preview branch only: the site root shows the Apps Script (Z1) frontend in demo mode.
  async rewrites() {
    return { beforeFiles: [{ source: "/", destination: "/z1/index.html" }] };
  },
  experimental: {
    serverComponentsExternalPackages: ["nodemailer"],
  },
};
module.exports = nextConfig;
