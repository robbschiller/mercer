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

export default async function ImportLeadsPage({
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
      <div className="mb-6 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">First time here?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Drop in a trade-show attendee list, tag the source, and you&apos;ll
          land on the leads page with one row per contact. Nothing is sent to
          anyone, you can always delete or re-import.
        </p>
        <ol className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">1. Upload</span>
            {" — "}pick a .csv saved from Excel, Google Sheets, or your
            badge-scan export.
          </li>
          <li>
            <span className="font-medium text-foreground">2. Auto-map</span>
            {" — "}we detect the usual columns, no manual mapping step.
          </li>
          <li>
            <span className="font-medium text-foreground">
              3. Enrich where we can
            </span>
            {" — "}we look up the property&apos;s address via Google Places
            from the property name and management company. Coverage is partial,
            don&apos;t expect every row to resolve.
          </li>
        </ol>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import leads from CSV</CardTitle>
          <CardDescription>
            Only <code>name</code> is required. We&apos;ll look for{" "}
            <code>email</code>, <code>phone</code>, <code>company</code>, and{" "}
            <code>property</code> (or common variants) and keep anything else
            in the row as raw data on the lead.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive mb-4 whitespace-pre-wrap">
              {error}
            </p>
          )}
          <form
            action={importLeadsAction}
            className="flex flex-col gap-4"
          >
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
                Applied to every row in this import. Used for filtering in the
                lead list.
              </p>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium mb-1">What happens next</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Rows without a name are skipped</li>
                <li>
                  Property-address lookup runs inline via Google Places when
                  a <code>property</code> or <code>company</code> is present.
                  Many attendee lists won&apos;t resolve cleanly, that&apos;s
                  expected.
                </li>
                <li>
                  You&apos;ll land on the leads page with a confirmation
                  banner, enrichment status shows per row.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" asChild>
                <Link href="/leads">Cancel</Link>
              </Button>
              <SubmitButton>Import &amp; enrich</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
