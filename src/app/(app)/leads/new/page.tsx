import Link from "next/link";
import { createLeadAction } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";

export default async function NewLeadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/leads"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Leads
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>New lead</CardTitle>
          <CardDescription>
            Add a property opportunity and the first contact attached to it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive mb-4">{error}</p>
          )}
          <form action={createLeadAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required autoFocus />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
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
                <Label htmlFor="company">Company</Label>
                <Input id="company" name="company" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="propertyName">Property name</Label>
                <Input id="propertyName" name="propertyName" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="resolvedAddress">Property address</Label>
              <Input
                id="resolvedAddress"
                name="resolvedAddress"
                placeholder="123 Main St, Atlanta, GA"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="sourceTag">Source</Label>
              <Input
                id="sourceTag"
                name="sourceTag"
                placeholder="NAA Orlando 2026, Referral, etc."
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" asChild>
                <Link href="/leads">Cancel</Link>
              </Button>
              <SubmitButton>Add lead</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
