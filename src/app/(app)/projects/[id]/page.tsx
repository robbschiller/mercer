import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProject,
  getProjectPreStart,
  getProjectUpdates,
  getJobFinancials,
  getJobScheduleContext,
  getExpensesForBid,
  getInvoicesForBid,
  getChangeOrdersForBid,
  allowedProjectStatusTransitions,
  isProjectStartReady,
  type ProjectStatus,
  type ProjectView,
  type JobFinancials,
  type JobScheduleContext,
  type Expense,
  type Invoice,
  type ChangeOrder,
} from "@/lib/store";
import {
  updateProjectStatusAction,
  updateProjectDetailsAction,
  updateJobScheduleAction,
  createProjectUpdateAction,
  setProjectNtoAction,
  createExpenseAction,
  deleteExpenseAction,
  createInvoiceAction,
  setInvoiceStatusAction,
  deleteInvoiceAction,
  createChangeOrderAction,
  setChangeOrderStatusAction,
  deleteChangeOrderAction,
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
  INVOICE_TYPES,
  INVOICE_STATUSES,
  invoiceTypeLabel,
  invoiceStatusLabel,
  invoiceStatusVariant,
  CHANGE_ORDER_REASONS,
  changeOrderReasonLabel,
  changeOrderStatusLabel,
  changeOrderStatusVariant,
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
  warranty_watch:
    "Done, under warranty monitoring. A warranty claim reopens the job; the actual end date stands until then.",
  on_hold:
    "Paused (weather, owner, sub availability). Resume by moving back to in progress.",
};

const TRANSITION_LABELS: Record<ProjectStatus, string> = {
  not_started: "Reset to not started",
  in_progress: "Move to in progress",
  punch_out: "Move to punch out",
  complete: "Mark complete",
  warranty_watch: "Move to warranty watch",
  on_hold: "Put on hold",
};

