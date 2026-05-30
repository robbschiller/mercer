import Link from "next/link";
import {
  CONTACTS_PAGE_DEFAULT_LIMIT,
  CONTACTS_SORTS,
  getContactSourceOptions,
  getContacts,
  type ContactsSort,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContactsTable } from "@/components/contacts-table";
import { ContactsToolbar } from "@/components/contacts-toolbar";

type ContactsQuery = {
  q: string;
  source: string | null;
  sort: ContactsSort | null;
  limit: number;
  page: number;
};

function parseSort(raw: string | undefined): ContactsSort | null {
  const v = raw?.trim();
  if (!v) return null;
  return (CONTACTS_SORTS as readonly string[]).includes(v)
    ? (v as ContactsSort)
    : null;
}

function parseLimit(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n <= 0) return CONTACTS_PAGE_DEFAULT_LIMIT;
  return n;
}

function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n <= 1) return 1;
  return n;
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{
    imported?: string;
    q?: string;
    source?: string;
    sort?: string;
    limit?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const query: ContactsQuery = {
    q: (params.q ?? "").trim(),
    source: params.source?.trim() || null,
    sort: parseSort(params.sort),
    limit: parseLimit(params.limit),
    page: parsePage(params.page),
  };

  const [listResult, sourceOptions] = await Promise.all([
    getContacts({
      q: query.q || null,
      sourceTag: query.source,
      sort: query.sort ?? "recent",
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    }),
    getContactSourceOptions(),
  ]);
  const hasFilters = Boolean(query.q || query.source);

  return (
    <div className="flex h-[calc(100svh-3.5rem)] min-h-0 w-full flex-col overflow-hidden">
      <ContactsToolbar />

      {params.imported && (
        <div className="border-b border-emerald-600/30 bg-emerald-600/5 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Imported {params.imported} contact
          {params.imported === "1" ? "" : "s"}.
        </div>
      )}

      {listResult.rows.length === 0 ? (
        <div className="p-3 lg:p-4">
          <EmptyState query={query} hasFilters={hasFilters} />
        </div>
      ) : (
        <ContactsTable
          contacts={listResult.rows.map((row) => ({
            ...row,
            href: `/contacts/${row.contact.id}`,
            accountHref: row.contact.accountId
              ? `/leads/accounts/${row.contact.accountId}`
              : null,
            sourceTag: row.contact.sourceTag,
            createdAt: row.contact.createdAt,
          }))}
          query={query}
          total={listResult.total}
          page={query.page}
          sourceOptions={sourceOptions}
        />
      )}
    </div>
  );
}

function EmptyState({
  query,
  hasFilters,
}: {
  query: ContactsQuery;
  hasFilters: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        {hasFilters ? (
          <>
            <p className="text-muted-foreground">
              {query.q
                ? `No contacts match “${query.q}”.`
                : "No contacts match these filters."}
            </p>
            <Button variant="outline" asChild>
              <Link href="/contacts">Clear filters</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">No contacts yet.</p>
            <p className="max-w-sm text-sm text-muted-foreground/80">
              Import a trade-show CSV to build the contact database. Contacts
              can be linked to one or more properties before they become leads.
            </p>
            <Button asChild>
              <Link href="/contacts/import">Import contacts</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
