import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Statement rows are parsed entirely client-side and posted as JSON (see
    // src/lib/statements) -- a couple thousand rows can exceed the 1MB default.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
