import Link from "next/link";
import {
  ArrowUpRight,
  Calendar,
  CalendarClock,
  HardHat,
  Hourglass,
  Phone,
  Ruler,
  Sun,
  Timer,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FollowUpNudge } from "@/components/follow-up-nudge";
import { CopyShareLinkButton } from "@/components/copy-share-link-button";
import { setLeadFollowUpAction } from "@/lib/actions";
import type { HomeAgenda } from "@/lib/store";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function compactMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return money.format(n);
}

const GROUP_TITLES = [
  "Quotes going quiet",
  "Follow-ups due",
  "Takeoffs this week",
  "Expiring links",
  "Jobs drifting",
];

/** "Needs you today" — the agenda. Every row carries its one next action. */
export function HomeAgendaSection({ agenda }: { agenda: HomeAgenda }) {
  const total =
    agenda.quietQuotes.length +
    agenda.followUps.length +
    agenda.takeoffs.length +
    agenda.expiringLinks.length +
    agenda.driftingJobs.length;

  return (
    <section className="mt-10">
      <div className="mb-3.5 flex items-baseline gap-2.5 px-0.5">
        <h2 className="text-[15px] font-semibold tracking-tight">
          Needs you today
        </h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {total > 0 ? `${total} thing${total === 1 ? "" : "s"}` : "all clear"}
        </span>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border bg-card px-8 py-10 text-center shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
          <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <Sun className="size-6" />
          </span>
          <h3 className="mb-1.5 text-lg font-semibold tracking-tight">
            All clear
          </h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Nothing needs you.{" "}
            {agenda.openQuotes.count > 0 ? (
              <>
                <span className="font-medium text-foreground">
                  {agenda.openQuotes.count} quote
                  {agenda.openQuotes.count === 1 ? " is" : "s are"}
                </span>{" "}
                out totaling{" "}
                <span className="font-medium text-foreground">
                  {compactMoney(agenda.openQuotes.totalValue)}
                </span>{" "}
                — all still within their follow-up window.
              </>
            ) : (
              "Time to go find the next property."
            )}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-1.5">
            {GROUP_TITLES.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground"
              >
                <Check className="size-3 text-emerald-600" />
                {t}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {agenda.quietQuotes.length > 0 && (
            <Group
              icon={Hourglass}
              title="Quotes going quiet"
              count={agenda.quietQuotes.length}
              seeAllHref="/pipeline?stage=sent"
            >
              {agenda.quietQuotes.slice(0, 3).map((q) => (
                <Row key={q.bidId}>
                  <RowMain
                    title={q.propertyName}
                    amount={q.total != null ? compactMoney(q.total) : null}
                    meta={
                      q.neverOpened ? (
                        <>
                          Sent {q.sentDaysAgo}d ago ·{" "}
                          <span className="rounded-full border bg-muted/60 px-1.5 py-px text-[10.5px] font-semibold">
                            never opened
                          </span>
                        </>
                      ) : (
                        <>
                          Sent {q.sentDaysAgo}d ago · viewed {q.viewCount}×
                          {q.lastViewedAt
                            ? `, silent since ${q.lastViewedAt.toLocaleDateString(undefined, { weekday: "short" })}`
                            : ""}
                        </>
                      )
                    }
                  />
                  <div className="flex shrink-0 items-center gap-1.5">
                    {q.neverOpened ? (
                      <CopyShareLinkButton
                        proposalId={q.proposalId}
                        label="Resend link"
                      />
                    ) : (
                      <FollowUpNudge bidId={q.bidId} />
                    )}
                  </div>
                </Row>
              ))}
            </Group>
          )}

          {agenda.followUps.length > 0 && (
            <Group
              icon={CalendarClock}
              title="Follow-ups due"
              count={agenda.followUps.length}
              seeAllHref="/pipeline"
            >
              {agenda.followUps.slice(0, 3).map((f) => {
                const snoozeTo = new Date(Date.now() + 3 * 86_400_000)
                  .toISOString()
                  .slice(0, 10);
                return (
                  <Row key={f.leadId}>
                    {f.overdueDays > 0 && (
                      <span className="size-[7px] shrink-0 rounded-full bg-amber-500 shadow-[0_0_0_3px] shadow-amber-500/15" />
                    )}
                    <RowMain
                      title={f.name}
                      sub={f.propertyName}
                      meta={
                        f.overdueDays > 0 ? (
                          <span className="font-medium text-amber-700 dark:text-amber-400">
                            Follow-up due {f.overdueDays} day
                            {f.overdueDays === 1 ? "" : "s"} ago
                          </span>
                        ) : (
                          "Follow-up due today"
                        )
                      }
                    />
                    <div className="flex shrink-0 items-center gap-1.5">
                      <ActLink href={`/leads/${f.leadId}`}>
                        <Phone className="size-3.5" />
                        Log call
                      </ActLink>
                      <form action={setLeadFollowUpAction}>
                        <input type="hidden" name="id" value={f.leadId} />
                        <input
                          type="hidden"
                          name="followUpAt"
                          value={snoozeTo}
                        />
                        <button
                          type="submit"
                          title="Snooze 3 days"
                          className="flex h-8 items-center rounded-lg px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          Snooze
                        </button>
                      </form>
                    </div>
                  </Row>
                );
              })}
            </Group>
          )}

          {agenda.takeoffs.length > 0 && (
            <Group
              icon={Ruler}
              title="Takeoffs this week"
              count={agenda.takeoffs.length}
            >
              {agenda.takeoffs.slice(0, 3).map((t) => (
                <Row key={t.leadId}>
                  <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-[10px] border bg-muted/40 leading-none">
                    <span className="text-[9.5px] font-bold tracking-wider text-muted-foreground">
                      {t.scheduledAt
                        .toLocaleDateString("en-US", { weekday: "short" })
                        .toUpperCase()}
                    </span>
                    <span className="mt-0.5 text-[13px] font-semibold tabular-nums">
                      {t.scheduledAt
                        .toLocaleTimeString("en-US", { hour: "numeric" })
                        .toLowerCase()
                        .replace(" ", "")}
                    </span>
                  </span>
                  <RowMain
                    title={t.name}
                    meta={t.contactName ?? "On-site takeoff"}
                  />
                  <ActLink href={`/leads/${t.leadId}`} primary>
                    Open
                    <ArrowUpRight className="size-3.5" />
                  </ActLink>
                </Row>
              ))}
            </Group>
          )}

          {agenda.expiringLinks.length > 0 && (
            <Group
              icon={Timer}
              title="Expiring links"
              count={agenda.expiringLinks.length}
            >
              {agenda.expiringLinks.slice(0, 3).map((e) => (
                <Row key={e.bidId}>
                  <RowMain
                    title={e.propertyName}
                    meta={
                      <span
                        className={cn(
                          e.daysLeft <= 5 &&
                            "font-medium text-amber-700 dark:text-amber-400",
                        )}
                      >
                        Quote link expires in {e.daysLeft} day
                        {e.daysLeft === 1 ? "" : "s"}
                      </span>
                    }
                  />
                  <ActLink href={`/bids/${e.bidId}`}>Open bid</ActLink>
                </Row>
              ))}
            </Group>
          )}

          {agenda.driftingJobs.length > 0 && (
            <Group
              icon={HardHat}
              title="Jobs drifting"
              count={agenda.driftingJobs.length}
            >
              {agenda.driftingJobs.slice(0, 3).map((j) => (
                <Row key={j.bidId}>
                  <RowMain
                    title={j.propertyName}
                    meta={
                      <>
                        {j.reason}
                        {j.notStarted && (
                          <span className="ml-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-px text-[10.5px] font-semibold text-amber-700 dark:text-amber-400">
                            Not started
                          </span>
                        )}
                      </>
                    }
                  />
                  <ActLink href={`/projects/${j.bidId}`} primary>
                    <Calendar className="size-3.5" />
                    Update schedule
                  </ActLink>
                </Row>
              ))}
            </Group>
          )}
        </div>
      )}
    </section>
  );
}

