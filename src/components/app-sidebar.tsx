import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { AppSidebarNav } from "@/components/app-sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutAction } from "@/lib/actions";

export function AppSidebar({ userEmail }: { userEmail: string }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/bids"
          className="flex items-center gap-2 px-2 py-1.5 font-bold text-lg group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
        >
          <span className="group-data-[collapsible=icon]:hidden">Mercer</span>
          <span className="hidden group-data-[collapsible=icon]:inline">M</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <AppSidebarNav />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 px-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:px-0">
          <span className="truncate text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            {userEmail}
          </span>
          <ThemeToggle />
        </div>
        <form action={signOutAction}>
          <Button
            variant="ghost"
            size="sm"
            type="submit"
            className="w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            <span className="group-data-[collapsible=icon]:hidden">
              Sign out
            </span>
            <span className="hidden group-data-[collapsible=icon]:inline">
              ⏻
            </span>
          </Button>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
