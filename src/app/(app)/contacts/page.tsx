import Link from "next/link";
import {
  AlarmClock,
  ArrowDownWideNarrow,
  ArrowRight,
  Award,
  Briefcase,
  Building,
  ContactRound,
  FileText,
  FolderTree,
  Gavel,
  History,
  Mail,
  MessageSquare,
  Phone,
  PhoneOutgoing,
  Plus,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { getContactsRegister, type ContactRegisterRow } from "@/lib/store";
import type { ContactMethod } from "@/lib/status-meta";
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

const METHOD_META: Record<
  ContactMethod,
  { label: string; verb: string; Icon: typeof Mail }
> = {
  email: { label: "Email", verb: "Emailed", Icon: Mail },
  phone: { label: "Call", verb: "Called", Icon: Phone },
  text: { label: "Text", verb: "Texted", Icon: MessageSquare },
};

type Rel = "dm" | "champ" | "new" | null;
function relOf(c: ContactRegisterRow): Rel {
  if (c.isDecisionMaker) return "dm";
  if (c.wonCount >= 2) return "champ";
  if (c.decidedCount === 0 && c.dealsCount <= 1) return "new";
  return null;
}
function daysSince(d: Date | null): number | null {
  return d == null ? null : Math.floor((Date.now() - d.getTime()) / 86_400_000);
}
function hasOpenWork(c: ContactRegisterRow): boolean {
  return c.openLeadCount > 0 || c.openBidCount > 0;
}
/** Going cold: open work on the table and >14 days of silence (or none logged). */
function isCold(c: ContactRegisterRow): boolean {
  const d = daysSince(c.lastTouchAt);
  return hasOpenWork(c) && (d == null || d > 14);
}

const FILTERS = ["all", "dm", "cold"] as const;
type Filter = (typeof FILTERS)[number];

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{
    show?: string;
    group?: string;
    q?: string;
    imported?: string;
  }>;
}) {
  const params = await searchParams;
  const filter: Filter = FILTERS.includes(params.show as Filter)
    ? (params.show as Filter)
    : "all";
  const grouped = params.group === "co";
  const q = (params.q ?? "").trim();

  const { rows: all, total } = await getContactsRegister({ q, limit: 60 });
  const counts = {
    all: total,
    dm: all.filter((c) => relOf(c) === "dm").length,
    cold: all.filter(isCold).length,
  };
  const rows = grouped
    ? all
    : filter === "dm"
      ? all.filter((c) => relOf(c) === "dm")
      : filter === "cold"
        ? all.filter(isCold)
        : all;
  const lifetime = rows.reduce((n, c) => n + c.lifetime, 0);

  const companies = new Map<string, ContactRegisterRow[]>();
  if (grouped) {
    for (const c of all) {
      const key = c.company ?? "No company on file";
      companies.set(key, [...(companies.get(key) ?? []), c]);
    }
  }

  const qs = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    for (const [k, v] of Object.entries(patch)) if (v) p.set(k, v);
    const str = p.toString();
    return str ? `/contacts?${str}` : "/contacts";
  };

  return (
    <div className="relative mx-auto w-full max-w-[1240px] px-6 pb-24 pt-7">
      <header className="mb-5 flex flex-wrap items-end gap-5">
        <div>
          <p className="mb-2.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
            <ContactRound className="size-3.5" />
            The people register
          </p>
          <h1 className="text-[27px] font-semibold leading-tight tracking-tight">
            Contacts
          </h1>
          <p className="mt-1 max-w-[640px] text-[13.5px] text-muted-foreground">
            Buildings are the durable asset; people are the portable one. The
            rep follows the firm — this is who says yes, and who&apos;s going
            quiet.
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link
            href="/contacts/import"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3.5 text-[13px] font-medium text-foreground/80 transition-colors hover:bg-muted"
          >
            <Upload className="size-3.5" />
            Import
          </Link>
          <Link
            href="/contacts/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-foreground bg-foreground px-3.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
          >
            <Plus className="size-3.5" />
            New contact
          </Link>
        </div>
      </header>

      {params.imported && (
        <div className="mb-4 rounded-xl border border-emerald-600/30 bg-emerald-600/5 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Imported {params.imported} contact
          {params.imported === "1" ? "" : "s"}.
        </div>
      )}

      {/* search + filter chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form action="/contacts" className="relative">
          {filter !== "all" && <input type="hidden" name="show" value={filter} />}
          {grouped && <input type="hidden" name="group" value="co" />}
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search people, companies…"
            className="h-9 w-56 rounded-[10px] border bg-card pl-9 pr-3 text-[13.5px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground/30"
          />
        </form>
        <Chip href={qs({})} active={filter === "all" && !grouped}>
          All
          <Count n={counts.all} />
        </Chip>
        <Chip href={qs({ show: "dm" })} active={filter === "dm" && !grouped}>
          <Gavel className="size-3.5 text-muted-foreground" />
          Decision makers
          <Count n={counts.dm} />
        </Chip>
        <Chip
          href={qs({ show: "cold" })}
          active={filter === "cold" && !grouped}
          activeClass="border-amber-500 bg-amber-500 text-white [&_span]:!text-white/85 [&_svg]:!text-white/85"
        >
          <AlarmClock className="size-3.5 text-muted-foreground" />
          Going cold
          <Count n={counts.cold} />
        </Chip>
        <Chip href={qs({ group: "co" })} active={grouped} className="ml-auto">
          <FolderTree className="size-3.5 text-muted-foreground" />
          By company
        </Chip>
      </div>

      {/* toolbar */}
      <div className="mb-3 flex items-center gap-3 px-0.5">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          {grouped ? (
            <>
              <FolderTree className="size-3.5" />
              Grouped{" "}
              <b className="font-semibold text-foreground/80">by company</b>
            </>
          ) : (
            <>
              <ArrowDownWideNarrow className="size-3.5" />
              Sorted{" "}
              <b className="font-semibold text-foreground/80">
                highest lifetime first
              </b>
            </>
          )}
        </span>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {counts.cold > 0 && (
            <>
              <b className="font-semibold text-foreground/80">{counts.cold}</b>{" "}
              going cold ·{" "}
            </>
          )}
          {total > all.length ? (
            <>
              top{" "}
              <b className="font-semibold text-foreground/80">{all.length}</b>{" "}
              of {total} ·{" "}
            </>
          ) : (
            <>
              <b className="font-semibold text-foreground/80">{rows.length}</b>{" "}
              contact{rows.length === 1 ? "" : "s"} ·{" "}
            </>
          )}
          <b className="font-mono font-semibold text-foreground/80">
            {moneyK(lifetime)}
          </b>{" "}
          lifetime
        </span>
      </div>

      {all.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border bg-card px-8 py-14 text-center shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
          <span className="mb-5 flex size-[54px] items-center justify-center rounded-2xl bg-muted text-foreground/60">
            <ContactRound className="size-6" />
          </span>
          <h3 className="mb-2 text-xl font-semibold tracking-tight">
            {q ? `No contacts match “${q}”` : "No contacts yet"}
          </h3>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            {q
              ? "Try a different name or company."
              : "Import a trade-show CSV or add people as leads come in — every yes starts with a name."}
          </p>
          <Link
            href={q ? "/contacts" : "/contacts/import"}
            className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3.5 text-[13px] font-medium transition-colors hover:bg-muted"
          >
            {q ? "Clear search" : "Import contacts"}
          </Link>
        </div>
      ) : grouped ? (
        [...companies.entries()].map(([name, list]) => (
          <section key={name} className="mb-6">
            <div className="mb-3 flex items-center gap-2.5 px-1">
              <span className="flex size-[26px] items-center justify-center rounded-lg bg-muted text-foreground/60">
                <Building className="size-[15px]" />
              </span>
              <span className="text-[14.5px] font-semibold tracking-tight">
                {name}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                ×{list.length}
              </span>
              <span className="flex-1" />
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {moneyK(list.reduce((n, c) => n + c.lifetime, 0))} lifetime
              </span>
              {list.filter(isCold).length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-px text-[11.5px] font-semibold text-amber-700 dark:text-amber-400">
                  <AlarmClock className="size-3" />
                  {list.filter(isCold).length} going cold
                </span>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {list.map((c) => (
                <ContactCard key={c.id} c={c} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((c) => (
            <ContactCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContactCard({ c }: { c: ContactRegisterRow }) {
  const rel = relOf(c);
  const cold = isCold(c);
  const d = daysSince(c.lastTouchAt);
  const method = c.preferredMethod ? METHOD_META[c.preferredMethod] : null;
  const openLine =
    c.openLine ??
    (c.openBidCount > 0
      ? `${c.openBidCount} open bid${c.openBidCount === 1 ? "" : "s"}`
      : c.openLeadCount > 0
        ? `${c.openLeadCount} open lead${c.openLeadCount === 1 ? "" : "s"}`
        : null);

  return (
    <Link
      href={`/contacts/${c.id}`}
      className={cn(
        "grid grid-cols-[46px_minmax(0,1fr)] gap-4 rounded-2xl border bg-card p-[17px_20px_17px_17px] shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[border-color,box-shadow,transform] hover:border-foreground/20 hover:shadow-[0_4px_16px_-6px_rgb(0_0_0/0.12)] active:translate-y-px md:grid-cols-[46px_minmax(0,1fr)_272px]",
        cold && "border-l-[3px] border-l-amber-500",
      )}
    >
      <span
        className={cn(
          "grid size-[46px] place-items-center rounded-full text-[14.5px] font-bold tracking-[0.01em] text-white",
          tintFor(c.name),
        )}
      >
        {initials(c.name)}
      </span>

      <div className="min-w-0">
        <div className="mb-0.5 flex flex-wrap items-center gap-2">
          <span className="text-[16.5px] font-semibold tracking-tight">
            {c.name}
          </span>
          {rel === "dm" && (
            <Tag className="border-foreground bg-foreground text-background">
              <Gavel className="size-3" />
              Decision maker
            </Tag>
          )}
          {rel === "champ" && (
            <Tag className="border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
              <Award className="size-3" />
              Champion
            </Tag>
          )}
          {rel === "new" && (
            <Tag className="border-border bg-muted/60 text-muted-foreground">
              <Sparkles className="size-3" />
              New
            </Tag>
          )}
          {method && (
            <Tag
              className="border-border bg-card text-foreground/70"
              title={`Prefers ${method.label.toLowerCase()}`}
            >
              <method.Icon className="size-3 text-muted-foreground" />
              {method.label}
              <span className="size-[5px] rounded-full bg-blue-600" />
            </Tag>
          )}
        </div>
        <div className="mb-2.5 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
          {c.title && (
            <span className="font-medium text-foreground/80">{c.title}</span>
          )}
          {c.company && (
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-px text-xs font-medium text-foreground/80">
              <Building className="size-3 text-muted-foreground/70" />
              {c.company}
            </span>
          )}
        </div>
        {(c.sinceYear != null || c.prevEmployer) && (
          <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground/80">
            <Briefcase className="size-3.5 text-muted-foreground/60" />
            {c.company && c.sinceYear != null
              ? `At ${c.company} since ${c.sinceYear}`
              : c.company
                ? `At ${c.company}`
                : "Employment on file"}
            {c.prevEmployer && (
              <span className="text-muted-foreground/60">
                · previously {c.prevEmployer}
              </span>
            )}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Spark
            n={c.propsCount}
            label={c.propsCount === 1 ? "property" : "properties"}
          />
          <Spark n={c.dealsCount} label={c.dealsCount === 1 ? "deal" : "deals"} />
          {c.decidedCount >= 2 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
              <b className="font-mono font-medium tabular-nums text-emerald-600">
                {Math.round((c.wonCount / c.decidedCount) * 100)}%
              </b>
              win rate
            </span>
          )}
        </div>
      </div>

      {/* side rail */}
      <div className="col-span-2 flex flex-col gap-2.5 border-t pt-4 md:col-span-1 md:border-l md:border-t-0 md:pl-5 md:pt-0">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Lifetime awarded
          </p>
          <p className="mt-0.5 font-mono text-[22px] font-medium leading-tight tabular-nums tracking-tight">
            {money.format(c.lifetime)}
          </p>
        </div>
        <p
          className={cn(
            "flex items-start gap-1.5 text-xs",
            cold
              ? "font-medium text-amber-700 dark:text-amber-400"
              : "text-muted-foreground",
          )}
        >
          {cold ? (
            <AlarmClock className="mt-px size-3.5 shrink-0" />
          ) : (
            <History className="mt-px size-3.5 shrink-0" />
          )}
          <span>
            {d == null ? (
              <>No touch logged{openLine ? ` · ${openLine}` : ""}</>
            ) : (
              <>
                {cold ? <b>Last touch {d}d ago</b> : `Last touch ${d}d ago`}
                {openLine ? ` · ${openLine}` : ""}
              </>
            )}
          </span>
        </p>
        <div className="mt-auto pt-1">
          <span
            className={cn(
              "inline-flex h-[34px] w-full items-center justify-center gap-1.5 rounded-lg border text-[13px] font-medium transition-colors",
              cold
                ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                : hasOpenWork(c)
                  ? "border-foreground bg-foreground text-background"
                  : "bg-card text-foreground/80",
            )}
          >
            {cold ? (
              <>
                <PhoneOutgoing className="size-3.5" />
                Log a call
              </>
            ) : hasOpenWork(c) ? (
              <>
                <FileText className="size-3.5" />
                Open deal
              </>
            ) : (
              <>
                <ArrowRight className="size-3.5" />
                Open contact
              </>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}

function Tag({
  className,
  title,
  children,
}: {
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11.5px] font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Spark({ n, label }: { n: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
      <b className="font-mono font-medium tabular-nums text-foreground">{n}</b>
      {label}
    </span>
  );
}

function Chip({
  href,
  active,
  className,
  activeClass,
  children,
}: {
  href: string;
  active: boolean;
  className?: string;
  activeClass?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-[10px] border px-3 text-[13.5px] font-medium transition-colors",
        active
          ? (activeClass ??
            "border-foreground bg-foreground text-background [&_span]:!text-background/80 [&_svg]:!text-background/80")
          : "bg-card text-foreground/80 hover:border-foreground/25 hover:bg-muted/40",
        className,
      )}
    >
      {children}
    </Link>
  );
}

function Count({ n }: { n: number }) {
  return (
    <span className="font-semibold tabular-nums text-muted-foreground">
      {n}
    </span>
  );
}
