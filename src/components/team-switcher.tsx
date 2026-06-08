"use client";

import Link from "next/link";
import { Building2, PanelLeft, Settings } from "lucide-react";

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

export function TeamSwitcher({
  companyName,
}: {
  companyName: string;
  // Accepted for callsite compatibility; no longer rendered now that the
  // team switcher is a plain name + collapse icon.
  logoUrl: string | null;
  primaryColor: string | null;
  role: string;
}) {
  const { isMobile, setOpenMobile, toggleSidebar, state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const dismissOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  function handleToggle(e: React.SyntheticEvent) {
    e.stopPropagation();
    e.preventDefault();
    toggleSidebar();
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/* Dropdown is forced closed when collapsed — the row's only job
            then is to expand the sidebar. */}
        <DropdownMenu open={isCollapsed ? false : undefined}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              // Default size (h-8) in both states so the row height never
              // changes when collapsing — the whole thing is a pure
              // horizontal-only transition. Matches the nav rows below for
              // consistent icon rhythm in collapsed mode.
              onClick={isCollapsed ? handleToggle : undefined}
              aria-label={isCollapsed ? "Expand sidebar" : undefined}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {isCollapsed ? (
                // Bare SVG: shadcn's [&>svg]:size-4 sizes & centers it,
                // matching every nav icon below — same x, same width.
                <PanelLeft />
              ) : (
                <>
                  <span className="flex-1 truncate text-left font-medium text-sidebar-foreground">
                    {companyName || "Mercer"}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Collapse sidebar"
                    className="ml-auto inline-flex size-6 items-center justify-center rounded-md text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground shrink-0"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={handleToggle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleToggle(e);
                      }
                    }}
                  >
                    <PanelLeft className="size-4" />
                  </span>
                </>
              )}
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
              <Link href="/settings" onClick={dismissOnMobile}>
                <Settings className="size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 p-2">
              <Link href="/settings/members" onClick={dismissOnMobile}>
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
