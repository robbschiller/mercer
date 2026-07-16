"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CircleAlert,
  Loader2,
  MessageSquareText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SUGGESTIONS = [
  "Add contact",
  "Create lead",
  "Log call",
  "Set follow-up",
  "Start draft opportunity",
  "Show overdue",
];

type CommandState = "idle" | "loading" | "not_connected";

export function DashboardCommandBar() {
  const [value, setValue] = useState("");
  const [state, setState] = useState<CommandState>("idle");

  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0 && state !== "loading";
  const statusText = useMemo(() => {
    if (state === "loading") return "Reading command";
    if (state === "not_connected") return "Command parser is not connected yet";
    return null;
  }, [state]);

  function submitCommand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmed) return;
    setState("loading");
    window.setTimeout(() => setState("not_connected"), 450);
  }

  function chooseSuggestion(suggestion: string) {
    const next = suggestionPrompt(suggestion);
    setValue(next);
    setState("idle");
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 px-4">
      <div className="mx-auto max-w-3xl rounded-lg border bg-background/95 p-2 shadow-lg shadow-black/10 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => chooseSuggestion(suggestion)}
              className="shrink-0 rounded-md border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted hover:text-foreground"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form onSubmit={submitCommand} className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <MessageSquareText className="h-4 w-4" />
          </div>
          <Input
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (state !== "idle") setState("idle");
            }}
            placeholder="Ask Mercer to start an action..."
            className="h-10 border-0 px-0 shadow-none focus-visible:ring-0"
            aria-label="Dashboard command"
          />
          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={!canSubmit}
            aria-label="Submit command"
          >
            {state === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </Button>
        </form>

        {statusText ? (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-2">
              {state === "not_connected" ? (
                <CircleAlert className="h-3.5 w-3.5 shrink-0" />
              ) : null}
              <span className="truncate">{statusText}</span>
            </span>
            {state === "not_connected" ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-foreground">
                UI ready
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function suggestionPrompt(suggestion: string) {
  switch (suggestion) {
    case "Add contact":
      return "Add Sarah Chen at Highmark as a contact";
    case "Create lead":
      return "Sarah at Greystar asked us to quote Vista Palms";
    case "Log call":
      return "Log that I called Sarah at Greystar today";
    case "Set follow-up":
      return "Remind me to follow up with Sarah Friday";
    case "Start draft opportunity":
      return "Start a draft opportunity for Pura Vida blue section";
    case "Show overdue":
      return "Show overdue follow-ups";
    default:
      return suggestion;
  }
}
