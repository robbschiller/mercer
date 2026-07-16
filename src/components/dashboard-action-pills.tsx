"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  CircleAlert,
  ClipboardList,
  Loader2,
  Phone,
  Target,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DashboardIntent } from "@/lib/dashboard-intent";
import {
  quickAddContact,
  quickCreateLead,
  quickLogCall,
  quickSetFollowUp,
  type QuickResult,
} from "@/lib/actions/dashboard-quick-actions";
import type { OverdueFollowUp } from "@/lib/store";

type FieldDef =
  | { kind: "input"; label: string; placeholder?: string; type?: string }
  | { kind: "textarea"; label: string; placeholder?: string }
  | { kind: "select"; label: string; options: string[] };

type FormAction = {
  kind: "form";
  title: string;
  description: string;
  cta: string;
  success: { title: string; sub: string };
  fields: FieldDef[];
};

type OverdueAction = {
  kind: "overdue";
  title: string;
  description: string;
};

type ActionDef = FormAction | OverdueAction;

type ActionKey =
  | "add-contact"
  | "create-lead"
  | "log-call"
  | "set-follow-up"
  | "start-draft-bid"
  | "show-overdue";

// Form actions submit to the result-returning quick actions in
// dashboard-quick-actions.ts (add-contact / create-lead / log-call /
// set-follow-up). "start-draft-bid" routes into the full /bids/new wizard
// (a bid needs a client + property name the composer doesn't collect).
// "show-overdue" renders real overdue follow-ups passed in via the `overdue`
// prop (getOverdueFollowUps).
const ACTIONS: Record<ActionKey, ActionDef> = {
  "add-contact": {
    kind: "form",
    title: "Add contact",
    description: "Create a new person or company",
    cta: "Save contact",
    success: { title: "Contact added", sub: "It's now in your contacts." },
    fields: [
      { kind: "input", label: "Full name", placeholder: "Sarah Chen" },
      { kind: "input", label: "Company", placeholder: "Highmark Properties" },
      {
        kind: "input",
        label: "Email",
        placeholder: "sarah@highmark.com",
        type: "email",
      },
      {
        kind: "input",
        label: "Phone",
        placeholder: "(555) 012-3456",
        type: "tel",
      },
    ],
  },
  "create-lead": {
    kind: "form",
    title: "Create lead",
    description: "Log a new opportunity",
    cta: "Create lead",
    success: { title: "Lead created", sub: "Added to your pipeline as New." },
    fields: [
      {
        kind: "input",
        label: "Property address",
        placeholder: "57 Halsey St, Apt 1",
      },
      { kind: "input", label: "Primary contact", placeholder: "Sarah Chen" },
      {
        kind: "select",
        label: "Source",
        options: [
          "Referral",
          "Trade show",
          "Cold call",
          "Website",
          "Repeat client",
        ],
      },
    ],
  },
  "log-call": {
    kind: "form",
    title: "Log call",
    description: "Record an outreach",
    cta: "Log call",
    success: { title: "Call logged", sub: "Saved to the contact's timeline." },
    fields: [
      { kind: "input", label: "Contact", placeholder: "Sarah Chen" },
      {
        kind: "select",
        label: "Outcome",
        options: [
          "Connected",
          "Left voicemail",
          "No answer",
          "Scheduled meeting",
        ],
      },
      {
        kind: "textarea",
        label: "Notes",
        placeholder: "What did you discuss?",
      },
    ],
  },
  "set-follow-up": {
    kind: "form",
    title: "Set follow-up",
    description: "Schedule a reminder",
    cta: "Set reminder",
    success: {
      title: "Reminder set",
      sub: "We'll surface it on the due date.",
    },
    fields: [
      { kind: "input", label: "About", placeholder: "Sarah at Greystar" },
      { kind: "input", label: "Due date", type: "date" },
      {
        kind: "textarea",
        label: "Note",
        placeholder: "Send the revised proposal",
      },
    ],
  },
  "start-draft-bid": {
    kind: "form",
    title: "Start draft opportunity",
    description: "Begin a new proposal",
    cta: "Start opportunity",
    success: {
      title: "Draft opportunity started",
      sub: "Opening the opportunity editor next.",
    },
    fields: [
      {
        kind: "input",
        label: "Property address",
        placeholder: "57 Halsey St, Apt 1",
      },
      {
        kind: "input",
        label: "Scope summary",
        placeholder: "Full exterior repaint",
      },
      {
        kind: "select",
        label: "Source tag",
        options: ["57 Halsey St, Apt 1", "New property"],
      },
    ],
  },
  "show-overdue": {
    kind: "overdue",
    title: "Overdue follow-ups",
    description: "Open leads past their reminder date",
  },
};

