import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <Card className="w-full border-[var(--color-parchment-border)] bg-[var(--color-parchment-soft)]/85 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white">
      <CardHeader className="gap-2">
        <span className="kicker text-[var(--color-amber)]">
          §&nbsp;reset&nbsp;password
        </span>
        <CardTitle className="font-display text-3xl font-medium tracking-tight">
          Forgot your password?
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground dark:text-white/70">
              If an account exists for that email, we&apos;ve sent a link to
              reset your password. Check your inbox and spam folder.
            </p>
            <p className="text-center text-sm text-muted-foreground dark:text-white/60">
              <Link
                href="/login"
                className="font-medium text-foreground underline-offset-4 hover:underline dark:text-white"
              >
                Back to sign in
              </Link>
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground dark:text-white/70">
              Enter the email for your account and we&apos;ll send you a link to
              reset your password.
            </p>
            {error && (
              <p className="mb-4 text-sm text-destructive dark:text-[var(--color-amber-soft)]">
                {error}
              </p>
            )}
            <form
              action={requestPasswordResetAction}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <SubmitButton variant="amber" className="w-full">
                Send reset link
              </SubmitButton>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground dark:text-white/60">
              Remembered it?{" "}
              <Link
                href="/login"
                className="font-medium text-foreground underline-offset-4 hover:underline dark:text-white"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
