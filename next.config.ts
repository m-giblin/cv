import type { NextConfig } from "next";
import path from "path";

const securityHeaders = [
  // Clickjacking: this app is never meant to be framed.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // camera/microphone kept as self — pitch practice records audio/video.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Prevent Next from treating ~/package-lock.json as the monorepo root (breaks cache + slows compiles).
  outputFileTracingRoot: path.join(process.cwd()),
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
