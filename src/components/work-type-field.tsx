"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "What's the work?" as remembered free text (Jordan 2026-09-02): "a text
 * field for what's the work … and it saves it too, so that you can select it
 * again next time." Suggestions are whatever this org has typed before (plus
 * a few seeds); anything new is typed once and offered back from then on.
 *
 * Submits as a hidden `name` input joined with ", " so the existing
 * `scopeCategory` validator keeps working. Commas inside a value are dropped.
 */
export function WorkTypeField({
  name = "scopeCategory",
  value,
  defaultValue = [],
  onChange,
  suggestions,
  placeholder = "Type the work…",
  maxSuggestions = 8,
}: {
  name?: string;
  /** Controlled value; omit to let the field own its state. */
  value?: string[];
  defaultValue?: string[];
  onChange?: (next: string[]) => void;
  suggestions: string[];
  placeholder?: string;
  maxSuggestions?: number;
}) {
  const [inner, setInner] = useState<string[]>(defaultValue);
  const [draft, setDraft] = useState("");
  const selected = value ?? inner;
  const set = (next: string[]) => {
    if (value === undefined) setInner(next);
    onChange?.(next);
  };
  const norm = (s: string) => s.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const has = (s: string) =>
    selected.some((v) => v.toLowerCase() === s.toLowerCase());
  const add = (raw: string) => {
    const v = norm(raw);
    if (!v || has(v)) return;
    set([...selected, v]);
  };
  const remove = (s: string) => set(selected.filter((v) => v !== s));
  const commitDraft = () => {
    if (draft.trim()) add(draft);
    setDraft("");
  };
  const offered = suggestions
    .filter((s) => !has(s))
    .filter((s) =>
      draft.trim() ? s.toLowerCase().includes(draft.trim().toLowerCase()) : true,
    )
    .slice(0, maxSuggestions);

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={selected.join(", ")} />
      <div className="flex flex-wrap gap-2">
        {selected.map((s) => (
          <span
            key={s}
            className="inline-flex h-[38px] items-center gap-1.5 rounded-[10px] border border-foreground bg-foreground pl-3.5 pr-2 text-[13.5px] font-medium text-background"
          >
            <Check className="size-[15px]" />
            {s}
            <button
              type="button"
              onClick={() => remove(s)}
              aria-label={`Remove ${s}`}
              className="ml-0.5 grid size-5 place-items-center rounded-md text-background/70 transition-colors hover:bg-background/15 hover:text-background"
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        {offered.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => add(s)}
            className="inline-flex h-[38px] items-center gap-1.5 rounded-[10px] border bg-card px-3.5 text-[13.5px] font-medium text-foreground/80 transition-colors hover:border-foreground/25 hover:bg-muted/40 active:translate-y-px"
          >
            {s}
          </button>
        ))}
        <span
          className={cn(
            "inline-flex h-[38px] items-center gap-1.5 rounded-[10px] border border-dashed bg-card pl-3 pr-2 text-[13.5px] transition-colors focus-within:border-foreground/35",
          )}
        >
          <Plus className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                commitDraft();
              } else if (e.key === "Backspace" && !draft && selected.length) {
                remove(selected[selected.length - 1]);
              }
            }}
            placeholder={placeholder}
            autoComplete="off"
            className="w-40 min-w-0 border-none bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground/60"
          />
        </span>
      </div>
    </div>
  );
}
