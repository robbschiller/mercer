import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Page header: the one vocabulary every section page speaks.
 *
 * Index pages (Lists, Leads, Opportunities, Jobs) pass an `eyebrow` naming
 * the stage. Child pages (a lead, an opportunity, a "new …" form) pass
 * `back` to the parent section instead, plus the record's status `badge`.
 */
export function PageHeader({
  eyebrow,
  back,
  title,
  badge,
  description,
  actions,
  className,
}: {
  /** Index pages: the stage this section is (icon + short label). */
  eyebrow?: { icon?: React.ReactNode; label: string };
  /** Child pages: the parent section to go back to. */
  back?: { href: string; label: string };
  title: React.ReactNode;
  /** Status pill rendered beside the title. */
  badge?: React.ReactNode;
  description?: React.ReactNode;
  /** Primary and secondary actions, right-aligned. */
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-5 flex flex-wrap items-end justify-between gap-x-5 gap-y-3",
        className,
      )}
    >
      <div className="min-w-0">
        {back ? (
          <BackLink href={back.href} label={back.label} className="mb-2.5" />
        ) : eyebrow ? (
          <p className="mb-2.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
            {eyebrow.icon}
            {eyebrow.label}
          </p>
        ) : null}
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="min-w-0 truncate text-title font-semibold tracking-tight">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1 max-w-[640px] text-body text-muted-foreground [text-wrap:pretty]">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}

/** Parent-section link on every child page. */
export function BackLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft className="size-3.5" />
      {label}
    </Link>
  );
}
