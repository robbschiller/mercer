import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Camera, Landmark } from "lucide-react";
import {
  getProject,
  getProjectPreStart,
  getProjectUpdates,
  getJobFinancials,
  getJobScheduleContext,
  getAcceptedSignatureForBid,
  getPhotos,
  getExpensesForBid,
  getInvoicesForBid,
  getChangeOrdersForBid,
  getBidContactOptions,
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
  setInvoicingContactAction,
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
import { PhotosCard } from "@/components/photos-card";
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
    signature,
    photos,
    expenses,
    invoices,
    changeOrders,
    contactOptions,
  ] = await Promise.all([
    getProjectUpdates(project.id),
    project.status === "not_started"
      ? getProjectPreStart(project.id)
      : Promise.resolve(null),
    getJobFinancials(project.id),
    getJobScheduleContext(project.id),
    getAcceptedSignatureForBid(project.id),
    getPhotos("bid", project.id),
    getExpensesForBid(project.id),
    getInvoicesForBid(project.id),
    getChangeOrdersForBid(project.id),
    getBidContactOptions(project.id),
  ]);
  const startReady = preStart ? isProjectStartReady(preStart) : true;

  // Same fork ScheduleCard uses — the money panel needs the elapsed fraction
  // to place the schedule marker on the burn bar.
  const large =
    schedule.isLargeJob ??
    !(project.daysTotal != null && project.weeksTotal == null);
  const schedTotal = large ? project.weeksTotal : project.daysTotal;
  const schedCurrent = large ? project.currentWeek : project.currentDay;
  const schedulePct =
    schedTotal && schedTotal > 0 && schedCurrent != null
      ? Math.min(1, schedCurrent / schedTotal)
      : null;

  return (
    <div className="relative mx-auto w-full max-w-[1240px] px-6 pb-24 pt-7">
      <BreadcrumbLabel segment={id} label={bid.propertyName} />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/projects"
            className="mb-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            All jobs
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[27px] font-semibold leading-tight tracking-tight">
              {bid.propertyName}
            </h1>
            <Badge variant={projectStatusVariant(project.status)}>
              {projectStatusLabel(project.status)}
            </Badge>
          </div>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {bid.clientName}
            {bid.address ? ` · ${bid.address}` : ""}
          </p>
        </div>
        <a
          href="#updates"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-foreground bg-foreground px-3.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
        >
          <Camera className="size-3.5" />
          Post update
        </a>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* ── Left: delivery ── */}
        <div className="flex min-w-0 flex-col gap-5">
          <ScheduleCard
            project={project}
            schedule={schedule}
            financials={financials}
          />

          {preStart ? (
            <PreStartCard preStart={preStart} startReady={startReady} />
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
              <CardDescription>
                {STATUS_DESCRIPTIONS[project.status]}
              </CardDescription>
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
                              ? "Complete the pre-start checklist first."
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
                Entering <em>in progress</em> stamps the actual start date if
                it isn&apos;t already set; entering <em>complete</em> stamps
                the actual end date.
              </p>
            </CardContent>
          </Card>

          <UpdatesCard project={project} updates={updates} />

          <PhotosCard
            contextType="bid"
            contextId={project.id}
            returnTo={`/projects/${project.id}`}
            photos={photos}
            defaultKind="progress"
            description="The job's photo record — progress, completion walk, damage found along the way."
          />

          <DetailsCard project={project} />
        </div>

        {/* ── Right: money stack ── */}
        <div className="flex min-w-0 flex-col gap-5">
          <MoneyPanel
            financials={financials}
            project={project}
            signature={signature}
            schedulePct={schedulePct}
          />

          <InvoicesCard
            projectId={project.id}
            invoices={invoices}
            contactOptions={contactOptions}
            invoicingContactId={bid.invoicingContactId}
          />

          <ChangeOrdersCard
            projectId={project.id}
            changeOrders={changeOrders}
          />

          <BudgetCard projectId={project.id} expenses={expenses} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Opportunity context</CardTitle>
              <CardDescription>
                The accepted opportunity is the contract artifact — frozen, read-only.
                Scope changes need a new opportunity.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant={bidStatusVariant(bid.status)}>
                {bidStatusLabel(bid.status)}
              </Badge>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/opportunities/${bid.id}`}>
                  Open opportunity
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Right-rail hero: the contract, who signed it, and where the money stands. */
function MoneyPanel({
  financials,
  project,
  signature,
  schedulePct,
}: {
  financials: JobFinancials;
  project: ProjectView;
  signature: string | null;
  schedulePct: number | null;
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
  const pct =
    pctSpent == null ? null : Math.min(100, Math.round(pctSpent * 100));
  const over = remaining != null && remaining < 0;
  const schedPct =
    schedulePct == null ? null : Math.round(schedulePct * 100);
  const maxCat = Math.max(1, ...byCategory.map((c) => c.spent));

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <div className="border-b px-5 pb-4 pt-[18px]">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          <Landmark className="size-3.5" />
          Contract value
        </p>
        <p className="mt-1 font-mono text-[28px] font-medium tabular-nums tracking-tight">
          {fmtMoney(adjustedContract)}
        </p>
        {changeOrdersTotal !== 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Base {fmtMoney(contractValue)} + approved additional work{" "}
            {fmtMoney(changeOrdersTotal)}
          </p>
        )}
        {project.acceptedByName && (
          <div className="mt-3.5 flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                Accepted by
              </p>
              <p className="truncate text-[13px] font-medium">
                {project.acceptedByName}
                {project.acceptedByTitle ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {project.acceptedByTitle}
                  </span>
                ) : null}
              </p>
              {project.acceptedAt && (
                <p className="text-xs text-muted-foreground">
                  {formatDate(project.acceptedAt)}
                </p>
              )}
            </div>
            {signature && (
              <span
                className="shrink-0 font-serif text-[19px] italic leading-none text-foreground/80"
                title="Signature on the accepted proposal"
              >
                {signature}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 px-5 py-4">
        {pct != null ? (
          <div>
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                Budget burn
              </span>
              <span className="font-mono tabular-nums text-foreground/80">
                {fmtMoney(spent)}
                <span className="text-muted-foreground/70">
                  {" "}
                  / {fmtMoney(adjustedContract)} · {pct}%
                </span>
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-muted">
              <span
                className={
                  "absolute inset-y-0 left-0 rounded-full " +
                  (over
                    ? "bg-destructive"
                    : pct > (schedPct ?? 100) + 2
                      ? "bg-amber-500"
                      : "bg-foreground")
                }
                style={{ width: `${pct}%` }}
              />
              {schedPct != null && schedPct > 0 && schedPct < 100 && (
                <span
                  title={`Schedule ${schedPct}% elapsed`}
                  className="absolute -inset-y-[3px] w-[2px] rounded bg-foreground/60"
                  style={{ left: `${schedPct}%` }}
                />
              )}
            </div>
            {schedPct != null && (
              <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                Schedule marker at {schedPct}% —{" "}
                {pct > schedPct + 2
                  ? "spend is running ahead of the schedule."
                  : "spend is tracking at or under schedule pace."}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No contract value yet — it&apos;s stamped when the proposal is
            accepted.
          </p>
        )}

        <div className="grid grid-cols-3 gap-2">
          <MoneyStat label="Spent" value={fmtMoney(spent)} />
          <MoneyStat
            label={over ? "Over by" : "Remaining"}
            value={fmtMoney(remaining == null ? null : Math.abs(remaining))}
            bad={over}
          />
          <MoneyStat label="Outstanding" value={fmtMoney(outstanding)} />
        </div>
        <p className="-mt-2 text-[11.5px] text-muted-foreground">
          Invoiced {fmtMoney(invoicedTotal)} · paid {fmtMoney(paidTotal)}
        </p>

        {byCategory.length > 0 && (
          <div className="flex flex-col gap-2 border-t pt-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              Spend by category
            </p>
            {byCategory.map((c) => (
              <div key={c.category}>
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="font-medium text-foreground/80">
                    {expenseCategoryLabel(c.category)}
                  </span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {fmtMoney(c.spent)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/60"
                    style={{ width: `${Math.round((c.spent / maxCat) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MoneyStat({
  label,
  value,
  bad,
}: {
  label: string;
  value: string;
  bad?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 px-2.5 py-2">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
        {label}
      </p>
      <p
        className={
          "mt-0.5 truncate font-mono text-[15px] font-medium tabular-nums " +
          (bad ? "text-destructive" : "")
        }
      >
        {value}
      </p>
    </div>
  );
}

/** Target dates, crew assignment, internal notes. */
function DetailsCard({ project }: { project: ProjectView }) {
  return (
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
  );
}

/** Append-only progress feed with the composer on top. */
function UpdatesCard({
  project,
  updates,
}: {
  project: ProjectView;
  updates: Awaited<ReturnType<typeof getProjectUpdates>>;
}) {
  return (
    <Card id="updates" className="scroll-mt-6">
      <CardHeader>
        <CardTitle className="text-base">Job updates</CardTitle>
        <CardDescription>
          Append-only progress feed. Tick &ldquo;Visible to property
          manager&rdquo; to surface an entry on the post-acceptance status
          page; everything else stays internal.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          action={createProjectUpdateAction}
          className="flex flex-col gap-2.5 rounded-xl border bg-muted/20 p-3"
        >
          <input type="hidden" name="projectId" value={project.id} />
          <Label htmlFor="body" className="sr-only">
            Update
          </Label>
          <Textarea
            id="body"
            name="body"
            rows={3}
            placeholder="Crew arrived, prep started on the south elevation…"
            required
            className="border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between gap-3 border-t pt-2.5">
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
          <ol className="flex flex-col">
            {updates.map((u, i) => (
              <li
                key={u.id}
                className={
                  "relative py-3 pl-5 " +
                  (i < updates.length - 1
                    ? "border-l border-border ml-[5px]"
                    : "ml-[5px]")
                }
              >
                <span
                  className={
                    "absolute -left-[5px] top-[18px] size-[9px] rounded-full border-2 border-card " +
                    (u.visibleOnPublicUrl
                      ? "bg-blue-600"
                      : "bg-muted-foreground/50")
                  }
                />
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">
                    {u.authorName || "Unknown"}
                  </span>
                  <span>{formatDateTime(u.createdAt)}</span>
                  {u.visibleOnPublicUrl ? (
                    <span className="rounded-full border border-blue-600/25 bg-blue-600/10 px-2 py-px text-[10.5px] font-semibold text-blue-700 dark:text-blue-400">
                      Customer-visible
                    </span>
                  ) : (
                    <span className="rounded-full border bg-muted/60 px-2 py-px text-[10.5px] font-semibold text-muted-foreground">
                      Internal
                    </span>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                  {u.body}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
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
            can&apos;t be captured here. Link the opportunity to a property to enable
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
  expenses,
}: {
  projectId: string;
  expenses: Expense[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Expense ledger</CardTitle>
        <CardDescription>
          Every dollar going out on this job. Entries feed the burn bar and
          category breakdown above in real time.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
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
      {/* Customer-facing language is "additional work" — AQP does not do
          change orders (Jordan, AQP notes §7c). Table/enum names unchanged. */}
      <CardHeader>
        <CardTitle className="text-base">Additional work</CardTitle>
        <CardDescription>
          Signed scope additions (positive adds to the contract, negative
          credits). Approved additional work adjusts the budget baseline
          above.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3 rounded-md border border-primary/20 bg-primary/[0.03] p-3">
          <p className="text-sm text-muted-foreground">
            Found more scope on site? Draft an additional-work quote with the
            engine — describe it, review the lines, send a fresh version. When
            the customer accepts, the contract value updates to the new total.
          </p>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link href={`/opportunities/${projectId}`}>Draft with AI</Link>
          </Button>
        </div>
        <form
          action={createChangeOrderAction}
          className="grid gap-3 rounded-md border p-3"
        >
          <input type="hidden" name="bidId" value={projectId} />
          <p className="text-sm font-medium">Add additional work</p>
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
            <SubmitButton size="sm">Add additional work</SubmitButton>
          </div>
        </form>

        {changeOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No additional work recorded.
          </p>
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
  contactOptions,
  invoicingContactId,
}: {
  projectId: string;
  invoices: Invoice[];
  contactOptions: { id: string; name: string; title: string | null }[];
  invoicingContactId: string | null;
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
        {/* AQP §7: invoicing contact, so AP knows who to bill. */}
        {contactOptions.length > 0 && (
          <form
            action={setInvoicingContactAction}
            className="flex flex-wrap items-end gap-2"
          >
            <input type="hidden" name="bidId" value={projectId} />
            <div className="grid min-w-52 flex-1 gap-1.5">
              <Label htmlFor="inv-contact">Invoicing contact</Label>
              <select
                id="inv-contact"
                name="contactId"
                defaultValue={invoicingContactId ?? ""}
                className={SELECT_CLASS}
              >
                <option value="">— Not set —</option>
                {contactOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.title ? ` — ${c.title}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <SubmitButton size="sm" variant="outline">
              Save
            </SubmitButton>
          </form>
        )}

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
