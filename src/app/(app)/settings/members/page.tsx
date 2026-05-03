import { redirect } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getOrgContext } from "@/lib/org-context";
import { listOrgMembers } from "@/lib/store";
import {
  inviteOrgMemberAction,
  removeOrgMemberAction,
} from "@/lib/actions";

export default async function SettingsMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invited?: string }>;
}) {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const members = await listOrgMembers();
  const { error, invited } = await searchParams;
  const canManage = ctx.role === "owner" || ctx.role === "admin";

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {invited && (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Invitation created. They&apos;ll join your org the next time they
          sign in with that email.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team</CardTitle>
          <CardDescription>
            People with access to your bids, leads, and projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y">
            <li className="flex items-center justify-between gap-3 py-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {ctx.name || ctx.email || "You"}
                  {ctx.role === "owner" && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (you, owner)
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ctx.email}
                </span>
              </div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {ctx.role}
              </span>
            </li>
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{m.email}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.status === "invited"
                      ? "Pending invite"
                      : `Joined ${m.acceptedAt ? new Date(m.acceptedAt).toLocaleDateString() : ""}`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {m.role}
                  </span>
                  {canManage && (
                    <form action={removeOrgMemberAction}>
                      <input
                        type="hidden"
                        name="membershipId"
                        value={m.id}
                      />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive hover:bg-destructive/10"
                      >
                        {m.status === "invited" ? "Cancel" : "Remove"}
                      </Button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invite a teammate</CardTitle>
            <CardDescription>
              They&apos;ll get access the next time they sign in with this
              email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={inviteOrgMemberAction}
              className="flex flex-col gap-4"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="teammate@company.com"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select name="role" defaultValue="member">
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <SubmitButton className="self-start">Send invite</SubmitButton>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
