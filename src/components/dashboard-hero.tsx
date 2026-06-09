"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ArrowUp, Loader2, Plus } from "lucide-react";
import {
  parseDashboardIntent,
  type DashboardIntent,
} from "@/lib/actions/parse-dashboard-intent";

type DashboardHeroProps = {
  firstName: string | null;
};

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardHero({ firstName }: DashboardHeroProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "summary"; text: string }
    | { kind: "error"; text: string }
  >({ kind: "idle" });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setNow(new Date()), []);

  const autoGrow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 192) + "px";
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    if (status.kind !== "idle") setStatus({ kind: "idle" });
    autoGrow();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || pending) return;

    startTransition(async () => {
      const result = await parseDashboardIntent(trimmed);
      if (!result.ok) {
        setStatus({ kind: "error", text: result.error });
        return;
      }

      const intent = result.intent;
      // Hand the parsed intent off to the action pills component, which
      // opens the matching sheet pre-filled. `unknown` doesn't open a
      // sheet — we just surface the model's summary as a status line.
      if (intent.kind !== "unknown") {
        window.dispatchEvent(
          new CustomEvent<DashboardIntent>("dashboard:intent", {
            detail: intent,
          }),
        );
        // Clear the composer once the sheet has taken over.
        setValue("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      }

      const text =
        intent.summary ??
        (intent.kind === "unknown"
          ? "I couldn't tell what you wanted — try one of the actions below."
          : "Opening…");
      setStatus({ kind: "summary", text });
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
    <div className="text-center mb-14">
      <p
        className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground mb-3 min-h-4"
        suppressHydrationWarning
      >
        {dateLine}
      </p>
      <h1
        className="text-[2.125rem] leading-[1.15] font-semibold tracking-tight mb-7"
        suppressHydrationWarning
      >
        {name ? `${greeting}, ${name}` : greeting}
        <span className="text-muted-foreground">.</span>
      </h1>

      <form
        className="rounded-3xl border bg-card/80 dark:bg-card/80 text-left px-3.5 pt-3.5 pb-3 shadow-[0_1px_2px_rgb(0_0_0/0.08),0_16px_50px_-24px_rgb(0_0_0/0.25)] dark:shadow-[0_1px_2px_rgb(0_0_0/0.2),0_16px_50px_-24px_rgb(0_0_0/0.7)] transition-[border-color,box-shadow] focus-within:border-foreground/25"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask Mercer to do anything..."
          aria-label="Ask Mercer"
          disabled={pending}
          className="w-full resize-none border-0 bg-transparent outline-none text-[1.0625rem] leading-6 placeholder:text-muted-foreground px-2.5 py-2 min-h-11 max-h-48 disabled:opacity-60"
        />
        <div className="flex items-center justify-between gap-2 pt-1 px-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Attach"
              className="w-8 h-8 rounded-full border text-muted-foreground hover:bg-accent hover:text-foreground inline-flex items-center justify-center transition-colors"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            aria-label="Submit"
            className="h-9 w-9 shrink-0 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center transition-[opacity,transform] hover:-translate-y-px disabled:opacity-40 disabled:pointer-events-none"
          >
            {pending ? (
              <Loader2 className="size-[17px] animate-spin" />
            ) : (
              <ArrowUp className="size-[17px]" />
            )}
          </button>
        </div>
      </form>

      {status.kind !== "idle" && (
        <p
          className={
            "mt-3 text-xs " +
            (status.kind === "error"
              ? "text-destructive dark:text-[var(--color-amber-soft)]"
              : "text-muted-foreground")
          }
          role="status"
          aria-live="polite"
        >
          {status.text}
        </p>
      )}
    </div>
  );
}
