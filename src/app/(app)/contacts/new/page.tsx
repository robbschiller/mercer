import Link from "next/link";
import { createContactAction } from "@/lib/actions";
import { AccountAutocomplete } from "@/components/account-autocomplete";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/contacts"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Contacts
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>New contact</CardTitle>
          <CardDescription>
            Add a person to the contact database. You can connect them to a
            property or promote them to a lead when there is a work request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          <form action={createContactAction} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" required autoFocus />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" placeholder="Regional manager" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="jordan@example.com"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="company">Management group</Label>
                <AccountAutocomplete id="company" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sourceTag">Source</Label>
                <Input
                  id="sourceTag"
                  name="sourceTag"
                  placeholder="Referral, NAA Orlando 2026, etc."
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" asChild>
                <Link href="/contacts">Cancel</Link>
              </Button>
              <SubmitButton>Add contact</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