const PILLS: { key: ActionKey; label: string; icon: LucideIcon }[] = [
  { key: "add-contact", label: "Add contact", icon: UserPlus },
  { key: "create-lead", label: "Create lead", icon: Target },
  { key: "log-call", label: "Log call", icon: Phone },
  { key: "set-follow-up", label: "Set follow-up", icon: CalendarClock },
  { key: "start-draft-bid", label: "Start draft opportunity", icon: ClipboardList },
  { key: "show-overdue", label: "Show overdue", icon: CircleAlert },
];

const FORM_ID = "dashboard-action-form";

type Prefill = Partial<Record<string, string>>;

function prefillFromIntent(intent: DashboardIntent): Prefill {
  switch (intent.kind) {
    case "add-contact":
      return {
        "Full name": intent.name ?? "",
        Company: intent.company ?? "",
        Email: intent.email ?? "",
        Phone: intent.phone ?? "",
      };
    case "create-lead":
      return {
        "Property address": intent.propertyAddress ?? "",
        "Primary contact": intent.primaryContact ?? "",
        Source: intent.source ?? "",
      };
    case "log-call":
      return {
        Contact: intent.contact ?? "",
        Outcome: intent.outcome ?? "",
        Notes: intent.notes ?? "",
      };
    case "set-follow-up":
      return {
        About: intent.about ?? "",
        "Due date": intent.dueDate ?? "",
        Note: intent.note ?? "",
      };
    case "start-draft-bid":
      return {
        "Property address": intent.propertyAddress ?? "",
        "Scope summary": intent.scopeSummary ?? "",
        "Source tag": intent.sourceTag ?? "",
      };
    default:
      return {};
  }
}

