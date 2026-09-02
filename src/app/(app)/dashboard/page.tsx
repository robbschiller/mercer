import Link from "next/link";
import { Suspense } from "react";
import { ContactRound, Upload, UserRoundSearch } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getOrgContext } from "@/lib/org-context";
import { getMorningBriefAction } from "@/lib/actions/morning-brief";
import { DashboardHero } from "@/components/dashboard-hero";
import {
  MorningBrief,
  MorningBriefSkeleton,
} from "@/components/morning-brief";

/**
 * Home is the day's headline plus the two doors that start everything: a
 * lead (contact + property, which becomes an opportunity) and a bare
 * contact. Work in flight lives on Pipeline / Jobs — Home does not re-list it.
 */
export default async function DashboardPage() {
  const ctx = await getOrgContext();
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
        <StartHere />
      </div>
    </div>
  );
}

const ENTRY_POINTS: {
  href: string;
  label: string;
  sub: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/leads/new",
    label: "Add lead",
    sub: "A contact and a building with work to do",
    icon: UserRoundSearch,
  },
  {
    href: "/contacts/new",
    label: "Add contact",
    sub: "A person, on their own",
    icon: ContactRound,
  },
  {
    href: "/lists/new",
    label: "Import list",
    sub: "A CSV of people — convert the real ones into leads",
    icon: Upload,
  },
];

function StartHere() {
  return (
    <div className="grid gap-2.5 sm:grid-cols-3">
      {ENTRY_POINTS.map(({ href, label, sub, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="group rounded-2xl border bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[border-color,transform,box-shadow] hover:-translate-y-px hover:border-foreground/20 hover:shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
        >
          <span className="mb-3 flex size-9 items-center justify-center rounded-[10px] bg-muted text-foreground/60 transition-colors group-hover:bg-foreground group-hover:text-background">
            <Icon className="size-4" />
          </span>
          <p className="text-[13.5px] font-semibold tracking-tight">{label}</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
            {sub}
          </p>
        </Link>
      ))}
    </div>
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
