import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AnalyticsLoader } from "@/components/analytics-loader";
import { NavAuth } from "@/components/nav-auth";
import {
  SiteHeaderBrand,
  SiteHeaderNavLinks,
} from "@/components/site-header-nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mercer — Multifamily Exterior Bids",
  description:
    "From parking lot to proposal. Measure, price, and bid multifamily exterior jobs on-site.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen flex flex-col">
          <header className="border-b">
            <div className="container mx-auto flex h-14 items-center px-4">
              <SiteHeaderBrand />
              <nav className="ml-auto flex items-center gap-4">
                <SiteHeaderNavLinks />
                <NavAuth />
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
        <AnalyticsLoader />
      </body>
    </html>
  );
}
