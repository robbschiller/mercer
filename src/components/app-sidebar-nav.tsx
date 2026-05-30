"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  ContactRound,
  HardHat,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: ContactRound },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/bids", label: "Bids", icon: ClipboardList },
  { href: "/projects", label: "Projects", icon: HardHat },
  { href: "/settings", label: "Settings", icon: Settings },
];

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
