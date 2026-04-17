"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Settings, Users } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/bids", label: "Bids", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={isActive}>
              <Link href={item.href}>
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
