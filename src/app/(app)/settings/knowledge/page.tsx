import { Brain, FileText } from "lucide-react";
import { getOrgKnowledgeFiles } from "@/lib/store";
import {
  uploadOrgKnowledgeAction,
  deleteOrgKnowledgeAction,
} from "@/lib/actions/org-knowledge";
import { ORG_KNOWLEDGE_KINDS } from "@/db/schema";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Proposal brain" };

const KIND_LABELS: Record<(typeof ORG_KNOWLEDGE_KINDS)[number], string> = {
  pricing: "Pricing model",
  supplier_pricing: "Supplier pricing",
  takeoff_template: "Takeoff template",
  sample_proposal: "Sample proposal",
  messaging: "Messaging guide",
  testimonials: "Testimonials",
  company_facts: "Company facts (license, insurance, promises)",
  other: "Other",
};

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, files] = await Promise.all([
    searchParams,
    getOrgKnowledgeFiles(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Brain className="size-5" />
          Proposal brain
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Drop your raw files once — pricing spreadsheet, supplier price
          sheets, a takeoff template, a winning proposal, your messaging guide
          — and every AI-drafted quote, budget, and proposal reads them
          exactly as they are. No data entry, no reformatting.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add knowledge</CardTitle>
          <CardDescription>
            PDF, Excel, Word, CSV, text, or images — 10 MB max each.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={uploadOrgKnowledgeAction}
            className="flex flex-wrap items-center gap-2"
          >
            <select
              name="kind"
              defaultValue="pricing"
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              {ORG_KNOWLEDGE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
            <Input
              type="file"
              name="files"
              multiple
              required
              accept=".pdf,.xls,.xlsx,.doc,.docx,.csv,.txt,.png,.jpg,.jpeg,.webp"
              className="h-9 flex-1 min-w-52 text-xs"
            />
            <Input
              name="notes"
              placeholder="Note (optional) — e.g. '2026 rates'"
              className="h-9 w-56 text-xs"
            />
            <SubmitButton variant="outline" size="sm">
              Upload
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">On file</CardTitle>
          <CardDescription>
            What the engine knows about how you price and how you talk.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing yet. Start with your pricing spreadsheet and a proposal
              you&apos;re proud of.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate font-medium hover:underline"
                    >
                      {f.fileName}
                    </a>
                    <span className="block truncate text-xs text-muted-foreground">
                      {KIND_LABELS[f.kind]}
                      {f.notes ? ` · ${f.notes}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {fmtSize(f.sizeBytes)}
                  </span>
                  <form action={deleteOrgKnowledgeAction}>
                    <input type="hidden" name="id" value={f.id} />
                    <SubmitButton
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground"
                    >
                      Remove
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
