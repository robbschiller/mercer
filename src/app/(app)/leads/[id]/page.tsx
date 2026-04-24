import { redirect } from "next/navigation";

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const sp = new URLSearchParams();
  sp.set("lead", id);
  if (error) sp.set("error", error);
  redirect(`/leads?${sp.toString()}`);
}
