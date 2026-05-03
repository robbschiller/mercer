import { redirect } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { getOrgContext } from "@/lib/org-context";
import { getCompanyProfile } from "@/lib/store";
import { CompanyDetailsForm } from "@/components/company-details-form";

export default async function SettingsCompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const profile = await getCompanyProfile(ctx.ownerUserId);
  const { error, saved } = await searchParams;

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Company details saved.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Company details</CardTitle>
          <CardDescription>
            Pulled from your website during onboarding. These power your bid
            PDFs and shareable proposal pages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyDetailsForm profile={profile} />
        </CardContent>
      </Card>
    </div>
  );
}
