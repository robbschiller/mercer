import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { NavAuth } from "@/components/nav-auth";

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
              <Link href="/" className="font-bold text-lg">
                Mercer
              </Link>
              <nav className="ml-auto flex items-center gap-4">
                <Link
                  href="/bids"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Bids
                </Link>
                <Link
                  href="/settings"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Settings
                </Link>
                <NavAuth />
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
