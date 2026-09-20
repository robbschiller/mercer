import { redirect } from "next/navigation";
import { Check, CreditCard, ExternalLink } from "lucide-react";
import { getOrgContext } from "@/lib/org-context";
import { getOnboardingState, listOrgMembers } from "@/lib/store";
import {
  billingConfigured,
  billingEnforced,
  getSubscription,
  PLAN_IDS,
  PLANS,
  planPriceId,
  resolveAccess,
  TRIAL_DAYS,
  type AccessState,
} from "@/lib/billing";
import {
  openBillingPortalAction,
  startCheckoutAction,
} from "@/lib/actions/billing";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{
    success?: string;
    canceled?: string;
    error?: string;
  }>;
}) {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");
  const isOwner = ctx.role === "owner";

  const [sub, onboarding, members, params] = await Promise.all([
    getSubscription(ctx.ownerUserId),
    getOnboardingState(ctx.ownerUserId),
    listOrgMembers(),
    searchParams,
  ]);
  const access = resolveAccess({ sub, onboardingStartedAt: onboarding?.startedAt ?? null });
  const seatsUsed = 1 + members.filter((m) => m.status === "active").length;
  const configured = billingConfigured();
  const currentPlan = access.plan ? PLANS[access.plan] : null;

  return (
    <div className="flex flex-col gap-6">
      {params.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {params.error}
        </p>
      )}
      {params.success && (
        <p className="rounded-md border border-success/40 bg-success-soft px-3 py-2 text-sm text-success-foreground">
          You&apos;re all set. It can take a few seconds for the plan to show
          up here while Stripe confirms the payment.
        </p>
      )}
      {params.canceled && (
        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Checkout canceled. Nothing was charged.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="size-4" />
            Your plan
          </CardTitle>
          <CardDescription>{describe(access, currentPlan?.name ?? null)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Plan" value={currentPlan?.name ?? (access.level === "trialing" ? "Trial" : "None")} />
            <Stat
              label="Seats"
              value={currentPlan ? `${seatsUsed} of ${currentPlan.seats}` : String(seatsUsed)}
            />
            <Stat
              label={access.level === "trialing" ? "Trial ends" : "Renews"}
              value={access.until ? fmtDate(access.until) : "—"}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge access={access} />
            {!access.enforced && (
              <span className="text-xs text-muted-foreground">
                Billing is in setup mode: nothing is locked yet.
              </span>
            )}
          </div>
          {isOwner && sub?.stripeCustomerId && (
            <form action={openBillingPortalAction}>
              <SubmitButton variant="outline" size="sm">
                <ExternalLink className="size-3.5" />
                Manage cards & invoices
              </SubmitButton>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Plans</CardTitle>
          <CardDescription>
            Flat monthly price per org. Every AI feature is included; no
            per-token charges. A {TRIAL_DAYS}-day trial starts with your
            account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {PLAN_IDS.map((id) => {
              const plan = PLANS[id];
              const isCurrent = access.hasSubscription && access.plan === id;
              const available = configured && Boolean(planPriceId(id));
              return (
                <div
                  key={id}
                  className={
                    "flex flex-col gap-3 rounded-xl border p-4 " +
                    (isCurrent ? "border-foreground/40 bg-muted/20" : "")
                  }
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">{plan.name}</span>
                    <span className="font-mono text-lg tabular-nums">
                      {money.format(plan.priceMonthlyUsd)}
                      <span className="text-xs text-muted-foreground">/mo</span>
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.blurb}</p>
                  <ul className="flex flex-col gap-1 text-sm">
                    <Feature>Up to {plan.seats} seats</Feature>
                    <Feature>AI quotes, proposals, and Ask Mercer included</Feature>
                    <Feature>Live proposal pages and project status</Feature>
                  </ul>
                  <div className="mt-auto pt-1">
                    {isCurrent ? (
                      <Badge variant="secondary">Current plan</Badge>
                    ) : isOwner ? (
                      <form action={startCheckoutAction}>
                        <input type="hidden" name="plan" value={id} />
                        <SubmitButton size="sm" disabled={!available}>
                          {access.hasSubscription ? `Switch to ${plan.name}` : `Choose ${plan.name}`}
                        </SubmitButton>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Only the org owner can change the plan.
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {!configured && (
            <p className="mt-4 text-xs text-muted-foreground">
              Billing isn&apos;t connected on this environment yet, so the
              plan buttons are disabled.
            </p>
          )}
          {!billingEnforced() && configured && (
            <p className="mt-4 text-xs text-muted-foreground">
              Enforcement is off (BILLING_ENFORCED). Plans can be purchased
              and mirrored, but nobody is locked out until it is turned on.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function describe(access: AccessState, planName: string | null): string {
  switch (access.level) {
    case "active":
      return access.cancelAtPeriodEnd
        ? `${planName ?? "Your plan"} is set to cancel at the end of this period.`
        : `${planName ?? "Your plan"} is active.`;
    case "trialing":
      return access.hasSubscription
        ? `${planName ?? "Your plan"} trial, then billing starts automatically.`
        : "You're on the free trial. Pick a plan any time to keep going after it ends.";
    case "grace":
      return "The last payment didn't go through. Update your card to keep access.";
    case "locked":
      return access.hasSubscription
        ? "The subscription is no longer active."
        : "The trial has ended.";
  }
}

function StatusBadge({ access }: { access: AccessState }) {
  const map: Record<AccessState["level"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "Active", variant: "default" },
    trialing: { label: "Trial", variant: "secondary" },
    grace: { label: "Payment failed", variant: "destructive" },
    locked: { label: "Inactive", variant: "outline" },
  };
  const { label, variant } = map[access.level];
  return <Badge variant={variant}>{label}</Badge>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 px-3.5 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-xl font-medium tabular-nums">{value}</p>
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 size-3.5 shrink-0 text-success-foreground" />
      <span>{children}</span>
    </li>
  );
}
