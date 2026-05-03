"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CircleDollarSign, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/settings",
    label: "Pricing defaults",
    icon: CircleDollarSign,
    exact: true,
  },
  { href: "/settings/company", label: "Company details", icon: FileText },
  { href: "/settings/members", label: "Team", icon: Building2 },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
