import Link from "next/link";
import { signInAction } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <Card className="w-full border-[var(--color-parchment-border)] bg-[var(--color-parchment-soft)]/85 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white">
      <CardHeader className="gap-2">
        <span className="kicker text-[var(--color-amber)]">
          §&nbsp;sign&nbsp;in
        </span>
        <CardTitle className="font-display text-3xl font-medium tracking-tight">
          Welcome back
        </CardTitle>
      </CardHeader>
      <CardContent>
        {message && (
          <p className="mb-4 text-sm text-muted-foreground dark:text-white/70">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-4 text-sm text-destructive dark:text-[var(--color-amber-soft)]">
            {error}
          </p>
        )}
        <form action={signInAction} className="flex flex-col gap-4">
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
            />
          </div>
          <SubmitButton variant="amber" className="w-full">
            Sign in
          </SubmitButton>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground dark:text-white/60">
          No account?{" "}
          <Link
            href="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline dark:text-white"
          >
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
