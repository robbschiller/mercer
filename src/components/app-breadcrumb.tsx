"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useBreadcrumbLabels } from "@/components/breadcrumb-label";

const SECTION_LABELS: Record<string, string> = {
  dashboard: "Home",
  pipeline: "Pipeline",
  contacts: "Contacts",
  leads: "Leads",
  opportunities: "Opportunities",
  projects: "Jobs",
  properties: "Properties",
  settings: "Settings",
  members: "Team",
};

function labelFor(segment: string) {
  return (
    SECTION_LABELS[segment] ??
    segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AppBreadcrumb() {
  const pathname = usePathname();
  const overrides = useBreadcrumbLabels();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((seg, i) => {
          const href = "/" + segments.slice(0, i + 1).join("/");
          const isLast = i === segments.length - 1;
          const label =
            overrides[seg] ?? (UUID_RE.test(seg) ? "…" : labelFor(seg));
          return (
            <Fragment key={href}>
              {i > 0 && (
                <BreadcrumbSeparator className="hidden md:block" />
              )}
              <BreadcrumbItem
                className={i === 0 ? undefined : "hidden md:inline-flex"}
              >
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
