"use client";

import { usePathname } from "next/navigation";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { NotificationsBell } from "@/components/notifications-bell";
import { PageHeaderActionsSlot } from "@/components/page-header-actions";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppShellHeader() {
  const pathname = usePathname();
  // Dashboard is the welcome moment — breadcrumb-free, but the sidebar
  // still needs its mobile way in, and notifications keep their home.
  if (pathname === "/dashboard") {
    return (
      <>
        <div className="absolute left-3 top-3 z-10 md:hidden">
          <SidebarTrigger className="size-9 rounded-lg border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]" />
        </div>
        <div className="absolute right-4 top-3 z-10">
          <NotificationsBell />
        </div>
      </>
    );
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1 md:hidden" />
        <AppBreadcrumb />
        <PageHeaderActionsSlot className="ml-auto flex items-center gap-2" />
        <NotificationsBell />
      </div>
    </header>
  );
}
