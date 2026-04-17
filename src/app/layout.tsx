import type { Metadata } from "next";
import { Fraunces, Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AnalyticsLoader } from "@/components/analytics-loader";
import { ThemeProvider } from "@/components/theme-provider";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mercer-bids.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Mercer: the sales platform for commercial multifamily exterior renovation",
    template: "%s · Mercer",
  },
  description:
    "From trade show list to signed deal. Ingest leads, enrich with property intelligence, build bids, and close on a shareable link. Purpose-built for commercial multifamily exterior renovation, painting first.",
  applicationName: "Mercer",
  keywords: [
    "commercial renovation",
    "multifamily bidding",
    "exterior painting contractor software",
    "bid-to-close",
    "property intelligence",
    "contractor CRM",
  ],
  openGraph: {
    type: "website",
    siteName: "Mercer",
    title: "Mercer: from trade show list to signed deal.",
    description:
      "The sales platform for commercial multifamily exterior renovation. Ingest, enrich, bid, close, all in one place.",
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mercer: from trade show list to signed deal.",
    description:
      "The sales platform for commercial multifamily exterior renovation.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${fraunces.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
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
