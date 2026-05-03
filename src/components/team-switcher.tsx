"use client";

import Link from "next/link";
import { Building2, ChevronsUpDown, Settings } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function companyInitials(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "M";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return ((words[0][0] ?? "") + (words[1][0] ?? "")).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

function readableTextColor(bgHex: string | null | undefined): string {
  const hex = (bgHex ?? "").replace(/^#/, "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  if (full.length !== 6 || !/^[0-9a-f]{6}$/i.test(full)) return "#ffffff";
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111111" : "#ffffff";
}

export function TeamSwitcher({
  companyName,
  logoUrl,
  primaryColor,
  role,
}: {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  role: string;
}) {
  const { isMobile } = useSidebar();
  const initials = companyInitials(companyName);
  const fallbackStyle = primaryColor
    ? {
        backgroundColor: primaryColor,
        color: readableTextColor(primaryColor),
      }
    : undefined;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-md">
                <AvatarImage src={logoUrl ?? undefined} alt={companyName} />
                <AvatarFallback
                  className="rounded-md bg-sidebar-primary text-sidebar-primary-foreground"
                  style={fallbackStyle}
                >
                  {initials || <Building2 className="size-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {companyName || "Mercer"}
                </span>
                <span className="truncate text-xs capitalize">{role}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Organization
            </DropdownMenuLabel>
            <DropdownMenuItem asChild className="gap-2 p-2">
              <Link href="/settings">
                <Settings className="size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 p-2">
              <Link href="/settings/members">
                <Building2 className="size-4" />
                Manage team
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
