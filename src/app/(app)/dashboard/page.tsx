import Link from "next/link";
import { Suspense } from "react";
import {
  CircleCheck,
  CircleX,
  ContactRound,
  Eye,
  FileText,
  HardHat,
} from "lucide-react";
import { getOrgContext } from "@/lib/org-context";
import {
  getDashboardRecents,
  getHomeAgenda,
  getNotifications,
  getOverdueFollowUps,
  type NotificationItem,
} from "@/lib/store";
import { getMorningBriefAction } from "@/lib/actions/morning-brief";
import { DashboardHero } from "@/components/dashboard-hero";
import {
  MorningBrief,
  MorningBriefSkeleton,
} from "@/components/morning-brief";
import { DashboardActionPills } from "@/components/dashboard-action-pills";
import { HomeAgendaSection } from "@/components/home-agenda";

export default async function DashboardPage() {
  const [ctx, recents, overdue, agenda, notifications] = await Promise.all([
    getOrgContext(),
    getDashboardRecents(6),
    getOverdueFollowUps(20),
    getHomeAgenda(),
    getNotifications(),
  ]);
  const firstName = pickFirstName(ctx?.name ?? null, ctx?.email ?? null);

  return (
    <div className="relative">
      <div className="relative mx-auto w-full max-w-[46.5rem] px-6 pb-24 pt-12">
        <DashboardHero
          firstName={firstName}
          briefSlot={
            <Suspense fallback={<MorningBriefSkeleton />}>
              <BriefSlot />
            </Suspense>
          }
        />
        <DashboardActionPills overdue={overdue} />

        <HomeAgendaSection agenda={agenda} />

        {notifications.items.length > 0 && (
          <section className="mt-10">
            <div className="mb-3.5 flex items-baseline gap-2.5 px-0.5">
              <h2 className="text-[15px] font-semibold tracking-tight">
                What happened
              </h2>
              <span className="text-xs text-muted-foreground">
                while you were away
              </span>
            </div>
            <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
              {notifications.items.slice(0, 5).map((n) => (
                <FeedRow key={n.id} item={n} />
              ))}
            </div>
          </section>
        )}

        {recents.length > 0 && (
          <section className="mt-10">
            <div className="mb-3.5 flex items-baseline gap-2.5 px-0.5">
              <h2 className="text-[15px] font-semibold tracking-tight">
                Jump back in
              </h2>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none]">
              {recents.map((r) => (
                <Link
                  key={`${r.kind}-${r.id}`}
                  href={r.href}
                  className="w-44 flex-none rounded-xl border bg-card p-3 transition-[border-color,transform,box-shadow] hover:-translate-y-px hover:border-foreground/20 hover:shadow-[0_1px_2px_rgb(0_0_0/0.05)]"
                >
                  <span className="mb-2.5 flex size-[30px] items-center justify-center rounded-lg bg-muted text-foreground/60">
                    <RecentIcon kind={r.kind} />
                  </span>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                    {r.kind}
                  </p>
                  <p className="truncate text-[13px] font-semibold tracking-tight">
                    {r.title}
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                    {r.sub}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function RecentIcon({ kind }: { kind: string }) {
  if (kind === "Project") return <HardHat className="size-4" />;
  if (kind === "Bid") return <FileText className="size-4" />;
  return <ContactRound className="size-4" />;
}

function relTime(d: Date): string {
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7)
    return new Date(d).toLocaleDateString(undefined, { weekday: "short" });
  return new Date(d).toLocaleDateString();
}

function FeedRow({ item }: { item: NotificationItem }) {
  const t = item.title.toLowerCase();
  const kind = t.includes("accepted")
    ? "accepted"
    : t.includes("declined")
      ? "declined"
      : "viewed";
  return (
    <Link
      href={item.bidId ? `/bids/${item.bidId}` : "/pipeline"}
      className="flex items-center gap-3 border-t px-4 py-3 first:border-t-0 hover:bg-muted/30"
    >
      <span
        className={
          "flex size-[30px] shrink-0 items-center justify-center rounded-full " +
          (kind === "accepted"
            ? "bg-emerald-500/10 text-emerald-600"
            : kind === "declined"
              ? "bg-destructive/10 text-destructive"
              : "bg-blue-600/10 text-blue-600")
        }
      >
        {kind === "accepted" ? (
          <CircleCheck className="size-[15px]" />
        ) : kind === "declined" ? (
          <CircleX className="size-[15px]" />
        ) : (
          <Eye className="size-[15px]" />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13.5px] text-foreground/85">
        <span className="font-semibold text-foreground">{item.title}</span>
        {item.body ? (
          <span className="text-muted-foreground"> — {item.body}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {relTime(item.occurredAt)}
      </span>
    </Link>
  );
}

function pickFirstName(name: string | null, email: string | null) {
  const fromName = name?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  if (!email) return null;
  const local = email.split("@")[0] ?? "";
  // "timothy.schiller" -> "Timothy"; "alex42" -> "Alex42"
  const first = local.split(/[._-]/)[0];
  if (!first) return null;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/**
 * The one potentially-slow thing on Home: a cache-miss morning generates
 * the day's brief with the model. Suspended so it streams in after the
 * shell — login lands on a painted page, the brief follows.
 */
async function BriefSlot() {
  const brief = await getMorningBriefAction();
  return <MorningBrief initial={brief.text ? brief : null} />;
}
