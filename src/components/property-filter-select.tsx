"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import { MapPin, Building2 } from "lucide-react";

export type PropertyFilterOption = {
  key: string;
  label: string;
  count: number;
  href: string;
};

type EntityFilterProps = {
  options: PropertyFilterOption[];
  activeKey: string | null;
  clearHref: string;
  activeLabel: string | null;
  /** Singular label shown to the left of the select (e.g. "Property", "Management"). */
  entityLabel: string;
  /** Plural "All X" wording used as the empty option. */
  allLabel: string;
  /** Icon variant for the active chip and select id namespace. */
  variant?: "property" | "management";
};

function Icon({ variant }: { variant: EntityFilterProps["variant"] }) {
  return variant === "management" ? (
    <Building2 className="h-3 w-3" />
  ) : (
    <MapPin className="h-3 w-3" />
  );
}

export function PropertyFilterSelect({
  options,
  activeKey,
  clearHref,
  activeLabel,
  entityLabel,
  allLabel,
  variant = "property",
}: EntityFilterProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const id = `${variant}-filter`;

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor={id} className="text-muted-foreground shrink-0">
        {entityLabel}:
      </label>
      <select
        id={id}
        value={activeKey ?? ""}
        onChange={(e) => {
          const next = e.target.value
            ? options.find((o) => o.key === e.target.value)?.href ?? clearHref
            : clearHref;
          startTransition(() => router.push(next));
        }}
        className="h-8 max-w-[28ch] rounded-md border bg-background px-2 text-sm"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label} ({o.count})
          </option>
        ))}
      </select>
      {activeKey && activeLabel && (
        <span className="inline-flex items-center gap-2 rounded-full border border-foreground bg-foreground px-3 py-1 text-xs text-background">
          <Icon variant={variant} />
          {activeLabel}
          <Link
            href={clearHref}
            aria-label={`Clear ${entityLabel.toLowerCase()} filter`}
            className="ml-1 rounded-full px-1 leading-none hover:bg-background/20"
          >
            ×
          </Link>
        </span>
      )}
    </div>
  );
}
