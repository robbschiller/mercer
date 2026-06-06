import Link from "next/link";
import {
  Building2,
  ChevronRight,
  ClipboardList,
  ContactRound,
  HardHat,
  Users,
  type LucideIcon,
} from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import type { DashboardRecent } from "@/lib/store";

const ICONS: Record<DashboardRecent["kind"] | "Account" | "Contact", LucideIcon> = {
  Lead: Users,
  Bid: ClipboardList,
  Project: HardHat,
  Account: Building2,
  Contact: ContactRound,
};

export function DashboardRecents({
  recents,
}: {
  recents: DashboardRecent[];
}) {
  return (
    <section>
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Jump back in
        </span>
        <Link
          href="/leads"
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
        </Link>
      </div>

      {recents.length === 0 ? (
        <div className="px-3 py-10 text-center text-sm text-muted-foreground border rounded-lg">
          Your recent leads, bids, and projects will show up here.
        </div>
      ) : (
        <div className="flex flex-col">
          {recents.map((r) => {
            const Icon = ICONS[r.kind];
            return (
              <Link
                key={`${r.kind}-${r.id}`}
                href={r.href}
                className="group flex items-center gap-3.5 px-3 py-3.5 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <span className="size-9 shrink-0 rounded-md bg-muted text-foreground flex items-center justify-center">
                  <Icon className="size-[17px]" />
                </span>
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-0.5">
                    {r.kind}
                  </span>
                  <span className="text-sm font-medium truncate">
                    {r.title}
                  </span>
                  <span className="text-xs text-muted-foreground truncate capitalize">
                    {r.sub}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                  {formatDistanceToNowStrict(r.updatedAt, { addSuffix: true })}
                </span>
                <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <ChevronRight className="size-4" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
