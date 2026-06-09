import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProject,
  getProjectPreStart,
  getProjectUpdates,
  getJobFinancials,
  getExpensesForBid,
  allowedProjectStatusTransitions,
  isProjectStartReady,
  type ProjectStatus,
  type JobFinancials,
  type Expense,
} from "@/lib/store";
import {
  updateProjectStatusAction,
  updateProjectDetailsAction,
  createProjectUpdateAction,
  setProjectNtoAction,
  createExpenseAction,
  deleteExpenseAction,
} from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { BreadcrumbLabel } from "@/components/breadcrumb-label";
import {
  bidStatusLabel,
  bidStatusVariant,
  projectStatusLabel,
  projectStatusVariant,
  expenseCategoryLabel,
  paymentTypeLabel,
  EXPENSE_CATEGORIES,
  PAYMENT_TYPES,
} from "@/lib/status-meta";
import type { ProjectPreStart } from "@/lib/store";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
function fmtMoney(n: number | null): string {
  return n == null ? "—" : money.format(n);
}

const STATUS_DESCRIPTIONS: Record<ProjectStatus, string> = {
  not_started:
    "Awaiting kickoff. Pick a target start and assign a sub when you have one.",
  in_progress:
    "Crew is on site. Move to punch out when remaining items are walk-list only.",
  punch_out:
    "Closing out — final walks and remaining items. Mark complete when done.",
  complete:
    "Wrapped. Reopen to punch out or in progress if items resurface — the actual end date will clear and re-stamp on the next complete.",
  on_hold:
    "Paused (weather, owner, sub availability). Resume by moving back to in progress.",
};

const TRANSITION_LABELS: Record<ProjectStatus, string> = {
  not_started: "Reset to not started",
  in_progress: "Move to in progress",
  punch_out: "Move to punch out",
  complete: "Mark complete",
  on_hold: "Put on hold",
};

function transitionLabel(
  current: ProjectStatus,
  next: ProjectStatus
): string {
  if (current === "complete") {
    if (next === "punch_out") return "Reopen to punch out";
    if (next === "in_progress") return "Reopen to in progress";
  }
  return TRANSITION_LABELS[next];
}

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString();
}

