"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Eye, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getNotificationsAction,
  markNotificationsSeenAction,
} from "@/lib/actions/notifications";
import type { NotificationItem } from "@/lib/store";
import { cn } from "@/lib/utils";

function relTime(d: Date): string {
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

/** Customer-moment feed: proposal viewed / accepted / declined. */
export function NotificationsBell() {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, startLoad] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getNotificationsAction().then((r) => {
      if (!cancelled && r) setUnread(r.unreadCount);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onOpenChange = (open: boolean) => {
    if (!open) return;
    startLoad(async () => {
      const r = await getNotificationsAction();
      if (r) {
        setItems(r.items);
        setUnread(0);
        void markNotificationsSeenAction();
      }
    });
  };

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 size-2 rounded-full bg-blue-600 ring-2 ring-background" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-xl p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          <CheckCheck className="size-3.5 text-muted-foreground" />
        </div>
        <div className="max-h-96 overflow-y-auto border-t">
          {loading && items == null ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : !items || items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Customer moments land here — proposal views, acceptances,
              declines.
            </p>
          ) : (
            items.map((n) => (
              <Link
                key={n.id}
                href={
                  n.bidId
                    ? `/opportunities/${n.bidId}`
                    : n.leadId
                      ? `/leads/${n.leadId}`
                      : "/pipeline"
                }
                className={cn(
                  "flex items-start gap-2.5 border-b px-3 py-2.5 text-sm transition-colors last:border-0 hover:bg-accent/50",
                  n.unread && "bg-blue-600/[0.04]",
                )}
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Eye className="size-3" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{n.title}</span>
                  {n.body && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {n.body}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {relTime(n.occurredAt)}
                </span>
              </Link>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
