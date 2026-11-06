import type { NextConfig } from "next";

// The web app (app/) has its own tsconfig so scripts/ and src/ keep their NodeNext setup.
// src/ uses NodeNext-style ".js" import specifiers for ".ts" files. Turbopack can't map those,
// so the app runs on webpack (`next dev --webpack`) with extensionAlias doing the mapping.
const nextConfig: NextConfig = {
  typescript: { tsconfigPath: "tsconfig.web.json" },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
