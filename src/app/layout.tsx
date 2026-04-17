import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AnalyticsLoader } from "@/components/analytics-loader";
import { ThemeProvider } from "@/components/theme-provider";

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <AnalyticsLoader />
        </ThemeProvider>
      </body>
    </html>
  );
}
