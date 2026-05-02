import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/auth-cache";
import { getOnboardingState, isOnboardingComplete } from "@/lib/store";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const onboarding = await getOnboardingState(user.id);
  if (!isOnboardingComplete(onboarding)) redirect("/onboarding");

  return (
    <SidebarProvider>
      <AppSidebar userEmail={user.email ?? ""} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger />
          <span className="font-display text-lg font-medium tracking-tight">
            Mercer
          </span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
