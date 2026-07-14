import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    serverActions: {
      // Photo uploads post the file through a server action; the framework
      // default (1 MB) rejects real camera photos before uploadPhotoAction's
      // own 10 MB validation can run or report anything.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
