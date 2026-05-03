import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { AppSidebarNav } from "@/components/app-sidebar-nav";
import { TeamSwitcher } from "@/components/team-switcher";
import { NavUser } from "@/components/nav-user";
import type { OrgRole } from "@/lib/org-context";

export function AppSidebar({
  userEmail,
  userName,
  companyName,
  companyLogoUrl,
  companyPrimaryColor,
  role,
}: {
  userEmail: string;
  userName: string;
  companyName: string;
  companyLogoUrl: string | null;
  companyPrimaryColor: string | null;
  role: OrgRole;
}) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <TeamSwitcher
          companyName={companyName}
          logoUrl={companyLogoUrl}
          primaryColor={companyPrimaryColor}
          role={role}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <AppSidebarNav />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser name={userName} email={userEmail} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
