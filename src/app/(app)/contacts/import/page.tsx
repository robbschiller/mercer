import Link from "next/link";
import { importLeadsAction } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";

export default async function ImportContactsPage({
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
      <div className="mb-6 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">Trade-show list intake</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload attendee exports into the contact database. Contacts can be
          connected to properties and management groups before anyone has asked
          for work.
        </p>
        <ol className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">1. Upload</span>
            {" — "}pick a .csv saved from Excel, Google Sheets, or a badge-scan
            export.
          </li>
          <li>
            <span className="font-medium text-foreground">2. Auto-map</span>
            {" — "}we detect common contact, company, property, and address
            columns.
          </li>
          <li>
            <span className="font-medium text-foreground">
              3. Link property context
            </span>
            {" — "}property addresses stay attached to the property, not the
            person. Management group is optional on the contact.
          </li>
        </ol>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import contacts from CSV</CardTitle>
          <CardDescription>
            Only <code>name</code> is required. We&apos;ll look for{" "}
            <code>email</code>, <code>phone</code>, <code>company</code>,{" "}
            <code>property</code>, and address columns, then keep the original
            row as raw import context.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 whitespace-pre-wrap text-sm text-destructive">
              {error}
            </p>
          )}
          <form action={importLeadsAction} className="flex flex-col gap-4">
            <input type="hidden" name="returnTo" value="/contacts" />
            <div className="flex flex-col gap-2">
              <Label htmlFor="file">CSV file *</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".csv,text/csv"
                required
              />
              <p className="text-xs text-muted-foreground">
                Headers are auto-detected. A column matching{" "}
                <code>name</code>, <code>full name</code>, or{" "}
                <code>contact</code> is required.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="sourceTag">Source tag</Label>
              <Input
                id="sourceTag"
                name="sourceTag"
                placeholder="NAA Orlando 2026"
              />
              <p className="text-xs text-muted-foreground">
                Applied to contacts and imported context for filtering later.
              </p>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium">What happens next</p>
              <ul className="list-disc space-y-0.5 pl-4">
                <li>Rows without a name are skipped.</li>
                <li>
                  The import creates or updates contacts, properties, and their
                  relationship where property context exists.
                </li>
                <li>
                  A contact becomes a lead later, when there is an actual work
                  request against a property.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" asChild>
                <Link href="/contacts">Cancel</Link>
              </Button>
              <SubmitButton>Import contacts</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
