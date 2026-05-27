import Link from "next/link";
import { updatePasswordAction } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // This route is outside the middleware matcher, so it must verify the
  // recovery session itself rather than trusting forwarded auth headers.
  // The session is established by /auth/callback when the email link is opened.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Card className="w-full border-[var(--color-parchment-border)] bg-[var(--color-parchment-soft)]/85 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white">
      <CardHeader className="gap-2">
        <span className="kicker text-[var(--color-amber)]">
          §&nbsp;reset&nbsp;password
        </span>
        <CardTitle className="font-display text-3xl font-medium tracking-tight">
          Set a new password
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!user ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground dark:text-white/70">
              This reset link is invalid or has expired. Request a new one to
              continue.
            </p>
            <Link href="/forgot-password" className="w-full">
              <SubmitButton variant="amber" className="w-full">
                Request a new link
              </SubmitButton>
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <p className="mb-4 text-sm text-destructive dark:text-[var(--color-amber-soft)]">
                {error}
              </p>
            )}
            <form
              action={updatePasswordAction}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">New password</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="••••••••"
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
              </div>
              <SubmitButton variant="amber" className="w-full">
                Update password
              </SubmitButton>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
