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
      <Card>
        <CardHeader>
          <CardTitle>Import leads from CSV</CardTitle>
          <CardDescription>
            Upload a trade show attendee list. We&apos;ll auto-map the columns
            (Name, Email, Phone, Company, Property) and look up each
            company&apos;s office address via Google Places so you have context
            before you reach out.
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
                  Each row&apos;s office address is resolved via Google Places
                  using <code>company</code> (plus <code>property</code> if
                  present)
                </li>
                <li>
                  Enrichment runs inline — expect a brief wait on large imports
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
