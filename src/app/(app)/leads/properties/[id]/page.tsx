import { redirect } from "next/navigation";

// Properties moved to top-level /properties in the IA rework — this route
// only survives for old links.
export default async function LegacyPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/properties/${id}`);
}
