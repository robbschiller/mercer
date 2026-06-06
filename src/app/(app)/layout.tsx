import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org-context";
import {
  getOnboardingState,
  isOnboardingComplete,
  getCompanyProfile,
} from "@/lib/store";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppShellHeader } from "@/components/app-shell-header";
import { BreadcrumbLabelProvider } from "@/components/breadcrumb-label";

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
        <BreadcrumbLabelProvider>
          <AppShellHeader />
          {children}
        </BreadcrumbLabelProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
