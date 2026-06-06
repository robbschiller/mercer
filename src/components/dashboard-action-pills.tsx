"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  Check,
  CircleAlert,
  ClipboardList,
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
import type { DashboardIntent } from "@/lib/actions/parse-dashboard-intent";

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
  items: { title: string; sub: string; badge: string }[];
};

type ActionDef = FormAction | OverdueAction;

type ActionKey =
  | "add-contact"
  | "create-lead"
  | "log-call"
  | "set-follow-up"
  | "start-draft-bid"
  | "show-overdue";

// TODO Phase 2: forms should submit to the matching server action
// (createContact / createLeadAction / logLeadContactAction /
// setLeadFollowUpAction / createBidAction). "show-overdue" should query
// real overdue follow-ups instead of the placeholder list.
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
    title: "Start draft bid",
    description: "Begin a new proposal",
    cta: "Start bid",
    success: {
      title: "Draft bid started",
      sub: "Opening the bid editor next.",
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
    description: "Items past their reminder date",
    items: [
      {
        title: "Follow up with Greystar",
        sub: "Due 3 days ago · Vista Palms quote",
        badge: "3d late",
      },
      {
        title: "Send Pura Vida proposal",
        sub: "Due yesterday · Blue Section",
        badge: "1d late",
      },
    ],
  },
};

const PILLS: { key: ActionKey; label: string; icon: LucideIcon }[] = [
  { key: "add-contact", label: "Add contact", icon: UserPlus },
  { key: "create-lead", label: "Create lead", icon: Target },
  { key: "log-call", label: "Log call", icon: Phone },
  { key: "set-follow-up", label: "Set follow-up", icon: CalendarClock },
  { key: "start-draft-bid", label: "Start draft bid", icon: ClipboardList },
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

export function DashboardActionPills() {
  const [open, setOpen] = useState<ActionKey | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [prefill, setPrefill] = useState<Prefill>({});

  function close() {
    setOpen(null);
    setShowSuccess(false);
    setPrefill({});
  }

  // Listen for parsed intents from the dashboard composer (Claude API). The
  // hero component dispatches a "dashboard:intent" CustomEvent with the
  // intent payload; we open the matching sheet and pre-fill what we know.
  useEffect(() => {
    function onIntent(e: Event) {
      const ce = e as CustomEvent<DashboardIntent>;
      const intent = ce.detail;
      if (intent.kind === "unknown") return;
      setShowSuccess(false);
      setPrefill(prefillFromIntent(intent));
      setOpen(intent.kind);
    }
    window.addEventListener("dashboard:intent", onIntent);
    return () => window.removeEventListener("dashboard:intent", onIntent);
  }, []);

  const action = open ? ACTIONS[open] : null;

  return (
    <>
      <div className="flex flex-wrap justify-center gap-2 mt-5">
        {PILLS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setShowSuccess(false);
              setOpen(key);
            }}
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
                    // key remounts the form whenever a new prefill arrives so
                    // uncontrolled inputs pick up the new defaultValue.
                    key={`${open}-${Object.values(prefill).join("|")}`}
                    onSubmit={(e) => {
                      e.preventDefault();
                      // TODO Phase 2: call the matching server action here.
                      setShowSuccess(true);
                    }}
                    className="flex flex-col gap-5"
                  >
                    {action.fields.map((f, i) => (
                      <Field
                        key={i}
                        field={f}
                        defaultValue={prefill[f.label] ?? ""}
                      />
                    ))}
                  </form>
                )}

                {action.kind === "overdue" && (
                  <div className="flex flex-col gap-2">
                    {action.items.map((it, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3.5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{it.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {it.sub}
                          </p>
                        </div>
                        <span className="text-[0.6875rem] font-semibold px-2 py-0.5 rounded-full bg-foreground/10 text-foreground whitespace-nowrap">
                          {it.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <SheetFooter className="px-6 py-4 border-t flex-row justify-end gap-2">
                {action.kind === "form" && !showSuccess && (
                  <>
                    <Button type="button" variant="ghost" onClick={close}>
                      Cancel
                    </Button>
                    <Button type="submit" form={FORM_ID}>
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
  defaultValue,
}: {
  field: FieldDef;
  defaultValue: string;
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
          defaultValue={defaultValue}
        />
      )}
      {field.kind === "textarea" && (
        <Textarea
          id={id}
          placeholder={field.placeholder}
          className="min-h-20"
          defaultValue={defaultValue}
        />
      )}
      {field.kind === "select" && (
        <Select
          defaultValue={
            field.options.includes(defaultValue) ? defaultValue : undefined
          }
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
