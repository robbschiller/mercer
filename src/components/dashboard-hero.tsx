"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, FileText, Loader2, Paperclip } from "lucide-react";
import { parseDashboardIntent } from "@/lib/actions/parse-dashboard-intent";
import { askMercer } from "@/lib/actions/ask";
import { extractLeadDraftAction } from "@/lib/actions/extract-lead";
import { stashLeadDraft } from "@/lib/lead-draft";
import type { DashboardIntent } from "@/lib/dashboard-intent";
import { cn } from "@/lib/utils";

type DashboardHeroProps = {
  firstName: string | null;
  /** Server-rendered morning brief, suspended so it streams in. */
  briefSlot?: React.ReactNode;
};

function greetingFor(hour: number) {
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}


/**
 * Home hero (Direction A): eyebrow date · greeting · serif AI brief ·
 * do-or-answer composer. Commands open the matching quick-action sheet;
 * questions get answered inline (Ask, no tagged records) in a header block
 * above the input — one box, no wrong door.
 */
export function DashboardHero({ firstName, briefSlot }: DashboardHeroProps) {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [answer, setAnswer] = useState<{ q: string; a: string } | null>(null);
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "error"; text: string }
  >({ kind: "idle" });
  const [reading, setReading] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropInputRef = useRef<HTMLInputElement>(null);

  // D1: a dropped spec/RFP/email screenshot becomes a draft lead — AI
  // extracts the fields, then the New Lead form opens pre-filled for review.
  const readFiles = useCallback(
    (list: FileList | File[]) => {
      const files = Array.from(list).slice(0, 5);
      if (files.length === 0 || reading) return;
      setStatus({ kind: "idle" });
      setReading(
        files.length === 1
          ? `Reading ${files[0].name}…`
          : `Reading ${files.length} files…`,
      );
      startTransition(async () => {
        try {
          const fd = new FormData();
          for (const f of files) fd.append("files", f);
          if (value.trim()) fd.append("note", value.trim());
          const result = await extractLeadDraftAction(fd);
          if (!result.ok) {
            setStatus({ kind: "error", text: result.error });
            return;
          }
          stashLeadDraft(result.draft, files);
          router.push("/leads/new");
        } finally {
          setReading(null);
        }
      });
    },
    [reading, value, router],
  );

  useEffect(() => setNow(new Date()), []);

  // Sidebar Search / global ⌘K land on /dashboard#ask — focus the composer.
  useEffect(() => {
    const focusIfAsked = () => {
      if (window.location.hash === "#ask") {
        textareaRef.current?.focus();
        history.replaceState(null, "", window.location.pathname);
      }
    };
    focusIfAsked();
    window.addEventListener("hashchange", focusIfAsked);
    return () => window.removeEventListener("hashchange", focusIfAsked);
  }, []);

  const autoGrow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 192) + "px";
  }, []);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || pending) return;

    startTransition(async () => {
      setStatus({ kind: "idle" });
      const result = await parseDashboardIntent(trimmed);
      if (!result.ok) {
        setStatus({ kind: "error", text: result.error });
        return;
      }

      const intent = result.intent;
      if (intent.kind !== "unknown") {
        window.dispatchEvent(
          new CustomEvent<DashboardIntent>("dashboard:intent", {
            detail: intent,
          }),
        );
        setValue("");
        setAnswer(null);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        return;
      }

      // Not a command — treat it as a question and answer inline.
      const asked = await askMercer({ message: trimmed, refs: [] });
      if (asked.ok) {
        setAnswer({ q: trimmed, a: asked.answer });
        setValue("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      } else {
        setStatus({ kind: "error", text: asked.error });
      }
    });
  }

  const canSubmit = value.trim().length > 0 && !pending;
  const greeting = now ? greetingFor(now.getHours()) : "Welcome back";
  const dateLine = now
    ? now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";
  const name = firstName?.trim() || null;

  return (
    <div className="mb-10">
      <p
        className="mb-3 flex min-h-4 items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground"
        suppressHydrationWarning
      >
        <span className="size-[5px] rounded-full bg-emerald-500 shadow-[0_0_0_3px] shadow-emerald-500/15" />
        {dateLine}
      </p>
      <h1
        className="mb-4 text-3xl font-semibold leading-[1.1] tracking-tight"
        suppressHydrationWarning
      >
        {name ? `${greeting}, ${name}` : greeting}
        <span className="text-muted-foreground">.</span>
      </h1>

      {briefSlot}

      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (e.dataTransfer.files.length === 0) return;
          e.preventDefault();
          setDragOver(false);
          readFiles(e.dataTransfer.files);
        }}
        className={cn(
          "overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[border-color,box-shadow] focus-within:border-foreground/25 focus-within:shadow-[0_0_0_4px] focus-within:shadow-foreground/5",
          dragOver &&
            "border-blue-600/60 shadow-[0_0_0_4px] shadow-blue-600/10",
        )}
      >
        {(dragOver || reading) && (
          <div className="flex items-center gap-2 border-b bg-blue-600/5 px-4 py-2 text-[12.5px] text-blue-700 dark:text-blue-400">
            {reading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FileText className="size-3.5" />
            )}
            {reading ??
              "Drop it — a spec, RFP, or email screenshot becomes a draft lead."}
          </div>
        )}
        {answer && (
          <div className="border-b bg-muted/40 px-4 pb-3 pt-3.5">
            <div className="mb-2.5 flex items-baseline gap-2 text-[13px] text-muted-foreground">
              <span className="rounded-[5px] bg-muted px-1.5 py-px text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
                You
              </span>
              <span className="font-medium text-foreground/80">
                {answer.q}
              </span>
            </div>
            <div className="flex gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
                <svg
                  viewBox="0 0 24 24"
                  className="size-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 19V8.5L12 14l8-5.5V19" />
                </svg>
              </span>
              <p className="min-w-0 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                {answer.a}
              </p>
            </div>
          </div>
        )}
        <form
          className="flex items-end gap-2.5 px-4 pb-2.5 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (status.kind !== "idle") setStatus({ kind: "idle" });
              autoGrow();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask Mercer to do anything…"
            aria-label="Ask Mercer"
            disabled={pending}
            className="max-h-40 min-h-9 w-full resize-none border-0 bg-transparent py-1.5 text-base leading-6 outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
          />
          <input
            ref={dropInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.eml,image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) readFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => dropInputRef.current?.click()}
            disabled={pending}
            aria-label="Upload a spec or email — AI drafts the lead"
            title="Upload a spec or email — AI drafts the lead"
            className="mb-0.5 flex size-[34px] shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
          >
            <Paperclip className="size-4" />
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            aria-label="Submit"
            className="mb-0.5 flex size-[34px] shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-[opacity,transform] hover:-translate-y-px disabled:pointer-events-none disabled:opacity-35"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowUp className="size-4" />
            )}
          </button>
        </form>
      </div>

      {status.kind === "error" && (
        <p className="mt-3 text-xs text-destructive" role="status">
          {status.text}
        </p>
      )}
    </div>
  );
}
