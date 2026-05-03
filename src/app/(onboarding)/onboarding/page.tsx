import { redirect } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { getOrgContext } from "@/lib/org-context";
import {
  getOnboardingState,
  getCompanyProfile,
  isOnboardingComplete,
} from "@/lib/store";
import {
  submitOnboardingWebsiteAction,
  confirmOnboardingProfileAction,
  confirmOnboardingThemeAction,
  skipOnboardingAction,
} from "@/lib/actions";
import { StepIndicator } from "./step-indicator";

type Step = "website" | "confirm" | "theme";

function parseStep(raw: string | undefined): Step {
  return raw === "confirm" || raw === "theme" ? raw : "website";
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; error?: string }>;
}) {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  // Invited members shouldn't redo onboarding — their org's owner already did it.
  if (ctx.role !== "owner") redirect("/bids");

  const state = await getOnboardingState(ctx.ownerUserId);
  if (isOnboardingComplete(state)) redirect("/bids");

  const { step: rawStep, error } = await searchParams;
  const step = parseStep(rawStep);
  const profile = await getCompanyProfile(ctx.ownerUserId);

  return (
    <Card className="w-full border-[var(--color-parchment-border)] bg-[var(--color-parchment-soft)]/85 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white">
      <CardHeader className="gap-2">
        <span className="kicker text-[var(--color-amber)]">
          §&nbsp;welcome
        </span>
        <CardTitle className="font-display text-3xl font-medium tracking-tight">
          {step === "website" && "Let's brand your bids"}
          {step === "confirm" && "Confirm your company"}
          {step === "theme" && "Theme your bid page"}
        </CardTitle>
        <CardDescription>
          {step === "website" &&
            "Drop in your website. We'll pull your company name, address, and brand to theme every bid you send."}
          {step === "confirm" &&
            "Edit anything we got wrong. This shows up at the top of your bid PDF and shareable proposal page."}
          {step === "theme" &&
            "Pick the accent color for your bid page. You can change everything later from Settings."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StepIndicator current={step} />
        {error && (
          <p className="mb-4 text-sm text-destructive dark:text-[var(--color-amber-soft)]">
            {error}
          </p>
        )}

        {step === "website" && (
          <form
            action={submitOnboardingWebsiteAction}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="websiteUrl">Company website</Label>
              <Input
                id="websiteUrl"
                name="websiteUrl"
                type="text"
                placeholder="bayareapainters.com"
                defaultValue={profile?.websiteUrl ?? ""}
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground dark:text-white/60">
                We&apos;ll read the homepage to fill in the next step.
              </p>
            </div>
            <SubmitButton variant="amber" className="w-full">
              Continue
            </SubmitButton>
          </form>
        )}

        {step === "confirm" && (
          <form
            action={confirmOnboardingProfileAction}
            className="flex flex-col gap-4"
          >
            {profile?.enrichmentStatus === "failed" && (
              <p className="rounded-md border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/10 p-3 text-xs text-[var(--color-ink)] dark:text-white/80">
                We couldn&apos;t read{" "}
                <span className="font-medium">{profile.websiteUrl}</span>{" "}
                automatically. Fill in what you can below; you can always
                refine this later from Settings.
              </p>
            )}
            {profile?.enrichmentStatus === "success" && profile.companyName && (
              <p className="rounded-md border border-[var(--color-parchment-border)] bg-[var(--color-parchment-soft)]/60 p-3 text-xs text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                Pulled from {profile.websiteUrl}. Edit anything that&apos;s
                wrong.
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="companyName">Company name</Label>
              <Input
                id="companyName"
                name="companyName"
                defaultValue={profile?.companyName ?? ""}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="street">Street</Label>
              <Input
                id="street"
                name="street"
                defaultValue={profile?.street ?? ""}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  defaultValue={profile?.city ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  defaultValue={profile?.state ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input
                  id="zip"
                  name="zip"
                  defaultValue={profile?.zip ?? ""}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={profile?.phone ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={profile?.email ?? ""}
                />
              </div>
            </div>
            <SubmitButton variant="amber" className="w-full">
              Continue
            </SubmitButton>
          </form>
        )}

        {step === "theme" && (
          <form
            action={confirmOnboardingThemeAction}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="primaryColor">Accent color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="primaryColor"
                  name="primaryColor"
                  type="color"
                  defaultValue={profile?.primaryColor ?? "#1a1a1a"}
                  className="h-10 w-16 cursor-pointer p-1"
                />
                <span className="text-xs text-muted-foreground dark:text-white/60">
                  Used for the price box and section dividers on every bid.
                </span>
              </div>
            </div>
            <SubmitButton variant="amber" className="w-full">
              Finish
            </SubmitButton>
          </form>
        )}

        <form action={skipOnboardingAction} className="mt-6">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="mx-auto block text-xs text-muted-foreground hover:bg-transparent hover:underline dark:text-white/60"
          >
            Skip for now
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
