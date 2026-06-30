import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // standalone output bundles Next.js server into .next/standalone for packaging
  output: "standalone",

  // These packages use native bindings — must run in Node, not bundled by webpack
  serverExternalPackages: ["@libsql/client", "bcryptjs", "@react-pdf/renderer"],

  turbopack: {
    // Fix: Next.js 16 workspace root detection with multiple lockfiles
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
