import { notFound } from "next/navigation";
import {
  getPropertyDetail,
  getPropertyRelationshipHistory,
  getPropertyDeals,
  getPhotos,
} from "@/lib/store";
import { PropertyProfile } from "@/components/property-profile";
import { BreadcrumbLabel } from "@/components/breadcrumb-label";

/**
 * The building's own record. The same profile renders inside `/leads/[id]`,
 * where it wraps a single work request — see `property-profile.tsx`.
 */
export default async function PropertyHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [detail, history, photos, deals] = await Promise.all([
    getPropertyDetail(id),
    getPropertyRelationshipHistory(id),
    getPhotos("property", id),
    getPropertyDeals(id),
  ]);
  if (!detail) notFound();

  const label =
    detail.property.name ?? detail.property.address ?? "Untitled property";

  return (
    <div className="relative mx-auto w-full max-w-[1240px] px-6 pb-24 pt-7">
      <BreadcrumbLabel segment={id} label={label} />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <PropertyProfile
        detail={detail}
        history={history}
        photos={photos}
        deals={deals}
        title={label}
        backHref="/properties"
        backLabel="Properties"
        returnTo={`/properties/${id}`}
      />
    </div>
  );
}
