import type { NextConfig } from "next";

// The web app (app/) has its own tsconfig so scripts/ and src/ keep their NodeNext setup.
// src/ uses NodeNext-style ".js" import specifiers for ".ts" files. Turbopack can't map those,
// so the app runs on webpack (`next dev --webpack`) with extensionAlias doing the mapping.
// Pages read data files at request time with paths built at runtime (e.g. `grades/${run}.json`),
// which file tracing can't see, so a deployment would ship without them. List them explicitly:
// prompts for the agent, the gold set's question text for samples, runs and grades for the Report Card,
// and kb/ for document titles. The KB manifest (answer key) isn't read by any page, so it isn't shipped.
const DATA_FILES = [
  "./prompts/**/*",
  "./samples/**/*",
  "./eval/gold-set-v0.6.csv",
  "./runs/*.json",
  "./grades/*.json",
  "./kb/**/*",
];

const nextConfig: NextConfig = {
  typescript: { tsconfigPath: "tsconfig.web.json" },
  outputFileTracingIncludes: { "/": DATA_FILES, "/**": DATA_FILES },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
