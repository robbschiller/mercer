"use client";

import { NotificationsBell } from "@/components/notifications-bell";
import { PageHeaderActionsSlot } from "@/components/page-header-actions";
import { SidebarTrigger } from "@/components/ui/sidebar";

/**
 * No breadcrumb bar — the sidebar already says where you are (Jordan/Tim
 * field feedback). What survives floats: the mobile sidebar trigger, any
 * per-page actions (portaled via PageHeaderActions), and the bell.
 */
export function AppShellHeader() {
  return (
    <>
      <div className="absolute left-3 top-3 z-10 md:hidden">
        <SidebarTrigger className="size-9 rounded-lg border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]" />
      </div>
      <div className="absolute right-4 top-3 z-10 flex items-center gap-2">
        <PageHeaderActionsSlot className="flex items-center gap-2" />
        <NotificationsBell />
      </div>
    </>
  );
}
