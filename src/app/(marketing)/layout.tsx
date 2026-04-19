import Link from "next/link";
import { Fraunces } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${fraunces.variable} min-h-screen bg-[var(--color-ink)] text-white`}
    >
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-20 w-full max-w-[1400px] items-center gap-6 px-6 lg:px-10">
          <Link
            href="/"
            className="flex items-baseline gap-2 text-white"
            aria-label="Mercer, home"
          >
            <span className="font-display text-[1.6rem] leading-none tracking-tight font-medium">
              Mercer
            </span>
            <span className="kicker hidden text-white/50 sm:inline">
              §&nbsp;sales&nbsp;platform
            </span>
          </Link>

          <nav className="ml-auto flex items-center gap-1 text-sm text-white/75">
            <Link
              href="#workflow"
              className="hidden rounded-full px-3 py-2 transition-colors hover:bg-white/5 hover:text-white md:inline-block"
            >
              Workflow
            </Link>
            <Link
              href="#positioning"
              className="hidden rounded-full px-3 py-2 transition-colors hover:bg-white/5 hover:text-white md:inline-block"
            >
              Why Mercer
            </Link>
            <Link
              href="#product"
              className="hidden rounded-full px-3 py-2 transition-colors hover:bg-white/5 hover:text-white md:inline-block"
            >
              Product
            </Link>
            <span className="mx-2 hidden h-4 w-px bg-white/15 md:inline-block" />
            <Link
              href="/login"
              className="rounded-full px-3 py-2 transition-colors hover:bg-white/5 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="ml-1 inline-flex h-9 items-center rounded-full bg-[var(--color-amber)] px-4 text-sm font-medium text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_8px_24px_-8px_rgba(232,93,35,0.6)] transition-transform hover:-translate-y-[1px] hover:bg-[var(--color-amber-soft)]"
            >
              Start free
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