function formatDateTime(value: Date | string | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const data = await getProject(id);
  if (!data) notFound();

  const { project, bid } = data;
  const transitions = allowedProjectStatusTransitions(project.status);
  const [updates, preStart, financials, expenses] = await Promise.all([
    getProjectUpdates(project.id),
    project.status === "not_started" ? getProjectPreStart(project.id) : Promise.resolve(null),
    getJobFinancials(project.id),
    getExpensesForBid(project.id),
  ]);
  const startReady = preStart ? isProjectStartReady(preStart) : true;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 flex flex-col gap-6">
      <BreadcrumbLabel segment={id} label={bid.propertyName} />
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/bids/${bid.id}`}>&larr; Back to bid</Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Project
          </p>
          <h1 className="text-3xl font-medium tracking-tight">
            {bid.propertyName}
          </h1>
          {bid.address && (
            <p className="text-sm text-muted-foreground">{bid.address}</p>
          )}
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <Badge variant={projectStatusVariant(project.status)}>
            {projectStatusLabel(project.status)}
          </Badge>
          {project.acceptedByName && (
            <p className="text-xs text-muted-foreground">
              Accepted by {project.acceptedByName}
              {project.acceptedByTitle ? `, ${project.acceptedByTitle}` : ""}
              {project.acceptedAt
                ? ` on ${formatDate(project.acceptedAt)}`
                : ""}
            </p>
          )}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bid context</CardTitle>
          <CardDescription>
            The accepted bid is the contract artifact — frozen, read-only.
            Scope changes need a new bid.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Client</p>
            <p>{bid.clientName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Bid status</p>
            <Badge variant={bidStatusVariant(bid.status)}>
              {bidStatusLabel(bid.status)}
            </Badge>
          </div>
          <div className="sm:col-span-2 pt-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/bids/${bid.id}`}>Open bid</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <BudgetCard
        projectId={project.id}
        financials={financials}
        expenses={expenses}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
          <CardDescription>{STATUS_DESCRIPTIONS[project.status]}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {transitions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No further transitions available from this state.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {transitions.map((next) => {
                const gated = next === "in_progress" && !startReady;
                return (
                  <form key={next} action={updateProjectStatusAction}>
                    <input type="hidden" name="id" value={project.id} />
                    <input type="hidden" name="status" value={next} />
                    <SubmitButton
                      variant="outline"
                      size="sm"
                      disabled={gated}
                      title={
                        gated
                          ? "Complete the pre-start checklist below first."
                          : undefined
                      }
                    >
                      {transitionLabel(project.status, next)}
                    </SubmitButton>
                  </form>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Entering <em>in progress</em> stamps the actual start date if it
            isn&apos;t already set; entering <em>complete</em> stamps the
            actual end date.
          </p>
        </CardContent>
      </Card>

      {preStart ? (
        <PreStartCard preStart={preStart} startReady={startReady} />
      ) : null}

      <Card>
        <form action={updateProjectDetailsAction}>
          <input type="hidden" name="id" value={project.id} />
          <CardHeader>
            <CardTitle className="text-base">Project details</CardTitle>
            <CardDescription>
              Schedule, assignment, and contractor-only notes. Updates here
              never appear on the customer&apos;s proposal URL.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="targetStartDate">Target start</Label>
                <Input
                  id="targetStartDate"
                  name="targetStartDate"
                  type="date"
                  defaultValue={project.targetStartDate ?? ""}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="targetEndDate">Target end</Label>
                <Input
                  id="targetEndDate"
                  name="targetEndDate"
                  type="date"
                  defaultValue={project.targetEndDate ?? ""}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Actual start</p>
                <p>{formatDateTime(project.actualStartDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Actual end</p>
                <p>{formatDateTime(project.actualEndDate)}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="assignedSub">Assigned sub</Label>
                <Input
                  id="assignedSub"
                  name="assignedSub"
                  defaultValue={project.assignedSub ?? ""}
                  placeholder="e.g. Dante Painting"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="crewLeadName">Crew lead</Label>
                <Input
                  id="crewLeadName"
                  name="crewLeadName"
                  defaultValue={project.crewLeadName ?? ""}
                  placeholder="On-site point of contact"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={4}
                defaultValue={project.notes}
                placeholder="Internal notes, kickoff plan, gotchas…"
              />
            </div>

            <div>
              <SubmitButton>Save changes</SubmitButton>
            </div>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project updates</CardTitle>
          <CardDescription>
            Append-only progress feed. Tick &ldquo;Visible to property
            manager&rdquo; to surface a single entry on the post-acceptance
            status page; everything else stays internal.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form
            action={createProjectUpdateAction}
            className="flex flex-col gap-3"
          >
            <input type="hidden" name="projectId" value={project.id} />
            <div className="grid gap-1.5">
              <Label htmlFor="body" className="sr-only">
                Update
              </Label>
              <Textarea
                id="body"
                name="body"
                rows={3}
                placeholder="Crew arrived, prep started on the south elevation…"
                required
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  name="visibleOnPublicUrl"
                  className="size-4 rounded border-input"
                />
                <span>Visible to property manager</span>
              </label>
              <SubmitButton size="sm">Post update</SubmitButton>
            </div>
          </form>

          {updates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No updates yet. The first one shows up here.
            </p>
          ) : (
            <ol className="flex flex-col gap-3">
              {updates.map((u) => (
                <li
                  key={u.id}
                  className="rounded-md border border-border bg-card/50 p-3"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {u.authorName || "Unknown"}
                      {" · "}
                      {formatDateTime(u.createdAt)}
                    </span>
                    {u.visibleOnPublicUrl ? (
                      <Badge variant="outline">Visible publicly</Badge>
                    ) : (
                      <span className="text-muted-foreground/70">Internal</span>
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm">
                    {u.body}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PreStartCard({
  preStart,
  startReady,
}: {
  preStart: ProjectPreStart;
  startReady: boolean;
}) {
  const { nto, ownerContact, propertyContactOptions, bidId, propertyId } =
    preStart;

  if (!propertyId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pre-start checklist</CardTitle>
          <CardDescription>
            This project isn&apos;t attached to a property, so Notice to Owner
            can&apos;t be captured here. Link the bid to a property to enable
            the checklist.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span>Pre-start checklist</span>
          {startReady ? (
            <Badge variant="default">Ready to start</Badge>
          ) : (
            <Badge variant="outline">Required before start</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Notice to Owner must reach the legal owner, not the management
          company — serving the manager forfeits lien rights. Capture this
          before crews mobilize.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={setProjectNtoAction} className="flex flex-col gap-4">
          <input type="hidden" name="bidId" value={bidId} />
          <div className="grid gap-1.5">
            <Label htmlFor="legalOwnerName">Legal owner</Label>
            <Input
              id="legalOwnerName"
              name="legalOwnerName"
              placeholder="e.g. Pura Vita Owner LLC"
              defaultValue={nto.legalOwnerName ?? ""}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="legalOwnerAddress">Owner address</Label>
            <Input
              id="legalOwnerAddress"
              name="legalOwnerAddress"
              placeholder="Mailing address for legal notices"
              defaultValue={nto.legalOwnerAddress ?? ""}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ntoContactId">NTO recipient contact</Label>
            <select
              id="ntoContactId"
              name="ntoContactId"
              defaultValue={nto.contact?.id ?? ownerContact?.id ?? ""}
              required
              disabled={propertyContactOptions.length === 0}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="" disabled>
                — Pick a contact —
              </option>
              {propertyContactOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {propertyContactOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No contacts linked to this property. Add one from the
                property page first.
              </p>
            ) : ownerContact ? (
              <p className="text-xs text-muted-foreground">
                Defaulted to the owner contact{" "}
                <span className="font-medium">{ownerContact.name}</span>. Pick
                someone else if a different person at the owner should be
                served.
              </p>
            ) : null}
          </div>
          <SubmitButton size="sm" className="self-start">
            Save checklist
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "bad";
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          "text-lg font-semibold tabular-nums " +
          (tone === "bad" ? "text-destructive" : "")
        }
      >
        {value}
      </p>
    </div>
  );
}

function BudgetCard({
  projectId,
  financials,
  expenses,
}: {
  projectId: string;
  financials: JobFinancials;
  expenses: Expense[];
}) {
  const { contractValue, spent, remaining, pctSpent, byCategory } = financials;
  const pct = pctSpent == null ? null : Math.min(100, Math.round(pctSpent * 100));
  const over = remaining != null && remaining < 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Budget</CardTitle>
        <CardDescription>
          Real-time spend against the contract baseline. Contract value is
          snapshotted from the accepted proposal; spent, remaining, and profit
          derive live from dated expenses.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Contract" value={fmtMoney(contractValue)} />
          <Stat label="Spent" value={fmtMoney(spent)} />
          <Stat
            label={over ? "Over by" : "Remaining"}
            value={fmtMoney(remaining == null ? null : Math.abs(remaining))}
            tone={over ? "bad" : undefined}
          />
        </div>

        {pct != null ? (
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>{pct}% of contract spent</span>
              <span className="tabular-nums">
                {fmtMoney(spent)} / {fmtMoney(contractValue)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={
                  "h-full rounded-full " + (over ? "bg-destructive" : "bg-primary")
                }
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No contract value yet — it&apos;s stamped when the proposal is
            accepted.
          </p>
        )}

        {byCategory.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Spent by category
            </p>
            {byCategory.map((c) => (
              <div
                key={c.category}
                className="flex justify-between text-sm"
              >
                <span>{expenseCategoryLabel(c.category)}</span>
                <span className="tabular-nums">{fmtMoney(c.spent)}</span>
              </div>
            ))}
          </div>
        )}

        <form
          action={createExpenseAction}
          className="grid gap-3 rounded-md border p-3"
        >
          <input type="hidden" name="bidId" value={projectId} />
          <p className="text-sm font-medium">Add expense</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="exp-date">Date</Label>
              <Input id="exp-date" name="date" type="date" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-amount">Amount</Label>
              <Input
                id="exp-amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-category">Category</Label>
              <select
                id="exp-category"
                name="category"
                required
                defaultValue=""
                className={SELECT_CLASS}
              >
                <option value="" disabled>
                  — Pick —
                </option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {expenseCategoryLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-payment">Payment</Label>
              <select
                id="exp-payment"
                name="paymentType"
                defaultValue=""
                className={SELECT_CLASS}
              >
                <option value="">—</option>
                {PAYMENT_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {paymentTypeLabel(p)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-vendor">Vendor</Label>
              <Input
                id="exp-vendor"
                name="vendor"
                placeholder="Sherwin Williams"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-tax">Tax</Label>
              <Input
                id="exp-tax"
                name="tax"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="exp-desc">Description</Label>
            <Input
              id="exp-desc"
              name="description"
              placeholder="Optional note"
            />
          </div>
          <div>
            <SubmitButton size="sm">Add expense</SubmitButton>
          </div>
        </form>

        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No expenses logged yet.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">Ledger</p>
            <ul className="flex flex-col divide-y">
              {expenses.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate">
                      {e.vendor || expenseCategoryLabel(e.category)}
                      <span className="text-muted-foreground">
                        {" · "}
                        {expenseCategoryLabel(e.category)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(e.date)}
                      {e.paymentType ? ` · ${paymentTypeLabel(e.paymentType)}` : ""}
                      {e.description ? ` · ${e.description}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums">
                      {fmtMoney(Number(e.amount) + Number(e.tax))}
                    </span>
                    <form action={deleteExpenseAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="bidId" value={projectId} />
                      <button
                        type="submit"
                        aria-label="Delete expense"
                        className="rounded p-1 text-xs text-muted-foreground hover:text-destructive"
                      >
                        ✕
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