function Group({
  icon: Icon,
  title,
  count,
  seeAllHref,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  seeAllHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <span className="flex size-[26px] items-center justify-center rounded-lg bg-muted text-foreground/60">
          <Icon className="size-[15px]" />
        </span>
        <span className="text-[13.5px] font-semibold tracking-tight">
          {title}
        </span>
        <span className="rounded-full bg-muted px-2 py-px text-[11.5px] font-semibold tabular-nums text-muted-foreground">
          {count}
        </span>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            See all
          </Link>
        )}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-t px-3.5 py-3 transition-colors hover:bg-muted/30">
      {children}
    </div>
  );
}

function RowMain({
  title,
  amount,
  sub,
  meta,
}: {
  title: string;
  amount?: string | null;
  sub?: string | null;
  meta: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline gap-1.5 text-sm font-semibold tracking-tight">
        {title}
        {amount && (
          <span className="rounded-md bg-muted px-1.5 py-px text-[13px] font-semibold tabular-nums text-foreground/80">
            {amount}
          </span>
        )}
        {sub && (
          <span className="text-[13px] font-normal text-muted-foreground">
            · {sub}
          </span>
        )}
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {meta}
      </div>
    </div>
  );
}

function ActLink({
  href,
  primary,
  children,
}: {
  href: string;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-foreground/80 transition-colors",
        primary
          ? "hover:border-foreground hover:bg-foreground hover:text-background"
          : "hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
