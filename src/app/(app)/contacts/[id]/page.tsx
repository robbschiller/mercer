import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlarmClock,
  ArrowLeft,
  Award,
  BadgeCheck,
  Briefcase,
  Building2,
  ChevronRight,
  ContactRound,
  FileText,
  Gavel,
  GitCommitVertical,
  HardHat,
  Mail,
  MessageSquare,
  NotebookPen,
  PenLine,
  Phone,
  Repeat,
  Sparkles,
  UserPlus,
  UserRound,
} from "lucide-react";
import {
  getContactDetail,
  getContactDeals,
  getContactEmploymentHistory,
  type PropertyDeal,
} from "@/lib/store";
import {
  startContactEmploymentAction,
  endContactEmploymentAction,
} from "@/lib/actions";
import { ContactDetailPanel } from "@/components/contact-detail-panel";
import { BreadcrumbLabel } from "@/components/breadcrumb-label";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import {
  leadStatusLabel,
  projectStatusLabel,
  type ContactMethod,
  type LeadStatus,
  type ProjectStatus,
} from "@/lib/status-meta";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
function moneyK(n: number): string {
  if (Math.abs(n) >= 1_000_000)
    return `$${(n / 1_000_000).toFixed(2).replace(/0$/, "").replace(/\.$/, "")}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}
function monthYear(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const AVATAR_TINTS = [
  "bg-blue-600",
  "bg-rose-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-cyan-600",
];
function tintFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
}
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

type Outcome = { label: string; cls: string };
function dealOutcome(d: PropertyDeal): Outcome {
  if (d.kind === "job") {
    if (d.status === "complete" || d.status === "warranty_watch")
      return {
        label: "Completed",
        cls: "border bg-muted/60 text-foreground/70",
      };
    return {
      label: projectStatusLabel(d.status as ProjectStatus),
      cls: "border border-blue-600/25 bg-blue-600/10 text-blue-700 dark:text-blue-400",
    };
  }
  if (d.status === "won")
    return {
      label: "Won",
      cls: "border border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
    };
  if (d.status === "lost")
    return {
      label: "Lost",
      cls: "border border-destructive/25 bg-destructive/10 text-destructive",
    };
  return {
    label: "Open",
    cls: "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  };
}

function DealIcon({ kind }: { kind: PropertyDeal["kind"] }) {
  const cls = "size-3.5";
  if (kind === "job") return <HardHat className={cls} />;
  if (kind === "bid") return <FileText className={cls} />;
  return <UserPlus className={cls} />;
}

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [detail, employment, deals] = await Promise.all([
    getContactDetail(id),
    getContactEmploymentHistory(id),
    getContactDeals(id),
  ]);
  if (!detail) notFound();
  const { contact, account } = detail;

  // ── The relationship ledger ──
  const jobs = deals.filter((d) => d.kind === "job");
  const wonCount = jobs.length;
  const lostCount = deals.filter(
    (d) => d.kind !== "job" && d.status === "lost",
  ).length;
  const decided = wonCount + lostCount;
  const lifetime = detail.lifetimeAwarded;
  const firstMet =
    deals.length > 0
      ? Math.min(...deals.map((d) => d.createdAt.getFullYear()))
      : contact.createdAt.getFullYear();

  const isDM = detail.properties.some((p) =>
    (p.role ?? "").toLowerCase().includes("decision"),
  );
  const rel = isDM ? "dm" : wonCount >= 2 ? "champ" : decided === 0 ? "new" : null;

  // ── Going quiet? Open work + silence. ──
  const lastTouch = detail.leads.reduce<Date | null>((latest, l) => {
    const t = l.lastContactedAt;
    if (!t) return latest;
    return !latest || t > latest ? t : latest;
  }, null);
  const silenceDays = lastTouch
    ? Math.floor((Date.now() - lastTouch.getTime()) / 86_400_000)
    : null;
  const openBid = deals.find((d) => d.kind === "bid" && d.status === "sent");
  const openLead = deals.find(
    (d) =>
      d.kind === "lead" &&
      ["needs_takeoff", "takeoff_scheduled", "on_hold"].includes(d.status),
  );
  const openWork = openBid ?? openLead ?? null;
  const goneQuiet =
    openWork != null && (silenceDays == null || silenceDays > 14);

  // ── Employment band scale ──
  const nowYear = new Date().getFullYear();
  const empStart = employment.length
    ? Math.min(
        firstMet,
        ...employment.map((e) => new Date(e.startDate).getFullYear()),
      )
    : firstMet;
  const empEnd = nowYear + 1;
  const empSpan = Math.max(empEnd - empStart, 1);
  const pos = (y: number) =>
    Math.max(0, Math.min(100, ((y - empStart) / empSpan) * 100));
  const currentEmp = employment.find((e) => e.current) ?? null;
  const prevEmp = employment.find((e) => !e.current) ?? null;
  const companyName = account?.name ?? currentEmp?.accountName ?? null;

  const preferred = contact.preferredContactMethod as ContactMethod | null;
  const channels = [
    contact.phone && {
      key: "phone" as const,
      label: "Call",
      value: contact.phone,
      Icon: Phone,
      pref: preferred === "phone",
    },
    contact.phone && {
      key: "text" as const,
      label: "Text",
      value: contact.phone,
      Icon: MessageSquare,
      pref: preferred === "text",
    },
    contact.email && {
      key: "email" as const,
      label: "Email",
      value: contact.email,
      Icon: Mail,
      pref: preferred === "email",
      plain: true,
    },
  ].filter((c): c is Exclude<typeof c, false | null | ""> => Boolean(c));

  const noteLines = contact.notes
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const firstName = contact.name.split(/\s+/)[0] ?? contact.name;

  return (
    <div className="relative mx-auto w-full max-w-[1240px] px-6 pb-24 pt-7">
      <BreadcrumbLabel segment={id} label={contact.name} />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Link
        href="/contacts"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Contacts
      </Link>

      {/* ── Hero ── */}
      <div className="mb-4 grid grid-cols-1 gap-6 rounded-2xl border bg-card p-[22px] shadow-[0_1px_2px_rgb(0_0_0/0.04)] lg:grid-cols-[minmax(0,1fr)_232px]">
        <div className="flex min-w-0 flex-col">
          <div className="flex min-w-0 items-center gap-4">
            <span
              className={cn(
                "grid size-16 shrink-0 place-items-center rounded-full text-[21px] font-bold tracking-[0.01em] text-white",
                tintFor(contact.name),
              )}
            >
              {initials(contact.name)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[25px] font-semibold leading-tight tracking-tight">
                  {contact.name}
                </h1>
                {rel === "dm" && (
                  <HeroTag className="border-foreground bg-foreground text-background">
                    <Gavel className="size-3" />
                    Decision maker
                  </HeroTag>
                )}
                {rel === "champ" && (
                  <HeroTag className="border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
                    <Award className="size-3" />
                    Champion
                  </HeroTag>
                )}
                {rel === "new" && (
                  <HeroTag className="border-border bg-muted/60 text-muted-foreground">
                    <Sparkles className="size-3" />
                    New
                  </HeroTag>
                )}
              </div>
              <p className="mt-1 truncate text-[13.5px] text-muted-foreground">
                {contact.title && (
                  <b className="font-semibold text-foreground/80">
                    {contact.title}
                  </b>
                )}
                {contact.title && companyName ? " · " : ""}
                {companyName}
              </p>
            </div>
          </div>

          <p className="mt-[18px] flex flex-wrap items-center gap-1.5 border-t pt-4 text-[12.5px] text-muted-foreground/80">
            <Briefcase className="size-3.5 text-muted-foreground/60" />
            {companyName ? (
              <>
                At{" "}
                <b className="font-semibold text-foreground/80">
                  {companyName}
                </b>
                {currentEmp &&
                  ` since ${new Date(currentEmp.startDate).getFullYear()}`}
                {prevEmp && (
                  <span className="text-muted-foreground/60">
                    · previously {prevEmp.accountName}
                  </span>
                )}
              </>
            ) : (
              "No employer on file — add one below"
            )}
          </p>

          {channels.length > 0 && (
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              {channels.map((ch) => (
                <span
                  key={ch.key}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium",
                    ch.pref
                      ? "border-foreground bg-foreground text-background"
                      : "bg-muted/40 text-foreground/80",
                  )}
                >
                  <ch.Icon
                    className={cn(
                      "size-3.5",
                      ch.pref ? "text-background/80" : "text-muted-foreground",
                    )}
                  />
                  {ch.label}
                  {ch.pref && (
                    <span className="rounded bg-background/20 px-1.5 py-px text-[9.5px] font-bold uppercase tracking-[0.05em] text-background/75">
                      Preferred
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center gap-2.5 border-t pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="flex items-baseline justify-between gap-2.5">
            <span className="text-xs text-muted-foreground">First met</span>
            <span className="text-[13.5px] font-semibold">{firstMet}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2.5">
            <span className="text-xs text-muted-foreground">Deals won</span>
            <span className="text-[13.5px] font-semibold">{wonCount}</span>
          </div>
          <div className="my-0.5 flex items-baseline justify-between gap-2.5 border-y py-2.5">
            <span className="text-xs font-medium text-foreground/80">
              Lifetime awarded
            </span>
            <span className="font-mono text-[19px] font-semibold tabular-nums tracking-tight">
              {money.format(lifetime)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2.5">
            <span className="text-xs text-muted-foreground">Win rate</span>
            <span className="text-[13.5px] font-semibold">
              {decided > 0
                ? `${Math.round((wonCount / decided) * 100)}% · ${decided} decided`
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Going-quiet banner ── */}
      {goneQuiet && openWork && (
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-amber-500/15 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-[0_4px_12px_-3px] shadow-amber-500/50">
            <AlarmClock className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-semibold text-amber-900 dark:text-amber-200">
              {silenceDays == null
                ? `No touch logged with ${firstName} while ${
                    openWork.value != null
                      ? `a ${moneyK(openWork.value)} ${openWork.kind === "bid" ? "quote" : "lead"}`
                      : `an open ${openWork.kind}`
                  } sits open`
                : `${firstName} hasn't been contacted in ${silenceDays} days while ${
                    openWork.value != null
                      ? `a ${moneyK(openWork.value)} ${openWork.kind === "bid" ? "quote" : "lead"}`
                      : `an open ${openWork.kind}`
                  } sits open`}
            </p>
            <p className="mt-0.5 truncate text-[12.5px] text-amber-800/80 dark:text-amber-300/80">
              {openWork.name}
              {preferred
                ? ` — they prefer ${preferred === "phone" ? "a call" : preferred}; the silence is on us.`
                : " — the silence is on us."}
            </p>
          </div>
          <Link
            href={openWork.href}
            className="inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-lg border border-foreground bg-foreground px-3.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
          >
            <PenLine className="size-3.5" />
            Open &amp; follow up
          </Link>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* ── Left column ── */}
        <div className="flex min-w-0 flex-col gap-5">
          <Panel
            icon={<GitCommitVertical className="size-[15px]" />}
            title={`Deals through ${firstName}`}
            note={
              deals.length > 0
                ? `every lead, bid & job since ${firstMet}`
                : "nothing here yet"
            }
            right={
              deals.length > 0 ? (
                <span className="text-xs text-muted-foreground">
                  <b className="font-semibold text-foreground">{wonCount}</b>{" "}
                  won ·{" "}
                  <b className="font-mono font-semibold tabular-nums text-foreground">
                    {moneyK(lifetime)}
                  </b>
                </span>
              ) : undefined
            }
          >
            <div className="px-4 pb-2 pt-4">
              {deals.length === 0 ? (
                <p className="pb-3 text-sm text-muted-foreground">
                  No deals through this contact yet — link them to a lead and
                  the story starts here.
                </p>
              ) : (
                deals.map((d, i) => {
                  const oc = dealOutcome(d);
                  return (
                    <div
                      key={`${d.kind}-${d.id}`}
                      className="relative grid grid-cols-[30px_minmax(0,1fr)] gap-3.5 pb-5"
                    >
                      {i < deals.length - 1 && (
                        <span className="absolute bottom-0 left-[14px] top-[30px] w-[2px] bg-border" />
                      )}
                      <span
                        className={cn(
                          "relative z-[1] grid size-[30px] place-items-center rounded-full border",
                          d.kind === "job"
                            ? "border-foreground bg-foreground text-background"
                            : d.kind === "lead"
                              ? "border-blue-600/25 bg-blue-600/10 text-blue-700 dark:text-blue-400"
                              : "border-border bg-muted/60 text-foreground/70",
                        )}
                      >
                        <DealIcon kind={d.kind} />
                      </span>
                      <Link
                        href={d.href}
                        className={cn(
                          "block min-w-0 pt-0.5 hover:opacity-90",
                          d.kind === "job" &&
                            "-mt-0.5 rounded-xl border border-border/70 bg-muted/20 p-3",
                        )}
                      >
                        <div className="mb-1 flex items-center gap-2.5">
                          <span className="font-mono text-xs tabular-nums text-muted-foreground/80">
                            {monthYear(d.acceptedAt ?? d.createdAt)}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-px text-[10.5px] font-semibold",
                              oc.cls,
                            )}
                          >
                            {oc.label}
                          </span>
                          {d.value != null ? (
                            <span className="ml-auto font-mono text-[13.5px] font-medium tabular-nums">
                              {money.format(d.value)}
                            </span>
                          ) : (
                            <span className="ml-auto text-[11px] text-muted-foreground/70">
                              {d.kind === "lead" ? "Lead" : ""}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold tracking-tight">
                          {d.name}
                        </p>
                        {d.kind === "job" && d.acceptedAt && (
                          <p className="mt-1 inline-flex items-center gap-1.5 text-[11.5px] text-emerald-600">
                            <BadgeCheck className="size-3" />
                            Accepted {monthYear(d.acceptedAt)}
                          </p>
                        )}
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </Panel>

          {/* Properties they touch */}
          <Panel
            icon={<Building2 className="size-[15px]" />}
            title={`Properties ${firstName} touches`}
            note={`their role at each · ${detail.properties.length} building${detail.properties.length === 1 ? "" : "s"}`}
          >
            {detail.properties.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Not linked to any properties yet — attach them from a property
                page so the next bid knows who decides.
              </p>
            ) : (
              <div className="flex flex-col">
                {detail.properties.map((p, i) => (
                  <Link
                    key={p.property.id}
                    href={`/properties/${p.property.id}`}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30",
                      i > 0 && "border-t border-border/60",
                    )}
                  >
                    <span className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-muted text-foreground/60">
                      <Building2 className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold">
                        {p.property.name ??
                          p.property.address ??
                          "Untitled property"}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <UserRound className="size-3 text-muted-foreground/70" />
                        {p.role ?? "Contact"}
                      </span>
                    </span>
                    {p.status && (
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-xs font-semibold",
                          p.status === "won"
                            ? "border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                            : p.status === "lost"
                              ? "border-border bg-muted/60 text-muted-foreground"
                              : "border-blue-600/20 bg-blue-600/10 text-blue-700 dark:text-blue-400",
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            p.status === "won"
                              ? "bg-emerald-600"
                              : p.status === "lost"
                                ? "bg-muted-foreground/60"
                                : "bg-blue-600",
                          )}
                        />
                        {leadStatusLabel(p.status as LeadStatus)}
                      </span>
                    )}
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* ── Right column ── */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* Channels & preferences */}
          <Panel
            icon={<ContactRound className="size-[15px]" />}
            title="Channels & preferences"
            note={`how ${firstName} wants to hear from us`}
          >
            {channels.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                No phone or email on file yet — add them below.
              </p>
            ) : (
              <div className="flex flex-col">
                {channels.map((ch, i) => (
                  <div
                    key={ch.key}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      i > 0 && "border-t border-border/60",
                    )}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-foreground/60">
                      <ch.Icon className="size-[15px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
                        {ch.label}
                      </span>
                      <span
                        className={cn(
                          "block truncate text-[13px]",
                          !("plain" in ch && ch.plain) &&
                            "font-mono tabular-nums",
                        )}
                      >
                        {ch.value}
                      </span>
                    </span>
                    {ch.pref && (
                      <span className="shrink-0 rounded-md border border-blue-600/25 bg-blue-600/10 px-2 py-px text-[10px] font-bold uppercase tracking-[0.04em] text-blue-700 dark:text-blue-400">
                        Preferred
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Relationship notes */}
          <Panel
            icon={<NotebookPen className="size-[15px]" />}
            title="Relationship notes"
            note="the human file"
          >
            <div className="p-4">
              {noteLines.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing yet — the &ldquo;prefers texts, hates
                  voicemail&rdquo; kind of intel lives here. Edit below.
                </p>
              ) : (
                <div className="flex flex-col">
                  {noteLines.map((line, i) => (
                    <p
                      key={i}
                      className={cn(
                        "flex gap-2.5 py-2 text-[12.5px] leading-relaxed text-foreground/80",
                        i > 0 && "border-t border-dashed",
                        i === 0 && "pt-0",
                        i === noteLines.length - 1 && "pb-0",
                      )}
                    >
                      <NotebookPen className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          {/* Employment history band */}
          <Panel
            icon={<Repeat className="size-[15px]" />}
            title="Employment history"
            note={
              employment.length > 1
                ? "they rotated — the trust came along"
                : "the rep follows the firm"
            }
          >
            <div className="p-4">
              {employment.length === 0 ? (
                <p className="mb-3 text-sm text-muted-foreground">
                  No dated employment yet. When a contact changes companies,
                  the history keeps the relationship.
                </p>
              ) : (
                <div className="pt-1">
                  <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    Employer
                  </p>
                  <div className="relative h-9 rounded-lg bg-muted/60 shadow-[inset_0_0_0_1px] shadow-border/60">
                    {employment.map((e) => {
                      const s = new Date(e.startDate).getFullYear();
                      const en = e.endDate
                        ? new Date(e.endDate).getFullYear()
                        : empEnd;
                      const left = pos(s);
                      const width = Math.max(pos(en) - left, 8);
                      return (
                        <span
                          key={e.id}
                          className={cn(
                            "absolute inset-y-1 flex items-center gap-2 overflow-hidden rounded-md px-2.5",
                            e.current
                              ? "bg-foreground text-background"
                              : "bg-foreground/15 text-foreground/80",
                          )}
                          style={{ left: `${left}%`, width: `${width}%` }}
                        >
                          <span className="truncate text-xs font-medium">
                            {e.accountName}
                          </span>
                          {e.current && (
                            <span className="ml-auto shrink-0 rounded bg-background/20 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide text-background/80">
                              now
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                  <div className="relative mt-2 h-4">
                    {Array.from(
                      { length: Math.floor(empSpan / 2) + 1 },
                      (_, i) => empStart + i * 2,
                    ).map((y) => (
                      <span
                        key={y}
                        className="absolute -translate-x-1/2 font-mono text-[10px] text-muted-foreground/70"
                        style={{ left: `${pos(y)}%` }}
                      >
                        {String(y).slice(2)}
                      </span>
                    ))}
                  </div>
                  {employment.length > 1 && (
                    <p className="mt-3 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
                      {firstName} changed companies — the deals above moved{" "}
                      <b className="font-semibold text-foreground/80">
                        with them
                      </b>
                      , not with the old firm. The trust is theirs to carry.
                    </p>
                  )}
                </div>
              )}

              <details className="mt-4 border-t pt-3.5">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Edit employment — add or end a role
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  {employment
                    .filter((e) => e.current)
                    .map((e) => (
                      <form
                        key={e.id}
                        action={endContactEmploymentAction}
                        className="flex flex-wrap items-center gap-2 text-sm"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {e.accountName}
                          {e.title ? (
                            <span className="text-muted-foreground">
                              {" "}
                              · {e.title}
                            </span>
                          ) : null}
                        </span>
                        <input type="hidden" name="contactId" value={id} />
                        <input type="hidden" name="id" value={e.id} />
                        <Input
                          type="date"
                          name="endDate"
                          required
                          className="h-7 w-36 text-xs"
                        />
                        <SubmitButton variant="outline" size="sm">
                          End
                        </SubmitButton>
                      </form>
                    ))}
                  <form
                    action={startContactEmploymentAction}
                    className="flex flex-wrap items-center gap-2 border-t pt-3"
                  >
                    <input type="hidden" name="contactId" value={id} />
                    <Input
                      name="accountName"
                      required
                      placeholder="Company"
                      className="h-7 flex-1 text-xs"
                    />
                    <Input
                      name="title"
                      placeholder="Title (optional)"
                      className="h-7 w-36 text-xs"
                    />
                    <Input
                      type="date"
                      name="startDate"
                      required
                      className="h-7 w-36 text-xs"
                    />
                    <SubmitButton variant="outline" size="sm">
                      Add
                    </SubmitButton>
                  </form>
                </div>
              </details>
            </div>
          </Panel>
        </div>
      </div>

      {/* Everything else — edit fields, linked leads — stays reachable. */}
      <details className="mt-6 rounded-2xl border bg-card px-5 py-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        <summary className="cursor-pointer text-sm font-medium text-foreground/80 transition-colors hover:text-foreground">
          Manage contact — details, preferences, linked leads
        </summary>
        <div className="mt-4">
          <ContactDetailPanel
            detail={detail}
            closeHref="/contacts"
            buildAccountHref={(accountId) => `/leads/accounts/${accountId}`}
            buildPropertyHref={(propertyId) => `/properties/${propertyId}`}
            buildLeadHref={(leadId) => `/leads/${leadId}`}
          />
        </div>
      </details>
    </div>
  );
}

function HeroTag({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11.5px] font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Panel({
  icon,
  title,
  note,
  right,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  note?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
        <span className="grid size-[26px] shrink-0 place-items-center rounded-lg bg-muted text-foreground/60">
          {icon}
        </span>
        <span className="shrink-0 text-[13.5px] font-semibold tracking-tight">
          {title}
        </span>
        {note && (
          <span className="min-w-0 truncate text-xs text-muted-foreground/80">
            · {note}
          </span>
        )}
        {right && <span className="ml-auto shrink-0">{right}</span>}
      </div>
      {children}
    </div>
  );
}
