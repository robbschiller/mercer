import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org-context";
import {
  getOnboardingState,
  isOnboardingComplete,
  getCompanyProfile,
} from "@/lib/store";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { PageHeaderActionsSlot } from "@/components/page-header-actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const [onboarding, profile] = await Promise.all([
    getOnboardingState(ctx.ownerUserId),
    getCompanyProfile(ctx.ownerUserId),
  ]);
  // Invited members skip onboarding even if the org owner hasn't finished —
  // they joined an existing org.
  if (ctx.role === "owner" && !isOnboardingComplete(onboarding)) {
    redirect("/onboarding");
  }

  return (
    <SidebarProvider>
      <AppSidebar
        userEmail={ctx.email ?? ""}
        userName={ctx.name ?? ""}
        companyName={profile?.companyName ?? ""}
        companyLogoUrl={profile?.logoUrl ?? null}
        companyPrimaryColor={profile?.primaryColor ?? null}
        role={ctx.role}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex w-full items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <AppBreadcrumb />
            <PageHeaderActionsSlot className="ml-auto flex items-center gap-2" />
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
