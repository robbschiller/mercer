"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Clock } from "lucide-react";
import type { AccessState } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const BILLING_PATH = "/settings/billing";

/**
 * Wraps the app shell's page slot. When access is blocked it replaces the
 * page with a lock card everywhere except the billing settings, so the
 * owner can always reach the place that fixes it. Trial and grace states
 * render a slim banner above the page instead.
 */
export function BillingGate({
  access,
  role,
  children,
}: {
  access: AccessState;
  role: "owner" | "admin" | "member";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const onBilling = pathname === BILLING_PATH || pathname.startsWith(`${BILLING_PATH}/`);
  const isOwner = role === "owner";

  if (access.blocked && !onBilling) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="size-4" />
              {access.hasSubscription ? "Subscription paused" : "Trial ended"}
            </CardTitle>
            <CardDescription>
              {isOwner
                ? "Pick a plan to keep working. Your leads, opportunities, and jobs are all still here."
                : "Ask your org owner to pick a plan. Your data is safe and nothing has been deleted."}
            </CardDescription>
          </CardHeader>
          {isOwner && (
            <CardContent>
              <Button asChild>
                <Link href={BILLING_PATH}>Choose a plan</Link>
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  const banner = bannerFor(access, isOwner);
  return (
    <>
      {banner && !onBilling && (
        <div className="border-b bg-warning-soft px-4 py-2 text-sm text-warning-foreground">
          <div className="mx-auto flex max-w-6xl items-center gap-2">
            <Clock className="size-3.5 shrink-0" />
            <span>{banner}</span>
            {isOwner && (
              <Link href={BILLING_PATH} className="ml-auto font-medium underline underline-offset-2">
                Billing
              </Link>
            )}
          </div>
        </div>
      )}
      {children}
    </>
  );
}

function bannerFor(access: AccessState, isOwner: boolean): string | null {
  if (!access.enforced) return null;
  if (access.level === "grace") {
    return isOwner
      ? "Your last payment didn't go through. Update your card to keep access."
      : "The org's last payment didn't go through. The owner needs to update the card.";
  }
  if (access.level === "trialing" && !access.hasSubscription && access.daysLeft !== null && access.daysLeft <= 7) {
    const d = access.daysLeft;
    return d === 0
      ? "Your trial ends today."
      : `Your trial ends in ${d} day${d === 1 ? "" : "s"}.`;
  }
  return null;
}
