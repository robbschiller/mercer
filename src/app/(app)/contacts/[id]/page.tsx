import { notFound } from "next/navigation";
import { getContactDetail, getContactEmploymentHistory } from "@/lib/store";
import {
  startContactEmploymentAction,
  endContactEmploymentAction,
} from "@/lib/actions";
import { ContactDetailPanel } from "@/components/contact-detail-panel";
import { BreadcrumbLabel } from "@/components/breadcrumb-label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [detail, employment] = await Promise.all([
    getContactDetail(id),
    getContactEmploymentHistory(id),
  ]);
  if (!detail) notFound();

  return (
    <div className="container mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <BreadcrumbLabel segment={id} label={detail.contact.name} />
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <ContactDetailPanel
        detail={detail}
        closeHref="/contacts"
        buildAccountHref={(accountId) => `/leads/accounts/${accountId}`}
        buildPropertyHref={(propertyId) => `/leads/properties/${propertyId}`}
        buildLeadHref={(leadId) => `/leads/${leadId}`}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employment history</CardTitle>
          <CardDescription>
            A contact keeps their identity as they move between firms. Each role
            is dated; adding a new one ends the current role as of its start
            date.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {employment.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No employment recorded.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {employment.map((e) => (
                <li key={e.id} className="flex flex-col gap-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span>
                      {e.accountName}
                      {e.title ? (
                        <span className="text-muted-foreground">
                          {" · "}
                          {e.title}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {e.endDate
                        ? `${e.startDate} – ${e.endDate}`
                        : `${e.startDate} – present`}
                      {e.current && (
                        <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[0.6875rem] font-medium text-foreground">
                          current
                        </span>
                      )}
                    </span>
                  </div>
                  {e.current && (
                    <form
                      action={endContactEmploymentAction}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="contactId" value={id} />
                      <input type="hidden" name="id" value={e.id} />
                      <Input
                        type="date"
                        name="endDate"
                        required
                        className="h-7 w-36 text-xs"
                      />
                      <SubmitButton variant="outline" size="sm">
                        End
                      </SubmitButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          <form
            action={startContactEmploymentAction}
            className="flex flex-wrap items-center gap-2 border-t pt-3"
          >
            <input type="hidden" name="contactId" value={id} />
            <Input
              name="accountName"
              required
              placeholder="Company"
              className="h-7 flex-1 text-xs"
            />
            <Input
              name="title"
              placeholder="Title (optional)"
              className="h-7 w-36 text-xs"
            />
            <Input
              type="date"
              name="startDate"
              required
              className="h-7 w-36 text-xs"
            />
            <SubmitButton variant="outline" size="sm">
              Add
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
