import Link from "next/link";
import { importListAction } from "@/lib/actions";
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
import { PageContainer, PageHeader } from "@/components/page-chrome";

export default async function NewListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <PageContainer width="narrow">
      <PageHeader
        back={{ href: "/lists", label: "Lists" }}
        title="Import a list"
        description="A list is raw people — a trade-show export, a purchased roster. It lives on its own. Nothing else is created until you open the list and convert someone into a lead."
      />

      <Card>
        <CardHeader>
          <CardTitle>Upload a CSV</CardTitle>
          <CardDescription>
            Only a name column is required. We&apos;ll also look for{" "}
            <code>first name</code> / <code>last name</code>, <code>email</code>
            , <code>phone</code>, <code>company</code>, <code>property</code>,
            and address columns, and keep every original row as-is.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 whitespace-pre-wrap text-sm text-destructive">
              {error}
            </p>
          )}
          <form action={importListAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="file">CSV file *</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".csv,text/csv"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="name">List name</Label>
              <Input id="name" name="name" placeholder="BAAA 2026 attendees" />
              <p className="text-xs text-muted-foreground">
                Defaults to the file name.
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
                Becomes the lead&apos;s source when you convert someone.
              </p>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium">What happens next</p>
              <ul className="list-disc space-y-0.5 pl-4">
                <li>Rows without a name are skipped.</li>
                <li>
                  The rows land on the list and nowhere else — no contacts,
                  properties, or leads are created.
                </li>
                <li>
                  Convert a row when there is real work: that opens a
                  pre-filled new lead for you to confirm.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" asChild>
                <Link href="/lists">Cancel</Link>
              </Button>
              <SubmitButton>Import list</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
