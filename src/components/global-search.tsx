"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building,
  Building2,
  ContactRound,
  FilePlus2,
  FileText,
  Sparkles,
  Target,
  UserPlus,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { searchUnitsAction } from "@/lib/actions/ask";
import type { UnitHit } from "@/lib/store";

/** The sidebar's ⌘K, for real: one box that finds any record. */
const TYPE_META: Record<
  UnitHit["type"],
  { label: string; href: (id: string) => string; icon: React.ReactNode }
> = {
  property: {
    label: "Properties",
    href: (id) => `/properties/${id}`,
    icon: <Building2 className="size-4" />,
  },
  bid: {
    label: "Opportunities & jobs",
    href: (id) => `/opportunities/${id}`,
    icon: <FileText className="size-4" />,
  },
  lead: {
    label: "Leads",
    href: (id) => `/leads/${id}`,
    icon: <Target className="size-4" />,
  },
  contact: {
    label: "Contacts",
    href: (id) => `/contacts/${id}`,
    icon: <ContactRound className="size-4" />,
  },
  account: {
    label: "Companies",
    href: (id) => `/leads/accounts/${id}`,
    icon: <Building className="size-4" />,
  },
};

const GROUP_ORDER: UnitHit["type"][] = [
  "property",
  "bid",
  "lead",
  "contact",
  "account",
];

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<UnitHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState("");
  const seq = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mercer:search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mercer:search", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const mySeq = ++seq.current;
    const t = setTimeout(async () => {
      const results = await searchUnitsAction(q);
      if (seq.current === mySeq) {
        setHits(results);
        setSearching(false);
        // cmdk doesn't re-select when async items arrive — point it at the
        // top-ranked hit explicitly.
        const first = GROUP_ORDER.flatMap((type) =>
          results.filter((h) => h.type === type),
        )[0];
        setSelected(first ? `${first.type}-${first.id}` : "action-ask");
      }
    }, 180);
    return () => clearTimeout(t);
  }, [query, open]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const grouped = GROUP_ORDER.map((type) => ({
    type,
    items: hits.filter((h) => h.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
      title="Search"
      description="Find any property, project, or person"
      // The palette filters server-side; client-side re-filtering would
      // fight the ranked results.
      shouldFilter={false}
      value={selected}
      onValueChange={setSelected}
    >
      <CommandInput
        placeholder="Search properties, projects, people…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {query.trim().length < 2
            ? "Type to search across everything."
            : searching
              ? "Searching…"
              : "No matches."}
        </CommandEmpty>
        {grouped.map((g) => (
          <CommandGroup key={g.type} heading={TYPE_META[g.type].label}>
            {g.items.map((h) => (
              <CommandItem
                key={`${h.type}-${h.id}`}
                value={`${h.type}-${h.id}`}
                onSelect={() => go(TYPE_META[h.type].href(h.id))}
              >
                {TYPE_META[h.type].icon}
                <span className="min-w-0 flex-1 truncate">{h.label}</span>
                {h.sublabel && (
                  <span className="truncate text-xs text-muted-foreground">
                    {h.sublabel}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        {grouped.length === 0 && (
          <>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem value="action-new-lead" onSelect={() => go("/leads/new")}>
            <UserPlus className="size-4" />
            New lead
          </CommandItem>
          <CommandItem value="action-new-bid" onSelect={() => go("/opportunities/new")}>
            <FilePlus2 className="size-4" />
            New opportunity
          </CommandItem>
          <CommandItem
            value="action-ask"
            onSelect={() => go("/dashboard#ask")}
          >
            <Sparkles className="size-4" />
            Ask Mercer{query.trim() ? ` about “${query.trim()}”` : "…"}
          </CommandItem>
        </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
