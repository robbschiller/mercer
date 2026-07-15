"use client";

import { usePathname } from "next/navigation";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { NotificationsBell } from "@/components/notifications-bell";
import { PageHeaderActionsSlot } from "@/components/page-header-actions";

export function AppShellHeader() {
  const pathname = usePathname();
  // Dashboard is the welcome moment — breadcrumb-free, but customer
  // notifications still deserve a home there.
  if (pathname === "/dashboard") {
    return (
      <div className="absolute right-4 top-3 z-10">
        <NotificationsBell />
      </div>
    );
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center gap-2 px-4">
        <AppBreadcrumb />
        <PageHeaderActionsSlot className="ml-auto flex items-center gap-2" />
        <NotificationsBell />
      </div>
    </header>
  );
}
