import Link from "next/link";
import { getSessionUser } from "@/lib/supabase/auth-cache";
import { signOutAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export async function NavAuth() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href="/login">Sign in</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground hidden sm:inline">
        {user.email}
      </span>
      <form action={signOutAction}>
        <Button variant="ghost" size="sm" type="submit">
          Sign out
        </Button>
      </form>
    </div>
  );
}
