"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChevronsUpDown,
  ContactRound,
  HardHat,
  House,
  LifeBuoy,
  LogOut,
  Monitor,
  Moon,
  PanelLeft,
  Coins,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sun,
  UsersRound,
  Waypoints,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOutAction } from "@/lib/actions";
import type { SidebarCounts } from "@/lib/store";
import type { OrgRole } from "@/lib/org-context";
import { cn } from "@/lib/utils";

/**
 * Sidebar Redesign — Direction A Final (claude.ai/design project `mercer`).
 * Brand header + collapse · Search/⌘K + quick-add row · icon-tile nav with
 * live counts (blue dots in the rail) · footer account card with popover.
 */

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: House, countKey: null },
  {
    href: "/pipeline",
    label: "Pipeline",
    icon: Waypoints,
    countKey: "pipeline" as const,
  },
  { href: "/projects", label: "Jobs", icon: HardHat, countKey: "jobs" as const },
  { href: "/properties", label: "Properties", icon: Building2, countKey: null },
  { href: "/contacts", label: "Contacts", icon: ContactRound, countKey: null },
  { href: "/reports", label: "Reports", icon: BarChart3, countKey: null },
];

export function AppSidebar({
  userEmail,
  userName,
  companyName,
  role,
  counts,
}: {
  userEmail: string;
  userName: string;
  companyName: string;
  role: OrgRole;
  counts: SidebarCounts;
}) {
  const { isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const pathname = usePathname();

  const dismissOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  // ⌘K is handled by <GlobalSearch/> (mounted in the app layout); the
  // sidebar button just asks it to open.
  const openSearch = () => {
    dismissOnMobile();
    window.dispatchEvent(new Event("mercer:search"));
  };

  return (
    <Sidebar collapsible="icon">
      {/* brand row */}
      <SidebarHeader className="px-3 pb-1 pt-3 group-data-[collapsible=icon]:px-0">
        <div className="flex items-center gap-2.5 pl-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pl-0">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            className="font-serif-brand hidden size-8 shrink-0 items-center justify-center text-[24px] leading-none group-data-[collapsible=icon]:flex"
          >
            M
          </button>
          <span className="font-serif-brand truncate text-[26px] leading-none tracking-[0.005em] group-data-[collapsible=icon]:hidden">
            Mercer
          </span>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground group-data-[collapsible=icon]:hidden"
          >
            <PanelLeft className="size-4" />
          </button>
        </div>

        {/* tools: search + new */}
        <div className="mt-2 flex gap-2 group-data-[collapsible=icon]:mt-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
          <button
            type="button"
            onClick={openSearch}
            className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[9px] border border-transparent bg-muted/70 px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            <Search className="size-4 shrink-0" />
            <span className="flex-1 truncate text-left group-data-[collapsible=icon]:hidden">
              Search
            </span>
            <kbd className="shrink-0 rounded-[5px] border bg-background px-1.5 py-0.5 font-mono text-[10.5px] tracking-wide text-muted-foreground group-data-[collapsible=icon]:hidden">
              ⌘K
            </kbd>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="New"
                className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-foreground text-background transition-colors hover:bg-foreground/85 active:translate-y-px"
              >
                <Plus className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={isMobile ? "bottom" : "right"}
              align="start"
              className="min-w-44 rounded-lg"
            >
              <DropdownMenuItem asChild>
                <Link href="/leads/new" onClick={dismissOnMobile}>
                  New lead
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/bids/new" onClick={dismissOnMobile}>
                  New bid
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarHeader>

      <div className="mx-3.5 my-1 h-px bg-sidebar-border group-data-[collapsible=icon]:hidden" />

      {/* nav */}
      <SidebarContent className="px-3 py-1 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
        <nav className="flex flex-col gap-0.5 group-data-[collapsible=icon]:items-center">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const count = item.countKey ? counts[item.countKey] : 0;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={dismissOnMobile}
                title={item.label}
                className={cn(
                  "flex items-center gap-2.5 rounded-[9px] px-2 py-1.5 text-sm transition-colors",
                  "group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0",
                  active
                    ? "bg-foreground text-background"
                    : "text-foreground/80 hover:bg-sidebar-accent",
                )}
              >
                <span
                  className={cn(
                    "relative flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                    active
                      ? "bg-background/15 text-background"
                      : "bg-muted text-foreground/60",
                  )}
                >
                  <Icon className="size-4" />
                  {count > 0 && (
                    <span className="absolute -right-px -top-px hidden size-[7px] rounded-full bg-blue-600 ring-2 ring-sidebar group-data-[collapsible=icon]:block" />
                  )}
                </span>
                <span className="flex-1 truncate group-data-[collapsible=icon]:hidden">
                  {item.label}
                </span>
                {count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums group-data-[collapsible=icon]:hidden",
                      active
                        ? "bg-background/20 text-background/90"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </SidebarContent>

      {/* footer account card */}
      <SidebarFooter className="px-3 pb-3 group-data-[collapsible=icon]:px-1.5">
        <AccountCard
          userName={userName}
          userEmail={userEmail}
          companyName={companyName}
          role={role}
          memberCount={counts.members}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function initialsOf(name: string, email: string): string {
  return (
    (name || email || "?")
      .split(/\s+|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

function AccountCard({
  userName,
  userEmail,
  companyName,
  role,
  memberCount,
}: {
  userName: string;
  userEmail: string;
  companyName: string;
  role: OrgRole;
  memberCount: number;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [, startTransition] = useTransition();
  const display = userName || "Account";
  const initials = initialsOf(userName, userEmail);
  const dismissOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <div className="rounded-xl border bg-muted/40 p-1.5 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg p-1 text-left transition-colors hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
              {initials}
            </span>
            <span className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate text-[13px] font-semibold">
                {display}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {companyName || ROLE_LABELS[role] || "Account"}
              </span>
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={isMobile ? "bottom" : "top"}
          align="start"
          sideOffset={8}
          className="w-64 rounded-[14px] p-0"
        >
          <div className="flex items-center gap-2.5 p-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
              {initials}
            </span>
            <span className="grid min-w-0 leading-tight">
              <span className="truncate text-[13px] font-semibold">
                {display}
              </span>
              <span className="truncate text-[11.5px] text-muted-foreground">
                {userEmail}
              </span>
            </span>
          </div>
          <DropdownMenuSeparator className="my-0" />
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="flex items-center gap-1.5 text-[12.5px] font-semibold">
              <span className="rounded-[5px] border border-blue-600/25 bg-blue-600/10 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400">
                {ROLE_LABELS[role] ?? role}
              </span>
              {companyName || "Mercer"}
            </span>
            <Link
              href="/settings"
              onClick={dismissOnMobile}
              className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Manage
            </Link>
          </div>
          <DropdownMenuSeparator className="my-0" />
          <div className="p-1.5">
            <DropdownMenuItem asChild>
              <Link href="/settings" onClick={dismissOnMobile}>
                <Settings className="size-4" />
                Account settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/members" onClick={dismissOnMobile}>
                <UsersRound className="size-4" />
                Team &amp; members
                <span className="ml-auto text-[10.5px] tabular-nums text-muted-foreground">
                  {memberCount}
                </span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/company" onClick={dismissOnMobile}>
                <SlidersHorizontal className="size-4" />
                Company &amp; branding
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/usage" onClick={dismissOnMobile}>
                <Coins className="size-4" />
                Usage &amp; billing
              </Link>
            </DropdownMenuItem>
          </div>
          <DropdownMenuSeparator className="my-0" />
          <div className="px-3 pb-3 pt-2">
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
              Appearance
            </div>
            <div className="flex gap-0.5 rounded-[9px] border bg-muted/70 p-[3px]">
              {(
                [
                  { value: "light", icon: Sun, label: "Light" },
                  { value: "dark", icon: Moon, label: "Dark" },
                  { value: "system", icon: Monitor, label: "System" },
                ] as const
              ).map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1 rounded-md py-1 text-xs font-medium transition-colors",
                    (theme ?? "system") === value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <DropdownMenuSeparator className="my-0" />
          <div className="p-1.5">
            <DropdownMenuItem asChild>
              <a
                href="mailto:support@mercer.build"
                onClick={dismissOnMobile}
              >
                <LifeBuoy className="size-4" />
                Help &amp; support
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={(event) => {
                event.preventDefault();
                startTransition(() => {
                  void signOutAction();
                });
              }}
            >
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
