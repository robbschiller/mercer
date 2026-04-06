"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

function LinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) {
    return <span className="inline-block w-3.5 shrink-0" aria-hidden />;
  }
  return (
    <Loader2
      className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground"
      aria-hidden
    />
  );
}

function NavTextLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
    >
      <LinkPending />
      <span>{children}</span>
    </Link>
  );
}

export function SiteHeaderBrand() {
  return (
    <Link
      href="/"
      className="font-bold text-lg inline-flex items-center gap-1.5"
    >
      <LinkPending />
      <span>Mercer</span>
    </Link>
  );
}

export function SiteHeaderNavLinks() {
  return (
    <>
      <NavTextLink href="/bids">Bids</NavTextLink>
      <NavTextLink href="/settings">Settings</NavTextLink>
    </>
  );
}
