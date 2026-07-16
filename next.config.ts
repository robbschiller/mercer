import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  // Legacy-route redirects (IA rework). These used to be page-level
  // redirect() stubs, but streaming (loading.tsx) turns those into
  // client-side redirects that trip React #310 mid-hydration — config
  // redirects answer at the edge before React is involved.
  async redirects() {
    return [
      {
        source: "/takeoff-queue",
        destination: "/pipeline?stage=takeoff",
        permanent: false,
      },
      // Bids became Opportunities (Jordan field pass B1) — old links live on.
      { source: "/bids", destination: "/opportunities", permanent: false },
      { source: "/bids/:path*", destination: "/opportunities/:path*", permanent: false },
      { source: "/leads/import", destination: "/contacts/import", permanent: false },
      { source: "/leads/accounts", destination: "/leads?view=property", permanent: false },
      { source: "/leads/properties", destination: "/leads?view=property", permanent: false },
      { source: "/leads/properties/:id", destination: "/properties/:id", permanent: false },
      { source: "/leads/contacts", destination: "/contacts", permanent: false },
      { source: "/leads/contacts/:id", destination: "/contacts/:id", permanent: false },
    ];
  },
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
