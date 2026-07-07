import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile our workspace TS packages (they ship raw source, no build step).
  transpilePackages: ["@infinite-playlist/shared-types"],
};

export default nextConfig;