function transitionLabel(
  current: ProjectStatus,
  next: ProjectStatus
): string {
  if (current === "complete" || current === "warranty_watch") {
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
  const [
    updates,
    preStart,
    financials,
    schedule,
    expenses,
    invoices,
    changeOrders,
  ] = await Promise.all([
    getProjectUpdates(project.id),
    project.status === "not_started"
      ? getProjectPreStart(project.id)
      : Promise.resolve(null),
    getJobFinancials(project.id),
    getJobScheduleContext(project.id),
    getExpensesForBid(project.id),
    getInvoicesForBid(project.id),
    getChangeOrdersForBid(project.id),
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

      <ScheduleCard
        project={project}
        schedule={schedule}
        financials={financials}
      />

      <BudgetCard
        projectId={project.id}
        financials={financials}
        expenses={expenses}
      />

      <ChangeOrdersCard projectId={project.id} changeOrders={changeOrders} />

      <InvoicesCard projectId={project.id} invoices={invoices} />

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

function ScheduleCard({
  project,
  schedule,
  financials,
}: {
  project: ProjectView;
  schedule: JobScheduleContext;
  financials: JobFinancials;
}) {
  // Fork on the lead's large/small flag; without a lead, infer from which
  // track has data (day strip set and weeks not → small), defaulting large.
  const large =
    schedule.isLargeJob ??
    !(project.daysTotal != null && project.weeksTotal == null);

  const totalUnits = large ? project.weeksTotal : project.daysTotal;
  const currentUnit = large ? project.currentWeek : project.currentDay;
  const schedulePct =
    totalUnits && totalUnits > 0 && currentUnit != null
      ? Math.min(1, currentUnit / totalUnits)
      : null;
  const buildingsTotal = schedule.buildingsTotal;
  const buildingsPct =
    buildingsTotal > 0 && project.buildingsDone != null
      ? Math.min(1, project.buildingsDone / buildingsTotal)
      : null;

  // Burn-rate alert: dollars are going out faster than the schedule is
  // elapsing. 10-point grace before flagging.
  const burnGap =
    financials.pctSpent != null && schedulePct != null
      ? financials.pctSpent - schedulePct
      : null;
  const burnHot = burnGap != null && burnGap > 0.1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Schedule</CardTitle>
        <CardDescription>
          {large
            ? "Week-by-week progress against the plan, with buildings knocked down as crews finish them."
            : "Day-by-day progress for a short job."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {burnHot && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
            Burn rate ahead of schedule:{" "}
            {Math.round((financials.pctSpent ?? 0) * 100)}% of budget spent vs{" "}
            {Math.round((schedulePct ?? 0) * 100)}% of schedule elapsed.
          </div>
        )}

        {schedulePct != null ? (
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>
                {large
                  ? `Week ${currentUnit} of ${totalUnits}`
                  : `Day ${currentUnit} of ${totalUnits}`}
              </span>
              <span className="tabular-nums">
                {Math.round(schedulePct * 100)}% elapsed
              </span>
            </div>
            {large ? (
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round(schedulePct * 100)}%` }}
                />
              </div>
            ) : (
              <div className="flex gap-1">
                {Array.from({ length: totalUnits ?? 0 }, (_, i) => (
                  <div
                    key={i}
                    className={
                      "h-2 flex-1 rounded-sm " +
                      (i < (currentUnit ?? 0) ? "bg-primary" : "bg-muted")
                    }
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No schedule set yet — fill in the plan below to track pace.
          </p>
        )}

        {large && buildingsPct != null && (
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>
                {project.buildingsDone} of {buildingsTotal} buildings done
              </span>
              <span className="tabular-nums">
                {Math.round(buildingsPct * 100)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.round(buildingsPct * 100)}%` }}
              />
            </div>
          </div>
        )}

        <form
          action={updateJobScheduleAction}
          className="flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="id" value={project.id} />
          {large ? (
            <>
              {/* Preserve the other track's values — absent fields null out. */}
              <input
                type="hidden"
                name="daysTotal"
                value={project.daysTotal ?? ""}
              />
              <input
                type="hidden"
                name="currentDay"
                value={project.currentDay ?? ""}
              />
              <ScheduleField
                label="Weeks planned"
                name="weeksTotal"
                defaultValue={project.weeksTotal}
              />
              <ScheduleField
                label="Current week"
                name="currentWeek"
                defaultValue={project.currentWeek}
              />
              <ScheduleField
                label="Buildings done"
                name="buildingsDone"
                defaultValue={project.buildingsDone}
                max={buildingsTotal > 0 ? buildingsTotal : undefined}
              />
            </>
          ) : (
            <>
              <input
                type="hidden"
                name="weeksTotal"
                value={project.weeksTotal ?? ""}
              />
              <input
                type="hidden"
                name="currentWeek"
                value={project.currentWeek ?? ""}
              />
              <input
                type="hidden"
                name="buildingsDone"
                value={project.buildingsDone ?? ""}
              />
              <ScheduleField
                label="Days planned"
                name="daysTotal"
                defaultValue={project.daysTotal}
              />
              <ScheduleField
                label="Current day"
                name="currentDay"
                defaultValue={project.currentDay}
              />
            </>
          )}
          <SubmitButton variant="outline" size="sm">
            Save schedule
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

function ScheduleField({
  label,
  name,
  defaultValue,
  max,
}: {
  label: string;
  name: string;
  defaultValue: number | null;
  max?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={`schedule-${name}`} className="text-xs">
        {label}
      </Label>
      <Input
        id={`schedule-${name}`}
        name={name}
        type="number"
        min={0}
        max={max}
        defaultValue={defaultValue ?? ""}
        className="h-8 w-28"
      />
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
  const {
    contractValue,
    changeOrdersTotal,
    adjustedContract,
    spent,
    remaining,
    pctSpent,
    byCategory,
    invoicedTotal,
    paidTotal,
    outstanding,
  } = financials;
  const pct = pctSpent == null ? null : Math.min(100, Math.round(pctSpent * 100));
  const over = remaining != null && remaining < 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Budget</CardTitle>
        <CardDescription>
          Real-time spend against the contract baseline. Contract value is
          snapshotted from the accepted proposal; approved change orders adjust
          it; spent, remaining, and billing derive live.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Contract" value={fmtMoney(adjustedContract)} />
          <Stat label="Spent" value={fmtMoney(spent)} />
          <Stat
            label={over ? "Over by" : "Remaining"}
            value={fmtMoney(remaining == null ? null : Math.abs(remaining))}
            tone={over ? "bad" : undefined}
          />
        </div>

        {changeOrdersTotal !== 0 && (
          <p className="-mt-2 text-xs text-muted-foreground">
            Base {fmtMoney(contractValue)} + approved change orders{" "}
            {fmtMoney(changeOrdersTotal)} = {fmtMoney(adjustedContract)}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Invoiced" value={fmtMoney(invoicedTotal)} />
          <Stat label="Paid" value={fmtMoney(paidTotal)} />
          <Stat label="Outstanding" value={fmtMoney(outstanding)} />
        </div>

        {pct != null ? (
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>{pct}% of contract spent</span>
              <span className="tabular-nums">
                {fmtMoney(spent)} / {fmtMoney(adjustedContract)}
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

function fmtSigned(n: number): string {
  const s = money.format(Math.abs(n));
  return n < 0 ? `−${s}` : `+${s}`;
}

function ChangeOrdersCard({
  projectId,
  changeOrders,
}: {
  projectId: string;
  changeOrders: ChangeOrder[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change orders</CardTitle>
        <CardDescription>
          Signed scope adjustments (positive adds to the contract, negative
          credits). Approved change orders adjust the budget baseline above.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          action={createChangeOrderAction}
          className="grid gap-3 rounded-md border p-3"
        >
          <input type="hidden" name="bidId" value={projectId} />
          <p className="text-sm font-medium">Add change order</p>
          <div className="grid gap-1.5">
            <Label htmlFor="co-desc">Description</Label>
            <Input
              id="co-desc"
              name="description"
              placeholder="Added stucco repair, building 4"
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="co-amount">Amount (− for credit)</Label>
              <Input
                id="co-amount"
                name="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="co-reason">Reason</Label>
              <select
                id="co-reason"
                name="reason"
                defaultValue=""
                className={SELECT_CLASS}
              >
                <option value="">—</option>
                {CHANGE_ORDER_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {changeOrderReasonLabel(r)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="co-detail">Detail</Label>
            <Input id="co-detail" name="detail" placeholder="Optional note" />
          </div>
          <div>
            <SubmitButton size="sm">Add change order</SubmitButton>
          </div>
        </form>

        {changeOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No change orders.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {changeOrders.map((co) => {
              const amount = Number(co.amount);
              return (
                <li key={co.id} className="flex flex-col gap-2 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {co.number ? `${co.number} · ` : ""}
                        {co.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {co.reason ? changeOrderReasonLabel(co.reason) : "—"}
                        {co.detail ? ` · ${co.detail}` : ""}
                      </p>
                    </div>
                    <span
                      className={
                        "shrink-0 tabular-nums text-sm font-medium " +
                        (amount < 0 ? "text-destructive" : "text-emerald-600")
                      }
                    >
                      {fmtSigned(amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={changeOrderStatusVariant(co.status)}>
                      {changeOrderStatusLabel(co.status)}
                    </Badge>
                    <div className="flex flex-wrap gap-1.5">
                      {co.status !== "approved" && (
                        <StatusButton
                          action={setChangeOrderStatusAction}
                          id={co.id}
                          bidId={projectId}
                          status="approved"
                          label="Approve"
                        />
                      )}
                      {co.status !== "denied" && (
                        <StatusButton
                          action={setChangeOrderStatusAction}
                          id={co.id}
                          bidId={projectId}
                          status="denied"
                          label="Deny"
                        />
                      )}
                      <DeleteButton
                        action={deleteChangeOrderAction}
                        id={co.id}
                        bidId={projectId}
                        label="Delete"
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function InvoicesCard({
  projectId,
  invoices,
}: {
  projectId: string;
  invoices: Invoice[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invoices &amp; draws</CardTitle>
        <CardDescription>
          Customer billing — draws on milestones for large jobs, deposit + final
          for small. Marking paid feeds the billing totals above.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          action={createInvoiceAction}
          className="grid gap-3 rounded-md border p-3"
        >
          <input type="hidden" name="bidId" value={projectId} />
          <p className="text-sm font-medium">Add invoice</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="inv-type">Type</Label>
              <select
                id="inv-type"
                name="type"
                defaultValue="draw"
                className={SELECT_CLASS}
              >
                {INVOICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {invoiceTypeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-amount">Amount</Label>
              <Input
                id="inv-amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-seq">Sequence</Label>
              <Input
                id="inv-seq"
                name="sequence"
                type="number"
                min="1"
                placeholder="e.g. 1"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-due">Due date</Label>
              <Input id="inv-due" name="dueAt" type="date" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="inv-trigger">Trigger</Label>
            <Input
              id="inv-trigger"
              name="trigger"
              placeholder="Building 4 complete"
            />
          </div>
          <div>
            <SubmitButton size="sm">Add invoice</SubmitButton>
          </div>
        </form>

        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex flex-col gap-2 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {invoiceTypeLabel(inv.type)}
                      {inv.sequence != null ? ` #${inv.sequence}` : ""}
                      {inv.number ? ` · ${inv.number}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.trigger ? `${inv.trigger} · ` : ""}
                      {inv.dueAt ? `due ${formatDate(inv.dueAt)}` : "no due date"}
                      {inv.paidAt ? ` · paid ${formatDate(inv.paidAt)}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums text-sm font-medium">
                    {fmtMoney(Number(inv.amount))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={invoiceStatusVariant(inv.status)}>
                    {invoiceStatusLabel(inv.status)}
                  </Badge>
                  <div className="flex flex-wrap gap-1.5">
                    {INVOICE_STATUSES.filter((s) => s !== inv.status).map(
                      (s) => (
                        <StatusButton
                          key={s}
                          action={setInvoiceStatusAction}
                          id={inv.id}
                          bidId={projectId}
                          status={s}
                          label={invoiceStatusLabel(s)}
                        />
                      ),
                    )}
                    <DeleteButton
                      action={deleteInvoiceAction}
                      id={inv.id}
                      bidId={projectId}
                      label="Delete"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function StatusButton({
  action,
  id,
  bidId,
  status,
  label,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  bidId: string;
  status: string;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="bidId" value={bidId} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className="rounded-full border px-2 py-0.5 text-[0.6875rem] text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        {label}
      </button>
    </form>
  );
}

function DeleteButton({
  action,
  id,
  bidId,
  label,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  bidId: string;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="bidId" value={bidId} />
      <button
        type="submit"
        className="rounded-full border border-transparent px-2 py-0.5 text-[0.6875rem] text-muted-foreground hover:text-destructive"
      >
        {label}
      </button>
    </form>
  );
}
