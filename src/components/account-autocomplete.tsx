"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { searchAccountsAction } from "@/lib/actions";
import { cn } from "@/lib/utils";

const SUGGEST_DEBOUNCE_MS = 200;
const MIN_QUERY_LEN = 2;

type Suggestion = { id: string; name: string };

export function AccountAutocomplete({
  id,
  name = "company",
  hiddenIdName = "accountId",
  defaultValue = "",
  className,
}: {
  id?: string;
  name?: string;
  hiddenIdName?: string;
  defaultValue?: string;
  className?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}-company`;
  const listboxId = `${inputId}-suggestions`;

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchSeqRef = useRef(0);

  const [value, setValue] = useState(defaultValue);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setActiveIndex(-1);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  function scheduleFetch(next: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = next.trim();
    if (q.length < MIN_QUERY_LEN) {
      setSuggestions([]);
      setSearched(false);
      setLoading(false);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    setLoading(true);
    setOpen(true);
    debounceRef.current = setTimeout(async () => {
      const seq = ++fetchSeqRef.current;
      try {
        const rows = await searchAccountsAction(q);
        if (seq !== fetchSeqRef.current) return;
        setSuggestions(rows);
        setSearched(true);
        setActiveIndex(-1);
      } catch (err) {
        if (seq !== fetchSeqRef.current) return;
        console.error("[AccountAutocomplete] searchAccountsAction:", err);
        setSuggestions([]);
        setSearched(true);
      } finally {
        if (seq === fetchSeqRef.current) setLoading(false);
      }
    }, SUGGEST_DEBOUNCE_MS);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    setAccountId(null);
    scheduleFetch(next);
  }

  function pick(s: Suggestion) {
    setValue(s.name);
    setAccountId(s.id);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    setSearched(false);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) =>
        suggestions.length === 0 ? -1 : Math.min(i + 1, suggestions.length - 1),
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pick(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const showCreateHint =
    open && searched && !loading && suggestions.length === 0 && value.trim().length >= MIN_QUERY_LEN;

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        id={inputId}
        name={name}
        type="text"
        value={value}
        onChange={onChange}
        onFocus={() => {
          if (value.trim().length >= MIN_QUERY_LEN) {
            scheduleFetch(value);
          }
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={
          open && activeIndex >= 0 ? `${inputId}-option-${activeIndex}` : undefined
        }
        className={className}
      />
      <input type="hidden" name={hiddenIdName} value={accountId ?? ""} />

      {open && (loading || suggestions.length > 0 || showCreateHint) ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute top-full z-[100000] mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover py-1 text-sm shadow-md"
        >
          {loading ? (
            <li className="px-3 py-2 text-muted-foreground">Searching…</li>
          ) : null}
          {!loading &&
            suggestions.map((s, i) => (
              <li
                key={s.id}
                id={`${inputId}-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                className={cn(
                  "cursor-pointer px-3 py-2",
                  i === activeIndex ? "bg-accent" : "hover:bg-accent/80",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
              >
                {s.name}
              </li>
            ))}
          {showCreateHint ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              No matches. A new account named{" "}
              <span className="font-medium text-foreground">“{value.trim()}”</span>{" "}
              will be created on save.
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
