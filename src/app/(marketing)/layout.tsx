import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/" className="font-bold text-lg">
            Mercer
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