// Format an ISO YYYY-MM-DD as "Jun 3" without going through Date (avoids the
// UTC-vs-local off-by-one a date-only string is prone to).
function formatDueDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[m - 1]} ${d}`;
}

export function DashboardActionPills({
  overdue = [],
}: {
  overdue?: OverdueFollowUp[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState<ActionKey | null>(null);
  const [values, setValues] = useState<Prefill>({});
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "success" } | { kind: "error"; text: string }
  >({ kind: "idle" });
  const [submitting, startSubmit] = useTransition();

  function close() {
    setOpen(null);
    setStatus({ kind: "idle" });
    setValues({});
  }

  function openManual(key: ActionKey) {
    setStatus({ kind: "idle" });
    setValues({});
    setOpen(key);
  }

  function setField(label: string, value: string) {
    setValues((v) => ({ ...v, [label]: value }));
  }

  // Listen for parsed intents from the dashboard composer (Claude API). The
  // hero component dispatches a "dashboard:intent" CustomEvent with the
  // intent payload; we open the matching sheet and pre-fill what we know.
  useEffect(() => {
    function onIntent(e: Event) {
      const ce = e as CustomEvent<DashboardIntent>;
      const intent = ce.detail;
      if (intent.kind === "unknown") return;
      setStatus({ kind: "idle" });
      setValues(prefillFromIntent(intent));
      setOpen(intent.kind);
    }
    window.addEventListener("dashboard:intent", onIntent);
    return () => window.removeEventListener("dashboard:intent", onIntent);
  }, []);

  function handleSubmit() {
    if (!open || open === "show-overdue") return;

    // A bid needs a client + property name the composer doesn't collect —
    // route into the full wizard instead of a partial one-shot create.
    if (open === "start-draft-bid") {
      close();
      router.push("/opportunities/new");
      return;
    }

    const v = (label: string) => (values[label] ?? "").trim();

    startSubmit(async () => {
      let res: QuickResult;
      switch (open) {
        case "add-contact":
          res = await quickAddContact({
            name: v("Full name"),
            company: v("Company"),
            email: v("Email"),
            phone: v("Phone"),
          });
          break;
        case "create-lead":
          res = await quickCreateLead({
            propertyAddress: v("Property address"),
            primaryContact: v("Primary contact"),
            source: v("Source"),
          });
          break;
        case "log-call":
          res = await quickLogCall({
            contact: v("Contact"),
            outcome: v("Outcome"),
            notes: v("Notes"),
          });
          break;
        case "set-follow-up":
          res = await quickSetFollowUp({
            about: v("About"),
            dueDate: v("Due date"),
            note: v("Note"),
          });
          break;
        default:
          res = { ok: false, error: "Unknown action." };
      }
      setStatus(
        res.ok ? { kind: "success" } : { kind: "error", text: res.error },
      );
    });
  }

  const action = open ? ACTIONS[open] : null;
  const showSuccess = status.kind === "success";

  return (
    <>
      <div className="flex flex-wrap justify-center gap-2 mt-5">
        {PILLS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => openManual(key)}
            className="inline-flex items-center gap-1.5 rounded-full border bg-card/60 px-3.5 py-1.5 text-[0.8125rem] font-medium text-muted-foreground transition-[background-color,border-color,color,transform] hover:bg-card hover:text-foreground hover:border-foreground/25 active:translate-y-px whitespace-nowrap"
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      <Sheet open={open !== null} onOpenChange={(o) => !o && close()}>
        <SheetContent side="right" className="w-full sm:max-w-md gap-0 p-0">
          {action && (
            <>
              <SheetHeader className="px-6 py-5 border-b">
                <SheetTitle className="text-[1.0625rem] tracking-tight">
                  {action.title}
                </SheetTitle>
                <SheetDescription>{action.description}</SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-6">
                {action.kind === "form" && showSuccess && (
                  <div className="flex flex-col items-center text-center py-10 gap-3">
                    <div className="size-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                      <Check className="size-7" />
                    </div>
                    <h3 className="text-[1.0625rem] font-semibold">
                      {action.success.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {action.success.sub}
                    </p>
                  </div>
                )}

                {action.kind === "form" && !showSuccess && (
                  <form
                    id={FORM_ID}
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmit();
                    }}
                    className="flex flex-col gap-5"
                  >
                    {status.kind === "error" && (
                      <p className="text-xs text-destructive dark:text-[var(--color-amber-soft)] -mb-1">
                        {status.text}
                      </p>
                    )}
                    {action.fields.map((f, i) => (
                      <Field
                        key={i}
                        field={f}
                        value={values[f.label] ?? ""}
                        onChange={(val) => setField(f.label, val)}
                        disabled={submitting}
                      />
                    ))}
                  </form>
                )}

                {action.kind === "overdue" &&
                  (overdue.length === 0 ? (
                    <div className="flex flex-col items-center text-center py-10 gap-2">
                      <div className="size-12 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                        <Check className="size-6" />
                      </div>
                      <p className="text-sm font-medium">All caught up</p>
                      <p className="text-xs text-muted-foreground">
                        No follow-ups are past due.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {overdue.map((it) => (
                        <button
                          key={it.leadId}
                          type="button"
                          onClick={() => {
                            close();
                            router.push(`/leads/${it.leadId}`);
                          }}
                          className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3.5 text-left transition-colors hover:bg-accent"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {it.propertyName?.trim() || it.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              Due {formatDueDate(it.followUpAt)}
                              {it.company ? ` · ${it.company}` : ""}
                            </p>
                          </div>
                          <span className="text-[0.6875rem] font-semibold px-2 py-0.5 rounded-full bg-foreground/10 text-foreground whitespace-nowrap">
                            {it.daysLate}d late
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
              </div>

              <SheetFooter className="px-6 py-4 border-t flex-row justify-end gap-2">
                {action.kind === "form" && !showSuccess && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={close}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" form={FORM_ID} disabled={submitting}>
                      {submitting && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      {action.cta}
                    </Button>
                  </>
                )}
                {action.kind === "form" && showSuccess && (
                  <Button onClick={close} className="mx-auto">
                    Done
                  </Button>
                )}
                {action.kind === "overdue" && (
                  <Button variant="ghost" onClick={close}>
                    Close
                  </Button>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Field({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FieldDef;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = `f-${field.label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[0.8125rem]">
        {field.label}
      </Label>
      {field.kind === "input" && (
        <Input
          id={id}
          type={field.type ?? "text"}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )}
      {field.kind === "textarea" && (
        <Textarea
          id={id}
          placeholder={field.placeholder}
          className="min-h-20"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )}
      {field.kind === "select" && (
        <Select
          value={field.options.includes(value) ? value : undefined}
          onValueChange={onChange}
          disabled={disabled}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
