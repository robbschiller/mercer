import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org-context";
import {
  getOnboardingState,
  isOnboardingComplete,
  getCompanyProfile,
  getSidebarCounts,
} from "@/lib/store";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppShellHeader } from "@/components/app-shell-header";
import { BreadcrumbLabelProvider } from "@/components/breadcrumb-label";
import { GlobalSearch } from "@/components/global-search";
import { BillingGate } from "@/components/billing-gate";
import { getAccessState } from "@/lib/billing";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const [onboarding, profile, counts] = await Promise.all([
    getOnboardingState(ctx.ownerUserId),
    getCompanyProfile(ctx.ownerUserId),
    getSidebarCounts(),
  ]);
  // Invited members skip onboarding even if the org owner hasn't finished —
  // they joined an existing org.
  if (ctx.role === "owner" && !isOnboardingComplete(onboarding)) {
    redirect("/onboarding");
  }
  // Subscription gate: resolved from the webhook-mirrored row, never from
  // Stripe. Inert until BILLING_ENFORCED=1 (see src/lib/billing.ts).
  const access = await getAccessState(ctx.ownerUserId, onboarding?.startedAt ?? null);

  return (
    <SidebarProvider>
      <AppSidebar
        userEmail={ctx.email ?? ""}
        userName={ctx.name ?? ""}
        companyName={profile?.companyName ?? ""}
        role={ctx.role}
        counts={counts}
      />
      <SidebarInset>
        <BreadcrumbLabelProvider>
          <AppShellHeader />
          <BillingGate access={access} role={ctx.role}>
            {children}
          </BillingGate>
        </BreadcrumbLabelProvider>
      </SidebarInset>
      <GlobalSearch />
    </SidebarProvider>
  );
}
