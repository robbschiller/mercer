import { getOrgContext } from "@/lib/org-context";
import { getDashboardRecents } from "@/lib/store";
import { DashboardHero } from "@/components/dashboard-hero";
import { DashboardActionPills } from "@/components/dashboard-action-pills";
import { DashboardRecents } from "@/components/dashboard-recents";

export default async function DashboardPage() {
  const [ctx, recents] = await Promise.all([
    getOrgContext(),
    getDashboardRecents(5),
  ]);
  const firstName = pickFirstName(ctx?.name ?? null, ctx?.email ?? null);

  return (
    <div className="relative">
      {/* soft glow behind the hero, scoped to the dashboard surface */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(60rem_32rem_at_50%_-8rem,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_70%),radial-gradient(40rem_24rem_at_50%_-4rem,color-mix(in_oklab,var(--foreground)_4%,transparent),transparent_70%)]"
      />
      <div className="relative mx-auto w-full max-w-[46rem] px-6 pt-20 pb-20">
        <DashboardHero firstName={firstName} />
        <DashboardActionPills />

        {/* The pills sit visually under the composer (inside the hero card area).
            The recents section starts further down to give the welcome moment room. */}
        <div className="mt-14">
          <DashboardRecents recents={recents} />
        </div>
      </div>
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
