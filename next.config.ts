import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Prevent Next from treating ~/package-lock.json as the monorepo root (breaks cache + slows compiles).
  outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;
