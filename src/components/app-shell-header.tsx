"use client";

import { usePathname } from "next/navigation";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { PageHeaderActionsSlot } from "@/components/page-header-actions";

export function AppShellHeader() {
  const pathname = usePathname();
  // Dashboard is the welcome moment — no breadcrumb, no top chrome.
  if (pathname === "/dashboard") return null;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center gap-2 px-4">
        <AppBreadcrumb />
        <PageHeaderActionsSlot className="ml-auto flex items-center gap-2" />
      </div>
    </header>
  );
}
