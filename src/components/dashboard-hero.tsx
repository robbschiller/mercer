"use client";

import { useEffect, useState } from "react";

type DashboardHeroProps = {
  firstName: string | null;
  /** Server-rendered morning brief, suspended so it streams in. */
  briefSlot?: React.ReactNode;
};

function greetingFor(hour: number) {
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Home hero: eyebrow date · greeting · serif AI brief. The clock reads on the
 * client (the server has no idea what hour it is where you are), so the first
 * paint shows a neutral greeting and settles after hydration.
 */
export function DashboardHero({ firstName, briefSlot }: DashboardHeroProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => setNow(new Date()), []);

  const greeting = now ? greetingFor(now.getHours()) : "Welcome back";
  const dateLine = now
    ? now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";
  const name = firstName?.trim() || null;

  return (
    <div className="mb-10">
      <p
        className="mb-3 flex min-h-4 items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground"
        suppressHydrationWarning
      >
        <span className="size-[5px] rounded-full bg-emerald-500 shadow-[0_0_0_3px] shadow-emerald-500/15" />
        {dateLine}
      </p>
      <h1
        className="mb-4 text-3xl font-semibold leading-[1.1] tracking-tight"
        suppressHydrationWarning
      >
        {name ? `${greeting}, ${name}` : greeting}
        <span className="text-muted-foreground">.</span>
      </h1>

      {briefSlot}
    </div>
  );
}
