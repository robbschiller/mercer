"use server";

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { getOrgContext } from "@/lib/org-context";
import { resolveAnthropicKey } from "@/lib/integrations";
import {
  getCachedMorningBrief,
  getHomeAgenda,
  saveMorningBrief,
  type HomeAgenda,
  type MorningBrief,
} from "@/lib/store";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function factsFor(agenda: HomeAgenda): string {
  const quietValue = agenda.quietQuotes.reduce(
    (s, q) => s + (q.total ?? 0),
    0,
  );
  return [
    agenda.quietQuotes.length > 0
      ? `Quotes gone quiet: ${agenda.quietQuotes
          .map(
            (q) =>
              `${q.propertyName} (${q.total != null ? money.format(q.total) : "?"}, sent ${q.sentDaysAgo}d ago, ${q.neverOpened ? "never opened" : `viewed ${q.viewCount}x`})`,
          )
          .join("; ")} — ${money.format(quietValue)} combined`
      : "No quotes going quiet",
    agenda.followUps.length > 0
      ? `Follow-ups due: ${agenda.followUps.map((f) => `${f.name}${f.overdueDays > 0 ? ` (${f.overdueDays}d overdue)` : " (today)"}`).join("; ")}`
      : null,
    agenda.takeoffs.length > 0
      ? `Takeoffs: ${agenda.takeoffs.map((t) => `${t.name} ${t.scheduledAt.toLocaleDateString("en-US", { weekday: "long" })} ${t.scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`).join("; ")}`
      : null,
    agenda.expiringLinks.length > 0
      ? `Links expiring soon: ${agenda.expiringLinks.map((e) => `${e.propertyName} in ${e.daysLeft}d`).join("; ")}`
      : null,
    agenda.driftingJobs.length > 0
      ? `Jobs drifting: ${agenda.driftingJobs.map((j) => `${j.propertyName} (${j.reason.toLowerCase()})`).join("; ")}`
      : null,
    `Open quotes overall: ${agenda.openQuotes.count} totaling ${money.format(agenda.openQuotes.totalValue)}${agenda.openQuoteNames.length > 0 ? ` (${agenda.openQuoteNames.join(", ")})` : ""}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function templateBrief(agenda: HomeAgenda): string {
  const parts: string[] = [];
  if (agenda.quietQuotes.length > 0) {
    const v = agenda.quietQuotes.reduce((s, q) => s + (q.total ?? 0), 0);
    parts.push(
      `${agenda.quietQuotes.length} quote${agenda.quietQuotes.length === 1 ? " is" : "s are"} going quiet (${money.format(v)} combined).`,
    );
  }
  if (agenda.followUps.length > 0) {
    parts.push(
      `${agenda.followUps.length} follow-up${agenda.followUps.length === 1 ? "" : "s"} due today.`,
    );
  }
  if (agenda.takeoffs.length > 0) {
    const t = agenda.takeoffs[0];
    parts.push(
      `Next takeoff: ${t.name}, ${t.scheduledAt.toLocaleDateString("en-US", { weekday: "long" })}.`,
    );
  }
  if (parts.length === 0) {
    parts.push(
      agenda.openQuotes.count > 0
        ? `Quiet start — the ${agenda.openQuotes.count} open quote${agenda.openQuotes.count === 1 ? "" : "s"} (${money.format(agenda.openQuotes.totalValue)}) are all inside their follow-up window.`
        : "Quiet start — nothing on the agenda needs you yet.",
    );
  }
  return parts.join(" ");
}

/**
 * The two-sentence brief at the top of Home. Generated once per day per
 * user and cached (user_defaults.morning_brief); `force` regenerates.
 */
export async function getMorningBriefAction(
  force = false,
): Promise<MorningBrief> {
  const ctx = await getOrgContext();
  if (!ctx) return { date: "", text: "", generatedAt: "" };

  const today = new Date().toISOString().slice(0, 10);
  if (!force) {
    const cached = await getCachedMorningBrief();
    if (cached && cached.date === today) return cached;
  }

  const agenda = await getHomeAgenda();
  let text = templateBrief(agenda);

  const apiKey = await resolveAnthropicKey(ctx.ownerUserId);
  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create(
        {
          model: "claude-opus-4-8",
          max_tokens: 200,
          system:
            "You write the two-sentence morning brief for a commercial painting contractor's home screen. Plain text, exactly 1-2 sentences, ≤45 words total. Lead with the highest-dollar or most time-sensitive item; include dollar figures as given. Use ONLY property and people names that appear verbatim in the facts — if the facts don't name something, describe it generically ('your open quote'). Never invent a name. Calm and specific — an experienced ops manager, not a cheerleader. No greetings, no emoji.",
          messages: [{ role: "user", content: factsFor(agenda) }],
        },
        { timeout: 20_000 },
      );
      const t = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      if (t) text = t;
    } catch {
      // Template brief already set — a model hiccup never blanks the page.
    }
  }

  const brief: MorningBrief = {
    date: today,
    text,
    generatedAt: new Date().toISOString(),
  };
  await saveMorningBrief(brief);
  return brief;
}

export async function refreshMorningBriefAction(): Promise<MorningBrief> {
  const brief = await getMorningBriefAction(true);
  revalidatePath("/dashboard");
  return brief;
}
