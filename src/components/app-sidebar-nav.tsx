"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  ContactRound,
  Filter,
  HardHat,
  House,
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

// IA rework: the nav mirrors the mental model — work the pipeline, run the
// jobs, know your properties and people. Pipeline stages (leads, takeoffs,
// bids) are filters inside /pipeline, not destinations; /leads and /bids
// stay routable for deep links. Ask lives in the Home composer.
const items = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/pipeline", label: "Pipeline", icon: Filter },
  { href: "/projects", label: "Jobs", icon: HardHat },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: ContactRound },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];
// Settings lives in the org dropdown (click the company name in the sidebar
// header — see team-switcher.tsx), so it's intentionally not a nav row here.

export function AppSidebarNav() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={isActive}>
              <Link
                href={item.href}
                onClick={() => {
                  if (isMobile) setOpenMobile(false);
                }}
              >
                <item.icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
