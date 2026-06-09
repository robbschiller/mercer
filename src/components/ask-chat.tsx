"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { ArrowUp, Loader2, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  askMercer,
  searchUnitsAction,
  type AskResult,
} from "@/lib/actions/ask";
import type { UnitHit, UnitRef } from "@/lib/store";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  offline?: boolean;
  refs?: UnitHit[];
};

const TYPE_LABEL: Record<UnitHit["type"], string> = {
  lead: "Lead",
  bid: "Bid / Project",
  property: "Property",
  contact: "Contact",
  account: "Company",
};

let idSeq = 0;
const nextId = () => `m${idSeq++}`;

export function AskChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [refs, setRefs] = useState<UnitHit[]>([]);
  const [pending, startSend] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  function addUnit(hit: UnitHit) {
    setRefs((cur) =>
      cur.some((r) => r.type === hit.type && r.id === hit.id)
        ? cur
        : [...cur, hit],
    );
  }
  function removeUnit(type: string, id: string) {
    setRefs((cur) => cur.filter((r) => !(r.type === type && r.id === id)));
  }

  function send() {
    const message = input.trim();
    if (!message || pending) return;

    const sentRefs = refs;
    const userMsg: ChatMessage = {
      id: nextId(),
      role: "user",
      content: message,
      refs: sentRefs,
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    startSend(async () => {
      const res: AskResult = await askMercer({
        message,
        refs: sentRefs.map(({ type, id }) => ({ type, id }) as UnitRef),
      });
      setMessages((m) => [
        ...m,
        res.ok
          ? {
              id: nextId(),
              role: "assistant",
              content: res.answer,
              offline: !res.usedModel,
            }
          : {
              id: nextId(),
              role: "assistant",
              content: res.error,
              offline: false,
            },
      ]);
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[46rem] flex-1 flex-col px-6">
      {/* Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-8">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center text-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl border bg-card">
              <Sparkles className="size-5 text-muted-foreground" />
            </div>
            <h1 className="text-[1.375rem] font-semibold tracking-tight">
              Ask Mercer
            </h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Tag a property, bid, lead, contact, or company with the{" "}
              <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
                <Plus className="size-3.5" /> Add context
              </span>{" "}
              button, then ask about it — e.g. “What did the Disney property’s
              accepted bid come to, and how far along are its buildings?”
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {messages.map((m) => (
              <MessageRow key={m.id} message={m} />
            ))}
            {pending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Thinking…
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="pb-6">
        <div className="rounded-3xl border bg-card/80 px-3.5 pt-3 pb-2.5 shadow-[0_1px_2px_rgb(0_0_0/0.08),0_16px_50px_-24px_rgb(0_0_0/0.25)] focus-within:border-foreground/25 transition-colors">
          {refs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1 pb-2">
              {refs.map((r) => (
                <Badge
                  key={`${r.type}-${r.id}`}
                  variant="secondary"
                  className="gap-1 pr-1 font-normal"
                >
                  <span className="text-muted-foreground">
                    {TYPE_LABEL[r.type]}:
                  </span>
                  <span className="max-w-[12rem] truncate">{r.label}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${r.label}`}
                    onClick={() => removeUnit(r.type, r.id)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about your tagged records…"
            aria-label="Ask Mercer"
            disabled={pending}
            className="max-h-48 min-h-11 w-full resize-none border-0 bg-transparent px-2.5 py-2 text-[1.0625rem] leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />

          <div className="flex items-center justify-between gap-2 px-1 pt-1">
            <AddContextPopover onPick={addUnit} taggedRefs={refs} />
            <button
              type="button"
              onClick={send}
              disabled={input.trim().length === 0 || pending}
              aria-label="Send"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-[opacity,transform] hover:-translate-y-px disabled:pointer-events-none disabled:opacity-40"
            >
              {pending ? (
                <Loader2 className="size-[17px] animate-spin" />
              ) : (
                <ArrowUp className="size-[17px]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageRow({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {message.refs && message.refs.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1">
            {message.refs.map((r) => (
              <span
                key={`${r.type}-${r.id}`}
                className="rounded-full bg-foreground/5 px-2 py-0.5 text-[0.6875rem] text-muted-foreground"
              >
                {TYPE_LABEL[r.type]}: {r.label}
              </span>
            ))}
          </div>
        )}
        <div className="max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {message.offline && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.6875rem] font-medium text-amber-600 dark:text-amber-400">
          Offline mode
        </span>
      )}
      <div className="max-w-[90%] rounded-2xl border bg-card px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
        {message.content}
      </div>
    </div>
  );
}

function AddContextPopover({
  onPick,
  taggedRefs,
}: {
  onPick: (hit: UnitHit) => void;
  taggedRefs: UnitHit[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnitHit[]>([]);
  const [searching, startSearch] = useTransition();

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      startSearch(async () => {
        setResults(await searchUnitsAction(q));
      });
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const isTagged = (h: UnitHit) =>
    taggedRefs.some((r) => r.type === h.type && r.id === h.id);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setQuery("");
          setResults([]);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-full text-xs"
        >
          <Plus className="size-3.5" />
          Add context
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0" side="top">
        <div className="border-b p-2">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search records…"
            className="h-9"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {searching && (
            <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Searching…
            </div>
          )}
          {!searching && query.trim() && results.length === 0 && (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              No matching records.
            </p>
          )}
          {!searching && !query.trim() && (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              Search leads, bids/projects, properties, contacts, or companies.
            </p>
          )}
          {results.map((hit) => {
            const tagged = isTagged(hit);
            return (
              <button
                key={`${hit.type}-${hit.id}`}
                type="button"
                disabled={tagged}
                onClick={() => {
                  onPick(hit);
                  setOpen(false);
                  setQuery("");
                  setResults([]);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{hit.label}</p>
                  {hit.sublabel && (
                    <p className="truncate text-xs text-muted-foreground">
                      {hit.sublabel}
                    </p>
                  )}
                </div>
                {tagged && (
                  <span className="text-[0.6875rem] text-muted-foreground">
                    added
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
