import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[var(--color-parchment)] text-[var(--color-ink)] dark:bg-[var(--color-ink)] dark:text-white">
      <div
        className="absolute inset-0 bg-grid-parchment dark:bg-grid-ink"
        aria-hidden
      />
      <div className="hero-vignette absolute inset-0" aria-hidden />
      <div className="noise-overlay absolute inset-0" aria-hidden />

      <header className="relative z-10 mx-auto flex h-20 w-full max-w-[1400px] items-center px-6 lg:px-10">
        <Link
          href="/"
          aria-label="Mercer, home"
          className="flex items-baseline gap-2"
        >
          <span className="font-display text-[1.6rem] leading-none tracking-tight font-medium">
            Mercer
          </span>
          <span className="kicker hidden text-[var(--color-ink)]/55 sm:inline dark:text-white/50">
            §&nbsp;sales&nbsp;platform
          </span>
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-col px-4 pb-16 pt-6 sm:pt-12">
        {children}
      </main>
    </div>
  );
}
